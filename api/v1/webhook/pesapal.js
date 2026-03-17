import { createClient } from "@supabase/supabase-js";
import { getTransactionStatus, isPesapalConfigured } from "../../lib/pesapal.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getAdmin = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

const normalizeStatus = (payload) => {
  const desc = String(payload?.payment_status_description || payload?.payment_status || "").toLowerCase();
  const codeRaw = payload?.status_code ?? payload?.statusCode;
  const code = Number.isFinite(Number(codeRaw)) ? Number(codeRaw) : null;
  if (code === 1 || desc === "completed") return "success";
  if (code === 2 || code === 0 || code === 3 || ["failed", "invalid", "reversed"].includes(desc)) return "failed";
  return "pending";
};

const applyDepositSuccess = async (supabaseAdmin, merchantReference) => {
  if (!merchantReference) return { updated: false, reason: "missing_reference" };
  const { data: dep, error } = await supabaseAdmin
    .from("deposits")
    .select("deposit_id,user_id,amount,status")
    .eq("provider_reference", merchantReference)
    .maybeSingle();
  if (error || !dep) return { updated: false, reason: "not_found" };
  if (dep.status === "success") return { updated: true, already: true };
  const { error: updateErr } = await supabaseAdmin
    .from("deposits")
    .update({ status: "success", confirmed_at: new Date().toISOString() })
    .eq("deposit_id", dep.deposit_id);
  if (updateErr) return { updated: false, reason: "update_failed" };
  await supabaseAdmin.rpc("apply_wallet_tx", {
    p_user_id: dep.user_id,
    p_type: "deposit",
    p_amount: dep.amount,
    p_related_id: dep.deposit_id,
    p_reference: merchantReference
  });
  return { updated: true, already: false };
};

const applyDepositFailure = async (supabaseAdmin, merchantReference) => {
  if (!merchantReference) return;
  await supabaseAdmin
    .from("deposits")
    .update({ status: "failed" })
    .eq("provider_reference", merchantReference);
};

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "supabase not configured" });
  }
  if (!isPesapalConfigured()) {
    return res.status(500).json({ error: "Pesapal is not configured." });
  }

  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const src = req.method === "GET" ? req.query : req.body || {};
  const trackingId =
    String(src?.OrderTrackingId || src?.orderTrackingId || src?.tracking_id || "").trim();
  const merchantReference =
    String(src?.OrderMerchantReference || src?.orderMerchantReference || src?.merchant_reference || "").trim();

  if (!trackingId || !merchantReference) {
    return res.status(400).json({ error: "missing tracking_id or merchant_reference" });
  }

  try {
    const statusPayload = await getTransactionStatus(trackingId);
    const status = normalizeStatus(statusPayload);
    if (status === "success") {
      await applyDepositSuccess(supabaseAdmin, merchantReference);
    } else if (status === "failed") {
      await applyDepositFailure(supabaseAdmin, merchantReference);
    }
    return res.status(200).json({
      orderNotificationType: "IPNCHANGE",
      orderTrackingId: trackingId,
      orderMerchantReference: merchantReference,
      status: status === "success" ? 200 : status === "failed" ? 400 : 202
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "failed to process IPN" });
  }
}
