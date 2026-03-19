const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const webhookApp = require("./pesapal-webhook");
const {
  isKoraConfigured,
  getIpnId,
  submitOrder,
  getTransactionStatus
} = require("./pesapal");

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

const getBearerToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  if (!header) return "";
  return header.startsWith("Bearer ") ? header.slice(7) : header;
};

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

app.post("/api/v1/payout/auto-complete", async (req, res) => {
  try {
    const withdrawalsMode = String(
      process.env.WITHDRAWALS_MODE || process.env.VITE_WITHDRAWALS_MODE || "auto"
    ).toLowerCase();
    if (withdrawalsMode !== "auto") {
      return res.status(403).json({ error: "auto payouts are disabled" });
    }
    if (!hasSupabase()) {
      return res.status(500).json({ error: "supabase not configured" });
    }
    const payoutId = String(req.body?.payout_id || req.body?.payoutId || "").trim();
    if (!payoutId) {
      return res.status(400).json({ error: "payout_id required" });
    }
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const sb = await getSupabase();
    const { data: authData, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !authData?.user?.id) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const userId = authData.user.id;

    const { data: payoutRow, error: payoutErr } = await sb
      .from("payout_requests")
      .select("payout_id,user_id,status")
      .eq("payout_id", payoutId)
      .maybeSingle();
    if (payoutErr || !payoutRow) {
      return res.status(404).json({ error: "payout request not found" });
    }
    if (payoutRow.user_id !== userId) {
      return res.status(403).json({ error: "forbidden" });
    }

    const currentStatus = String(payoutRow.status || "").toLowerCase();
    if (currentStatus === "completed") {
      return res.status(200).json({ ok: true, payout_id: payoutId, status: "completed" });
    }
    if (currentStatus === "failed") {
      return res.status(409).json({ error: "payout request already failed" });
    }

    const { error: updateErr } = await sb
      .from("payout_requests")
      .update({ status: "completed", processed_at: new Date().toISOString() })
      .eq("payout_id", payoutId);
    if (updateErr) throw updateErr;

    return res.status(200).json({ ok: true, payout_id: payoutId, status: "completed" });
  } catch (err) {
    console.error(err);
    const detail =
      process.env.NODE_ENV === "production"
        ? undefined
        : String(err?.message || err);
    return res.status(500).json({ error: "server error", detail });
  }
});

app.post("/api/v1/deposit/create", async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    const email = String(req.body?.email || "").trim();
    const userId = String(req.body?.user_id || "").trim();
    const tier = Number(req.body?.tier || 1);
    const method = String(req.body?.method || "Kora");
    const currency = String(req.body?.currency || "KES");
    const phone = String(req.body?.phone || "").trim();
    const name = String(req.body?.name || "").trim();
    const manualMode = String(process.env.PAYMENTS_MODE || "").toLowerCase() === "manual";
    const manualRequested = ["manual", "true", "1"].includes(
      String(req.body?.payment_mode || req.body?.mode || "").toLowerCase()
    );
    const mockKora = ["1", "true", "yes", "on"].includes(
      String(process.env.KORA_MOCK || process.env.PESAPAL_MOCK || "").toLowerCase()
    );
    const callbackUrl =
      process.env.KORA_CALLBACK_URL ||
      process.env.PESAPAL_CALLBACK_URL ||
      (mockKora ? process.env.KORA_MOCK_REDIRECT_URL || "http://localhost:5000/" : "");

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "invalid amount" });
    }
    if (!email || !userId) {
      return res.status(400).json({ error: "email and user_id required" });
    }

    const reference = `ep_${crypto.randomUUID().replace(/-/g, "")}`;

    if (manualMode || manualRequested) {
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
              provider: "Manual",
              provider_reference: reference,
              created_at: new Date().toISOString()
            },
            { onConflict: "provider_reference" }
          );
        if (error) throw error;
      } else {
        await pool.query(
          "INSERT INTO deposits (user_id, amount, tier_at_deposit, status, provider, provider_reference, created_at) VALUES ($1,$2,$3,'pending','Manual',$4,now()) ON CONFLICT (provider_reference) DO NOTHING",
          [userId, amount, tier, reference]
        );
      }
      return res.status(200).json({
        manual: true,
        reference,
        message: "Deposit request submitted for manual confirmation."
      });
    }

    if (!isKoraConfigured()) {
      return res
        .status(500)
        .json({ error: "KORA_SECRET_KEY not set" });
    }
    if (!callbackUrl) {
      return res.status(500).json({ error: "KORA_CALLBACK_URL not set" });
    }

    const ipnId = await getIpnId();
    if (!ipnId) {
      return res.status(500).json({ error: "KORA_WEBHOOK_URL not set" });
    }

    const billingAddress = {
      email_address: email
    };
    if (phone) billingAddress.phone_number = phone;
    if (name) {
      const parts = name.split(" ").filter(Boolean);
      billingAddress.first_name = parts[0] || name;
      if (parts.length > 1) billingAddress.last_name = parts.slice(1).join(" ");
    }

    const description = `Tier ${tier} deposit via ${method}`;
    const submitRes = await submitOrder({
      reference,
      amount: Number(amount.toFixed(2)),
      currency,
      description,
      callbackUrl,
      notificationId: ipnId,
      billingAddress,
      redirectMode: "TOP_WINDOW"
    });
    const authUrl = submitRes?.redirect_url || submitRes?.redirectUrl || null;
    const orderTrackingId =
      submitRes?.order_tracking_id || submitRes?.orderTrackingId || null;
    const merchantReference =
      submitRes?.merchant_reference || submitRes?.merchantReference || reference;
    if (!authUrl) {
      return res.status(400).json({ error: "Kora did not return a checkout URL." });
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
            provider: "Kora",
            provider_reference: reference,
            created_at: new Date().toISOString()
          },
          { onConflict: "provider_reference" }
        );
      if (error) throw error;
    } else {
      await pool.query(
        "INSERT INTO deposits (user_id, amount, tier_at_deposit, status, provider, provider_reference, created_at) VALUES ($1,$2,$3,'pending','Kora',$4,now()) ON CONFLICT (provider_reference) DO NOTHING",
        [userId, amount, tier, reference]
      );
    }

    return res.status(200).json({
      authorization_url: authUrl,
      reference: merchantReference,
      merchant_reference: merchantReference,
      order_tracking_id: orderTrackingId
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
    const manualMode = String(process.env.PAYMENTS_MODE || "").toLowerCase() === "manual";
    if (manualMode) {
      return res.status(400).json({ error: "manual payments enabled" });
    }
    const trackingId = String(
      req.query?.tracking_id ||
        req.query?.orderTrackingId ||
        req.query?.OrderTrackingId ||
        req.query?.reference ||
        req.query?.merchant_reference ||
        ""
    ).trim();
    const merchantReference = String(
      req.query?.merchant_reference ||
        req.query?.orderMerchantReference ||
        req.query?.OrderMerchantReference ||
        req.query?.reference ||
        ""
    ).trim();

    if (!trackingId) {
      return res.status(400).json({ error: "orderTrackingId required" });
    }
    if (!isKoraConfigured()) {
      return res
        .status(500)
        .json({ error: "KORA_SECRET_KEY not set" });
    }

    const statusPayload = await getTransactionStatus(trackingId);
    const statusCode = Number(
      statusPayload?.status_code ?? statusPayload?.payment_status_code ?? NaN
    );
    const statusDesc = String(
      statusPayload?.payment_status_description ||
        statusPayload?.payment_status ||
        statusPayload?.status ||
        ""
    ).toLowerCase();
    const isSuccess = Number.isFinite(statusCode)
      ? statusCode === 1
      : statusDesc === "completed" || statusDesc === "complete" || statusDesc === "success";

    if (!isSuccess) {
      return res.status(200).json({ status: statusDesc || "pending" });
    }

    const refFromStatus =
      statusPayload?.merchant_reference ||
      statusPayload?.merchantReference ||
      merchantReference;
    if (!refFromStatus) {
      return res.status(400).json({ error: "merchant reference required" });
    }

    let amount = Number(statusPayload?.amount || 0);
    let userId = null;
    let tierAtDeposit = null;

    if (hasSupabase()) {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from("deposits")
        .select("user_id,amount,tier_at_deposit")
        .eq("provider_reference", refFromStatus)
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: "deposit not found" });
      userId = data.user_id;
      tierAtDeposit = data.tier_at_deposit;
      if (!Number.isFinite(amount) || amount <= 0) amount = Number(data.amount || 0);
    } else {
      const result = await pool.query(
        "SELECT user_id, amount, tier_at_deposit FROM deposits WHERE provider_reference = $1 LIMIT 1",
        [refFromStatus]
      );
      if (!result?.rows?.length) return res.status(404).json({ error: "deposit not found" });
      userId = result.rows[0].user_id;
      tierAtDeposit = result.rows[0].tier_at_deposit;
      if (!Number.isFinite(amount) || amount <= 0) amount = Number(result.rows[0].amount || 0);
    }

    await applyDepositSuccess({
      providerReference: refFromStatus,
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
