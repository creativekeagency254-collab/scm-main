import payfleeCreateSessionHandler from "../../payments/payflee/create-session.js";
import mpesaInitiateHandler from "../../payments/mpesa/initiate.js";
import { normalizeCheckoutMethod } from "../../../lib/payments/index.js";

const FX_KES_PER_USD = (() => {
  const n = Number(process.env.PAYMENTS_FX_KES_PER_USD || process.env.VITE_FX_KES_PER_USD || 130);
  if (!Number.isFinite(n) || n <= 0) return 130;
  return Number(n.toFixed(6));
})();

const toMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Number(n.toFixed(2));
};

const toUsd = (kesAmount) => {
  const kes = toMoney(kesAmount);
  if (!Number.isFinite(kes)) return NaN;
  return Number((kes / FX_KES_PER_USD).toFixed(2));
};

const bodyObject = (req) =>
  req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};

export default async function handler(req, res) {
  const body = bodyObject(req);
  const method = normalizeCheckoutMethod(body.method || body.payment_method);
  const amountKes = toMoney(body.amountKES ?? body.amount_kes ?? body.amountKes ?? body.amount);
  const tier = Number(body.planId || body.plan_id || body.tier || body.tierId);
  const email = String(body.userEmail || body.user_email || body.email || "").trim();
  const upgradeFromTier =
    body.upgrade_from_tier ??
    body.upgradeFromTier ??
    body.from_tier ??
    body.fromTier ??
    null;

  if (method === "card") {
    req.body = {
      planId: tier,
      amountKES: amountKes,
      amountUSD: toMoney(body.amountUSD ?? body.amount_usd ?? body.amountUsd ?? toUsd(amountKes)),
      userEmail: email,
      userId: body.userId || body.user_id,
      preferredCurrency: body.currency || body.preferredCurrency || body.cardCurrency || "USD",
      successUrl: body.successUrl || body.callback_url || "/dashboard?payment=success",
      cancelUrl: body.cancelUrl || "/dashboard?payment=failed",
      upgrade_from_tier: upgradeFromTier
    };
    await payfleeCreateSessionHandler(req, res);
    return;
  }

  req.body = {
    planId: tier,
    amountKES: amountKes,
    phoneNumber: body.phoneNumber || body.phone_number || body.phone || "",
    userEmail: email,
    userId: body.userId || body.user_id,
    courseId: body.courseId || body.course_id || null,
    successUrl: body.successUrl || body.callback_url || "/dashboard?payment=success",
    upgrade_from_tier: upgradeFromTier
  };
  await mpesaInitiateHandler(req, res);
}
