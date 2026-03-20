import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AUTO_PAYOUT_ADMIN_TOKEN = String(process.env.AUTO_PAYOUT_ADMIN_TOKEN || "").trim();

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

const secureEqual = (a, b) => {
  const left = String(a || "");
  const right = String(b || "");
  if (!left || !right) return false;
  const aBuf = Buffer.from(left);
  const bBuf = Buffer.from(right);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

const isAdminUser = async (supabaseAdmin, userId) => {
  if (!userId) return false;
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("profile_data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return String(data?.profile_data?.role || "").toLowerCase() === "admin";
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

  const withdrawalsMode = String(
    process.env.WITHDRAWALS_MODE || process.env.VITE_WITHDRAWALS_MODE || "auto"
  ).toLowerCase();
  if (withdrawalsMode !== "auto") {
    return res.status(403).json({ error: "auto payouts are disabled" });
  }

  const payoutId = String(req.body?.payout_id || req.body?.payoutId || "").trim();
  if (!payoutId) {
    return res.status(400).json({ error: "payout_id required" });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const isAutomationCall =
    AUTO_PAYOUT_ADMIN_TOKEN &&
    secureEqual(token, AUTO_PAYOUT_ADMIN_TOKEN);

  let userId = null;
  if (!isAutomationCall) {
    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !authData?.user?.id) {
      return res.status(401).json({ error: "unauthorized" });
    }
    userId = authData.user.id;
    const adminAccess = await isAdminUser(supabaseAdmin, userId);
    if (!adminAccess) {
      return res.status(403).json({ error: "admin required" });
    }
  }

  const { data: payoutRow, error: payoutErr } = await supabaseAdmin
    .from("payout_requests")
    .select("payout_id,user_id,status")
    .eq("payout_id", payoutId)
    .maybeSingle();

  if (payoutErr || !payoutRow) {
    return res.status(404).json({ error: "payout request not found" });
  }
  const currentStatus = String(payoutRow.status || "").toLowerCase();
  if (currentStatus === "completed") {
    return res.status(200).json({ ok: true, payout_id: payoutId, status: "completed" });
  }
  if (currentStatus === "failed") {
    return res.status(409).json({ error: "payout request already failed" });
  }
  if (!["queued", "processing"].includes(currentStatus)) {
    return res.status(409).json({ error: "payout request not in completable state" });
  }

  const { error: updateErr } = await supabaseAdmin
    .from("payout_requests")
    .update({ status: "completed", processed_at: new Date().toISOString() })
    .eq("payout_id", payoutId);

  if (updateErr) {
    return res.status(500).json({ error: updateErr.message || "failed to update payout request" });
  }

  return res.status(200).json({ ok: true, payout_id: payoutId, status: "completed" });
}
