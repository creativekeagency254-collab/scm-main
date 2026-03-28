const clean = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");

const PAYFLEE_API_BASE_URL = clean(process.env.PAYFLEE_API_BASE_URL || "https://api.pay4.work/api/v1");
const PAYFLEE_SECRET_KEY = clean(process.env.PAYFLEE_SECRET_KEY);
const PAYFLEE_PUBLIC_KEY = clean(process.env.PAYFLEE_PUBLIC_KEY);
const PAYFLEE_API_KEY = clean(process.env.PAYFLEE_API_KEY || PAYFLEE_PUBLIC_KEY || PAYFLEE_SECRET_KEY);
const PAYSTACK_API_BASE_URL = clean(process.env.PAYSTACK_API_BASE_URL || "https://api.paystack.co");
const PAYSTACK_SECRET_KEY = clean(
  process.env.PAYSTACK_SECRET_KEY ||
    process.env.PAYSTACK_SECRET ||
    process.env.PAYSTACK_SK ||
    process.env.PAYSTACK_TEST_SECRET_KEY
);
const PAYSTACK_PUBLIC_KEY = clean(
  process.env.PAYSTACK_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    process.env.PAYSTACK_PK ||
    process.env.PAYSTACK_TEST_PUBLIC_KEY
);
const PAYSTACK_CALLBACK_URL = clean(process.env.PAYSTACK_CALLBACK_URL);

const parseJsonResponse = async (res) => {
  const raw = await res.text().catch(() => "");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (_e) {
    return { raw };
  }
};

const readErrorMessage = (data, fallback) => {
  const raw =
    data?.message ||
    data?.error?.message ||
    data?.error ||
    data?.detail ||
    data?.errors?.[0]?.message ||
    data?.raw ||
    fallback;
  return typeof raw === "string" ? raw : JSON.stringify(raw);
};

const withTimeout = async (promiseFactory, timeoutMs = 25_000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await promiseFactory(controller.signal);
  } finally {
    clearTimeout(timer);
  }
};

const normalizeAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Number(n.toFixed(2));
};

const safeBody = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});

const buildUrl = (path) => {
  const base = PAYFLEE_API_BASE_URL.replace(/\/+$/, "");
  const p = String(path || "").trim();
  if (!p) return base;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return `${base}${p.startsWith("/") ? "" : "/"}${p}`;
};

const buildPaystackUrl = (path) => {
  const base = PAYSTACK_API_BASE_URL.replace(/\/+$/, "");
  const p = String(path || "").trim();
  if (!p) return base;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return `${base}${p.startsWith("/") ? "" : "/"}${p}`;
};

const payfleeFetch = async (path, { method = "GET", body } = {}) => {
  if (!PAYFLEE_SECRET_KEY) {
    throw new Error("PAYFLEE_SECRET_KEY is required");
  }
  if (!PAYFLEE_API_KEY) {
    throw new Error("PAYFLEE_PUBLIC_KEY (or PAYFLEE_API_KEY) is required");
  }
  const payload = body && typeof body === "object" ? JSON.stringify(body) : body;
  return withTimeout(async (signal) => {
    const res = await fetch(buildUrl(path), {
      method,
      signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Use-API-Key": "true",
        Authorization: `Bearer ${PAYFLEE_SECRET_KEY}`,
        "X-API-Key": PAYFLEE_API_KEY,
        "X-API-Secret": PAYFLEE_SECRET_KEY,
        "X-Payflee-Secret": PAYFLEE_SECRET_KEY
      },
      body: payload
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      const err = new Error(readErrorMessage(data, `Payflee request failed (${res.status})`));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  });
};

const paystackFetch = async (path, { method = "GET", body } = {}) => {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is required");
  }
  const payload = body && typeof body === "object" ? JSON.stringify(body) : body;
  return withTimeout(async (signal) => {
    const res = await fetch(buildPaystackUrl(path), {
      method,
      signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      },
      body: payload
    });
    const data = await parseJsonResponse(res);
    if (!res.ok || data?.status === false) {
      const err = new Error(readErrorMessage(data, `Paystack request failed (${res.status})`));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  });
};

const pick = (obj, paths = []) => {
  const source = safeBody(obj);
  for (const path of paths) {
    const parts = String(path || "")
      .split(".")
      .map((s) => s.trim())
      .filter(Boolean);
    let cursor = source;
    let ok = true;
    for (const part of parts) {
      if (!cursor || typeof cursor !== "object" || !(part in cursor)) {
        ok = false;
        break;
      }
      cursor = cursor[part];
    }
    if (ok && cursor !== undefined && cursor !== null && cursor !== "") return cursor;
  }
  return null;
};

const normalizeStatus = (rawStatus) => {
  const value = clean(rawStatus).toLowerCase();
  if (
    [
      "success",
      "successful",
      "succeeded",
      "paid",
      "completed",
      "complete",
      "approved"
    ].includes(value)
  ) {
    return "success";
  }
  if (
    [
      "failed",
      "declined",
      "cancelled",
      "canceled",
      "invalid",
      "expired",
      "reversed",
      "voided"
    ].includes(value)
  ) {
    return "failed";
  }
  return "pending";
};

const extractCheckoutUrl = (payload) =>
  clean(
    pick(payload, [
      "paymentPageUrl",
      "payment_page_url",
      "checkout_url",
      "checkoutUrl",
      "payment_url",
      "paymentUrl",
      "authorization_url",
      "authorizationUrl",
      "url",
      "redirect_url",
      "redirectUrl",
      "data.checkout_url",
      "data.checkoutUrl",
      "data.paymentPageUrl",
      "data.payment_page_url",
      "data.payment_url",
      "data.paymentUrl",
      "data.authorization_url",
      "data.authorizationUrl",
      "data.url",
      "data.redirect_url",
      "data.redirectUrl"
    ]) || ""
  );

const extractReference = (payload) =>
  clean(
    pick(payload, [
      "reference",
      "data.0.reference",
      "data.0.order_reference",
      "data.0.orderReference",
      "data.0.merchant_reference",
      "data.0.merchantReference",
      "data.order.orderId",
      "data.order.order_id",
      "order_reference",
      "orderReference",
      "session_id",
      "sessionId",
      "order_id",
      "orderId",
      "transaction_reference",
      "transactionReference",
      "data.reference",
      "data.order_reference",
      "data.orderReference",
      "data.session_id",
      "data.sessionId",
      "data.order_id",
      "data.orderId",
      "data.transaction_reference",
      "data.transactionReference"
    ]) || ""
  );

const normalizePaystackStatus = (rawStatus) => {
  const status = clean(rawStatus).toLowerCase();
  if (status === "success") return "success";
  if (["failed", "reversed", "abandoned", "cancelled", "canceled"].includes(status)) return "failed";
  return "pending";
};

const createPaystackCheckoutSession = async ({
  reference,
  amount,
  currency,
  userEmail,
  planId,
  userId,
  callbackUrl,
  successUrl,
  cancelUrl,
  metadata = {}
}) => {
  const normalizedAmount = normalizeAmount(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("amount must be positive");
  }

  const safeCurrency = clean(currency || "KES").toUpperCase() || "KES";
  const amountMinor = Math.round(normalizedAmount * 100);
  const payload = {
    email: clean(userEmail),
    amount: amountMinor,
    currency: safeCurrency,
    reference: clean(reference),
    callback_url: clean(PAYSTACK_CALLBACK_URL || callbackUrl || successUrl),
    metadata: {
      planId,
      userId: clean(userId),
      cancel_url: clean(cancelUrl),
      ...safeBody(metadata)
    }
  };

  const response = await paystackFetch("/transaction/initialize", {
    method: "POST",
    body: payload
  });

  const checkoutUrl = clean(response?.data?.authorization_url);
  if (!checkoutUrl) throw new Error("Paystack did not return an authorization_url.");

  return {
    checkoutUrl,
    providerReference: clean(response?.data?.reference || reference),
    raw: response
  };
};

const verifyPaystackPayment = async ({ reference }) => {
  const ref = clean(reference);
  if (!ref) throw new Error("reference required");

  const response = await paystackFetch(`/transaction/verify/${encodeURIComponent(ref)}`, {
    method: "GET"
  });
  const amountMinor = Number(response?.data?.amount);
  const amount = Number.isFinite(amountMinor) ? Number((amountMinor / 100).toFixed(2)) : NaN;
  const providerStatus = clean(response?.data?.status);

  return {
    status: normalizePaystackStatus(providerStatus),
    providerStatus,
    amount,
    currency: clean(response?.data?.currency || "KES").toUpperCase() || "KES",
    reference: clean(response?.data?.reference || ref),
    raw: response
  };
};

export const isPaystackConfigured = () => Boolean(PAYSTACK_SECRET_KEY);

export const getActiveCardProvider = () => (isPaystackConfigured() ? "paystack" : "payflee");

export const isPayfleeConfigured = () =>
  Boolean((PAYFLEE_SECRET_KEY && PAYFLEE_API_BASE_URL) || isPaystackConfigured());

export const getPayfleePublicKey = () => PAYFLEE_PUBLIC_KEY || PAYSTACK_PUBLIC_KEY;

export const createPayfleeCheckoutSession = async ({
  reference,
  amount,
  currency,
  userEmail,
  planId,
  userId,
  callbackUrl,
  successUrl,
  cancelUrl,
  metadata = {}
}) => {
  if (!isPayfleeConfigured()) throw new Error("Card gateway is not configured");
  if (isPaystackConfigured()) {
    return createPaystackCheckoutSession({
      reference,
      amount,
      currency,
      userEmail,
      planId,
      userId,
      callbackUrl,
      successUrl,
      cancelUrl,
      metadata
    });
  }
  const normalizedAmount = normalizeAmount(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("amount must be positive");
  }

  const payload = {
    amount: normalizedAmount,
    currency: clean(currency || "USD").toUpperCase() || "USD",
    order_amount: normalizedAmount,
    orderAmount: normalizedAmount,
    email: clean(userEmail),
    customer_email: clean(userEmail),
    customerEmail: clean(userEmail),
    customer: {
      email: clean(userEmail)
    },
    reference: clean(reference),
    merchant_reference: clean(reference),
    merchantReference: clean(reference),
    order_reference: clean(reference),
    orderReference: clean(reference),
    plan_id: planId,
    planId,
    user_id: clean(userId),
    userId: clean(userId),
    success_url: clean(successUrl),
    successUrl: clean(successUrl),
    cancel_url: clean(cancelUrl),
    cancelUrl: clean(cancelUrl),
    metadata: {
      planId,
      userId: clean(userId),
      ...safeBody(metadata)
    }
  };

  const attempts = [
    { path: "/orders/create", method: "POST", body: payload },
    { path: "/orders", method: "POST", body: payload },
    { path: "/checkout/session", method: "POST", body: payload }
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const response = await payfleeFetch(attempt.path, {
        method: attempt.method,
        body: attempt.body
      });
      const checkoutUrl = extractCheckoutUrl(response);
      if (!checkoutUrl) throw new Error("Payflee did not return a checkout URL.");
      return {
        checkoutUrl,
        providerReference: extractReference(response) || clean(reference),
        raw: response
      };
    } catch (err) {
      lastError = err;
      const status = Number(err?.status || 0);
      const detail = `${clean(err?.message)} ${JSON.stringify(err?.data || {})}`.toLowerCase();
      if (status === 401 || status === 403) throw err;
      if (status === 400 && detail.includes("invalid currency")) throw err;
    }
  }
  throw lastError || new Error("Failed to create Payflee checkout session");
};

export const verifyPayfleePayment = async ({ reference }) => {
  if (!isPayfleeConfigured()) throw new Error("Card gateway is not configured");
  if (isPaystackConfigured()) {
    return verifyPaystackPayment({ reference });
  }
  const ref = clean(reference);
  if (!ref) throw new Error("reference required");

  const encoded = encodeURIComponent(ref);
  const attempts = [
    { path: `/orders/${encoded}`, method: "GET" },
    { path: `/orders/status?reference=${encoded}`, method: "GET" },
    { path: `/orders?reference=${encoded}`, method: "GET" }
  ];

  let payload = null;
  let lastError = null;
  for (const attempt of attempts) {
    try {
      payload = await payfleeFetch(attempt.path, { method: attempt.method });
      if (payload) break;
    } catch (err) {
      lastError = err;
      const status = Number(err?.status || 0);
      const message = clean(err?.message).toLowerCase();
      if (status === 401 || status === 403) throw err;
      if (status === 400 && message.includes("not found")) continue;
      if (status !== 404) break;
    }
  }
  if (!payload) throw lastError || new Error("Unable to verify Payflee payment.");

  const statusRaw = pick(payload, [
    "status",
    "payment_status",
    "paymentStatus",
    "transaction_status",
    "transactionStatus",
    "data.0.status",
    "data.0.payment_status",
    "data.0.paymentStatus",
    "data.0.transaction_status",
    "data.0.transactionStatus",
    "data.status",
    "data.payment_status",
    "data.paymentStatus",
    "data.transaction_status",
    "data.transactionStatus"
  ]);
  const amountRaw = pick(payload, [
    "amount",
    "amount_paid",
    "amountPaid",
    "data.0.amount",
    "data.0.amount_paid",
    "data.0.amountPaid",
    "data.amount",
    "data.amount_paid",
    "data.amountPaid"
  ]);
  const currencyRaw = pick(payload, ["currency", "data.0.currency", "data.currency"]) || "USD";
  const referenceRaw = extractReference(payload) || ref;

  return {
    status: normalizeStatus(statusRaw),
    providerStatus: clean(statusRaw),
    amount: normalizeAmount(amountRaw),
    currency: clean(currencyRaw).toUpperCase() || "USD",
    reference: clean(referenceRaw) || ref,
    raw: payload
  };
};
