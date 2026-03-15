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
const randEmail = () => `user+flow_${nowTag()}_${Math.floor(Math.random() * 1e6)}@example.com`;

async function main() {
  const email = randEmail();
  const password = TEST_PASSWORD;

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Flow Test" }
  });
  if (cErr) throw new Error(`createUser failed: ${cErr.message}`);
  const userId = created.user?.id;
  if (!userId) throw new Error("No user id returned");

  // Mark tier selected and set tier 1 (no deposit)
  await admin
    .from("users")
    .update({
      tier: 1,
      profile_data: { tier_selected: true }
    })
    .eq("user_id", userId);

  const { data: session, error: sErr } = await anon.auth.signInWithPassword({
    email,
    password
  });
  if (sErr) throw new Error(`signIn failed: ${sErr.message}`);
  const accessToken = session?.session?.access_token;
  if (!accessToken) throw new Error("No session token");

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });

  // Insert required views
  const today = new Date().toISOString();
  const { error: vErr } = await client.from("video_views").insert([
    { user_id: userId, video_id: `req-${nowTag()}-1`, tier: 1, duration_watched: 60, watched_at: today, verified_by: "test", is_required: true },
    { user_id: userId, video_id: `req-${nowTag()}-2`, tier: 1, duration_watched: 60, watched_at: today, verified_by: "test", is_required: true }
  ]);
  if (vErr) throw new Error(`insert views failed: ${vErr.message}`);

  // Earn (should succeed)
  const { data: earnData, error: earnErr } = await client.rpc("claim_earning", {
    p_kind: "manual",
    p_qty: 1,
    p_event_id: `evt_${nowTag()}`
  });
  if (earnErr) throw new Error(`claim_earning failed: ${earnErr.message}`);
  const earnRow = Array.isArray(earnData) ? earnData[0] : earnData;

  // Withdraw (should fail without deposit)
  const { error: wdErr } = await client.rpc("request_withdrawal", {
    p_amount: 50,
    p_method: "M-Pesa",
    p_phone: "0700000000"
  });

  console.log("FLOW TEST OK");
  console.log(`Email: ${email}`);
  console.log(`Earned: ${earnRow?.credited_amount ?? 0}`);
  console.log(`Withdraw blocked: ${wdErr ? "yes" : "no"}`);
  if (wdErr) console.log(`Withdraw error: ${wdErr.message}`);
}

main().catch((err) => {
  console.error("FLOW TEST FAILED:", err.message);
  process.exit(1);
});
