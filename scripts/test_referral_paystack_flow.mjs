import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_API_BASE = "https://scm-main-ruddy.vercel.app";
const DEFAULT_RUNS = 4;
const PLAN_ID = 1;
const PLAN_AMOUNT_KES = 5000;
const PLAN_AMOUNT_USD = 38.46; // 5000 / 130
const EXPECTED_REFERRAL_COMMISSION = 500;

const parseEnvFile = (filePath) => {
  const out = {};
  if (!filePath || !fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = String(line || "").trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    out[key] = value.replace(/\\r\\n/g, "").trim();
  }
  return out;
};

const envPath = process.argv[2] || ".tmp_vercel_env_prod_latest";
const fileEnv = parseEnvFile(envPath);
const envGet = (name, fallback = "") => process.env[name] || fileEnv[name] || fallback;

const SUPABASE_URL = envGet("SUPABASE_URL", envGet("VITE_SUPABASE_URL"));
const SUPABASE_SERVICE_ROLE_KEY = envGet("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = envGet("VITE_SUPABASE_ANON_KEY", envGet("SUPABASE_ANON_KEY"));
const API_BASE = String(process.argv[3] || envGet("API_BASE", DEFAULT_API_BASE)).replace(/\/+$/, "");
const RUNS = Number(process.argv[4] || envGet("REFERRAL_TEST_RUNS", String(DEFAULT_RUNS)));
const TEST_PASSWORD = envGet("TEST_PASSWORD", "Pass1234!");

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_ANON_KEY) throw new Error("Missing VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY");
if (!Number.isInteger(RUNS) || RUNS <= 0) throw new Error("RUNS must be a positive integer");

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nowTag = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const fail = (message) => {
  throw new Error(message);
};

const requireCondition = (condition, message) => {
  if (!condition) fail(message);
};

const createUser = async ({ email, password, metadata = {} }) => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata
  });
  if (error || !data?.user?.id) {
    fail(`createUser failed for ${email}: ${error?.message || "unknown error"}`);
  }
  return data.user;
};

const deleteUserQuietly = async (userId) => {
  if (!userId) return;
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch (_err) {
    // ignore cleanup errors
  }
};

const getUserRow = async (userId) => {
  const { data, error } = await admin
    .from("users")
    .select("user_id,referrer_id,referral_code,tier,status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) fail(`getUserRow failed: ${error.message}`);
  return data || null;
};

const waitForUserRow = async (userId, { maxAttempts = 15, delayMs = 500 } = {}) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const row = await getUserRow(userId);
    if (row) return row;
    await sleep(delayMs);
  }
  return null;
};

const signInUser = async ({ email, password }) => {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data?.session?.access_token) {
    fail(`signInWithPassword failed for ${email}: ${error?.message || "unknown error"}`);
  }
  return data.session.access_token;
};

const createPaymentSession = async ({ token, userId, email }) => {
  const response = await fetch(`${API_BASE}/api/payments/payflee/create-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      planId: PLAN_ID,
      amountKES: PLAN_AMOUNT_KES,
      amountUSD: PLAN_AMOUNT_USD,
      userEmail: email,
      userId,
      preferredCurrency: "KES",
      successUrl: "/dashboard",
      cancelUrl: "/payment-cancel"
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    fail(
      `create-session failed (${response.status}): ${JSON.stringify(payload).slice(0, 300)}`
    );
  }
  const reference = String(payload?.reference || "").trim();
  requireCondition(reference, "create-session response missing reference");
  return { reference, payload };
};

const getPaymentRow = async (reference) => {
  const { data, error } = await admin
    .from("payments")
    .select("reference,payment_reference,status,user_id,amount,currency,provider,metadata")
    .eq("reference", reference)
    .maybeSingle();
  if (error) fail(`failed to fetch payment row: ${error.message}`);
  return data || null;
};

const getReferralRows = async (referrerId, referredUserId) => {
  const { data, error } = await admin
    .from("referrals")
    .select("ref_id,referrer_id,referred_user_id,deposit_id,commission_amount,created_at")
    .eq("referrer_id", referrerId)
    .eq("referred_user_id", referredUserId);
  if (error) fail(`failed to fetch referrals: ${error.message}`);
  return Array.isArray(data) ? data : [];
};

const getReferralTransactions = async (reference) => {
  const refTx = `ref:${reference}`;
  const { data, error } = await admin
    .from("transactions")
    .select("tx_id,user_id,type,amount,reference,created_at")
    .eq("reference", refTx)
    .eq("type", "referral");
  if (error) fail(`failed to fetch referral transactions: ${error.message}`);
  return Array.isArray(data) ? data : [];
};

const getWallet = async (userId) => {
  const { data, error } = await admin
    .from("wallets")
    .select("balance,available_for_withdrawal,hold")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) fail(`failed to fetch wallet: ${error.message}`);
  return data || null;
};

const applyDepositSuccess = async (reference) => {
  const { data, error } = await admin.rpc("confirm_deposit_success", {
    p_provider_reference: reference
  });
  if (error) fail(`confirm_deposit_success failed: ${error.message}`);
  return Array.isArray(data) ? data[0] : data;
};

const patchPaymentSuccess = async (reference) => {
  const nowIso = new Date().toISOString();
  let updateResult = await admin
    .from("payments")
    .update({
      status: "success",
      paystack_reference: reference,
      provider_transaction_id: reference,
      callback_received_at: nowIso,
      updated_at: nowIso
    })
    .eq("reference", reference);
  if (updateResult.error) {
    const msg = String(updateResult.error.message || "").toLowerCase();
    const missingPaystackReferenceColumn =
      msg.includes("paystack_reference") &&
      (msg.includes("schema cache") || msg.includes("does not exist") || msg.includes("column"));
    if (missingPaystackReferenceColumn) {
      updateResult = await admin
        .from("payments")
        .update({
          status: "success",
          provider_transaction_id: reference,
          callback_received_at: nowIso,
          updated_at: nowIso
        })
        .eq("reference", reference);
    }
  }
  if (updateResult.error) fail(`failed to patch payment success: ${updateResult.error.message}`);
};

const checkCallbackRedirect = async (reference) => {
  const response = await fetch(
    `${API_BASE}/api/paystack/callback?reference=${encodeURIComponent(reference)}`,
    {
      method: "GET",
      redirect: "manual"
    }
  );
  requireCondition(
    response.status === 302,
    `callback expected 302 redirect, got ${response.status}`
  );
  const location = String(response.headers.get("location") || "").trim();
  requireCondition(location, "callback redirect missing Location header");
  requireCondition(
    /\/dashboard/i.test(location),
    `callback should redirect to dashboard, got: ${location}`
  );
  requireCondition(
    location.includes(`reference=${encodeURIComponent(reference)}`) || location.includes(`reference=${reference}`),
    `callback redirect missing reference query param: ${location}`
  );
  return location;
};

const runSingleTest = async (index) => {
  const referrerEmail = `referrer_${index}_${nowTag()}@example.com`;
  const referredEmail = `referred_${index}_${nowTag()}@example.com`;
  let referrerId = "";
  let referredId = "";

  try {
    const referrerUser = await createUser({
      email: referrerEmail,
      password: TEST_PASSWORD,
      metadata: { full_name: `Referrer ${index}` }
    });
    referrerId = referrerUser.id;

    const referrerRow = await waitForUserRow(referrerId);
    requireCondition(referrerRow, "referrer row was not created in users table");
    const referralCode = String(referrerRow.referral_code || "").trim();
    requireCondition(referralCode, "referrer referral_code is empty");

    const referredUser = await createUser({
      email: referredEmail,
      password: TEST_PASSWORD,
      metadata: {
        full_name: `Referred ${index}`,
        referred_by: referralCode
      }
    });
    referredId = referredUser.id;

    let referredRow = null;
    for (let attempt = 1; attempt <= 15; attempt++) {
      referredRow = await getUserRow(referredId);
      if (referredRow?.referrer_id === referrerId) break;
      await sleep(500);
    }
    requireCondition(referredRow, "referred row was not created in users table");
    requireCondition(
      String(referredRow.referrer_id || "") === referrerId,
      `referred user referrer_id mismatch (expected ${referrerId}, got ${referredRow.referrer_id || "null"})`
    );

    const token = await signInUser({ email: referredEmail, password: TEST_PASSWORD });
    const { reference } = await createPaymentSession({
      token,
      userId: referredId,
      email: referredEmail
    });

    const paymentRow = await getPaymentRow(reference);
    requireCondition(paymentRow, `payment row missing for ${reference}`);
    requireCondition(
      String(paymentRow.payment_reference || "").trim().length > 0,
      `payment_reference is empty for ${reference}`
    );

    const firstApply = await applyDepositSuccess(reference);
    requireCondition(firstApply?.updated === true, "confirm_deposit_success did not return updated=true");
    await patchPaymentSuccess(reference);

    const referralsAfterFirst = await getReferralRows(referrerId, referredId);
    requireCondition(
      referralsAfterFirst.length === 1,
      `expected 1 referral row after first success, got ${referralsAfterFirst.length}`
    );
    const commission = Number(referralsAfterFirst[0]?.commission_amount);
    requireCondition(
      Number.isFinite(commission) && Math.abs(commission - EXPECTED_REFERRAL_COMMISSION) <= 0.01,
      `unexpected referral commission ${commission}`
    );

    const txAfterFirst = await getReferralTransactions(reference);
    requireCondition(
      txAfterFirst.length === 1,
      `expected 1 referral transaction after first success, got ${txAfterFirst.length}`
    );

    const wallet = await getWallet(referrerId);
    const walletBalance = Number(wallet?.balance);
    requireCondition(
      Number.isFinite(walletBalance) && walletBalance >= EXPECTED_REFERRAL_COMMISSION,
      `referrer wallet balance not credited correctly (balance=${walletBalance})`
    );

    await applyDepositSuccess(reference);
    const referralsAfterSecond = await getReferralRows(referrerId, referredId);
    const txAfterSecond = await getReferralTransactions(reference);
    requireCondition(
      referralsAfterSecond.length === 1,
      `duplicate referral row detected after second confirmation (${referralsAfterSecond.length})`
    );
    requireCondition(
      txAfterSecond.length === 1,
      `duplicate referral transaction detected after second confirmation (${txAfterSecond.length})`
    );

    const redirectLocation = await checkCallbackRedirect(reference);

    return {
      ok: true,
      reference,
      referralCode,
      redirectLocation
    };
  } finally {
    await deleteUserQuietly(referredId);
    await deleteUserQuietly(referrerId);
  }
};

const main = async () => {
  console.log(`Running ${RUNS} referral flow tests against ${API_BASE}`);
  let passed = 0;
  for (let i = 1; i <= RUNS; i++) {
    const result = await runSingleTest(i);
    passed += 1;
    console.log(
      `PASS ${i}/${RUNS}: ref=${result.reference} code=${result.referralCode} redirect=${result.redirectLocation}`
    );
  }
  console.log(`SUCCESS: ${passed}/${RUNS} referral flow tests passed.`);
};

main().catch((error) => {
  console.error(`FAIL: ${error?.message || String(error)}`);
  process.exit(1);
});
