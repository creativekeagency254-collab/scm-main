import { createClient } from "@supabase/supabase-js";
import { applyApiSecurity, readClientIp } from "../../../lib/api/http-security.js";
import { checkRateLimit } from "../../../lib/api/rate-limit.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const normalizeRefCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);

const getAdmin = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

const getBearerToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  if (!header) return "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : String(header || "").trim();
};

const getAuthUser = async (supabaseAdmin, req) => {
  const token = getBearerToken(req);
  if (!token) return { user: null, error: "missing token" };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) return { user: null, error: error?.message || "invalid token" };
  return { user: data.user, error: null };
};

export default async function handler(req, res) {
  const security = applyApiSecurity(req, res, { methods: ["POST", "OPTIONS"] });
  if (!security.ok) {
    return res.status(403).json({ error: security.error || "forbidden" });
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const { user, error: authError } = await getAuthUser(supabaseAdmin, req);
  if (authError || !user?.id) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const rateKey = `ref-attach:${user.id}:${readClientIp(req) || "unknown"}`;
  const rate = checkRateLimit(rateKey, { windowMs: 60_000, max: 40 });
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(Math.max(Math.ceil(rate.retryAfterMs / 1000), 1)));
    return res.status(429).json({ error: "too many requests" });
  }

  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const referralCode = normalizeRefCode(body.ref_code || body.referral_code || body.referred_by || body.ref || "");
  if (!referralCode) {
    return res.status(400).json({ error: "referral code required" });
  }

  const { data: me, error: meError } = await supabaseAdmin
    .from("users")
    .select("user_id,referrer_id,referral_code,profile_data")
    .eq("user_id", user.id)
    .maybeSingle();

  if (meError || !me?.user_id) {
    return res.status(404).json({ error: "profile not found" });
  }

  if (me.referrer_id) {
    return res.status(200).json({ attached: false, reason: "already_attached" });
  }

  // Harden referral attribution: only allow attachment before any earning/deposit activity.
  const [depositActivity, paymentActivity, txActivity] = await Promise.all([
    supabaseAdmin
      .from("deposits")
      .select("deposit_id")
      .eq("user_id", user.id)
      .eq("status", "success")
      .limit(1),
    supabaseAdmin
      .from("payments")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "success")
      .limit(1),
    supabaseAdmin
      .from("transactions")
      .select("tx_id,amount")
      .eq("user_id", user.id)
      .gt("amount", 0)
      .limit(1)
  ]);
  const hasDepositActivity = Array.isArray(depositActivity?.data) && depositActivity.data.length > 0;
  const hasPaymentActivity = Array.isArray(paymentActivity?.data) && paymentActivity.data.length > 0;
  const hasTransactionActivity = Array.isArray(txActivity?.data) && txActivity.data.length > 0;
  if (hasDepositActivity || hasPaymentActivity || hasTransactionActivity) {
    return res.status(409).json({ attached: false, reason: "ineligible_account" });
  }

  if (String(me.referral_code || "").toUpperCase() === referralCode) {
    return res.status(400).json({ error: "self referral not allowed" });
  }

  const { data: refUser, error: refErr } = await supabaseAdmin
    .from("users")
    .select("user_id,referral_code")
    .eq("referral_code", referralCode)
    .maybeSingle();

  if (refErr || !refUser?.user_id) {
    return res.status(404).json({ error: "invalid referral code" });
  }

  if (String(refUser.user_id) === String(user.id)) {
    return res.status(400).json({ error: "self referral not allowed" });
  }

  const nowIso = new Date().toISOString();
  const profileData = me.profile_data && typeof me.profile_data === "object" ? me.profile_data : {};
  const nextProfile = {
    ...profileData,
    referred_by: referralCode,
    updated_at: nowIso
  };

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("users")
    .update({
      referrer_id: refUser.user_id,
      profile_data: nextProfile,
      last_seen: nowIso
    })
    .eq("user_id", user.id)
    .is("referrer_id", null)
    .select("user_id,referrer_id,profile_data")
    .maybeSingle();

  if (updateErr) {
    return res.status(500).json({ error: updateErr.message || "failed to attach referral" });
  }

  if (!updated?.referrer_id) {
    return res.status(200).json({ attached: false, reason: "already_attached" });
  }

  return res.status(200).json({
    attached: true,
    referrer_id: updated.referrer_id,
    referred_by: updated.profile_data?.referred_by || referralCode
  });
}
