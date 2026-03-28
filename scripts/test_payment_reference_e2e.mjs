import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const FX_KES_PER_USD = 130;

const parseEnvFile = (filePath) => {
  const out = {};
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = String(line || "").trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    value = value.replace(/\\r\\n/g, "").trim();
    out[key] = value;
  }
  return out;
};

const toMoney = (value, digits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Number(n.toFixed(digits));
};

const toUsd = (kesAmount) => toMoney(Number(kesAmount) / FX_KES_PER_USD, 2);

const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exit(1);
};

const envFilePath = process.argv[2] || ".tmp_vercel_env_prod_latest";
if (!fs.existsSync(envFilePath)) fail(`env file not found: ${envFilePath}`);
const env = parseEnvFile(envFilePath);

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || "";
const API_BASE = (process.argv[3] || "https://scm-main-ruddy.vercel.app").replace(/\/+$/, "");

if (!SUPABASE_URL) fail("SUPABASE_URL missing");
if (!SUPABASE_SERVICE_ROLE_KEY) fail("SUPABASE_SERVICE_ROLE_KEY missing");
if (!SUPABASE_ANON_KEY) fail("VITE_SUPABASE_ANON_KEY missing");

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const email = `payref_test_${Date.now()}@example.com`;
const password = "Pass1234!";
const references = [];
let userId = "";

const callJson = async (url, token, body) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_e) {
    data = { raw: text };
  }
  return { status: res.status, ok: res.ok, data, raw: text };
};

const assertNoNullConstraintError = (payload) => {
  const msg = String(payload?.error || payload?.message || payload?.raw || "").toLowerCase();
  if (
    msg.includes("null value in column") &&
    msg.includes("payment_reference") &&
    msg.includes("not-null")
  ) {
    fail(`payment_reference null constraint still present: ${msg}`);
  }
};

try {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (created.error || !created.data?.user?.id) {
    fail(`create test user failed: ${created.error?.message || "unknown"}`);
  }
  userId = created.data.user.id;

  const login = await anon.auth.signInWithPassword({ email, password });
  if (login.error || !login.data?.session?.access_token) {
    fail(`login test user failed: ${login.error?.message || "unknown"}`);
  }
  const token = login.data.session.access_token;

  const tests = [
    {
      name: "Test 1: payflee/create-session plan 1",
      url: `${API_BASE}/api/payments/payflee/create-session`,
      body: {
        planId: 1,
        amountKES: 5000,
        amountUSD: toUsd(5000),
        userEmail: email,
        userId,
        preferredCurrency: "KES",
        successUrl: "/payment-success",
        cancelUrl: "/payment-cancel"
      }
    },
    {
      name: "Test 2: payflee/create-session plan 2",
      url: `${API_BASE}/api/payments/payflee/create-session`,
      body: {
        planId: 2,
        amountKES: 10000,
        amountUSD: toUsd(10000),
        userEmail: email,
        userId,
        preferredCurrency: "KES",
        successUrl: "/payment-success",
        cancelUrl: "/payment-cancel"
      }
    },
    {
      name: "Test 3: payflee/create-session plan 3",
      url: `${API_BASE}/api/payments/payflee/create-session`,
      body: {
        planId: 3,
        amountKES: 20000,
        amountUSD: toUsd(20000),
        userEmail: email,
        userId,
        preferredCurrency: "KES",
        successUrl: "/payment-success",
        cancelUrl: "/payment-cancel"
      }
    },
    {
      name: "Test 4: payflee/create-session plan 4",
      url: `${API_BASE}/api/payments/payflee/create-session`,
      body: {
        planId: 4,
        amountKES: 50000,
        amountUSD: toUsd(50000),
        userEmail: email,
        userId,
        preferredCurrency: "KES",
        successUrl: "/payment-success",
        cancelUrl: "/payment-cancel"
      }
    }
  ];

  for (const test of tests) {
    const result = await callJson(test.url, token, test.body);
    assertNoNullConstraintError(result.data);
    if (!result.ok) {
      fail(`${test.name} failed (${result.status}): ${JSON.stringify(result.data)}`);
    }
    const reference = String(result.data?.reference || "").trim();
    if (!reference) fail(`${test.name} missing payment reference`);
    references.push(reference);
    console.log(`PASS: ${test.name} -> ${reference}`);
  }

  const { data: rows, error: rowsError } = await admin
    .from("payments")
    .select("reference,payment_reference,provider,status,created_at")
    .in("reference", references);
  if (rowsError) fail(`failed to load created payment rows: ${rowsError.message}`);

  const byRef = new Map((rows || []).map((r) => [String(r.reference), r]));
  for (const reference of references) {
    const row = byRef.get(reference);
    if (!row) fail(`missing payment row for reference ${reference}`);
    const paymentReference = String(row.payment_reference || "").trim();
    if (!paymentReference) fail(`payment_reference is empty for ${reference}`);
    console.log(`PASS: DB row has payment_reference for ${reference}`);
  }

  console.log(`PASS: All 4 tests succeeded against ${API_BASE}`);
} finally {
  if (references.length && userId) {
    await admin.from("payments").delete().in("reference", references);
  }
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
  }
}
