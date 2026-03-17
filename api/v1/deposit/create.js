import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

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

  const reference = `ep_${crypto.randomUUID().replace(/-/g, "")}`;

  const { error } = await supabaseAdmin
    .from("deposits")
    .insert({
      user_id: userId,
      amount,
      tier_at_deposit: tier,
      status: "pending",
      provider: method || "Manual",
      provider_reference: reference,
      created_at: new Date().toISOString()
    });

  if (error) {
    return res.status(500).json({ error: "failed to create deposit" });
  }

  return res.status(200).json({
    manual: true,
    reference,
    message: "Deposit request submitted for manual confirmation."
  });
}
