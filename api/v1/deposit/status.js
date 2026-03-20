import { createClient } from "@supabase/supabase-js";

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

  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const { user, error: authError } = await getAuthUser(supabaseAdmin, req);
  if (authError || !user?.id) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const adminAccess = await isAdminUser(supabaseAdmin, user.id);

  const reference = String(req.query?.reference || "").trim();
  if (!reference) return res.status(400).json({ error: "reference required" });

  const { data, error } = await supabaseAdmin
    .from("deposits")
    .select("status, amount, user_id, tier_at_deposit, confirmed_at")
    .eq("provider_reference", reference)
    .maybeSingle();

  if (error) return res.status(500).json({ error: "failed to fetch deposit" });
  if (!data) return res.status(404).json({ error: "not found" });
  if (!adminAccess && String(data.user_id || "") !== String(user.id)) {
    return res.status(403).json({ error: "forbidden" });
  }

  return res.status(200).json(data);
}
