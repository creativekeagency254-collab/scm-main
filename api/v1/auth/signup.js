import { createClient } from "@supabase/supabase-js";

import { applyApiSecurity, readClientIp } from "../../../lib/api/http-security.js";
import { checkRateLimit } from "../../../lib/api/rate-limit.js";
import { DEFAULT_AVATAR, pickAvatarForSeed } from "../../../src/features/profile/avatar-presets.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AUTH_REDIRECT_BASE =
  process.env.AUTH_REDIRECT_URL ||
  process.env.PUBLIC_APP_URL ||
  process.env.VITE_AUTH_REDIRECT_URL ||
  "";

const getAnon = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

const getService = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
const isStrongPassword = (value) => {
  const pwd = String(value || "");
  return pwd.length >= 8 && pwd.length <= 72;
};
const clean = (value) => String(value || "").trim();
const cleanAvatar = (value) => String(value || "").trim().slice(0, 2048);
const normalizeRefCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);

const isLocalHost = (host) => {
  const lower = String(host || "").toLowerCase();
  return (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("[::1]") ||
    lower.startsWith("0.0.0.0")
  );
};

const buildEmailRedirectTo = (req) => {
  const configured = clean(AUTH_REDIRECT_BASE).replace(/\/+$/, "");
  if (configured) {
    try {
      const url = new URL(configured);
      if (!isLocalHost(url.host || "")) return `${url.origin}/?auth=email`;
    } catch (_e) {
      // ignore invalid AUTH_REDIRECT_BASE and fall back to request headers
    }
  }

  const protoHeader = clean(req.headers?.["x-forwarded-proto"] || req.headers?.["X-Forwarded-Proto"]);
  const hostHeader = clean(req.headers?.["x-forwarded-host"] || req.headers?.["X-Forwarded-Host"] || req.headers?.host || "");
  const proto = protoHeader.includes(",")
    ? clean(protoHeader.split(",")[0])
    : protoHeader || (hostHeader && !isLocalHost(hostHeader) ? "https" : "http");

  if (hostHeader) {
    const host = hostHeader.includes(",") ? clean(hostHeader.split(",")[0]) : hostHeader;
    return `${proto}://${host}/?auth=email`;
  }

  if (configured) {
    try {
      const url = new URL(configured);
      return `${url.origin}/?auth=email`;
    } catch (_e) {
      return "";
    }
  }

  return "";
};

const isDuplicateSignupError = (message) => {
  const msg = String(message || "").toLowerCase();
  return (
    msg.includes("already registered") ||
    msg.includes("user already registered") ||
    msg.includes("already exists") ||
    msg.includes("duplicate key") ||
    msg.includes("exists")
  );
};

const resolveReferralCode = async (rawCode = "") => {
  const referralCode = normalizeRefCode(rawCode);
  if (!referralCode) return { code: "", error: null };
  const service = getService();
  if (!service) {
    return { code: referralCode, error: null };
  }
  try {
    const { data, error } = await service
      .from("users")
      .select("user_id,referral_code")
      .eq("referral_code", referralCode)
      .maybeSingle();
    if (error) {
      return { code: "", error: "unable to validate referral code" };
    }
    if (!data?.user_id) {
      return { code: "", error: "invalid referral code" };
    }
    return { code: referralCode, error: null };
  } catch (_e) {
    return { code: "", error: "unable to validate referral code" };
  }
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

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const rateKey = `auth-signup:${readClientIp(req) || "unknown"}`;
  const rate = checkRateLimit(rateKey, { windowMs: 10 * 60_000, max: 20 });
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(Math.max(Math.ceil(rate.retryAfterMs / 1000), 1)));
    return res.status(429).json({ error: "too many signup attempts" });
  }

  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const fullName = String(body.full_name || body.name || "").trim();
  const referredByInput = String(body.referred_by || body.ref || "").trim();
  const avatarInput = cleanAvatar(body.avatar_url || body.avatar || "");
  const signupAvatar = avatarInput || pickAvatarForSeed(email) || DEFAULT_AVATAR;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "invalid email" });
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: "password must be 8-72 characters" });
  }

  const { code: referredBy, error: referralError } = await resolveReferralCode(referredByInput);
  if (referralError) {
    return res.status(400).json({ error: referralError });
  }

  const anon = getAnon();
  if (!anon) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  try {
    const { data: created, error: createError } = await anon.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: buildEmailRedirectTo(req) || undefined,
        data: {
          full_name: fullName || null,
          referred_by: referredBy || null,
          avatar_url: signupAvatar
        }
      }
    });

    if (createError) {
      if (isDuplicateSignupError(createError.message)) {
        return res.status(409).json({ error: "email already registered" });
      }
      return res.status(400).json({ error: createError.message || "unable to create user" });
    }

    if (!created?.session) {
      return res.status(200).json({
        user: created?.user || null,
        message: "Account created. Check your email to verify your account, then sign in."
      });
    }

    return res.status(200).json({
      session: created.session,
      user: created.user || null
    });
  } catch (e) {
    console.error("auth signup error", e);
    return res.status(500).json({ error: "unable to create user" });
  }
}
