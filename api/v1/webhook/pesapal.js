import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { getTransactionStatus, isKoraConfigured } from "../../lib/pesapal.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

const getAdmin = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

const normalizeStatus = (payload) => {
  const desc = String(
    payload?.payment_status_description ||
      payload?.payment_status ||
      payload?.transaction_status ||
      ""
  ).toLowerCase();
  const codeRaw = payload?.status_code ?? payload?.statusCode;
  const code = Number.isFinite(Number(codeRaw)) ? Number(codeRaw) : null;
  if (code === 1 || desc === "completed") return "success";
  if (code === 2 || code === 0 || code === 3 || ["failed", "invalid", "reversed"].includes(desc)) return "failed";
  return "pending";
};

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

const registerWebhookReceipt = async (
  supabaseAdmin,
  { eventKey, source, trackingId, merchantReference, signature, payloadHash }
) => {
  try {
    const { data, error } = await supabaseAdmin.rpc("register_payment_webhook_receipt", {
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
};

const readClientIp = (req) =>
  String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "")
    .split(",")[0]
    .trim();

const loadDepositRow = async (supabaseAdmin, merchantReference) => {
  if (!merchantReference) return null;
  const { data, error } = await supabaseAdmin
    .from("deposits")
    .select("deposit_id,user_id,amount,status,tier_at_deposit")
    .eq("provider_reference", merchantReference)
    .maybeSingle();
  if (error) return null;
  return data || null;
};

const maybeLogPaymentEvent = async (
  supabaseAdmin,
  { req, source, trackingId, merchantReference, decision, expectedAmount, providerAmount, currency, payload }
) => {
  try {
    await supabaseAdmin.from("payment_audit_events").insert({
      provider: "kora",
      source,
      tracking_id: trackingId || null,
      merchant_reference: merchantReference || null,
      decision,
      expected_amount: expectedAmount,
      provider_amount: providerAmount,
      currency: currency || null,
      ip: readClientIp(req),
      user_agent: String(req.headers["user-agent"] || "").slice(0, 512),
      payload: payload && typeof payload === "object" ? payload : {}
    });
  } catch (e) {
    // Keep payment flow resilient if telemetry table is not deployed yet.
  }
};

const maybeFlagPaymentIssue = async (
  supabaseAdmin,
  { source, reason, trackingId, merchantReference, expectedAmount, providerAmount, currency, payload }
) => {
  try {
    await supabaseAdmin.from("payment_flags").insert({
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
    // Keep payment flow resilient if telemetry table is not deployed yet.
  }
};

const applyDepositSuccess = async (supabaseAdmin, merchantReference) => {
  if (!merchantReference) return { updated: false, reason: "missing_reference" };
  const { data, error } = await supabaseAdmin.rpc("confirm_deposit_success", {
    p_provider_reference: merchantReference
  });
  if (error) return { updated: false, reason: error?.message || "confirm_failed" };
  const row = Array.isArray(data) ? data[0] : data;
  return { updated: true, already: !!row?.already };
};

const applyDepositFailure = async (supabaseAdmin, merchantReference) => {
  if (!merchantReference) return;
  await supabaseAdmin
    .from("deposits")
    .update({ status: "failed" })
    .eq("provider_reference", merchantReference)
    .neq("status", "success");
};

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "supabase not configured" });
  }
  if (!isKoraConfigured()) {
    return res.status(500).json({ error: "Kora is not configured." });
  }

  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const src = req.method === "GET" ? req.query : req.body || {};
  const webhookCheck = verifyWebhookRequest(req, src);
  if (!webhookCheck.ok) {
    return res.status(401).json({ error: webhookCheck.reason || "unauthorized webhook" });
  }

  const trackingId =
    String(
      src?.OrderTrackingId ||
        src?.orderTrackingId ||
        src?.tracking_id ||
        src?.reference ||
        src?.merchant_reference ||
        src?.data?.reference ||
        ""
    ).trim();
  const merchantReference =
    String(
      src?.OrderMerchantReference ||
        src?.orderMerchantReference ||
        src?.merchant_reference ||
        src?.reference ||
        src?.data?.reference ||
        ""
    ).trim();

  if (!trackingId || !merchantReference) {
    return res.status(400).json({ error: "missing tracking_id or merchant_reference" });
  }

  const eventKey = `kora:webhook:${trackingId}:${merchantReference}:${webhookCheck.payloadHash}`;
  const receipt = await registerWebhookReceipt(supabaseAdmin, {
    eventKey,
    source: "webhook",
    trackingId,
    merchantReference,
    signature: webhookCheck.signature,
    payloadHash: webhookCheck.payloadHash
  });
  if (!receipt.accepted) {
    return res.status(500).json({ error: receipt.error || "failed to register webhook receipt" });
  }
  if (receipt.duplicate) {
    return res.status(200).json({
      orderNotificationType: "IPNCHANGE",
      orderTrackingId: trackingId,
      orderMerchantReference: merchantReference,
      status: 200,
      duplicate: true
    });
  }

  try {
    const statusPayload = await getTransactionStatus(trackingId);
    const status = normalizeStatus(statusPayload);
    const providerAmount =
      toMoney(
        statusPayload?.amount ??
          statusPayload?.data?.amount ??
          statusPayload?.amount_paid ??
          statusPayload?.data?.amount_paid
      );
    const currency =
      String(statusPayload?.currency || statusPayload?.data?.currency || "").trim().toUpperCase() || null;
    const depositRow = await loadDepositRow(supabaseAdmin, merchantReference);
    const expectedAmount = toMoney(depositRow?.amount);
    const amountMismatch =
      status === "success" &&
      providerAmount !== null &&
      expectedAmount !== null &&
      Math.abs(providerAmount - expectedAmount) > 0.009;

    if (status === "success") {
      if (!depositRow) {
        await maybeFlagPaymentIssue(supabaseAdmin, {
          source: "webhook",
          reason: "deposit_not_found",
          trackingId,
          merchantReference,
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        await maybeLogPaymentEvent(supabaseAdmin, {
          req,
          source: "webhook",
          trackingId,
          merchantReference,
          decision: "rejected",
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        return res.status(404).json({ error: "deposit not found" });
      }
      if (amountMismatch) {
        await maybeFlagPaymentIssue(supabaseAdmin, {
          source: "webhook",
          reason: "amount_mismatch",
          trackingId,
          merchantReference,
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        await applyDepositFailure(supabaseAdmin, merchantReference);
        await maybeLogPaymentEvent(supabaseAdmin, {
          req,
          source: "webhook",
          trackingId,
          merchantReference,
          decision: "rejected",
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        return res.status(409).json({
          error: "payment amount mismatch",
          expected_amount: expectedAmount,
          provider_amount: providerAmount
        });
      }
      const applied = await applyDepositSuccess(supabaseAdmin, merchantReference);
      if (!applied?.updated) {
        const isMissing = String(applied?.reason || "").toLowerCase().includes("not found");
        await maybeFlagPaymentIssue(supabaseAdmin, {
          source: "webhook",
          reason: applied?.reason || "confirm_failed",
          trackingId,
          merchantReference,
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        await maybeLogPaymentEvent(supabaseAdmin, {
          req,
          source: "webhook",
          trackingId,
          merchantReference,
          decision: "error",
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        return res.status(isMissing ? 404 : 500).json({
          error: applied?.reason || "failed to confirm deposit",
          orderTrackingId: trackingId,
          orderMerchantReference: merchantReference
        });
      }
      await maybeLogPaymentEvent(supabaseAdmin, {
        req,
        source: "webhook",
        trackingId,
        merchantReference,
        decision: "success",
        expectedAmount,
        providerAmount,
        currency,
        payload: statusPayload
      });
    } else if (status === "failed") {
      await applyDepositFailure(supabaseAdmin, merchantReference);
      await maybeLogPaymentEvent(supabaseAdmin, {
        req,
        source: "webhook",
        trackingId,
        merchantReference,
        decision: "failed",
        expectedAmount,
        providerAmount,
        currency,
        payload: statusPayload
      });
    } else {
      await maybeLogPaymentEvent(supabaseAdmin, {
        req,
        source: "webhook",
        trackingId,
        merchantReference,
        decision: "pending",
        expectedAmount,
        providerAmount,
        currency,
        payload: statusPayload
      });
    }
    return res.status(200).json({
      orderNotificationType: "IPNCHANGE",
      orderTrackingId: trackingId,
      orderMerchantReference: merchantReference,
      status: status === "success" ? 200 : status === "failed" ? 400 : 202
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "failed to process IPN" });
  }
}
