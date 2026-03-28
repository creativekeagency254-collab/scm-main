import payfleeVerifyHandler from "./payflee.js";
import {
  amountMatches,
  applyDepositSuccess,
  fetchDepositByReference,
  fetchPaymentByReference,
  getSupabaseAdmin,
  isSafeReference,
  isSupabaseConfigured,
  patchPaymentRecord,
  updatePaymentRecordsStatus
} from "../../../lib/api/payment-common.js";
import { applyApiSecurity, readClientIp, resolveRuntimeBaseUrl } from "../../../lib/api/http-security.js";
import { checkRateLimit } from "../../../lib/api/rate-limit.js";
import { verifyPayfleePayment } from "../../../lib/payments/index.js";

const clean = (value) => String(value || "").trim();
const DASHBOARD_REDIRECT_BASE = "https://scm-main-ruddy.vercel.app";

const resolveDashboardRedirectBase = (req) => {
  const configured = clean(
    process.env.PUBLIC_APP_URL ||
    process.env.AUTH_REDIRECT_URL ||
    process.env.SITE_URL
  );
  if (configured) {
    try {
      const url = new URL(configured);
      return `${url.origin}`;
    } catch (_e) {
      // fall through to runtime-derived base
    }
  }
  return resolveRuntimeBaseUrl(req) || DASHBOARD_REDIRECT_BASE;
};

const isColumnMissingError = (message = "") => {
  const msg = String(message || "").toLowerCase();
  return (
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("undefined column") ||
    msg.includes("unknown column")
  );
};

const hasAuthHeader = (req) =>
  Boolean(
    clean(req.headers?.authorization || "") ||
      clean(req.headers?.Authorization || "")
  );

const readReference = (req) =>
  clean(req.query?.reference || req.query?.trxref || req.query?.merchant_reference || req.body?.reference || "");

const redirectTo = (res, location) => {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.end();
};

const handlePublicCallback = async (req, res) => {
  const security = applyApiSecurity(req, res, { methods: ["GET", "OPTIONS"] });
  if (!security.ok) return res.status(403).json({ error: security.error || "forbidden" });

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  const reference = readReference(req);
  if (!reference || !isSafeReference(reference)) {
    return res.status(400).json({ error: "Missing or invalid reference" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(500).json({ error: "supabase not configured" });
  }
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const rateKey = `paystack-callback:${reference}:${readClientIp(req) || "unknown"}`;
  const rate = checkRateLimit(rateKey, { windowMs: 60_000, max: 60 });
  if (!rate.allowed) {
    return res.status(429).json({ error: "too many requests" });
  }

  const [paymentLookup, depositLookup] = await Promise.all([
    fetchPaymentByReference(supabaseAdmin, reference),
    fetchDepositByReference(supabaseAdmin, reference)
  ]);

  if (paymentLookup.error) return res.status(500).json({ error: paymentLookup.error });
  if (depositLookup.error) return res.status(500).json({ error: depositLookup.error });

  const paymentRow = paymentLookup.row;
  const depositRow = depositLookup.row;

  const redirectBase = resolveDashboardRedirectBase(req);
  const successRedirect = `${redirectBase}/dashboard?payment=success`;
  const failedRedirect = `${redirectBase}/dashboard?payment=failed`;

  if (!paymentRow || !depositRow) return redirectTo(res, failedRedirect);

  if (clean(paymentRow.status).toLowerCase() === "success") {
    return redirectTo(res, successRedirect);
  }

  try {
    const providerStatus = await verifyPayfleePayment({ reference });
    if (providerStatus.status !== "success") {
      await updatePaymentRecordsStatus(supabaseAdmin, { reference, status: "failed" });
      return redirectTo(res, failedRedirect);
    }

    const expectedAmount = Number(paymentRow.amount);
    const providerAmount = Number(providerStatus.amount);
    const expectedCurrency = clean(paymentRow.currency).toUpperCase();
    const providerCurrency = clean(providerStatus.currency).toUpperCase();
    const amountOk = amountMatches(expectedAmount, providerAmount);
    const currencyOk = !providerCurrency || !expectedCurrency || providerCurrency === expectedCurrency;
    if (!amountOk || !currencyOk) {
      await updatePaymentRecordsStatus(supabaseAdmin, { reference, status: "failed" });
      return redirectTo(res, failedRedirect);
    }

    const nowIso = new Date().toISOString();
    const applied = await applyDepositSuccess(supabaseAdmin, reference);
    if (!applied.ok) return res.status(500).json({ error: applied.error || "failed to apply deposit" });

    await updatePaymentRecordsStatus(supabaseAdmin, {
      reference,
      status: "success",
      confirmedAt: nowIso
    });

    const safePaystackRef = clean(providerStatus.reference || reference);
    let patchRes = await patchPaymentRecord(supabaseAdmin, {
      reference,
      patch: {
        paystack_reference: safePaystackRef,
        provider_transaction_id: safePaystackRef
      }
    });
    if (!patchRes.ok && isColumnMissingError(patchRes.error || "")) {
      patchRes = await patchPaymentRecord(supabaseAdmin, {
        reference,
        patch: { provider_transaction_id: safePaystackRef }
      });
    }

    return redirectTo(res, successRedirect);
  } catch (err) {
    return res.status(502).json({
      error: String(err?.message || "verification failed").slice(0, 240)
    });
  }
};

export default async function handler(req, res) {
  if (!hasAuthHeader(req)) {
    await handlePublicCallback(req, res);
    return;
  }
  await payfleeVerifyHandler(req, res);
}
