// Paystack webhook handler (Node/Express) with idempotency + wallet ledger update
// Env: PAYSTACK_SECRET_KEY, DATABASE_URL

const crypto = require("crypto");
const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false }
});

let supabaseClient = null;
const supabaseUrl = () =>
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const hasSupabase = () =>
  !!supabaseUrl() && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const mod = await import("@supabase/supabase-js");
  supabaseClient = mod.createClient(
    supabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return supabaseClient;
}

// Capture raw body for signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);

function verifyPaystackSignature(req) {
  const signature = req.headers["x-paystack-signature"];
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(req.rawBody)
    .digest("hex");
  return hash === signature;
}

app.post("/api/v1/webhook/paystack", async (req, res) => {
  if (!verifyPaystackSignature(req)) {
    return res.status(401).json({ ok: false });
  }

  const event = req.body?.event;
  const data = req.body?.data || {};

  if (event !== "charge.success") {
    return res.status(200).json({ ok: true });
  }

  // Paystack amount is in minor units (divide by 100)
  const providerReference = data.reference;
  const amount = Number(data.amount || 0) / 100;
  const userId = data.metadata?.user_id;
  const tierAtDeposit = Number(data.metadata?.tier || 1);

  if (!providerReference || !userId || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ ok: false, error: "invalid payload" });
  }

  if (hasSupabase()) {
    try {
      const sb = await getSupabase();

      const { data: depRow, error: depErr } = await sb
        .from("deposits")
        .select("deposit_id,status")
        .eq("provider_reference", providerReference)
        .maybeSingle();
      if (depErr) throw depErr;
      if (depRow?.status === "success") {
        return res.status(200).json({ ok: true });
      }

      const { data: upserted, error: upsertErr } = await sb
        .from("deposits")
        .upsert(
          {
            user_id: userId,
            amount,
            tier_at_deposit: tierAtDeposit,
            status: "success",
            provider: "Paystack",
            provider_reference: providerReference,
            created_at: new Date().toISOString(),
            confirmed_at: new Date().toISOString()
          },
          { onConflict: "provider_reference" }
        )
        .select("deposit_id,status")
        .maybeSingle();
      if (upsertErr) throw upsertErr;
      const depositId = upserted?.deposit_id || depRow?.deposit_id || null;

      const { error: depTxErr } = await sb.rpc("apply_wallet_tx", {
        p_user_id: userId,
        p_type: "deposit",
        p_amount: amount,
        p_related_id: null,
        p_reference: `dep:${providerReference}`
      });
      if (depTxErr) throw depTxErr;

      const { data: refRow, error: refErr } = await sb
        .from("users")
        .select("referrer_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (refErr) throw refErr;
      const referrerId = refRow?.referrer_id;
      if (referrerId) {
        const commission = Number((amount * 0.1).toFixed(2));
        const { error: refInsErr } = await sb
          .from("referrals")
          .insert({
            referrer_id: referrerId,
            referred_user_id: userId,
            deposit_id: depositId,
            commission_amount: commission,
            created_at: new Date().toISOString()
          });
        if (refInsErr) throw refInsErr;
        const { error: refTxErr } = await sb.rpc("apply_wallet_tx", {
          p_user_id: referrerId,
          p_type: "referral",
          p_amount: commission,
          p_related_id: null,
          p_reference: `ref:${providerReference}`
        });
        if (refTxErr) throw refTxErr;
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ ok: false });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Idempotency: lock on provider_reference
    const dep = await client.query(
      "SELECT deposit_id, status FROM deposits WHERE provider_reference = $1 FOR UPDATE",
      [providerReference]
    );

    if (dep.rowCount > 0 && dep.rows[0].status === "success") {
      await client.query("COMMIT");
      return res.status(200).json({ ok: true });
    }

    if (dep.rowCount === 0) {
      await client.query(
        "INSERT INTO deposits (user_id, amount, tier_at_deposit, status, provider, provider_reference, created_at, confirmed_at) VALUES ($1,$2,$3,'success','Paystack',$4,now(),now())",
        [userId, amount, tierAtDeposit, providerReference]
      );
    } else {
      await client.query(
        "UPDATE deposits SET status = 'success', confirmed_at = now() WHERE provider_reference = $1",
        [providerReference]
      );
    }

    // Credit wallet ledger (idempotent by reference)
    await client.query(
      "SELECT apply_wallet_tx($1, 'deposit', $2, NULL, $3)",
      [userId, amount, `dep:${providerReference}`]
    );

    // Referral commission (10% direct referrer)
    const ref = await client.query(
      "SELECT referrer_id FROM users WHERE user_id = $1",
      [userId]
    );

    const referrerId = ref.rows[0]?.referrer_id;
    if (referrerId) {
      const commission = Number((amount * 0.10).toFixed(2));
      await client.query(
        "INSERT INTO referrals (referrer_id, referred_user_id, deposit_id, commission_amount, created_at) VALUES ($1,$2,(SELECT deposit_id FROM deposits WHERE provider_reference=$3),$4,now())",
        [referrerId, userId, providerReference, commission]
      );

      await client.query(
        "SELECT apply_wallet_tx($1, 'referral', $2, NULL, $3)",
        [referrerId, commission, `ref:${providerReference}`]
      );
    }

    await client.query("COMMIT");
    return res.status(200).json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ ok: false });
  } finally {
    client.release();
  }
});

module.exports = app;
