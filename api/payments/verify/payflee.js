import {
  amountMatches,
  applyDepositSuccess,
  fetchDepositByReference,
  fetchPaymentByReference,
  getAuthUser,
  getSupabaseAdmin,
  isAdminUser,
  isSafeReference,
  isSupabaseConfigured,
  sanitizePlanId,
  updatePaymentRecordsStatus
} from "../../../lib/api/payment-common.js";
import { applyApiSecurity, readClientIp } from "../../../lib/api/http-security.js";
import { checkRateLimit } from "../../../lib/api/rate-limit.js";
import { getActiveCardProvider, verifyPayfleePayment } from "../../../lib/payments/index.js";

const readReference = (req) =>
  String(req.query?.reference || req.query?.merchant_reference || req.body?.reference || "").trim();

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

  const rateKey = `payflee-verify:${user.id}:${readClientIp(req) || "unknown"}`;
  const rate = checkRateLimit(rateKey, { windowMs: 60_000, max: 40 });
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(Math.max(Math.ceil(rate.retryAfterMs / 1000), 1)));
    return res.status(429).json({ error: "too many requests" });
  }

  const reference = readReference(req);
  if (!reference) return res.status(400).json({ error: "reference required" });
  if (!isSafeReference(reference)) return res.status(400).json({ error: "invalid reference" });

  const [paymentLookup, depositLookup, adminAccess] = await Promise.all([
    fetchPaymentByReference(supabaseAdmin, reference),
    fetchDepositByReference(supabaseAdmin, reference),
    isAdminUser(supabaseAdmin, user.id)
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

  const expectedCurrency = String(paymentRow.currency || "USD").toUpperCase();
  const storedAmount = Number(paymentRow.amount);
  const expectedAmount = Number.isFinite(storedAmount) && storedAmount > 0
    ? storedAmount
    : Number(depositRow.amount);
  const cardProvider = getActiveCardProvider();

  try {
    const providerStatus = await verifyPayfleePayment({ reference });

    if (providerStatus.status === "success") {
      const providerAmount = Number.isFinite(Number(providerStatus.amount))
        ? Number(providerStatus.amount)
        : NaN;
      if (!Number.isFinite(providerAmount) || !amountMatches(expectedAmount, providerAmount)) {
        await updatePaymentRecordsStatus(supabaseAdmin, { reference, status: "failed" });
        return res.status(409).json({
          error: "payment amount mismatch",
          expected_amount: expectedAmount,
          provider_amount: providerAmount,
          currency: expectedCurrency
        });
      }

      const applied = await applyDepositSuccess(supabaseAdmin, reference);
      if (!applied.ok) {
        return res.status(500).json({ error: applied.error || "failed to confirm payment" });
      }
      await updatePaymentRecordsStatus(supabaseAdmin, { reference, status: "success" });
      return res.status(200).json({
        status: "success",
        reference,
        provider: cardProvider,
        provider_status: providerStatus.providerStatus || "success"
      });
    }

    if (providerStatus.status === "failed") {
      await updatePaymentRecordsStatus(supabaseAdmin, { reference, status: "failed" });
      return res.status(200).json({
        status: "failed",
        reference,
        provider: cardProvider,
        provider_status: providerStatus.providerStatus || "failed"
      });
    }

    return res.status(200).json({
      status: "pending",
      reference,
      provider: cardProvider,
      provider_status: providerStatus.providerStatus || "pending"
    });
  } catch (err) {
    return res.status(502).json({
      error: String(err?.message || "failed to verify payflee payment").slice(0, 240)
    });
  }
}
