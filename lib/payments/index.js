export {
  createPayfleeCheckoutSession,
  getActiveCardProvider,
  getPayfleePublicKey,
  isPayfleeConfigured,
  isPaystackConfigured,
  verifyPayfleePayment
} from "./payflee.js";
export { initiatePaynectaStkPush, isPaynectaConfigured, verifyPaynectaPayment } from "./paynecta.js";
export {
  createMpesaCallbackSignature,
  getMpesaEnvironment,
  initiateMpesaStkPush,
  isMpesaConfigured,
  isMpesaSandbox,
  mapMpesaResultCodeToStatus,
  normalizeMpesaPhone,
  parseMpesaCallbackMetadata,
  queryMpesaStkPush,
  verifyMpesaCallbackSignature
} from "./mpesa-daraja.js";

export const PAYMENT_PROVIDER = {
  PAYFLEE: "payflee",
  PAYNECTA: "paynecta",
  MPESA_DARAJA: "mpesa_daraja"
};

export const normalizeCheckoutMethod = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "card";
  if (raw.includes("paystack")) return "card";
  if (raw.includes("card") || raw.includes("visa") || raw.includes("master")) return "card";
  if (raw.includes("crypto") || raw.includes("usdt") || raw.includes("btc") || raw.includes("bitcoin")) {
    return "card";
  }
  if (raw.includes("mpesa") || raw.includes("m-pesa") || raw.includes("m pesa")) return "mpesa";
  if (raw.includes("mobile")) return "mpesa";
  return "card";
};
