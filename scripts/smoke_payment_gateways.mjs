import fs from "node:fs";
import path from "node:path";

const loadLocalEnv = () => {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .forEach((line) => {
      const idx = line.indexOf("=");
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!key) return;
      if (process.env[key] === undefined || process.env[key] === null || process.env[key] === "") {
        process.env[key] = value;
      }
    });
};

const clean = (value) => String(value || "").trim();

const nowRef = () => `smoke_${Date.now()}`;

const printResult = (name, result) => {
  const icon = result.ok ? "PASS" : "FAIL";
  console.log(`[${icon}] ${name}`);
  if (result.message) console.log(`  ${result.message}`);
};

const isConnectivityPassMessage = (message) => {
  const raw = clean(message).toLowerCase();
  return (
    raw.includes("not found") ||
    raw.includes("order not found") ||
    raw.includes("transaction not found") ||
    raw.includes("payment not found") ||
    raw.includes("checkoutrequestid") ||
    raw.includes("checkout request id") ||
    raw.includes("invalid") ||
    raw.includes("404")
  );
};

const run = async () => {
  loadLocalEnv();
  const { verifyPayfleePayment } = await import("../lib/payments/payflee.js");
  const { verifyPaynectaPayment } = await import("../lib/payments/paynecta.js");
  const { queryMpesaStkPush } = await import("../lib/payments/mpesa-daraja.js");

  const payfleeKey = clean(process.env.PAYFLEE_SECRET_KEY);
  const paynectaKey = clean(process.env.PAYNECTA_API_KEY);
  const paynectaEmail = clean(process.env.PAYNECTA_USER_EMAIL);
  const mpesaKey = clean(process.env.MPESA_CONSUMER_KEY);
  const mpesaSecret = clean(process.env.MPESA_CONSUMER_SECRET);
  const mpesaPasskey = clean(process.env.MPESA_PASSKEY);
  const mpesaShortcode = clean(process.env.MPESA_SHORTCODE);
  const checks = [];

  if (!payfleeKey) {
    checks.push({
      name: "Payflee Verify API",
      ok: false,
      message: "PAYFLEE_SECRET_KEY is missing."
    });
  } else {
    try {
      await verifyPayfleePayment({ reference: nowRef() });
      checks.push({
        name: "Payflee Verify API",
        ok: true,
        message: "Connected and got a valid response shape."
      });
    } catch (e) {
      const msg = clean(e?.message) || "Unknown error.";
      checks.push({
        name: "Payflee Verify API",
        ok: isConnectivityPassMessage(msg),
        message: isConnectivityPassMessage(msg)
          ? `Connected (received expected missing-reference response: ${msg})`
          : msg
      });
    }
  }

  if (!mpesaKey || !mpesaSecret || !mpesaPasskey || !mpesaShortcode) {
    checks.push({
      name: "Daraja STK Query API",
      ok: false,
      message:
        "Missing one or more MPESA env vars: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY, MPESA_SHORTCODE."
    });
  } else {
    try {
      await queryMpesaStkPush({ checkoutRequestId: nowRef() });
      checks.push({
        name: "Daraja STK Query API",
        ok: true,
        message: "Connected and got a valid response shape."
      });
    } catch (e) {
      const msg = clean(e?.message) || "Unknown error.";
      checks.push({
        name: "Daraja STK Query API",
        ok: isConnectivityPassMessage(msg),
        message: isConnectivityPassMessage(msg)
          ? `Connected (received expected missing-reference response: ${msg})`
          : msg
      });
    }
  }

  if (!paynectaKey) {
    checks.push({
      name: "Paynecta Verify API",
      ok: false,
      message: "PAYNECTA_API_KEY is missing."
    });
  } else if (!paynectaEmail) {
    checks.push({
      name: "Paynecta Verify API",
      ok: false,
      message: "PAYNECTA_USER_EMAIL is missing. Set it to the email linked to your PAYNECTA_API_KEY."
    });
  } else {
    try {
      await verifyPaynectaPayment({ reference: nowRef(), userEmail: paynectaEmail });
      checks.push({
        name: "Paynecta Verify API",
        ok: true,
        message: "Connected and got a valid response shape."
      });
    } catch (e) {
      const msg = clean(e?.message) || "Unknown error.";
      checks.push({
        name: "Paynecta Verify API",
        ok: isConnectivityPassMessage(msg),
        message: isConnectivityPassMessage(msg)
          ? `Connected (received expected missing-reference response: ${msg})`
          : msg
      });
    }
  }

  console.log("Gateway smoke test results");
  console.log("==========================");
  checks.forEach((c) => printResult(c.name, c));

  const passCount = checks.filter((c) => c.ok).length;
  const failCount = checks.length - passCount;
  console.log(`\nSummary: ${passCount} passed, ${failCount} failed.`);

  if (failCount > 0) process.exitCode = 1;
};

run().catch((e) => {
  console.error("Smoke test crashed:", e);
  process.exitCode = 1;
});
