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
  "MPESA_ENVIRONMENT",
  "MPESA_CONSUMER_KEY",
  "MPESA_CONSUMER_SECRET",
  "MPESA_PASSKEY",
  "MPESA_SHORTCODE"
];
const paymentRecommendedVars = [
  "MPESA_CALLBACK_SECRET",
  "MPESA_SIMULATION_TOKEN"
];

const missingCritical = [];
const placeholderCritical = [];
const missingPayment = [];
const placeholderPayment = [];
const missingPaymentRecommended = [];
const placeholderPaymentRecommended = [];
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
for (const key of paymentRecommendedVars) {
  const value = values[key];
  if (!value) missingPaymentRecommended.push(key);
  else if (looksPlaceholder(value)) placeholderPaymentRecommended.push(key);
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

for (const key of ["PAYFLEE_API_BASE_URL", "PAYNECTA_API_URL", "MPESA_API_BASE_URL"]) {
  const value = String(values[key] || "").trim().toLowerCase();
  if (!value) continue;
  if (value.startsWith("http://")) {
    warnings.push(`${key} is using http://. Use https:// in production.`);
  }
}

const hasBlockingErrors =
  missingCritical.length > 0 ||
  placeholderCritical.length > 0 ||
  missingPayment.length > 0 ||
  placeholderPayment.length > 0;

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
if (missingPaymentRecommended.length) {
  console.log(`- Recommended payment vars missing: ${missingPaymentRecommended.join(", ")}`);
}
if (placeholderPaymentRecommended.length) {
  console.log(`- Recommended payment vars placeholders: ${placeholderPaymentRecommended.join(", ")}`);
}

if (warnings.length) {
  console.log("- Warnings:");
  for (const w of warnings) console.log(`  - ${w}`);
}

if (hasBlockingErrors) {
  console.log("\nPreflight failed. Fix required env vars before deploying.");
  process.exit(1);
}

console.log("\nPreflight passed for critical env vars.");
