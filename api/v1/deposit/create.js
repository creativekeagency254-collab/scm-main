import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { isKoraConfigured, submitOrder } from "../../lib/pesapal.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KORA_WEBHOOK_URL = process.env.KORA_WEBHOOK_URL || process.env.PESAPAL_IPN_URL;
const KORA_CALLBACK_URL = process.env.KORA_CALLBACK_URL || process.env.PESAPAL_CALLBACK_URL;

const getAdmin = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

const getBearerToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  if (!header) return "";
  return header.startsWith("Bearer ") ? header.slice(7) : header;
};

const getAuthUser = async (supabaseAdmin, req) => {
  const token = getBearerToken(req);
  if (!token) return { user: null, error: "missing token" };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { user: null, error: error?.message || "invalid token" };
  return { user: data.user, error: null };
};

const orderMessageFrom = (order, errorMessage, errorCode) => {
  const base = String(errorMessage || order?.message || "").trim();
  const code = String(errorCode || "").trim();
  if (base && code) return `${base} (${code})`;
  if (base) return base;
  if (code) return `Kora rejected the order (${code}).`;
  return "";
};

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const { user, error: authError } = await getAuthUser(supabaseAdmin, req);
  if (authError) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const amount = Number(req.body?.amount);
  const email = String(req.body?.email || "").trim();
  const userId = String(req.body?.user_id || "").trim();
  const tier = Number(req.body?.tier || 1);
  const method = String(req.body?.method || "Manual");

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "invalid amount" });
  }
  if (!email || !userId) {
    return res.status(400).json({ error: "email and user_id required" });
  }
  if (user?.id && userId !== user.id) {
    return res.status(403).json({ error: "user mismatch" });
  }

  const paymentMode = String(req.body?.payment_mode || "").toLowerCase();
  const useKora = paymentMode !== "manual";
  if (useKora && !isKoraConfigured()) {
    return res.status(500).json({ error: "Kora is not configured." });
  }

  const reference = `ep_${crypto.randomUUID().replace(/-/g, "")}`;
  const providerLabel = useKora ? `Kora${method ? ` - ${method}` : ""}` : (method || "Manual");

  const { error } = await supabaseAdmin
    .from("deposits")
    .insert({
      user_id: userId,
      amount,
      tier_at_deposit: tier,
      status: "pending",
      provider: providerLabel,
      provider_reference: reference,
      created_at: new Date().toISOString()
    });

  if (error) {
    return res.status(500).json({ error: "failed to create deposit" });
  }

  if (useKora) {
    const xfProto = req.headers["x-forwarded-proto"] || "https";
    const xfHost = req.headers["x-forwarded-host"] || req.headers.host || "";
    const baseUrl = xfHost ? `${xfProto}://${xfHost}` : "";
    const callbackUrl = KORA_CALLBACK_URL || baseUrl || "";
    if (!callbackUrl) {
      return res.status(500).json({ error: "Payment callback URL is not configured." });
    }
    const webhookUrl = KORA_WEBHOOK_URL || (baseUrl ? `${baseUrl}/api/v1/webhook/kora` : "");

    const fullName = String(req.body?.name || "").trim() || "Client";
    const nameParts = fullName.split(" ").filter(Boolean);
    const firstName = nameParts[0] || "Client";
    const lastName = nameParts.slice(1).join(" ") || "Customer";
    const phone = String(req.body?.phone || "").trim();

    try {
      const order = await submitOrder({
        reference,
        currency: "KES",
        amount,
        description: `EdisonPay Tier ${tier} Deposit`,
        callback_url: callbackUrl,
        notification_url: webhookUrl,
        billing_address: {
          email_address: email,
          phone_number: phone,
          country_code: "KE",
          first_name: firstName,
          last_name: lastName
        }
      });
      const rawOrderStatus = order?.status;
      const statusOk =
        rawOrderStatus === undefined ||
        rawOrderStatus === null ||
        rawOrderStatus === true ||
        String(rawOrderStatus).toLowerCase() === "success" ||
        String(rawOrderStatus) === "200";
      const orderErrorObj = order?.error || null;
      const orderErrorMessage = order?.error?.message || order?.error?.error_message || "";
      const orderErrorCode = order?.error?.code || "";
      const orderMessage = orderMessageFrom(order, orderErrorMessage, orderErrorCode);
      if (orderErrorObj || !statusOk) {
        await supabaseAdmin
          .from("deposits")
          .update({ status: "failed" })
          .eq("provider_reference", reference);
        return res.status(500).json({ error: orderMessage || "Kora rejected the order." });
      }

      const redirectUrl =
        order?.redirect_url ||
        order?.redirectUrl ||
        order?.payment_url ||
        order?.payment_url_link ||
        "";
      if (!redirectUrl) {
        await supabaseAdmin
          .from("deposits")
          .update({ status: "failed" })
          .eq("provider_reference", reference);
        return res.status(500).json({ error: "Kora did not return a checkout URL." });
      }
      return res.status(200).json({
        redirect_url: redirectUrl,
        order_tracking_id: order?.order_tracking_id || order?.orderTrackingId || "",
        reference
      });
    } catch (e) {
      await supabaseAdmin
        .from("deposits")
        .update({ status: "failed" })
        .eq("provider_reference", reference);
      return res.status(500).json({ error: e?.message || "Failed to start checkout." });
    }
  }

  return res.status(200).json({
    manual: true,
    reference,
    message: "Deposit request submitted for manual confirmation."
  });
}
