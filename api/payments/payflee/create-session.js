import {
  buildPublicUrl,
  convertKesToUsd,
  createPendingPaymentRecords,
  ensureUserIdentity,
  generateReference,
  getAuthUser,
  getSupabaseAdmin,
  isSupabaseConfigured,
  isValidEmail,
  newReference,
  normalizeAmount,
  normalizeEmail,
  readBodyObject,
  resolveExpectedKesForCharge,
  resolveCardCurrency,
  sanitizePlanId,
  updatePaymentChargeDetails,
  updatePaymentRecordsStatus
} from "../../../lib/api/payment-common.js";
import { applyApiSecurity, readClientIp, resolveRuntimeBaseUrl } from "../../../lib/api/http-security.js";
import { checkRateLimit } from "../../../lib/api/rate-limit.js";
import {
  createPayfleeCheckoutSession,
  getActiveCardProvider,
  getPayfleePublicKey,
  isPayfleeConfigured
} from "../../../lib/payments/index.js";

const parseMoney = (value) => normalizeAmount(value);

const isUnsupportedCurrencyError = (err) => {
  const msg = `${String(err?.message || "")} ${JSON.stringify(err?.data || {})}`.toLowerCase();
  return msg.includes("invalid currency") || msg.includes("currency code");
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
  if (!isPayfleeConfigured()) {
    return res.status(500).json({ error: "card gateway not configured" });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const { user, error: authError } = await getAuthUser(supabaseAdmin, req);
  if (authError || !user?.id) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const rateKey = `payflee-create:${user.id}:${readClientIp(req) || "unknown"}`;
  const rate = checkRateLimit(rateKey, { windowMs: 60_000, max: 15 });
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(Math.max(Math.ceil(rate.retryAfterMs / 1000), 1)));
    return res.status(429).json({ error: "too many requests" });
  }

  const body = readBodyObject(req);
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

  const requestedEmail = normalizeEmail(body.userEmail || body.email || body.user_email || "");
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
  const expectedUsd = convertKesToUsd(expectedKes);
  const providedKes = parseMoney(body.amountKES ?? body.amount_kes ?? body.amountKes);
  const providedUsd = parseMoney(body.amountUSD ?? body.amount_usd ?? body.amountUsd);
  const amountKes = Number.isFinite(providedKes) ? providedKes : expectedKes;
  const amountUsd = Number.isFinite(providedUsd) ? providedUsd : expectedUsd;

  if (Math.abs(amountKes - expectedKes) > 0.009) {
    return res.status(400).json({ error: `invalid amountKES for plan ${planId}` });
  }
  if (!Number.isFinite(expectedUsd) || Math.abs(amountUsd - expectedUsd) > 0.05) {
    return res.status(400).json({ error: `invalid amountUSD for plan ${planId}` });
  }

  const currency = resolveCardCurrency(body.currency || body.preferredCurrency || body.cardCurrency);
  const cardProvider = getActiveCardProvider();
  const primaryAmount = currency === "KES" ? amountKes : amountUsd;
  const reference = cardProvider === "paystack" ? generateReference() : newReference("payflee");
  const baseUrl = resolveRuntimeBaseUrl(req);
  const successUrl = buildPublicUrl(
    baseUrl,
    body.success_url || body.successUrl || "/dashboard?payment=success",
    { provider: cardProvider, reference, planId }
  );
  const dashboardUrl = buildPublicUrl(baseUrl, "/dashboard", {
    provider: cardProvider,
    reference,
    planId
  });
  const callbackUrl = buildPublicUrl(baseUrl, "/api/paystack/callback");
  const cancelUrl = buildPublicUrl(
    baseUrl,
    body.cancel_url || body.cancelUrl || "/dashboard?payment=failed",
    { provider: cardProvider, reference, planId }
  );

  const createRows = await createPendingPaymentRecords(supabaseAdmin, {
    userId: identity.userId,
    planId,
    amount: primaryAmount,
    depositAmount: expectedKes,
    currency,
    provider: cardProvider,
    reference,
    metadata: {
      upgrade_from_tier: effectiveUpgradeFromTier || null,
      requested_upgrade_from_tier: requestedUpgradeFromTier || null,
      charge_mode: effectiveUpgradeFromTier && effectiveUpgradeFromTier < planId ? "tier_topup" : "tier_deposit",
      success_redirect_url: successUrl,
      dashboard_redirect_url: dashboardUrl,
      cancel_redirect_url: cancelUrl,
      callback_url: callbackUrl,
      init_origin: baseUrl
    },
    depositProviderLabel: `${cardProvider} - card`
  });
  if (!createRows.ok) {
    return res.status(500).json({ error: createRows.error || "failed to create payment records" });
  }

  try {
    let effectiveCurrency = currency;
    let effectiveAmount = primaryAmount;
    let session = null;

    try {
      session = await createPayfleeCheckoutSession({
        reference,
        amount: primaryAmount,
        currency,
        userEmail: identity.email,
        planId,
        userId: identity.userId,
        callbackUrl,
        successUrl,
        cancelUrl,
        metadata: {
          planId,
          userId: identity.userId,
          success_redirect_url: successUrl,
          dashboard_redirect_url: dashboardUrl,
          cancel_redirect_url: cancelUrl,
          callback_url: callbackUrl,
          init_origin: baseUrl
        }
      });
    } catch (primaryErr) {
      // Provider may reject KES card currency. Fallback to USD to keep checkout flow available.
      if (currency === "KES" && isUnsupportedCurrencyError(primaryErr)) {
        effectiveCurrency = "USD";
        effectiveAmount = amountUsd;
        session = await createPayfleeCheckoutSession({
          reference,
          amount: effectiveAmount,
          currency: effectiveCurrency,
          userEmail: identity.email,
          planId,
          userId: identity.userId,
          callbackUrl,
          successUrl,
          cancelUrl,
          metadata: {
            planId,
            userId: identity.userId,
            originalCurrency: currency,
            originalAmount: primaryAmount,
            success_redirect_url: successUrl,
            dashboard_redirect_url: dashboardUrl,
            cancel_redirect_url: cancelUrl,
            callback_url: callbackUrl,
            init_origin: baseUrl
          }
        });

        const syncAmount = await updatePaymentChargeDetails(supabaseAdmin, {
          reference,
          amount: effectiveAmount,
          currency: effectiveCurrency
        });
        if (!syncAmount.ok) {
          throw new Error(syncAmount.error || "failed to sync fallback payment amount");
        }
      } else {
        throw primaryErr;
      }
    }

    return res.status(200).json({
      checkout_url: session.checkoutUrl,
      redirect_url: session.checkoutUrl,
      authorization_url: session.checkoutUrl,
      url: session.checkoutUrl,
      reference,
      provider: cardProvider,
      currency: effectiveCurrency,
      amount: effectiveAmount,
      public_key: getPayfleePublicKey() || ""
    });
  } catch (err) {
    await updatePaymentRecordsStatus(supabaseAdmin, { reference, status: "failed" });
    return res.status(502).json({
      error: String(err?.message || "failed to create card checkout session").slice(0, 240)
    });
  }
}
