import crypto from "node:crypto";
import {
  amountMatches,
  applyDepositSuccess,
  fetchPaymentByReference,
  getSupabaseAdmin,
  isSupabaseConfigured,
  patchPaymentRecord,
  updatePaymentRecordsStatus
} from "../../../lib/api/payment-common.js";
import { applyApiSecurity, readClientIp } from "../../../lib/api/http-security.js";
import {
  isMpesaConfigured,
  mapMpesaResultCodeToStatus,
  parseMpesaCallbackMetadata,
  verifyMpesaCallbackSignature
} from "../../../lib/payments/index.js";

const clean = (value) => String(value || "").trim();
const secureEqual = (a, b) => {
  const left = String(a || "");
  const right = String(b || "");
  if (!left || !right) return false;
  const aBuf = Buffer.from(left);
  const bBuf = Buffer.from(right);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

const safeBody = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const parseCallbackEnvelope = (body) => {
  const source = safeBody(body);
  const bodyCallback = safeBody(source?.Body?.stkCallback);
  const directCallback = safeBody(source?.stkCallback);
  const callback = Object.keys(bodyCallback).length
    ? bodyCallback
    : Object.keys(directCallback).length
      ? directCallback
      : safeBody(source);

  const resultCodeRaw = callback?.ResultCode;
  const resultCode =
    resultCodeRaw !== undefined && resultCodeRaw !== null && String(resultCodeRaw).trim() !== ""
      ? Number(resultCodeRaw)
      : null;

  return {
    callback,
    checkoutRequestId: clean(callback?.CheckoutRequestID),
    merchantRequestId: clean(callback?.MerchantRequestID),
    resultCode,
    resultDesc: clean(callback?.ResultDesc)
  };
};

const readHeader = (req, key) => {
  const value = req.headers?.[key];
  return Array.isArray(value) ? clean(value[0]) : clean(value);
};

const safeInsert = async (supabaseAdmin, table, payload) => {
  try {
    await supabaseAdmin.from(table).insert(payload);
  } catch (_e) {
    // Telemetry tables are optional in some environments.
  }
};

export default async function handler(req, res) {
  const security = applyApiSecurity(req, res, { methods: ["POST", "OPTIONS", "GET"] });
  if (!security.ok) {
    return res.status(403).json({ error: security.error || "forbidden" });
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(204).end();
  }
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, provider: "mpesa_daraja", endpoint: "callback" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(500).json({ error: "supabase not configured" });
  }
  if (!isMpesaConfigured()) {
    return res.status(500).json({ error: "mpesa daraja not configured" });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const body = safeBody(req.body);
  const { callback, checkoutRequestId, merchantRequestId, resultCode, resultDesc } =
    parseCallbackEnvelope(body);
  const reference = clean(req.query?.reference || req.query?.ref || "");
  const callbackToken = clean(req.query?.token || req.query?.callback_token || "");

  if (!reference && !checkoutRequestId) {
    return res.status(400).json({ error: "reference or checkout id required" });
  }

  const stkQuery = supabaseAdmin
    .from("mpesa_stk_requests")
    .select("id,reference,user_id,amount,checkout_request_id,merchant_request_id,callback_token,status")
    .limit(1);
  const { data: stkRow, error: stkErr } = reference
    ? await stkQuery.eq("reference", reference).maybeSingle()
    : await stkQuery.eq("checkout_request_id", checkoutRequestId).maybeSingle();

  if (stkErr || !stkRow) {
    await safeInsert(supabaseAdmin, "payment_flags", {
      provider: "mpesa_daraja",
      source: "webhook",
      reason: "mpesa_tracking_not_found",
      merchant_reference: reference || checkoutRequestId || null,
      tracking_id: checkoutRequestId || merchantRequestId || null,
      payload: body,
      status: "open"
    });
    return res.status(404).json({ error: "payment tracking not found" });
  }

  if (!callbackToken || !secureEqual(callbackToken, clean(stkRow.callback_token))) {
    await safeInsert(supabaseAdmin, "payment_flags", {
      provider: "mpesa_daraja",
      source: "webhook",
      reason: "mpesa_callback_token_invalid",
      merchant_reference: stkRow.reference,
      tracking_id: checkoutRequestId || merchantRequestId || null,
      payload: {
        queryTokenPresent: Boolean(callbackToken),
        checkoutRequestId
      },
      status: "open"
    });
    return res.status(401).json({ error: "invalid callback token" });
  }

  const signature =
    readHeader(req, "x-mpesa-signature") ||
    readHeader(req, "x-signature") ||
    readHeader(req, "x-callback-signature");
  const signatureCheck = verifyMpesaCallbackSignature(body, signature);
  if (!signatureCheck.ok) {
    return res.status(401).json({ error: signatureCheck.reason || "invalid callback signature" });
  }

  const paymentReference = clean(stkRow.reference || reference);
  const paymentLookup = await fetchPaymentByReference(supabaseAdmin, paymentReference);
  if (paymentLookup.error || !paymentLookup.row) {
    return res.status(404).json({ error: paymentLookup.error || "payment not found" });
  }
  const paymentRow = paymentLookup.row;

  const metadata = parseMpesaCallbackMetadata(callback);
  const status = mapMpesaResultCodeToStatus(resultCode);
  const nowIso = new Date().toISOString();

  await supabaseAdmin
    .from("mpesa_stk_requests")
    .update({
      checkout_request_id: checkoutRequestId || clean(stkRow.checkout_request_id) || null,
      merchant_request_id: merchantRequestId || clean(stkRow.merchant_request_id) || null,
      result_code: Number.isFinite(resultCode) ? resultCode : null,
      result_desc: resultDesc || null,
      status,
      receipt_number: metadata.receipt || null,
      callback_payload: body,
      callback_received_at: nowIso,
      phone_number: metadata.phoneNumber || null,
      completed_at: status === "pending" ? null : nowIso,
      updated_at: nowIso
    })
    .eq("reference", paymentReference);

  const expectedAmount = Number(paymentRow?.amount);
  const providerAmount = Number(metadata?.amount);
  const amountMismatch =
    status === "success" &&
    Number.isFinite(expectedAmount) &&
    Number.isFinite(providerAmount) &&
    !amountMatches(expectedAmount, providerAmount);

  if (amountMismatch) {
    await updatePaymentRecordsStatus(supabaseAdmin, { reference: paymentReference, status: "failed" });
    await safeInsert(supabaseAdmin, "payment_flags", {
      provider: "mpesa_daraja",
      source: "webhook",
      reason: "amount_mismatch",
      merchant_reference: paymentReference,
      tracking_id: checkoutRequestId || merchantRequestId || null,
      expected_amount: expectedAmount,
      provider_amount: providerAmount,
      currency: "KES",
      payload: body,
      status: "open"
    });
    return res.status(409).json({
      error: "payment amount mismatch",
      reference: paymentReference,
      expected_amount: expectedAmount,
      provider_amount: providerAmount
    });
  }

  if (status === "success") {
    const applied = await applyDepositSuccess(supabaseAdmin, paymentReference);
    if (!applied.ok) {
      return res.status(500).json({ error: applied.error || "failed to confirm payment" });
    }
    await updatePaymentRecordsStatus(supabaseAdmin, {
      reference: paymentReference,
      status: "success",
      confirmedAt: nowIso
    });
  } else if (status === "failed") {
    await updatePaymentRecordsStatus(supabaseAdmin, {
      reference: paymentReference,
      status: "failed",
      confirmedAt: nowIso
    });
  }

  await patchPaymentRecord(supabaseAdmin, {
    reference: paymentReference,
    patch: {
      provider_transaction_id: checkoutRequestId || merchantRequestId || null,
      mpesa_receipt: metadata.receipt || null,
      callback_received_at: nowIso,
      phone_number: metadata.phoneNumber || null
    }
  });

  await safeInsert(supabaseAdmin, "payment_audit_events", {
    provider: "mpesa_daraja",
    source: "webhook",
    tracking_id: checkoutRequestId || merchantRequestId || null,
    merchant_reference: paymentReference,
    decision: status === "success" ? "success" : status === "failed" ? "failed" : "pending",
    expected_amount: Number.isFinite(expectedAmount) ? expectedAmount : null,
    provider_amount: Number.isFinite(providerAmount) ? providerAmount : null,
    currency: "KES",
    ip: readClientIp(req) || null,
    user_agent: String(req.headers["user-agent"] || "").slice(0, 512),
    payload: body
  });

  return res.status(200).json({
    ResultCode: 0,
    ResultDesc: "Accepted",
    reference: paymentReference,
    status
  });
}
