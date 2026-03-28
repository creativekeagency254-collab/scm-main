import crypto from "node:crypto";
import {
  buildPublicUrl,
  createPendingPaymentRecords,
  ensureUserIdentity,
  getAuthUser,
  getSupabaseAdmin,
  isSupabaseConfigured,
  isValidEmail,
  newReference,
  normalizeAmount,
  normalizeEmail,
  patchPaymentRecord,
  readBodyObject,
  resolveExpectedKesForCharge,
  sanitizePlanId,
  updatePaymentRecordsStatus
} from "../../../lib/api/payment-common.js";
import {
  applyApiSecurity,
  isSecurePublicUrl,
  readClientIp,
  resolveRuntimeBaseUrl
} from "../../../lib/api/http-security.js";
import { checkRateLimit } from "../../../lib/api/rate-limit.js";
import {
  getMpesaEnvironment,
  initiateMpesaStkPush,
  isMpesaConfigured,
  isMpesaSandbox,
  normalizeMpesaPhone
} from "../../../lib/payments/index.js";

const newCallbackToken = () => crypto.randomBytes(24).toString("hex");
const boolFlag = (value) =>
  ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());

const safeUuidOrNull = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)
    ? raw
    : null;
};

export default async function handler(req, res) {
  const security = applyApiSecurity(req, res, { methods: ["POST", "OPTIONS"] });
  if (!security.ok) {
    return res.status(403).json({ error: security.error || "forbidden" });
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
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

  const { user, error: authError } = await getAuthUser(supabaseAdmin, req);
  if (authError || !user?.id) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const rateKey = `mpesa-initiate:${user.id}:${readClientIp(req) || "unknown"}`;
  const rate = checkRateLimit(rateKey, { windowMs: 60_000, max: 20 });
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(Math.max(Math.ceil(rate.retryAfterMs / 1000), 1)));
    return res.status(429).json({ error: "too many requests" });
  }

  const body = readBodyObject(req);
  const sandboxFallbackEnabled = boolFlag(
    body.allowSandboxFallback ??
      body.allow_sandbox_fallback ??
      body.sandboxFallback ??
      process.env.MPESA_SANDBOX_STK_FALLBACK ??
      "0"
  );
  const planId = sanitizePlanId(body.planId || body.plan_id || body.tier || body.tierId);
  if (!planId) {
    return res.status(400).json({ error: "invalid planId" });
  }
  const requestedUpgradeFromTier = sanitizePlanId(
    body.upgrade_from_tier ||
    body.upgradeFromTier ||
    body.from_tier ||
    body.fromTier
  );

  const phoneNumber = normalizeMpesaPhone(body.phoneNumber || body.phone_number || body.phone || "");
  if (!phoneNumber) {
    return res.status(400).json({ error: "invalid phoneNumber" });
  }

  const requestedEmail = normalizeEmail(body.userEmail || body.email || body.user_email || user.email || "");
  if (!isValidEmail(requestedEmail)) {
    return res.status(400).json({ error: "invalid userEmail" });
  }

  const identity = ensureUserIdentity({
    authUser: user,
    userId: body.userId || body.user_id || user.id,
    email: requestedEmail
  });
  if (!identity.ok) {
    return res.status(403).json({ error: identity.error || "forbidden" });
  }

  let effectiveUpgradeFromTier = null;
  if (requestedUpgradeFromTier && requestedUpgradeFromTier < planId) {
    const [userRowRes, depRes] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("tier")
        .eq("user_id", identity.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("deposits")
        .select("deposit_id")
        .eq("user_id", identity.userId)
        .eq("status", "success")
        .eq("tier_at_deposit", requestedUpgradeFromTier)
        .limit(1)
    ]);
    const currentTier = sanitizePlanId(userRowRes?.data?.tier);
    const hasSourceTierDeposit = Array.isArray(depRes?.data) && depRes.data.length > 0;
    if (hasSourceTierDeposit && currentTier && currentTier >= requestedUpgradeFromTier) {
      effectiveUpgradeFromTier = requestedUpgradeFromTier;
    }
  }

  const expectedKes = resolveExpectedKesForCharge({
    planId,
    upgradeFromTier: effectiveUpgradeFromTier
  });
  if (!Number.isFinite(expectedKes) || expectedKes <= 0) {
    return res.status(400).json({ error: "invalid plan amount" });
  }

  const providedKes = normalizeAmount(body.amountKES ?? body.amount_kes ?? body.amountKes ?? body.amount);
  if (!Number.isFinite(providedKes) || Math.abs(providedKes - expectedKes) > 0.009) {
    return res.status(400).json({ error: `invalid amountKES for plan ${planId}` });
  }

  const baseUrl = resolveRuntimeBaseUrl(req);
  if (!baseUrl) {
    return res.status(500).json({ error: "public app url is not configured" });
  }
  const callbackToken = newCallbackToken();
  const reference = newReference("mpesa");
  const callbackUrl = buildPublicUrl(baseUrl, "/api/payments/mpesa/callback", {
    reference,
    token: callbackToken
  });
  if (!isSecurePublicUrl(callbackUrl)) {
    return res.status(400).json({ error: "callback url must be https" });
  }

  const environment = getMpesaEnvironment();
  const nowIso = new Date().toISOString();
  const courseId = safeUuidOrNull(body.courseId || body.course_id);

  const createRows = await createPendingPaymentRecords(supabaseAdmin, {
    userId: identity.userId,
    planId,
    amount: expectedKes,
    depositAmount: expectedKes,
    currency: "KES",
    provider: "mpesa_daraja",
    reference,
    paymentReference: reference,
    paymentType: "CustomerPayBillOnline",
    environment,
    paymentTimestamp: nowIso,
    phoneNumber,
    courseId,
    metadata: {
      callback_token_hint: callbackToken.slice(-8),
      sandbox_flow: environment === "sandbox",
      upgrade_from_tier: effectiveUpgradeFromTier || null,
      requested_upgrade_from_tier: requestedUpgradeFromTier || null,
      charge_mode: effectiveUpgradeFromTier && effectiveUpgradeFromTier < planId ? "tier_topup" : "tier_deposit"
    },
    depositProviderLabel: "mpesa_daraja",
    depositCreatedAt: nowIso
  });
  if (!createRows.ok) {
    return res.status(500).json({ error: createRows.error || "failed to create payment records" });
  }

  const mpesaInsert = await supabaseAdmin.from("mpesa_stk_requests").insert({
    reference,
    user_id: identity.userId,
    plan_id: planId,
    course_id: courseId,
    amount: expectedKes,
    phone_number: phoneNumber,
    status: "pending",
    callback_token: callbackToken,
    environment,
    created_at: nowIso,
    updated_at: nowIso
  });
  if (mpesaInsert.error) {
    await updatePaymentRecordsStatus(supabaseAdmin, { reference, status: "failed" });
    return res.status(500).json({ error: mpesaInsert.error.message || "failed to create mpesa tracking row" });
  }

  try {
    const stk = await initiateMpesaStkPush({
      phoneNumber,
      amountKes: expectedKes,
      reference,
      callbackUrl,
      accountReference: String(body.accountReference || `T${planId}`).slice(0, 12),
      transactionDesc: String(body.transactionDesc || "EddisonPay Sandbox Payment")
    });

    const checkoutRequestId = String(stk?.checkoutRequestId || "").trim();
    const merchantRequestId = String(stk?.merchantRequestId || "").trim();

    await patchPaymentRecord(supabaseAdmin, {
      reference,
      patch: {
        provider_transaction_id: checkoutRequestId || merchantRequestId || null,
        payment_reference: reference,
        phone_number: phoneNumber
      }
    });

    await supabaseAdmin
      .from("mpesa_stk_requests")
      .update({
        checkout_request_id: checkoutRequestId || null,
        merchant_request_id: merchantRequestId || null,
        request_payload: {
          planId,
          amount: expectedKes,
          phoneNumber,
          callbackUrl
        },
        response_payload: stk?.raw || {},
        updated_at: new Date().toISOString()
      })
      .eq("reference", reference);

    const redirectUrl = buildPublicUrl(
      baseUrl,
      body.success_url || body.successUrl || "/payment-success",
      { provider: "mpesa", reference, planId }
    );

    return res.status(200).json({
      success: true,
      message: stk?.message || "STK push sent to your phone.",
      provider: "mpesa",
      provider_code: "mpesa_daraja",
      reference,
      checkout_request_id: checkoutRequestId,
      merchant_request_id: merchantRequestId,
      redirect_url: redirectUrl,
      environment
    });
  } catch (err) {
    if (isMpesaSandbox() && sandboxFallbackEnabled) {
      const nowIsoFallback = new Date().toISOString();
      const fallbackCheckoutId = `ws_SIM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const fallbackMerchantId = `mr_SIM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      await patchPaymentRecord(supabaseAdmin, {
        reference,
        patch: {
          provider_transaction_id: fallbackCheckoutId,
          payment_reference: reference,
          phone_number: phoneNumber
        }
      });

      await supabaseAdmin
        .from("mpesa_stk_requests")
        .update({
          checkout_request_id: fallbackCheckoutId,
          merchant_request_id: fallbackMerchantId,
          status: "pending",
          result_desc: "Sandbox fallback active (provider unavailable).",
          request_payload: {
            planId,
            amount: expectedKes,
            phoneNumber,
            callbackUrl,
            fallback: true
          },
          response_payload: {
            fallback: true,
            provider_error: String(err?.message || "")
          },
          updated_at: nowIsoFallback
        })
        .eq("reference", reference);

      const redirectUrl = buildPublicUrl(
        baseUrl,
        body.success_url || body.successUrl || "/payment-success",
        { provider: "mpesa", reference, planId }
      );

      return res.status(200).json({
        success: true,
        fallback: true,
        message: "Sandbox provider is temporarily busy. Use simulation to complete this payment.",
        provider: "mpesa",
        provider_code: "mpesa_daraja",
        reference,
        checkout_request_id: fallbackCheckoutId,
        merchant_request_id: fallbackMerchantId,
        redirect_url: redirectUrl,
        environment
      });
    }

    await updatePaymentRecordsStatus(supabaseAdmin, { reference, status: "failed" });
    await supabaseAdmin
      .from("mpesa_stk_requests")
      .update({
        status: "failed",
        result_desc: String(err?.message || "failed to initiate stk push").slice(0, 220),
        response_payload: {
          error: String(err?.message || "")
        },
        updated_at: new Date().toISOString()
      })
      .eq("reference", reference);

    return res.status(502).json({
      success: false,
      error: String(err?.message || "failed to initiate M-Pesa STK push").slice(0, 240)
    });
  }
}
