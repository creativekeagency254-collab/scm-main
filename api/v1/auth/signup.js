import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const getAdmin = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

const getAnon = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");
  const fullName = String(req.body?.full_name || req.body?.name || "").trim();
  const referredBy = String(req.body?.referred_by || req.body?.ref || "").trim();

  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }

  const admin = getAdmin();
  const anon = getAnon();
  if (!admin || !anon) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName || null,
      referred_by: referredBy || null
    }
  });

  if (createError) {
    return res.status(400).json({ error: createError.message || "Unable to create user" });
  }

  const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password
  });

  if (signInError || !signInData?.session) {
    return res.status(200).json({
      user: created?.user || null,
      message: "Account created. Please sign in."
    });
  }

  return res.status(200).json({
    session: signInData.session,
    user: signInData.user
  });
}
