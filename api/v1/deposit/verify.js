import payfleeVerifyHandler from "../../payments/verify/payflee.js";
import paystackVerifyHandler from "../../payments/verify/paystack.js";
import mpesaVerifyHandler from "../../payments/verify/mpesa.js";

const clean = (value) => String(value || "").trim();

const normalizeProvider = (value, reference = "") => {
  const providerRaw = clean(value);
  const provider = providerRaw.toLowerCase();
  if (provider.includes("payflee")) return "payflee";
  if (provider.includes("paystack")) return "paystack";
  if (provider.includes("mpesa") || provider.includes("daraja")) return "mpesa";
  const ref = clean(reference).toLowerCase();
  if (ref.startsWith("payflee_")) return "payflee";
  if (ref.startsWith("paystack_") || ref.startsWith("pay-")) return "paystack";
  if (ref.startsWith("mpesa_")) return "mpesa";
  return "mpesa";
};

export default async function handler(req, res) {
  const reference = clean(
    req.query?.merchant_reference ||
      req.query?.reference ||
      req.query?.tracking_id ||
      req.query?.orderTrackingId ||
      req.query?.OrderTrackingId
  );
  if (!reference) {
    return res.status(400).json({ error: "reference required" });
  }

  const provider = normalizeProvider(req.query?.provider || req.query?.payment_provider || "", reference);

  req.query = {
    ...(req.query || {}),
    reference
  };

  if (provider === "payflee") {
    await payfleeVerifyHandler(req, res);
    return;
  }
  if (provider === "paystack") {
    await paystackVerifyHandler(req, res);
    return;
  }
  await mpesaVerifyHandler(req, res);
}
