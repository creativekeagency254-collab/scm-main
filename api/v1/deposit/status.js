import { createClient } from "@supabase/supabase-js";
import { applyApiSecurity, readClientIp } from "../../../lib/api/http-security.js";
import { checkRateLimit } from "../../../lib/api/rate-limit.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

const ADMIN_ROLE_TOKENS = new Set([
  "admin",
  "admins",
  "administrator",
  "administrators",
  "superadmin",
  "super_admin",
  "owner"
]);
const normalizeRoleToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
const parseRoleList = (raw) => {
  if (Array.isArray(raw)) return raw.map((v) => normalizeRoleToken(v)).filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(/[,\|]/)
      .map((v) => normalizeRoleToken(v))
      .filter(Boolean);
  }
  return [];
};
const hasAdminRole = (profileData) => {
  const profile = profileData && typeof profileData === "object" ? profileData : {};
  const directRole = normalizeRoleToken(profile.role || profile.user_role || "");
  const categoryRole = normalizeRoleToken(profile.category || profile.user_category || "");
  const roleList = parseRoleList(profile.roles);
  return (
    ADMIN_ROLE_TOKENS.has(directRole) ||
    ADMIN_ROLE_TOKENS.has(categoryRole) ||
    roleList.some((role) => ADMIN_ROLE_TOKENS.has(role))
  );
};

const isAdminUser = async (supabaseAdmin, userId) => {
  if (!userId) return false;
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("profile_data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return hasAdminRole(data?.profile_data);
};
const isSafeIdentifier = (value) => /^[A-Za-z0-9._:-]{1,128}$/.test(String(value || ""));

export default async function handler(req, res) {
  const security = applyApiSecurity(req, res, { methods: ["GET", "OPTIONS"] });
  if (!security.ok) {
    return res.status(403).json({ error: security.error || "forbidden" });
  }

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

  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const { user, error: authError } = await getAuthUser(supabaseAdmin, req);
  if (authError || !user?.id) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const rateKey = `deposit-status:${user.id}:${readClientIp(req) || "unknown"}`;
  const rate = checkRateLimit(rateKey, { windowMs: 60_000, max: 60 });
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(Math.max(Math.ceil(rate.retryAfterMs / 1000), 1)));
    return res.status(429).json({ error: "too many requests" });
  }
  const adminAccess = await isAdminUser(supabaseAdmin, user.id);

  const reference = String(req.query?.reference || "").trim();
  if (!reference) return res.status(400).json({ error: "reference required" });
  if (!isSafeIdentifier(reference)) return res.status(400).json({ error: "invalid reference" });

  const { data, error } = await supabaseAdmin
    .from("deposits")
    .select("status, amount, user_id, tier_at_deposit, confirmed_at, provider")
    .eq("provider_reference", reference)
    .maybeSingle();

  if (error) return res.status(500).json({ error: "failed to fetch deposit" });
  if (!data) return res.status(404).json({ error: "not found" });
  if (!adminAccess && String(data.user_id || "") !== String(user.id)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const { data: paymentRow } = await supabaseAdmin
    .from("payments")
    .select("status,environment,payment_reference,payment_type,payment_timestamp,provider,reference")
    .eq("reference", reference)
    .maybeSingle();

  return res.status(200).json({
    ...data,
    payment_status: paymentRow?.status || data.status,
    environment: paymentRow?.environment || null,
    payment_reference: paymentRow?.payment_reference || paymentRow?.reference || reference,
    payment_type: paymentRow?.payment_type || null,
    payment_timestamp: paymentRow?.payment_timestamp || null
  });
}
