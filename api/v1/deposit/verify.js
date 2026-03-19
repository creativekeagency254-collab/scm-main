import { createClient } from "@supabase/supabase-js";
import { getTransactionStatus, isKoraConfigured } from "../../lib/pesapal.js";

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
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "supabase not configured" });
  }
  if (!isKoraConfigured()) {
    return res.status(500).json({ error: "Kora is not configured." });
  }

  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const trackingId =
    String(
      req.query?.tracking_id ||
        req.query?.orderTrackingId ||
        req.query?.OrderTrackingId ||
        req.query?.reference ||
        req.query?.merchant_reference ||
        ""
    ).trim();
  const merchantReference =
    String(req.query?.merchant_reference || req.query?.reference || req.query?.OrderMerchantReference || "").trim();

  if (!trackingId) {
    return res.status(400).json({ error: "tracking_id required" });
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
      status,
      tracking_id: trackingId,
      merchant_reference: merchantReference,
      kora_status:
        statusPayload?.payment_status_description ||
        statusPayload?.payment_status ||
        statusPayload?.transaction_status ||
        ""
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "failed to verify payment" });
  }
}
