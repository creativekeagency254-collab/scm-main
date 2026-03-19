// Kora webhook handler (Node/Express) with idempotency + wallet ledger update
// Env: KORA_SECRET_KEY, DATABASE_URL

const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const dotenv = require("dotenv");
const { getTransactionStatus } = require("./pesapal");

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

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function isSuccessfulStatus(payload, eventName = "") {
  const code = Number(payload?.status_code ?? payload?.payment_status_code ?? NaN);
  const desc = String(
    payload?.payment_status_description ||
      payload?.payment_status ||
      payload?.transaction_status ||
      payload?.status ||
      ""
  ).toLowerCase();
  const evt = String(eventName || "").toLowerCase();
  if (Number.isFinite(code)) return code === 1;
  if (evt === "charge.success") return true;
  return desc === "completed" || desc === "complete" || desc === "success";
}

function pickParam(obj, keys) {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null && obj?.[k] !== "") {
      return obj[k];
    }
  }
  return "";
}

async function loadDepositRow(providerReference) {
  if (!providerReference) return null;
  if (hasSupabase()) {
    const sb = await getSupabase();
    const { data, error } = await sb
      .from("deposits")
      .select("deposit_id,status,user_id,amount,tier_at_deposit")
      .eq("provider_reference", providerReference)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }
  const result = await pool.query(
    "SELECT deposit_id,status,user_id,amount,tier_at_deposit FROM deposits WHERE provider_reference = $1 LIMIT 1",
    [providerReference]
  );
  return result?.rows?.[0] || null;
}

async function markDepositFailed(providerReference) {
  if (!providerReference) return;
  if (hasSupabase()) {
    const sb = await getSupabase();
    await sb
      .from("deposits")
      .update({ status: "failed" })
      .eq("provider_reference", providerReference);
    return;
  }
  await pool.query(
    "UPDATE deposits SET status = 'failed' WHERE provider_reference = $1",
    [providerReference]
  );
}

async function applyDepositSuccess({ providerReference, amount, userId, tierAtDeposit }) {
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
          provider: "Kora",
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
        "INSERT INTO deposits (user_id, amount, tier_at_deposit, status, provider, provider_reference, created_at, confirmed_at) VALUES ($1,$2,$3,'success','Kora',$4,now(),now())",
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

app.all(["/api/v1/webhook/kora", "/api/v1/webhook/pesapal"], async (req, res) => {
  const params = { ...(req.query || {}), ...(req.body || {}) };
  const eventName = pickParam(params, ["event", "type", "event_type"]);
  const dataPayload =
    params?.data && typeof params.data === "object"
      ? params.data
      : {};
  const orderTrackingId = pickParam(params, [
    "OrderTrackingId",
    "orderTrackingId",
    "order_tracking_id",
    "tracking_id",
    "reference"
  ]) || pickParam(dataPayload, ["reference"]);
  const merchantReference = pickParam(params, [
    "OrderMerchantReference",
    "orderMerchantReference",
    "merchant_reference",
    "reference"
  ]) || pickParam(dataPayload, ["reference"]);

  if (!orderTrackingId) {
    return res.status(400).json({ ok: false, error: "OrderTrackingId required" });
  }

  try {
    const statusPayload = await getTransactionStatus(orderTrackingId);
    const success = isSuccessfulStatus(statusPayload, eventName);
    const amountFromStatus = Number(statusPayload?.amount || 0);
    const refFromStatus =
      statusPayload?.merchant_reference || statusPayload?.merchantReference || merchantReference;

    if (!refFromStatus) {
      return res.status(400).json({ ok: false, error: "merchant reference required" });
    }

    const depRow = await loadDepositRow(refFromStatus);
    const userId = depRow?.user_id || null;
    const tierAtDeposit = depRow?.tier_at_deposit || 1;
    const amount =
      Number.isFinite(amountFromStatus) && amountFromStatus > 0
        ? amountFromStatus
        : Number(depRow?.amount || 0);

    if (success) {
      if (!userId) {
        return res.status(200).json({ ok: true });
      }
      await applyDepositSuccess({
        providerReference: refFromStatus,
        amount,
        userId,
        tierAtDeposit
      });
    } else {
      await markDepositFailed(refFromStatus);
    }

    return res.status(200).json({
      orderNotificationType: "IPNCHANGE",
      orderTrackingId,
      orderMerchantReference: refFromStatus,
      status: 200
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false });
  }
});

module.exports = app;
