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
      if (!process.env[key]) process.env[key] = value;
    });
};

const clean = (value) => String(value || "").trim();

const planAmountKes = (planId) => {
  const map = {
    1: 5000,
    2: 10000,
    3: 20000,
    4: 50000,
    5: 100000
  };
  const n = Number(planId);
  return map[n] || map[1];
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isTransientInitiateError = (message) => {
  const m = clean(message).toLowerCase();
  if (!m) return false;
  return (
    m.includes("system is busy") ||
    m.includes("timed out") ||
    m.includes("timeout") ||
    m.includes("temporarily unavailable") ||
    m.includes("econnreset") ||
    m.includes("503") ||
    m.includes("502")
  );
};

const jsonRequest = async (url, { method = "GET", token = "", body = null, headers = {} } = {}) => {
  const reqHeaders = {
    Accept: "application/json",
    ...headers
  };
  if (token) reqHeaders.Authorization = `Bearer ${token}`;
  let payload = undefined;
  if (body !== null && body !== undefined) {
    reqHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers: reqHeaders, body: payload });
  const text = await res.text().catch(() => "");
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_e) {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
};

const initiateMpesa = async ({ apiBase, authToken, phone, planId, amountKES }) => {
  const initiate = await jsonRequest(`${apiBase}/api/payments/mpesa/initiate`, {
    method: "POST",
    token: authToken,
    body: {
      planId,
      amountKES,
      phoneNumber: phone,
      allowSandboxFallback: true
    }
  });
  if (!initiate.ok) {
    throw new Error(
      `initiate failed (${initiate.status}): ${clean(initiate.data?.error || initiate.data?.message)}`
    );
  }
  const reference = clean(initiate.data?.reference);
  if (!reference) {
    throw new Error("initiate succeeded but no reference was returned");
  }
  return reference;
};

const simulateMpesa = async ({ apiBase, authToken, simToken, reference, scenario }) => {
  const tryWithSimTokenFirst = Boolean(clean(simToken));
  const attempts = tryWithSimTokenFirst ? ["simulation-token", "bearer-token"] : ["bearer-token"];
  let lastResult = null;

  for (const authMode of attempts) {
    const useSimulationToken = authMode === "simulation-token";
    const simulate = await jsonRequest(`${apiBase}/api/payments/mpesa/simulate`, {
      method: "POST",
      token: useSimulationToken ? "" : authToken,
      headers: useSimulationToken ? { "x-mpesa-simulation-token": simToken } : {},
      body: {
        reference,
        scenario
      }
    });

    if (simulate.ok) {
      return {
        ok: true,
        status: simulate.status,
        data: simulate.data,
        authMode
      };
    }

    lastResult = {
      ok: false,
      status: simulate.status,
      data: simulate.data,
      authMode
    };

    // If shared simulation token auth fails, fall back to user bearer token auth.
    if (useSimulationToken && simulate.status === 401) {
      continue;
    }

    return lastResult;
  }

  return (
    lastResult || {
      ok: false,
      status: 500,
      data: { error: "simulation request failed without response" },
      authMode: "unknown"
    }
  );
};

const runScenario = async ({ name, scenario, apiBase, authToken, simToken, phone, planId }) => {
  console.log(`\n=== ${name} (${scenario}) ===`);
  const amountKES = planAmountKes(planId);

  let reference = "";
  let simulationResult = null;
  const maxInitiateAttempts = 6;

  for (let attempt = 1; attempt <= maxInitiateAttempts; attempt += 1) {
    try {
      reference = await initiateMpesa({ apiBase, authToken, phone, planId, amountKES });
    } catch (err) {
      const errMsg = clean(err?.message || "");
      if (isTransientInitiateError(errMsg) && attempt < maxInitiateAttempts) {
        console.log(`Initiate attempt ${attempt} hit transient error. Retrying...`);
        await sleep(1500);
        continue;
      }
      throw err;
    }
    console.log(`Reference: ${reference} (attempt ${attempt})`);

    simulationResult = await simulateMpesa({
      apiBase,
      authToken,
      simToken,
      reference,
      scenario
    });

    if (simulationResult.ok) {
      break;
    }

    const simError = clean(simulationResult?.data?.error || simulationResult?.data?.message);
    const invalidTransition = simError.toLowerCase().includes("invalid deposit status transition");
    const shouldRetry = invalidTransition && attempt < maxInitiateAttempts;
    if (shouldRetry) {
      console.log("Payment status changed before simulation. Retrying with a fresh reference...");
      continue;
    }

    throw new Error(
      `simulate failed (${simulationResult.status}) [${simulationResult.authMode}]: ${simError}`
    );
  }
  if (!simulationResult?.ok) {
    throw new Error("simulate failed after retries");
  }
  console.log(
    `Simulated: ${clean(simulationResult.data?.status || scenario)} via ${simulationResult.authMode}`
  );

  let finalStatus = "pending";
  for (let i = 0; i < 10; i += 1) {
    const verify = await jsonRequest(
      `${apiBase}/api/payments/verify/mpesa?reference=${encodeURIComponent(reference)}`,
      { token: authToken }
    );
    if (!verify.ok) {
      throw new Error(`verify failed (${verify.status}): ${clean(verify.data?.error || verify.data?.message)}`);
    }
    finalStatus = clean(verify.data?.status || "pending").toLowerCase();
    if (finalStatus === "success" || finalStatus === "failed") {
      break;
    }
    await sleep(1000);
  }

  const statusView = await jsonRequest(
    `${apiBase}/api/payments/status?reference=${encodeURIComponent(reference)}&limit=1`,
    { token: authToken }
  );
  if (!statusView.ok) {
    throw new Error(`status endpoint failed (${statusView.status}): ${clean(statusView.data?.error || statusView.data?.message)}`);
  }
  const payment = Array.isArray(statusView.data?.payments) ? statusView.data.payments[0] : null;
  const environment = clean(payment?.environment || "unknown");
  const dashboardStatus = clean(payment?.status || finalStatus);

  console.log(`Verify status: ${finalStatus}`);
  console.log(`Dashboard status: ${dashboardStatus}`);
  console.log(`Environment: ${environment}`);

  return {
    reference,
    finalStatus,
    dashboardStatus,
    environment
  };
};

const main = async () => {
  loadLocalEnv();

  const apiBase = clean(process.env.API_BASE || process.env.VITE_API_BASE || "http://localhost:5001").replace(/\/+$/, "");
  const authToken = clean(process.env.MPESA_TEST_AUTH_TOKEN || process.env.TEST_AUTH_TOKEN);
  const simToken = clean(process.env.MPESA_SIMULATION_TOKEN);
  const phone = clean(process.env.MPESA_TEST_PHONE || "254708374149");
  const planId = Number(process.env.MPESA_TEST_PLAN_ID || 1);

  if (!authToken) {
    throw new Error(
      "Missing MPESA_TEST_AUTH_TOKEN (or TEST_AUTH_TOKEN). Use a valid logged-in Supabase access token."
    );
  }

  console.log("M-Pesa Sandbox End-to-End Test");
  console.log("===============================");
  console.log(`API Base: ${apiBase}`);
  console.log(`Phone: ${phone}`);
  console.log(`Plan ID: ${planId}`);

  const successRun = await runScenario({
    name: "Scenario A",
    scenario: "success",
    apiBase,
    authToken,
    simToken,
    phone,
    planId
  });

  const failureRun = await runScenario({
    name: "Scenario B",
    scenario: "failed",
    apiBase,
    authToken,
    simToken,
    phone,
    planId
  });

  const pass =
    successRun.finalStatus === "success" &&
    failureRun.finalStatus === "failed" &&
    ["sandbox", "live"].includes(successRun.environment) &&
    ["sandbox", "live"].includes(failureRun.environment);

  console.log("\nSummary");
  console.log("-------");
  console.log(`Success scenario status: ${successRun.finalStatus}`);
  console.log(`Failure scenario status: ${failureRun.finalStatus}`);
  console.log(`Success environment: ${successRun.environment}`);
  console.log(`Failure environment: ${failureRun.environment}`);

  if (!pass) {
    process.exitCode = 1;
    throw new Error("One or more sandbox assertions failed.");
  }

  console.log("All sandbox assertions passed.");
};

main().catch((err) => {
  console.error("M-Pesa sandbox test failed:", err.message);
  process.exitCode = 1;
});
