import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envPath = path.join(cwd, ".env");

const parseEnvFile = (text) => {
  const out = {};
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    out[key] = value;
  }
  return out;
};

const looksPlaceholder = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return false;
  return (
    v.includes("your_") ||
    v.includes("your-") ||
    v.includes("example") ||
    v.includes("changeme") ||
    v.includes("replace_me") ||
    v.includes("replace-with")
  );
};

const values = (() => {
  let fileValues = {};
  if (fs.existsSync(envPath)) {
    fileValues = parseEnvFile(fs.readFileSync(envPath, "utf8"));
  }
  return { ...fileValues, ...process.env };
})();

const criticalVars = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
];

const paymentVars = [
  "KORA_PUBLIC_KEY",
  "KORA_SECRET_KEY",
  "KORA_WEBHOOK_URL",
  "KORA_CALLBACK_URL"
];

const missingCritical = [];
const placeholderCritical = [];
const missingPayment = [];
const placeholderPayment = [];
const warnings = [];

for (const key of criticalVars) {
  const value = values[key];
  if (!value) missingCritical.push(key);
  else if (looksPlaceholder(value)) placeholderCritical.push(key);
}

for (const key of paymentVars) {
  const value = values[key];
  if (!value) missingPayment.push(key);
  else if (looksPlaceholder(value)) placeholderPayment.push(key);
}

const apiBaseRaw = String(values.VITE_API_BASE || "").trim();
if (apiBaseRaw) {
  const lower = apiBaseRaw.toLowerCase();
  const isLocal =
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("0.0.0.0");
  if (isLocal) {
    warnings.push(
      "VITE_API_BASE points to localhost. Leave it empty on Vercel so the app uses same-origin /api routes."
    );
  }
}

for (const key of ["KORA_CALLBACK_URL", "KORA_WEBHOOK_URL"]) {
  const value = String(values[key] || "").trim().toLowerCase();
  if (!value) continue;
  if (value.startsWith("http://")) {
    warnings.push(`${key} is using http://. Use https:// for production callbacks/webhooks.`);
  }
}

const hasBlockingErrors =
  missingCritical.length > 0 || placeholderCritical.length > 0;

console.log("Vercel preflight checks");
console.log("======================");

if (!fs.existsSync(envPath)) {
  console.log("- .env file not found (this is okay if vars are set in Vercel Project Settings).");
}

if (missingCritical.length) {
  console.log(`- Missing critical vars: ${missingCritical.join(", ")}`);
}
if (placeholderCritical.length) {
  console.log(`- Placeholder critical vars: ${placeholderCritical.join(", ")}`);
}

if (!missingPayment.length && !placeholderPayment.length) {
  console.log("- Payment envs look present.");
} else {
  if (missingPayment.length) {
    console.log(`- Missing payment vars: ${missingPayment.join(", ")}`);
  }
  if (placeholderPayment.length) {
    console.log(`- Placeholder payment vars: ${placeholderPayment.join(", ")}`);
  }
}

if (warnings.length) {
  console.log("- Warnings:");
  for (const w of warnings) console.log(`  - ${w}`);
}

if (hasBlockingErrors) {
  console.log("\nPreflight failed. Fix critical env vars before deploying.");
  process.exit(1);
}

console.log("\nPreflight passed for critical env vars.");
