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
const TEST_PASSWORD = process.env.TEST_PASSWORD || "Passw0rd!";

const must = (name, value) => {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const url = must("SUPABASE_URL", SUPABASE_URL);
const anonKey = must("SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);
const serviceKey = must("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const nowTag = () => Date.now().toString(36);
const randEmail = (prefix) => `${prefix}+sim_${nowTag()}_${Math.floor(Math.random() * 1e6)}@example.com`;

const makeReq = ({ method = "GET", headers = {}, body = {}, query = {} } = {}) => ({
  method,
  headers,
  body,
  query,
  socket: { remoteAddress: "127.0.0.1" }
});

const makeRes = () => {
  const headers = {};
  let statusCode = 200;
  let payload = null;
  let ended = false;
  return {
    headers,
    setHeader(key, value) {
      headers[String(key).toLowerCase()] = value;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      ended = true;
      return this;
    },
    end(data = null) {
      payload = data;
      ended = true;
      return this;
    },
    get result() {
      return { statusCode, payload, headers, ended };
    }
  };
};

const invokeHandler = async (handler, reqInput) => {
  const req = makeReq(reqInput);
  const res = makeRes();
  await handler(req, res);
  return res.result;
};

async function ensureUserRow(user, role = "client") {
  const roleValue = role === "admin" ? "admins" : "client";
  const categoryValue = role === "admin" ? "admin" : "client";
  const { data: existing } = await admin
    .from("users")
    .select("user_id,profile_data,email,full_name,tier,status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const referralCode = `EDP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const { error } = await admin.from("users").insert({
      user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || "Simulation User",
      referral_code: referralCode,
      tier: 1,
      status: "active",
      profile_data: { role: roleValue, category: categoryValue, roles: [roleValue] }
    });
    if (error) throw new Error(`ensureUserRow insert failed: ${error.message}`);
    return;
  }

  const merged = {
    ...(existing.profile_data && typeof existing.profile_data === "object" ? existing.profile_data : {}),
    role: roleValue,
    category: categoryValue,
    roles: role === "admin" ? ["admins", "admin"] : ["client"]
  };
  const { error: updateErr } = await admin
    .from("users")
    .update({
      profile_data: merged,
      tier: Number(existing.tier) || 1,
      status: existing.status || "active"
    })
    .eq("user_id", user.id);
  if (updateErr) throw new Error(`ensureUserRow update failed: ${updateErr.message}`);
}

async function createUser(email, password, fullName) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });
  if (error) throw new Error(`createUser failed: ${error.message}`);
  return data.user;
}

async function signIn(email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn failed: ${error.message}`);
  return data.session?.access_token || "";
}

async function run() {
  const { default: adminSimHandler } = await import("../api/admin/simulate/events.js");
  const { default: paymentStatusHandler } = await import("../api/payments/status.js");

  const adminEmail = randEmail("admin");
  const targetEmail = randEmail("target");

  const adminUser = await createUser(adminEmail, TEST_PASSWORD, "Admin Simulation");
  const targetUser = await createUser(targetEmail, TEST_PASSWORD, "Target Simulation");
  await ensureUserRow(adminUser, "admin");
  await ensureUserRow(targetUser, "client");

  const adminToken = await signIn(adminEmail, TEST_PASSWORD);
  if (!adminToken) throw new Error("No admin access token returned.");

  const authHeader = { authorization: `Bearer ${adminToken}` };
  const actions = [
    { action: "deposit_success", amount: 5000, tier: 1 },
    { action: "deposit_failed", amount: 5000, tier: 1 },
    { action: "withdrawal_pending", amount: 700, tier: 1 },
    { action: "withdrawal_paid", amount: 450, tier: 1 },
    { action: "tier_upgrade", amount: 0, tier: 2 },
    { action: "earning_tx", amount: 180, tier: 2 },
    { action: "referral_tx", amount: 95, tier: 2 },
    { action: "adjustment_tx", amount: 40, tier: 2 }
  ];

  const actionResults = [];
  for (const item of actions) {
    const res = await invokeHandler(adminSimHandler, {
      method: "POST",
      headers: authHeader,
      body: {
        action: item.action,
        userId: targetUser.id,
        amount: item.amount,
        tier: item.tier,
        environment: "sandbox",
        phoneNumber: "254708374149"
      }
    });
    actionResults.push({ action: item.action, status: res.statusCode, payload: res.payload });
    if (res.statusCode !== 200) {
      throw new Error(`Action ${item.action} failed with HTTP ${res.statusCode}: ${JSON.stringify(res.payload)}`);
    }
  }

  const [paymentRows, depositRows, payoutRows, txRows, userRow, upgradeRows] = await Promise.all([
    admin
      .from("payments")
      .select("*")
      .eq("user_id", targetUser.id)
      .order("id", { ascending: false }),
    admin
      .from("deposits")
      .select("*")
      .eq("user_id", targetUser.id)
      .order("deposit_id", { ascending: false }),
    admin
      .from("payout_requests")
      .select("*")
      .eq("user_id", targetUser.id)
      .order("payout_id", { ascending: false }),
    admin
      .from("transactions")
      .select("*")
      .eq("user_id", targetUser.id)
      .order("tx_id", { ascending: false }),
    admin
      .from("users")
      .select("user_id,tier")
      .eq("user_id", targetUser.id)
      .maybeSingle(),
    admin
      .from("tier_upgrade_events")
      .select("*")
      .eq("user_id", targetUser.id)
      .order("event_id", { ascending: false })
      .limit(5)
  ]);

  const statusEndpoint = await invokeHandler(paymentStatusHandler, {
    method: "GET",
    headers: authHeader,
    query: { scope: "all", limit: "20" }
  });
  if (statusEndpoint.statusCode !== 200) {
    throw new Error(`payments/status failed with HTTP ${statusEndpoint.statusCode}`);
  }
  const statusPayments = Array.isArray(statusEndpoint.payload?.payments)
    ? statusEndpoint.payload.payments.filter((p) => String(p.user_id) === String(targetUser.id))
    : [];

  const depositSuccess = (depositRows.data || []).find((r) => String(r.status).toLowerCase() === "success");
  const depositFailed = (depositRows.data || []).find((r) => String(r.status).toLowerCase() === "failed");
  const paymentSuccess = (paymentRows.data || []).find((r) => String(r.status).toLowerCase() === "success");
  const paymentFailed = (paymentRows.data || []).find((r) => String(r.status).toLowerCase() === "failed");
  const payoutPending = (payoutRows.data || []).find((r) => String(r.status).toLowerCase() === "queued");
  const payoutPaid = (payoutRows.data || []).find((r) =>
    ["completed", "paid", "success"].includes(String(r.status).toLowerCase())
  );
  const earningTx = (txRows.data || []).find((r) => String(r.type).toLowerCase() === "accrual");
  const referralTx = (txRows.data || []).find((r) => String(r.type).toLowerCase() === "referral");
  const adjustmentTx = (txRows.data || []).find((r) => String(r.type).toLowerCase() === "adjustment");
  const upgradedTier = Number(userRow.data?.tier || 0) >= 2;
  const hasUpgradeEvent = Array.isArray(upgradeRows.data) && upgradeRows.data.length > 0;
  const hasTestingEnv = statusPayments.some(
    (p) => String(p.environment || "sandbox").toLowerCase() === "sandbox"
  );

  console.log("ADMIN SIMULATION LAB TEST");
  console.log("=========================");
  console.log(`Admin user: ${adminEmail}`);
  console.log(`Target user: ${targetEmail} (${targetUser.id})`);
  console.log("Actions:");
  for (const row of actionResults) {
    console.log(`- ${row.action}: HTTP ${row.status}`);
  }
  console.log("Verification:");
  console.log(`- Deposit success row created: ${depositSuccess ? "YES" : "NO"}`);
  console.log(`- Deposit failure row created: ${depositFailed ? "YES" : "NO"}`);
  console.log(`- Payment success row created: ${paymentSuccess ? "YES" : "NO"}`);
  console.log(`- Payment failure row created: ${paymentFailed ? "YES" : "NO"}`);
  console.log(`- Pending withdrawal row created: ${payoutPending ? "YES" : "NO"}`);
  console.log(`- Paid withdrawal row created: ${payoutPaid ? "YES" : "NO"}`);
  console.log(`- Earning transaction row created: ${earningTx ? "YES" : "NO"}`);
  console.log(`- Referral transaction row created: ${referralTx ? "YES" : "NO"}`);
  console.log(`- Adjustment transaction row created: ${adjustmentTx ? "YES" : "NO"}`);
  console.log(`- Tier upgraded to >=2: ${upgradedTier ? "YES" : "NO"}`);
  console.log(`- Tier upgrade event logged: ${hasUpgradeEvent ? "YES" : "NO"}`);
  console.log(`- payments/status shows sandbox environment: ${hasTestingEnv ? "YES" : "NO"}`);

  if (
    !depositSuccess ||
    !depositFailed ||
    !paymentSuccess ||
    !paymentFailed ||
    !payoutPending ||
    !payoutPaid ||
    !earningTx ||
    !referralTx ||
    !adjustmentTx ||
    !upgradedTier ||
    !hasUpgradeEvent ||
    !hasTestingEnv
  ) {
    throw new Error("One or more verification checks failed.");
  }
}

run().catch((err) => {
  console.error("ADMIN SIMULATION LAB TEST FAILED:", err.message);
  process.exit(1);
});
