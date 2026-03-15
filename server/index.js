const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const webhookApp = require("./paystack-webhook");

const app = express();
const port = process.env.PORT || 8787;

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

const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
const paystackBase = process.env.PAYSTACK_BASE_URL || "https://api.paystack.co";
const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || undefined;
const paystackMock = String(process.env.PAYSTACK_MOCK || "").toLowerCase() === "1";

async function applyPaystackSuccess({ providerReference, amount, userId, tierAtDeposit }) {
  if (!providerReference || !userId || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("invalid deposit payload");
  }
  const tierVal = Number.isFinite(Number(tierAtDeposit)) ? Number(tierAtDeposit) : 1;

  if (hasSupabase()) {
    const sb = await getSupabase();
    const { data: depRow, error: depErr } = await sb
      .from("deposits")
      .select("deposit_id,status")
      .eq("provider_reference", providerReference)
      .maybeSingle();
    if (depErr) throw depErr;
    if (depRow?.status === "success") {
      return { status: "success", already: true };
    }

    const { data: upserted, error: upsertErr } = await sb
      .from("deposits")
      .upsert(
        {
          user_id: userId,
          amount,
          tier_at_deposit: tierVal,
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
      let hasReferral = false;
      if (depositId) {
        const { data: existingRef, error: existingErr } = await sb
          .from("referrals")
          .select("ref_id")
          .eq("deposit_id", depositId)
          .maybeSingle();
        if (existingErr) throw existingErr;
        hasReferral = !!existingRef;
      }
      if (!hasReferral) {
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
    }

    return { status: "success", already: false };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const dep = await client.query(
      "SELECT deposit_id, status FROM deposits WHERE provider_reference = $1 FOR UPDATE",
      [providerReference]
    );
    if (dep.rowCount > 0 && dep.rows[0].status === "success") {
      await client.query("COMMIT");
      return { status: "success", already: true };
    }
    if (dep.rowCount === 0) {
      await client.query(
        "INSERT INTO deposits (user_id, amount, tier_at_deposit, status, provider, provider_reference, created_at, confirmed_at) VALUES ($1,$2,$3,'success','Paystack',$4,now(),now())",
        [userId, amount, tierVal, providerReference]
      );
    } else {
      await client.query(
        "UPDATE deposits SET status = 'success', confirmed_at = now() WHERE provider_reference = $1",
        [providerReference]
      );
    }

    await client.query(
      "SELECT apply_wallet_tx($1, 'deposit', $2, NULL, $3)",
      [userId, amount, `dep:${providerReference}`]
    );

    const ref = await client.query(
      "SELECT referrer_id FROM users WHERE user_id = $1",
      [userId]
    );
    const referrerId = ref.rows[0]?.referrer_id;
    if (referrerId) {
      const existingRef = await client.query(
        "SELECT 1 FROM referrals WHERE deposit_id = (SELECT deposit_id FROM deposits WHERE provider_reference = $1)",
        [providerReference]
      );
      if (existingRef.rowCount === 0) {
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
    }

    await client.query("COMMIT");
    return { status: "success", already: false };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Webhook route uses its own raw-body parser
app.use(webhookApp);

app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((v) => v.trim()).filter(Boolean)
      : true,
    credentials: true
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post("/api/v1/deposit/create", async (req, res) => {
  try {
    if (!paystackSecret && !paystackMock) {
      return res.status(500).json({ error: "PAYSTACK_SECRET_KEY not set" });
    }
    const amount = Number(req.body?.amount);
    const email = String(req.body?.email || "").trim();
    const userId = String(req.body?.user_id || "").trim();
    const tier = Number(req.body?.tier || 1);
    const method = String(req.body?.method || "Paystack");
    const currency = String(req.body?.currency || "KES");

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "invalid amount" });
    }
    if (!email || !userId) {
      return res.status(400).json({ error: "email and user_id required" });
    }

    const reference = `ep_${crypto.randomUUID().replace(/-/g, "")}`;

    let authUrl = null;
    if (!paystackMock) {
      const initPayload = {
        email,
        amount: Math.round(amount * 100),
        currency,
        reference,
        metadata: { user_id: userId, tier, method }
      };
      if (callbackUrl) initPayload.callback_url = callbackUrl;

      const psRes = await fetch(`${paystackBase}/transaction/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(initPayload)
      });
      const psJson = await psRes.json().catch(() => ({}));
      if (!psRes.ok || !psJson?.status) {
        return res.status(400).json({ error: psJson?.message || "Paystack init failed" });
      }
      authUrl = psJson?.data?.authorization_url;
    } else {
      authUrl = `https://checkout.paystack.com/mock-${reference}`;
    }

    // Persist pending deposit
    if (hasSupabase()) {
      const sb = await getSupabase();
      const { error } = await sb
        .from("deposits")
        .upsert(
          {
            user_id: userId,
            amount,
            tier_at_deposit: tier,
            status: "pending",
            provider: "Paystack",
            provider_reference: reference,
            created_at: new Date().toISOString()
          },
          { onConflict: "provider_reference" }
        );
      if (error) throw error;
    } else {
      await pool.query(
        "INSERT INTO deposits (user_id, amount, tier_at_deposit, status, provider, provider_reference, created_at) VALUES ($1,$2,$3,'pending','Paystack',$4,now()) ON CONFLICT (provider_reference) DO NOTHING",
        [userId, amount, tier, reference]
      );
    }

    return res.status(200).json({
      authorization_url: authUrl,
      reference
    });
  } catch (err) {
    console.error(err);
    const detail =
      process.env.NODE_ENV === "production"
        ? undefined
        : String(err?.message || err);
    return res.status(500).json({ error: "server error", detail });
  }
});

app.get("/api/v1/deposit/status", async (req, res) => {
  try {
    const reference = String(req.query?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "reference required" });
    if (hasSupabase()) {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from("deposits")
        .select("status, amount, user_id, tier_at_deposit, confirmed_at")
        .eq("provider_reference", reference)
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: "not found" });
      return res.status(200).json(data);
    }
    const result = await pool.query(
      "SELECT status, amount, user_id, tier_at_deposit, confirmed_at FROM deposits WHERE provider_reference = $1 LIMIT 1",
      [reference]
    );
    if (!result?.rows?.length) return res.status(404).json({ error: "not found" });
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    const detail =
      process.env.NODE_ENV === "production"
        ? undefined
        : String(err?.message || err);
    return res.status(500).json({ error: "server error", detail });
  }
});

app.get("/api/v1/deposit/verify", async (req, res) => {
  try {
    const reference = String(req.query?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "reference required" });

    let amount = null;
    let userId = null;
    let tierAtDeposit = null;

    if (paystackMock) {
      if (hasSupabase()) {
        const sb = await getSupabase();
        const { data, error } = await sb
          .from("deposits")
          .select("user_id,amount,tier_at_deposit")
          .eq("provider_reference", reference)
          .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: "not found" });
        amount = Number(data.amount || 0);
        userId = data.user_id;
        tierAtDeposit = data.tier_at_deposit;
      } else {
        const result = await pool.query(
          "SELECT user_id, amount, tier_at_deposit FROM deposits WHERE provider_reference = $1 LIMIT 1",
          [reference]
        );
        if (!result?.rows?.length) return res.status(404).json({ error: "not found" });
        amount = Number(result.rows[0].amount || 0);
        userId = result.rows[0].user_id;
        tierAtDeposit = result.rows[0].tier_at_deposit;
      }
      await applyPaystackSuccess({
        providerReference: reference,
        amount,
        userId,
        tierAtDeposit
      });
      return res.status(200).json({ status: "success", source: "mock" });
    }

    if (!paystackSecret) {
      return res.status(500).json({ error: "PAYSTACK_SECRET_KEY not set" });
    }

    const verifyRes = await fetch(
      `${paystackBase}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${paystackSecret}` }
      }
    );
    const verifyJson = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || !verifyJson?.status) {
      return res
        .status(400)
        .json({ error: verifyJson?.message || "Paystack verify failed" });
    }
    const data = verifyJson?.data || {};
    const status = String(data.status || "").toLowerCase() || "pending";
    if (status !== "success") {
      return res.status(200).json({ status });
    }
    amount = Number(data.amount || 0) / 100;
    userId = data.metadata?.user_id || null;
    tierAtDeposit = Number(data.metadata?.tier || 1);

    if (!userId || !Number.isFinite(amount) || amount <= 0) {
      if (hasSupabase()) {
        const sb = await getSupabase();
        const { data: dep, error } = await sb
          .from("deposits")
          .select("user_id,amount,tier_at_deposit")
          .eq("provider_reference", reference)
          .maybeSingle();
        if (error) throw error;
        if (dep) {
          userId = userId || dep.user_id;
          amount = Number.isFinite(amount) && amount > 0 ? amount : Number(dep.amount || 0);
          tierAtDeposit = tierAtDeposit || dep.tier_at_deposit;
        }
      } else {
        const result = await pool.query(
          "SELECT user_id, amount, tier_at_deposit FROM deposits WHERE provider_reference = $1 LIMIT 1",
          [reference]
        );
        if (result?.rows?.length) {
          userId = userId || result.rows[0].user_id;
          amount = Number.isFinite(amount) && amount > 0 ? amount : Number(result.rows[0].amount || 0);
          tierAtDeposit = tierAtDeposit || result.rows[0].tier_at_deposit;
        }
      }
    }

    await applyPaystackSuccess({
      providerReference: reference,
      amount,
      userId,
      tierAtDeposit
    });

    return res.status(200).json({ status: "success", source: "verify" });
  } catch (err) {
    console.error(err);
    const detail =
      process.env.NODE_ENV === "production"
        ? undefined
        : String(err?.message || err);
    return res.status(500).json({ error: "server error", detail });
  }
});

function startServer(portOverride) {
  const usePort =
    portOverride === undefined || portOverride === null ? port : portOverride;
  return app.listen(usePort, () => {
    console.log(`Server listening on ${usePort}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, pool };
