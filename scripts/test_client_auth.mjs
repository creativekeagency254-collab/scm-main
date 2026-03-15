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

function must(name, value) {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

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
const randEmail = () => `user+auth_${nowTag()}_${Math.floor(Math.random() * 1e6)}@example.com`;

async function main() {
  const email = randEmail();
  const password = TEST_PASSWORD;

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Test Client" }
  });
  if (cErr) throw new Error(`createUser failed: ${cErr.message}`);
  const userId = created.user?.id;
  if (!userId) throw new Error("No user id returned");

  const { data: userRow, error: uErr } = await admin
    .from("users")
    .select("user_id, email, referral_code, tier, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (uErr) throw new Error(`users lookup failed: ${uErr.message}`);

  const { data: walletRow, error: wErr } = await admin
    .from("wallets")
    .select("wallet_id, user_id, balance, available_for_withdrawal, hold")
    .eq("user_id", userId)
    .maybeSingle();
  if (wErr) throw new Error(`wallets lookup failed: ${wErr.message}`);

  const { data: session, error: sErr } = await anon.auth.signInWithPassword({
    email,
    password
  });
  if (sErr) throw new Error(`signIn failed: ${sErr.message}`);

  const okUser = !!userRow?.user_id;
  const okWallet = !!walletRow?.wallet_id;
  const okLogin = !!session?.session?.access_token;

  console.log("CLIENT AUTH TEST OK");
  console.log(`Email: ${email}`);
  console.log(`User row: ${okUser ? "present" : "missing"}`);
  console.log(`Wallet row: ${okWallet ? "present" : "missing"}`);
  console.log(`Login: ${okLogin ? "ok" : "failed"}`);
}

main().catch((err) => {
  console.error("CLIENT AUTH TEST FAILED:", err.message);
  process.exit(1);
});
