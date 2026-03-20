import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { getTransactionStatus, isKoraConfigured } from "../api/lib/pesapal.js";

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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RECON_LIMIT = Number(process.env.RECON_LIMIT || "200");
const RECON_DAYS = Number(process.env.RECON_DAYS || "7");
const SOURCE = "reconcile";
const KORA_MOCK_ENABLED = String(process.env.KORA_MOCK || "").trim() === "1";
const ALLOW_MOCK_RECON = String(process.env.ALLOW_MOCK_RECON || "").trim() === "1";

function must(name, value) {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const toMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Number(n.toFixed(2));
};

const normalizeStatus = (payload) => {
  const desc = String(
    payload?.payment_status_description ||
      payload?.payment_status ||
      payload?.transaction_status ||
      payload?.status ||
      ""
  ).toLowerCase();
  const codeRaw = payload?.status_code ?? payload?.statusCode;
  const code = Number.isFinite(Number(codeRaw)) ? Number(codeRaw) : null;
  if (code === 1 || desc === "completed" || desc === "success") return "success";
  if (code === 2 || code === 0 || code === 3 || ["failed", "invalid", "reversed"].includes(desc)) return "failed";
  return "pending";
};

const url = must("SUPABASE_URL", SUPABASE_URL);
const serviceKey = must("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function safeInsert(table, row) {
  try {
    await admin.from(table).insert(row);
  } catch (e) {
    // ignore if optional telemetry tables are not deployed yet
  }
}

async function main() {
  if (!isKoraConfigured()) {
    throw new Error("Kora is not configured (missing KORA_SECRET_KEY / KORA_MOCK).");
  }
  if (KORA_MOCK_ENABLED && !ALLOW_MOCK_RECON) {
    throw new Error("Refusing to run reconciliation with KORA_MOCK=1. Set ALLOW_MOCK_RECON=1 only for test environments.");
  }

  const cutoff = new Date(Date.now() - RECON_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: deps, error: depErr } = await admin
    .from("deposits")
    .select("deposit_id,user_id,amount,status,tier_at_deposit,provider,provider_reference,created_at")
    .in("status", ["pending", "failed"])
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(RECON_LIMIT);

  if (depErr) throw new Error(`Failed to load deposits: ${depErr.message}`);
  const rows = deps || [];

  let successCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  let mismatchCount = 0;
  let errorCount = 0;

  for (const dep of rows) {
    const merchantReference = String(dep.provider_reference || "").trim();
    if (!merchantReference) continue;

    try {
      const statusPayload = await getTransactionStatus(merchantReference);
      const status = normalizeStatus(statusPayload);
      const expectedAmount = toMoney(dep.amount);
      const providerAmount = toMoney(
        statusPayload?.amount ??
          statusPayload?.data?.amount ??
          statusPayload?.amount_paid ??
          statusPayload?.data?.amount_paid
      );
      const currency =
        String(statusPayload?.currency || statusPayload?.data?.currency || "").trim().toUpperCase() || null;
      const amountMismatch =
        status === "success" &&
        expectedAmount !== null &&
        providerAmount !== null &&
        Math.abs(expectedAmount - providerAmount) > 0.009;

      if (amountMismatch) {
        mismatchCount += 1;
        await admin
          .from("deposits")
          .update({ status: "failed" })
          .eq("provider_reference", merchantReference)
          .neq("status", "success");
        await safeInsert("payment_flags", {
          provider: "kora",
          source: SOURCE,
          reason: "amount_mismatch",
          merchant_reference: merchantReference,
          tracking_id: merchantReference,
          expected_amount: expectedAmount,
          provider_amount: providerAmount,
          currency,
          payload: statusPayload,
          status: "open"
        });
        await safeInsert("payment_audit_events", {
          provider: "kora",
          source: SOURCE,
          tracking_id: merchantReference,
          merchant_reference: merchantReference,
          decision: "rejected",
          expected_amount: expectedAmount,
          provider_amount: providerAmount,
          currency,
          payload: statusPayload
        });
        continue;
      }

      if (status === "success") {
        const { error } = await admin.rpc("confirm_deposit_success", {
          p_provider_reference: merchantReference
        });
        if (error) throw new Error(error.message || "confirm_deposit_success failed");
        successCount += 1;
        await safeInsert("payment_audit_events", {
          provider: "kora",
          source: SOURCE,
          tracking_id: merchantReference,
          merchant_reference: merchantReference,
          decision: "success",
          expected_amount: expectedAmount,
          provider_amount: providerAmount,
          currency,
          payload: statusPayload
        });
      } else if (status === "failed") {
        failedCount += 1;
        await admin
          .from("deposits")
          .update({ status: "failed" })
          .eq("provider_reference", merchantReference)
          .neq("status", "success");
        await safeInsert("payment_audit_events", {
          provider: "kora",
          source: SOURCE,
          tracking_id: merchantReference,
          merchant_reference: merchantReference,
          decision: "failed",
          expected_amount: expectedAmount,
          provider_amount: providerAmount,
          currency,
          payload: statusPayload
        });
      } else {
        pendingCount += 1;
        await safeInsert("payment_audit_events", {
          provider: "kora",
          source: SOURCE,
          tracking_id: merchantReference,
          merchant_reference: merchantReference,
          decision: "pending",
          expected_amount: expectedAmount,
          provider_amount: providerAmount,
          currency,
          payload: statusPayload
        });
      }
    } catch (e) {
      errorCount += 1;
      await safeInsert("payment_flags", {
        provider: "kora",
        source: SOURCE,
        reason: "reconcile_error",
        merchant_reference: merchantReference,
        tracking_id: merchantReference,
        expected_amount: toMoney(dep.amount),
        payload: { error: String(e?.message || e) },
        status: "open"
      });
    }
  }

  console.log("RECONCILE KORA PAYMENTS COMPLETE");
  console.log(`Scanned: ${rows.length}`);
  console.log(`Confirmed success: ${successCount}`);
  console.log(`Marked failed: ${failedCount}`);
  console.log(`Still pending: ${pendingCount}`);
  console.log(`Amount mismatches flagged: ${mismatchCount}`);
  console.log(`Errors flagged: ${errorCount}`);
}

main().catch((err) => {
  console.error("RECONCILE KORA PAYMENTS FAILED:", err.message);
  process.exit(1);
});
