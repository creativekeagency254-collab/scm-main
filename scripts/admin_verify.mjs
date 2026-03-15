import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (!key || process.env[key]) return;
    if (val.startsWith("\"") && val.endsWith("\"")) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    process.env[key] = val;
  });
}

loadEnvFile(path.resolve(__dirname, "..", ".env"));
loadEnvFile(path.resolve(__dirname, "..", "server", ".env"));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE = process.env.API_BASE || process.env.VITE_API_BASE;
const TEST_PASSWORD = process.env.TEST_PASSWORD || "Passw0rd!";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

function must(name, value) {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const url = must("SUPABASE_URL", SUPABASE_URL);
const anonKey = must("SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);
const serviceKey = must("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
const paystackSecret = must("PAYSTACK_SECRET_KEY", PAYSTACK_SECRET_KEY);

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const nowTag = () => Date.now().toString(36);
const randEmail = (prefix) => `${prefix}+${nowTag()}_${Math.floor(Math.random() * 1e6)}@example.com`;

async function createUser(email, password, meta = {}) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta
  });
  if (error) throw new Error(`createUser failed: ${error.message}`);
  return data.user;
}

async function ensureUserRow(user, role = "client") {
  const { data: row } = await admin
    .from("users")
    .select("user_id,profile_data,email,full_name,referral_code,status,tier")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) {
    const referral_code = `EDP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const { error } = await admin.from("users").insert({
      user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || "User",
      referral_code,
      tier: 1,
      status: "active",
      profile_data: { role, category: role === "admin" ? "Admin" : "Client" }
    });
    if (error) throw new Error(`ensureUserRow insert failed: ${error.message}`);
    return;
  }
  const merged = { ...(row.profile_data || {}), role };
  const { error: upErr } = await admin
    .from("users")
    .update({ profile_data: merged })
    .eq("user_id", user.id);
  if (upErr) throw new Error(`ensureUserRow update failed: ${upErr.message}`);
}

async function signIn(email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn failed: ${error.message}`);
  return data.session;
}

function authedClient(accessToken) {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
}

async function creditBalance(userId, amount) {
  const { error } = await admin.rpc("apply_wallet_tx", {
    p_user_id: userId,
    p_type: "adjustment",
    p_amount: amount,
    p_related_id: null,
    p_reference: `admin-verify-${nowTag()}`
  });
  if (error) throw new Error(`creditBalance failed: ${error.message}`);
}

async function requestWithdrawal(client, amount) {
  const { data, error } = await client.rpc("request_withdrawal", {
    p_amount: amount,
    p_method: "M-Pesa",
    p_phone: "0700000000"
  });
  if (error) throw new Error(`request_withdrawal failed: ${error.message}`);
  return data;
}

async function getLatestPayout(userId) {
  const { data, error } = await admin
    .from("payout_requests")
    .select("payout_id,status,scheduled_for")
    .eq("user_id", userId)
    .order("scheduled_for", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestPayout failed: ${error.message}`);
  return data;
}

async function updatePayout(client, payoutId, status) {
  const { data, error } = await client
    .from("payout_requests")
    .update({ status })
    .eq("payout_id", payoutId)
    .select("payout_id,status")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("no rows updated");
  return data;
}

async function depositAndWebhook(userId, email, amount, tier) {
  if (!API_BASE) throw new Error("API_BASE not set");
  const res = await fetch(`${API_BASE}/api/v1/deposit/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, user_id: userId, email, tier, method: "Paystack" })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || data?.error || data?.message || res.status);
  const reference = data.reference;

  const payload = {
    event: "charge.success",
    data: {
      reference,
      amount: Math.round(amount * 100),
      metadata: { user_id: userId, tier }
    }
  };
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac("sha512", paystackSecret).update(raw).digest("hex");
  const whRes = await fetch(`${API_BASE}/api/v1/webhook/paystack`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": sig
    },
    body: raw
  });
  if (!whRes.ok) throw new Error(`webhook failed: ${whRes.status}`);
  return reference;
}

async function depositInit(userId, email) {
  if (!API_BASE) throw new Error("API_BASE not set");
  const res = await fetch(`${API_BASE}/api/v1/deposit/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 1000, user_id: userId, email, tier: 1, method: "Paystack" })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || data?.error || data?.message || res.status);
  if (!data?.authorization_url) throw new Error("Missing authorization_url");
  return data.authorization_url;
}

async function main() {
  const adminEmail = randEmail("admin");
  const userEmail = randEmail("user");

  const adminUser = await createUser(adminEmail, TEST_PASSWORD, { full_name: "Admin Test" });
  const normalUser = await createUser(userEmail, TEST_PASSWORD, { full_name: "User Test" });

  await ensureUserRow(adminUser, "admin");
  await ensureUserRow(normalUser, "client");

  await depositAndWebhook(normalUser.id, userEmail, 1000, 1);
  await creditBalance(normalUser.id, 200);
  const userSession = await signIn(userEmail, TEST_PASSWORD);
  const userClient = authedClient(userSession.access_token);
  await requestWithdrawal(userClient, 50);

  const payout = await getLatestPayout(normalUser.id);
  if (!payout?.payout_id) throw new Error("Payout not found");

  let nonAdminFailed = false;
  try {
    await updatePayout(userClient, payout.payout_id, "processing");
  } catch {
    nonAdminFailed = true;
  }
  if (!nonAdminFailed) throw new Error("Non-admin update unexpectedly succeeded");

  const adminSession = await signIn(adminEmail, TEST_PASSWORD);
  const adminClient = authedClient(adminSession.access_token);
  await updatePayout(adminClient, payout.payout_id, "processing");
  await updatePayout(adminClient, payout.payout_id, "completed");

  const authUrl = await depositInit(normalUser.id, userEmail);

  console.log("ADMIN VERIFY OK");
  console.log(`Admin user: ${adminEmail}`);
  console.log(`Normal user: ${userEmail}`);
  console.log(`Payout status: completed`);
  console.log(`Paystack auth URL: ${authUrl}`);
}

main().catch((err) => {
  console.error("ADMIN VERIFY FAILED:", err.message);
  process.exit(1);
});
