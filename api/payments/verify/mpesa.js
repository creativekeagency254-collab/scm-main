import {
  applyDepositSuccess,
  fetchDepositByReference,
  fetchPaymentByReference,
  getAuthUser,
  getSupabaseAdmin,
  isAdminUser,
  isSafeReference,
  isSupabaseConfigured,
  patchPaymentRecord,
  sanitizePlanId,
  updatePaymentRecordsStatus
} from "../../../lib/api/payment-common.js";
import { applyApiSecurity, readClientIp } from "../../../lib/api/http-security.js";
import { checkRateLimit } from "../../../lib/api/rate-limit.js";
import { queryMpesaStkPush } from "../../../lib/payments/index.js";

const clean = (value) => String(value || "").trim();

const readReference = (req) =>
  clean(req.query?.reference || req.query?.merchant_reference || req.body?.reference || "");

const readPlanId = (req) =>
  sanitizePlanId(req.query?.planId || req.query?.plan_id || req.body?.planId || req.body?.plan_id);

export default async function handler(req, res) {
  const security = applyApiSecurity(req, res, { methods: ["GET", "POST", "OPTIONS"] });
  if (!security.ok) {
    return res.status(403).json({ error: security.error || "forbidden" });
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(204).end();
  }

  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const { user, error: authError } = await getAuthUser(supabaseAdmin, req);
  if (authError || !user?.id) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const rateKey = `mpesa-verify:${user.id}:${readClientIp(req) || "unknown"}`;
  const rate = checkRateLimit(rateKey, { windowMs: 60_000, max: 50 });
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(Math.max(Math.ceil(rate.retryAfterMs / 1000), 1)));
    return res.status(429).json({ error: "too many requests" });
  }

  const reference = readReference(req);
  if (!reference) return res.status(400).json({ error: "reference required" });
  if (!isSafeReference(reference)) return res.status(400).json({ error: "invalid reference" });

  const [paymentLookup, depositLookup, adminAccess, stkLookup] = await Promise.all([
    fetchPaymentByReference(supabaseAdmin, reference),
    fetchDepositByReference(supabaseAdmin, reference),
    isAdminUser(supabaseAdmin, user.id),
    supabaseAdmin
      .from("mpesa_stk_requests")
      .select("reference,checkout_request_id,merchant_request_id,status,result_code,result_desc,updated_at")
      .eq("reference", reference)
      .maybeSingle()
  ]);

  if (paymentLookup.error) return res.status(500).json({ error: paymentLookup.error });
  if (depositLookup.error) return res.status(500).json({ error: depositLookup.error });

  const paymentRow = paymentLookup.row;
  const depositRow = depositLookup.row;
  if (!paymentRow || !depositRow) {
    return res.status(404).json({ error: "payment not found" });
  }

  if (!adminAccess && String(paymentRow.user_id || "") !== String(user.id)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const expectedPlan = sanitizePlanId(paymentRow.plan_id || depositRow.tier_at_deposit);
  if (!expectedPlan) {
    return res.status(409).json({ error: "invalid stored plan" });
  }
  const queryPlan = readPlanId(req);
  if (queryPlan && queryPlan !== expectedPlan) {
    return res.status(409).json({ error: "plan mismatch" });
  }

  const normalizedStatus = clean(paymentRow.status).toLowerCase();
  if (normalizedStatus === "success" || normalizedStatus === "failed") {
    return res.status(200).json({
      status: normalizedStatus,
      reference,
      provider: "mpesa",
      provider_code: "mpesa_daraja",
      checkout_request_id: clean(paymentRow.provider_transaction_id),
      result_code: stkLookup?.data?.result_code ?? null,
      result_desc: clean(stkLookup?.data?.result_desc || ""),
      environment: clean(paymentRow.environment || "")
    });
  }

  const stkRow = stkLookup?.data || null;
  const checkoutRequestId = clean(stkRow?.checkout_request_id || paymentRow.provider_transaction_id);
  if (!checkoutRequestId) {
    return res.status(200).json({
      status: "pending",
      reference,
      provider: "mpesa",
      provider_code: "mpesa_daraja",
      environment: clean(paymentRow.environment || "")
    });
  }

  try {
    const providerStatus = await queryMpesaStkPush({ checkoutRequestId });
    const nowIso = new Date().toISOString();

    await supabaseAdmin
      .from("mpesa_stk_requests")
      .update({
        status: providerStatus.status,
        result_code: providerStatus.resultCode,
        result_desc: providerStatus.resultDesc || null,
        checkout_request_id: providerStatus.checkoutRequestId || checkoutRequestId,
        merchant_request_id: providerStatus.merchantRequestId || clean(stkRow?.merchant_request_id) || null,
        query_payload: providerStatus.raw || {},
        completed_at: providerStatus.status === "pending" ? null : nowIso,
        updated_at: nowIso
      })
      .eq("reference", reference);

    if (providerStatus.status === "success") {
      const applied = await applyDepositSuccess(supabaseAdmin, reference);
      if (!applied.ok) {
        return res.status(500).json({ error: applied.error || "failed to confirm payment" });
      }
      await updatePaymentRecordsStatus(supabaseAdmin, {
        reference,
        status: "success",
        confirmedAt: nowIso
      });
      await patchPaymentRecord(supabaseAdmin, {
        reference,
        patch: {
          provider_transaction_id: providerStatus.checkoutRequestId || checkoutRequestId
        }
      });
      return res.status(200).json({
        status: "success",
        reference,
        provider: "mpesa",
        provider_code: "mpesa_daraja",
        checkout_request_id: providerStatus.checkoutRequestId || checkoutRequestId,
        result_code: providerStatus.resultCode,
        result_desc: providerStatus.resultDesc || "",
        environment: clean(paymentRow.environment || "")
      });
    }

    if (providerStatus.status === "failed") {
      await updatePaymentRecordsStatus(supabaseAdmin, {
        reference,
        status: "failed",
        confirmedAt: nowIso
      });
      return res.status(200).json({
        status: "failed",
        reference,
        provider: "mpesa",
        provider_code: "mpesa_daraja",
        checkout_request_id: providerStatus.checkoutRequestId || checkoutRequestId,
        result_code: providerStatus.resultCode,
        result_desc: providerStatus.resultDesc || "",
        environment: clean(paymentRow.environment || "")
      });
    }

    return res.status(200).json({
      status: "pending",
      reference,
      provider: "mpesa",
      provider_code: "mpesa_daraja",
      checkout_request_id: providerStatus.checkoutRequestId || checkoutRequestId,
      result_code: providerStatus.resultCode,
      result_desc: providerStatus.resultDesc || "",
      environment: clean(paymentRow.environment || "")
    });
  } catch (err) {
    return res.status(502).json({
      error: String(err?.message || "failed to verify mpesa payment").slice(0, 240)
    });
  }
}

