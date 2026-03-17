import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { isPesapalConfigured, registerIpn, submitOrder } from "../../lib/pesapal.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PESAPAL_IPN_ID = process.env.PESAPAL_IPN_ID;
const PESAPAL_IPN_URL = process.env.PESAPAL_IPN_URL;
const PESAPAL_CALLBACK_URL = process.env.PESAPAL_CALLBACK_URL;

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
  const usePesapal = paymentMode !== "manual";
  if (usePesapal && !isPesapalConfigured()) {
    return res.status(500).json({ error: "Pesapal is not configured." });
  }

  const reference = `ep_${crypto.randomUUID().replace(/-/g, "")}`;
  const providerLabel = usePesapal ? `Pesapal${method ? ` - ${method}` : ""}` : (method || "Manual");

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

  if (usePesapal) {
    const xfProto = req.headers["x-forwarded-proto"] || "https";
    const xfHost = req.headers["x-forwarded-host"] || req.headers.host || "";
    const baseUrl = xfHost ? `${xfProto}://${xfHost}` : "";
    const callbackUrl = PESAPAL_CALLBACK_URL || baseUrl || "";
    if (!callbackUrl) {
      return res.status(500).json({ error: "Payment callback URL is not configured." });
    }
    let ipnId = PESAPAL_IPN_ID;
    if (!ipnId) {
      const ipnUrl = PESAPAL_IPN_URL || (baseUrl ? `${baseUrl}/api/v1/webhook/pesapal` : "");
      if (!ipnUrl) {
        return res.status(500).json({ error: "IPN URL is not configured." });
      }
      try {
        const ipn = await registerIpn({ url: ipnUrl, type: "GET" });
        ipnId = ipn?.ipn_id || ipn?.ipnId || "";
      } catch (e) {
        return res.status(500).json({ error: "Failed to register IPN." });
      }
    }
    if (!ipnId) {
      return res.status(500).json({ error: "IPN is not configured." });
    }

    const fullName = String(req.body?.name || "").trim() || "Client";
    const nameParts = fullName.split(" ").filter(Boolean);
    const firstName = nameParts[0] || "Client";
    const lastName = nameParts.slice(1).join(" ") || "Customer";
    const phone = String(req.body?.phone || "").trim();

    try {
      const order = await submitOrder({
        id: reference,
        currency: "KES",
        amount,
        description: `EdisonPay Tier ${tier} Deposit`,
        callback_url: callbackUrl,
        notification_id: ipnId,
        redirect_mode: "TOP_WINDOW",
        billing_address: {
          email_address: email,
          phone_number: phone,
          country_code: "KE",
          first_name: firstName,
          last_name: lastName
        }
      });
      const orderStatus = order?.status ? String(order.status) : "";
      const orderError = order?.error || order?.error?.message || null;
      const orderMessage = order?.message || "";
      if (orderError || (orderStatus && orderStatus !== "200")) {
        await supabaseAdmin
          .from("deposits")
          .update({ status: "failed" })
          .eq("provider_reference", reference);
        return res.status(500).json({ error: orderMessage || "Pesapal rejected the order." });
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
        return res.status(500).json({ error: "Pesapal did not return a checkout URL." });
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
