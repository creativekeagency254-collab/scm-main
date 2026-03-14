import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

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
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const BRUTAL_USERS = process.env.BRUTAL_USERS || "3";
const BRUTAL_BATCHES = process.env.BRUTAL_BATCHES || "1";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "Passw0rd!";
const CLEANUP = process.env.CLEANUP || "0";

function must(name, value) {
  if (!value) throw new Error(`Missing ${name} env var`);
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowTag = () => Date.now().toString(36);
const randEmail = (prefix) => `${prefix}+${nowTag()}_${Math.floor(Math.random() * 1e6)}@example.com`;

async function startLocalServer() {
  if (API_BASE) return { base: API_BASE, server: null };
  const { startServer } = require("../server/index.js");
  const server = startServer(0);
  await new Promise((r) => server.once("listening", r));
  const addr = server.address();
  const base = `http://127.0.0.1:${addr.port}`;
  return { base, server };
}

async function createUser({ email, password, meta }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta || {}
  });
  if (error) throw new Error(`createUser failed: ${error.message}`);
  return data.user;
}

async function getUserRow(userId) {
  const { data, error } = await admin
    .from("users")
    .select("user_id, referral_code, referrer_id, tier, email")
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(`getUserRow failed: ${error.message}`);
  return data;
}

async function updateUserTier(userId, tier) {
  const { error } = await admin.from("users").update({ tier }).eq("user_id", userId);
  if (error) throw new Error(`updateUserTier failed: ${error.message}`);
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

async function insertViews(client, userId, tier, requiredCount = 2, optionalCount = 0) {
  const rows = [];
  for (let i = 0; i < requiredCount; i++) {
    rows.push({
      user_id: userId,
      video_id: `req-${nowTag()}-${i + 1}`,
      tier,
      duration_watched: 60,
      is_required: true,
      verified_by: "test"
    });
  }
  for (let i = 0; i < optionalCount; i++) {
    rows.push({
      user_id: userId,
      video_id: `opt-${nowTag()}-${i + 1}`,
      tier,
      duration_watched: 60,
      is_required: false,
      verified_by: "test"
    });
  }
  const { error } = await client.from("video_views").insert(rows);
  if (error) throw new Error(`insertViews failed: ${error.message}`);
}

async function claimEarning(client, kind = "manual") {
  const { data, error } = await client.rpc("claim_earning", {
    p_kind: kind,
    p_qty: 1,
    p_event_id: `evt_${nowTag()}`
  });
  if (error) throw new Error(`claim_earning failed: ${error.message}`);
  return data;
}

async function depositAndWebhook(base, userId, email, amount, tier) {
  const res = await fetch(`${base}/api/v1/deposit/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, user_id: userId, email, tier, method: "Paystack" })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`deposit/create failed: ${data?.error || data?.message || res.status}`);

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

  const whRes = await fetch(`${base}/api/v1/webhook/paystack`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": sig
    },
    body: raw
  });
  if (!whRes.ok) throw new Error(`webhook failed: ${whRes.status}`);

  // Idempotency check (send again, should not double credit)
  const whRes2 = await fetch(`${base}/api/v1/webhook/paystack`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": sig
    },
    body: raw
  });
  if (!whRes2.ok) throw new Error(`webhook second try failed: ${whRes2.status}`);

  return reference;
}

async function getWallet(userId) {
  const { data, error } = await admin
    .from("wallets")
    .select("balance, available_for_withdrawal, hold")
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(`getWallet failed: ${error.message}`);
  return data;
}

async function getReferrals(referrerId) {
  const { data, error } = await admin
    .from("referrals")
    .select("referrer_id,referred_user_id,commission_amount,created_at")
    .eq("referrer_id", referrerId);
  if (error) throw new Error(`getReferrals failed: ${error.message}`);
  return data || [];
}

async function requestWithdrawal(client, amount, phone = "") {
  const { data, error } = await client.rpc("request_withdrawal", {
    p_amount: amount,
    p_method: "M-Pesa",
    p_phone: phone
  });
  if (error) throw new Error(`request_withdrawal failed: ${error.message}`);
  return data;
}

async function cleanupUsers(userIds) {
  for (const id of userIds) {
    try {
      await admin.auth.admin.deleteUser(id);
    } catch {
      /* ignore */
    }
  }
}

async function runBatch(batchIndex, base) {
  const createdUserIds = [];
  const refEmail = randEmail(`ref${batchIndex}`);
  const refUser = await createUser({
    email: refEmail,
    password: TEST_PASSWORD,
    meta: { full_name: `Referrer ${batchIndex}` }
  });
  createdUserIds.push(refUser.id);
  await sleep(200);
  const refRow = await getUserRow(refUser.id);
  const refCode = refRow.referral_code;

  const users = [];
  const totalUsers = Number(BRUTAL_USERS);
  for (let i = 0; i < totalUsers; i++) {
    const email = randEmail(`user${batchIndex}_${i}`);
    const user = await createUser({
      email,
      password: TEST_PASSWORD,
      meta: { full_name: `User ${batchIndex}-${i}`, referred_by: refCode }
    });
    createdUserIds.push(user.id);
    const tier = i === 0 ? 2 : 1;
    await sleep(120);
    await updateUserTier(user.id, tier);
    users.push({ id: user.id, email, tier });
  }

  const results = [];
  for (const u of users) {
    const session = await signIn(u.email, TEST_PASSWORD);
    const client = authedClient(session.access_token);

    await insertViews(client, u.id, u.tier, 2, u.tier === 2 ? 1 : 0);
    await claimEarning(client, "manual");
    if (u.tier === 2) {
      await claimEarning(client, "bonus");
    }

    const reference = await depositAndWebhook(base, u.id, u.email, 1000, u.tier);
    const wallet = await getWallet(u.id);

    let payout = null;
    if (!payout) {
      payout = await requestWithdrawal(client, 50, "0700000000");
    }

    results.push({ user: u, reference, wallet });
  }

  const refs = await getReferrals(refUser.id);
  return { createdUserIds, refCode, results, refs };
}

async function main() {
  const { base, server } = await startLocalServer();
  const batches = Number(BRUTAL_BATCHES);
  const allCreated = [];
  const summaries = [];

  try {
    for (let b = 0; b < batches; b++) {
      const summary = await runBatch(b + 1, base);
      summaries.push(summary);
      allCreated.push(...summary.createdUserIds);
    }
  } finally {
    if (server) server.close();
  }

  const totalUsers = summaries.reduce((n, s) => n + s.results.length, 0);
  const totalRefs = summaries.reduce((n, s) => n + s.refs.length, 0);
  console.log("E2E brutal test complete");
  console.log(`Batches: ${summaries.length}`);
  console.log(`Users tested: ${totalUsers}`);
  console.log(`Referral rows: ${totalRefs}`);
  console.log("Sample wallet:", summaries[0]?.results[0]?.wallet || {});

  if (CLEANUP === "1") {
    await cleanupUsers(allCreated);
    console.log("Cleanup complete");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
