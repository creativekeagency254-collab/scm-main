// Kora webhook handler (Node/Express) with idempotency + wallet ledger update
// Env: KORA_SECRET_KEY, DATABASE_URL

const express = require("express");
const crypto = require("crypto");
const path = require("path");
const { Pool } = require("pg");
const dotenv = require("dotenv");
const { getTransactionStatus } = require("./pesapal");

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const KORA_WEBHOOK_TOKEN = String(
  process.env.KORA_WEBHOOK_TOKEN || process.env.PESAPAL_WEBHOOK_TOKEN || ""
).trim();
const KORA_WEBHOOK_HMAC_SECRET = String(
  process.env.KORA_WEBHOOK_HMAC_SECRET || process.env.PESAPAL_WEBHOOK_HMAC_SECRET || ""
).trim();
const KORA_WEBHOOK_ENFORCE = ["1", "true", "yes", "on"].includes(
  String(
    process.env.KORA_WEBHOOK_ENFORCE ||
      process.env.PESAPAL_WEBHOOK_ENFORCE ||
      (KORA_WEBHOOK_TOKEN || KORA_WEBHOOK_HMAC_SECRET ? "1" : "0")
  ).toLowerCase()
);
const KORA_WEBHOOK_MAX_SKEW_SECONDS = Math.max(
  0,
  Number(process.env.KORA_WEBHOOK_MAX_SKEW_SECONDS || 300) || 300
);
const KORA_WEBHOOK_REQUIRE_TIMESTAMP = ["1", "true", "yes", "on"].includes(
  String(
    process.env.KORA_WEBHOOK_REQUIRE_TIMESTAMP ||
      process.env.PESAPAL_WEBHOOK_REQUIRE_TIMESTAMP ||
      (KORA_WEBHOOK_HMAC_SECRET ? "1" : "0")
  ).toLowerCase()
);
const KORA_WEBHOOK_REPLAY_ENFORCE = ["1", "true", "yes", "on"].includes(
  String(process.env.KORA_WEBHOOK_REPLAY_ENFORCE || (KORA_WEBHOOK_ENFORCE ? "1" : "0")).toLowerCase()
);
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

const captureRawBody = (req, _res, buf) => {
  if (buf && buf.length > 0) {
    req.rawBody = buf.toString("utf8");
  }
};

app.use(express.json({ verify: captureRawBody }));
app.use(express.urlencoded({ extended: false, verify: captureRawBody }));

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

const toMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Number(n.toFixed(2));
};

const secureEqual = (a, b) => {
  const left = String(a || "");
  const right = String(b || "");
  if (!left || !right) return false;
  const aBuf = Buffer.from(left);
  const bBuf = Buffer.from(right);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

const readHeader = (req, keys) => {
  for (const key of keys) {
    const value = req.headers?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
};

const normalizeSignature = (value) =>
  String(value || "")
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase();

const canonicalPayloadFrom = (req, src) => {
  if (req.method === "GET") {
    const params = new URLSearchParams();
    Object.entries(src || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        params.append(k, typeof v === "string" ? v : JSON.stringify(v));
      });
    return params.toString();
  }
  if (typeof req.rawBody === "string" && req.rawBody) return req.rawBody;
  return JSON.stringify(src || {});
};

const hashPayload = (raw) =>
  crypto.createHash("sha256").update(String(raw || "")).digest("hex");

const verifyWebhookRequest = (req, src) => {
  if (!KORA_WEBHOOK_ENFORCE) {
    return { ok: true, signature: "", payloadHash: hashPayload(canonicalPayloadFrom(req, src)) };
  }

  const token = readHeader(req, ["x-webhook-token", "x-kora-webhook-token"]);
  if (KORA_WEBHOOK_TOKEN && !secureEqual(token, KORA_WEBHOOK_TOKEN)) {
    return { ok: false, reason: "invalid webhook token" };
  }

  const payloadRaw = canonicalPayloadFrom(req, src);
  const payloadHash = hashPayload(payloadRaw);
  const signature = normalizeSignature(
    readHeader(req, ["x-kora-signature", "x-korapay-signature", "x-signature"])
  );
  const timestampRaw = readHeader(req, ["x-webhook-timestamp", "x-kora-timestamp", "x-timestamp"]);

  if (KORA_WEBHOOK_REQUIRE_TIMESTAMP && KORA_WEBHOOK_MAX_SKEW_SECONDS > 0) {
    let timestampMs = Number(timestampRaw);
    if (Number.isFinite(timestampMs) && timestampMs > 0 && timestampMs < 1_000_000_000_000) {
      timestampMs *= 1000;
    }
    if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
      return { ok: false, reason: "missing webhook timestamp" };
    }
    const skewSeconds = Math.abs(Date.now() - timestampMs) / 1000;
    if (skewSeconds > KORA_WEBHOOK_MAX_SKEW_SECONDS) {
      return { ok: false, reason: "stale webhook timestamp" };
    }
  }

  if (KORA_WEBHOOK_HMAC_SECRET) {
    if (!signature) {
      return { ok: false, reason: "missing webhook signature" };
    }
    const expectedWithTs = timestampRaw
      ? crypto
          .createHmac("sha256", KORA_WEBHOOK_HMAC_SECRET)
          .update(`${timestampRaw}.${payloadRaw}`)
          .digest("hex")
      : "";
    const expectedRaw = crypto
      .createHmac("sha256", KORA_WEBHOOK_HMAC_SECRET)
      .update(payloadRaw)
      .digest("hex");
    const valid =
      secureEqual(signature, expectedWithTs) ||
      secureEqual(signature, expectedRaw);
    if (!valid) {
      return { ok: false, reason: "invalid webhook signature" };
    }
  }

  return { ok: true, signature, payloadHash };
};

async function registerWebhookReceipt({
  source,
  trackingId,
  merchantReference,
  signature,
  payloadHash
}) {
  if (!hasSupabase()) return { accepted: true, duplicate: false };
  try {
    const sb = await getSupabase();
    const eventKey = `kora:${source}:${trackingId}:${merchantReference}:${payloadHash}`;
    const { data, error } = await sb.rpc("register_payment_webhook_receipt", {
      p_event_key: eventKey,
      p_provider: "kora",
      p_source: source,
      p_tracking_id: trackingId || null,
      p_merchant_reference: merchantReference || null,
      p_signature: signature || null,
      p_payload_hash: payloadHash || null
    });
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("register_payment_webhook_receipt") || msg.includes("payment_webhook_receipts")) {
        if (KORA_WEBHOOK_REPLAY_ENFORCE) {
          return { accepted: false, duplicate: false, error: "webhook replay protection not configured" };
        }
        return { accepted: true, duplicate: false };
      }
      return { accepted: false, duplicate: false, error: error.message || "receipt registration failed" };
    }
    const inserted = Array.isArray(data) ? Boolean(data[0]) : Boolean(data);
    return { accepted: inserted, duplicate: !inserted };
  } catch (_e) {
    if (KORA_WEBHOOK_REPLAY_ENFORCE) {
      return { accepted: false, duplicate: false, error: "webhook replay registration failed" };
    }
    return { accepted: true, duplicate: false };
  }
}

async function maybeFlagIssue({
  source,
  reason,
  trackingId,
  merchantReference,
  expectedAmount,
  providerAmount,
  currency,
  payload
}) {
  if (!hasSupabase()) return;
  try {
    const sb = await getSupabase();
    await sb.from("payment_flags").insert({
      provider: "kora",
      source,
      reason,
      tracking_id: trackingId || null,
      merchant_reference: merchantReference || null,
      expected_amount: expectedAmount,
      provider_amount: providerAmount,
      currency: currency || null,
      payload: payload && typeof payload === "object" ? payload : {}
    });
  } catch (e) {
    // no-op if table not deployed yet
  }
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
      .eq("provider_reference", providerReference)
      .neq("status", "success");
    return;
  }
  await pool.query(
    "UPDATE deposits SET status = 'failed' WHERE provider_reference = $1 AND status <> 'success'",
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
    const { data, error } = await sb.rpc("confirm_deposit_success", {
      p_provider_reference: providerReference
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { status: "success", already: !!row?.already };
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
      "SELECT referrer_id FROM users WHERE user_id = $1 FOR UPDATE",
      [userId]
    );
    const referrerId = ref.rows[0]?.referrer_id;
    if (referrerId) {
      const priorSuccess = await client.query(
        "SELECT 1 FROM deposits WHERE user_id = $1 AND status = 'success' AND provider_reference <> $2 LIMIT 1",
        [userId, providerReference]
      );
      if (priorSuccess.rowCount === 0) {
        const existingRef = await client.query(
          "SELECT 1 FROM referrals WHERE referred_user_id = $1 AND deposit_id IS NOT NULL LIMIT 1",
          [userId]
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
  const webhookCheck = verifyWebhookRequest(req, params);
  if (!webhookCheck.ok) {
    return res.status(401).json({ ok: false, error: webhookCheck.reason || "unauthorized webhook" });
  }
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
  if (!merchantReference) {
    return res.status(400).json({ ok: false, error: "OrderMerchantReference required" });
  }

  const receipt = await registerWebhookReceipt({
    source: "webhook",
    trackingId: orderTrackingId,
    merchantReference,
    signature: webhookCheck.signature,
    payloadHash: webhookCheck.payloadHash
  });
  if (!receipt.accepted) {
    return res.status(500).json({ ok: false, error: receipt.error || "failed to register webhook receipt" });
  }
  if (receipt.duplicate) {
    return res.status(200).json({
      orderNotificationType: "IPNCHANGE",
      orderTrackingId,
      orderMerchantReference: merchantReference,
      status: 200,
      duplicate: true
    });
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
    const expectedAmount = toMoney(depRow?.amount);
    const providerAmount = toMoney(
      statusPayload?.amount ??
      statusPayload?.data?.amount ??
      statusPayload?.amount_paid ??
      statusPayload?.data?.amount_paid
    );
    const currency = String(statusPayload?.currency || statusPayload?.data?.currency || "").trim().toUpperCase() || null;
    const amount =
      Number.isFinite(amountFromStatus) && amountFromStatus > 0
        ? amountFromStatus
        : Number(depRow?.amount || 0);
    const amountMismatch =
      success &&
      providerAmount !== null &&
      expectedAmount !== null &&
      Math.abs(providerAmount - expectedAmount) > 0.009;

    if (success) {
      if (!userId) {
        await maybeFlagIssue({
          source: "webhook",
          reason: "deposit_not_found",
          trackingId: orderTrackingId,
          merchantReference: refFromStatus,
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        return res.status(200).json({ ok: true });
      }
      if (amountMismatch) {
        await maybeFlagIssue({
          source: "webhook",
          reason: "amount_mismatch",
          trackingId: orderTrackingId,
          merchantReference: refFromStatus,
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        await markDepositFailed(refFromStatus);
        return res.status(409).json({ ok: false, error: "amount mismatch" });
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
