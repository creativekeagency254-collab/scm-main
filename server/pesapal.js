const crypto = require("crypto");

const clean = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");
const boolFlag = (value) => ["1", "true", "yes", "on"].includes(clean(value).toLowerCase());

const FONBNK_BASE_URL = clean(process.env.FONBNK_BASE_URL || "https://api.fonbnk.com");
const FONBNK_WIDGET_BASE_URL = clean(process.env.FONBNK_WIDGET_BASE_URL || "https://pay.fonbnk.com");
const FONBNK_CLIENT_ID = clean(process.env.FONBNK_CLIENT_ID);
const FONBNK_CLIENT_SECRET = clean(process.env.FONBNK_CLIENT_SECRET);
const FONBNK_SOURCE = clean(process.env.FONBNK_SOURCE);
const FONBNK_URL_SIGNATURE_SECRET = clean(process.env.FONBNK_URL_SIGNATURE_SECRET);
const FONBNK_WEBHOOK_URL = clean(process.env.FONBNK_WEBHOOK_URL);
const FONBNK_CALLBACK_URL = clean(process.env.FONBNK_CALLBACK_URL);
const FONBNK_COUNTRY_ISO_CODE = clean(process.env.FONBNK_COUNTRY_ISO_CODE || "KE").toUpperCase();
const FONBNK_PAYMENT_CHANNEL = clean(process.env.FONBNK_PAYMENT_CHANNEL || "mobile_money").toLowerCase();
const FONBNK_MOCK = boolFlag(process.env.FONBNK_MOCK);

const mockOrders = new Map();

const mapStatus = (statusRaw) => {
  const status = clean(statusRaw).toLowerCase();
  if (["deposit_successful", "payout_successful"].includes(status)) return 1;
  if (
    [
      "deposit_invalid",
      "deposit_canceled",
      "deposit_expired",
      "payout_failed",
      "refund_pending",
      "refund_successful",
      "refund_failed",
      "failed",
      "cancelled",
      "canceled",
      "error"
    ].includes(status)
  ) {
    return 2;
  }
  return 0;
};

const appendQueryParam = (rawUrl, key, value) => {
  const base = clean(rawUrl);
  if (!base) return "";
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
};

const toBase64Url = (value) =>
  Buffer.from(String(value))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const signWidgetJwt = (payload) => {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const toSign = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", String(FONBNK_URL_SIGNATURE_SECRET))
    .update(toSign)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${toSign}.${signature}`;
};

const normalizePaymentChannel = (value) => {
  const raw = clean(value).toLowerCase();
  if (!raw) return FONBNK_PAYMENT_CHANNEL || "mobile_money";
  if (
    raw.includes("crypto") ||
    raw.includes("usdt") ||
    raw.includes("btc") ||
    raw.includes("bitcoin")
  ) {
    return "crypto";
  }
  if (raw.includes("mpesa") || raw.includes("m-pesa") || raw.includes("m pesa")) return "mobile_money";
  if (raw.includes("bank")) return "bank";
  if (raw.includes("airtime")) return "airtime";
  return "mobile_money";
};

const padBase64 = (raw) => {
  const value = clean(raw);
  if (!value) return "";
  return value + "=".repeat((4 - (value.length % 4)) % 4);
};

const decodeClientSecret = (rawSecret) => {
  const value = clean(rawSecret);
  if (!value) return Buffer.alloc(0);
  const normalized = padBase64(value.replace(/-/g, "+").replace(/_/g, "/"));
  const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
  if (base64Pattern.test(normalized)) {
    try {
      return Buffer.from(normalized, "base64");
    } catch (_e) {
      // fall back below
    }
  }
  return Buffer.from(value, "utf8");
};

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
    data?.errors?.[0]?.message ||
    data?.error ||
    data?.detail ||
    data?.raw ||
    fallback;
  return typeof raw === "string" ? raw : JSON.stringify(raw);
};

const jsonFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    const err = new Error(readErrorMessage(data, `Fonbnk request failed (${res.status})`));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

const buildSignedHeaders = (endpoint) => {
  if (!FONBNK_CLIENT_ID) throw new Error("FONBNK_CLIENT_ID is required");
  if (!FONBNK_CLIENT_SECRET) throw new Error("FONBNK_CLIENT_SECRET is required");
  const timestamp = String(Date.now());
  const key = decodeClientSecret(FONBNK_CLIENT_SECRET);
  const signature = crypto
    .createHmac("sha256", key)
    .update(`${timestamp}:${endpoint}`)
    .digest("base64");
  return {
    "x-client-id": FONBNK_CLIENT_ID,
    "x-timestamp": timestamp,
    "x-signature": signature
  };
};

const fonbnkAuthedFetch = async (endpoint, { method = "GET", body } = {}) => {
  const payload = body && typeof body === "object" ? JSON.stringify(body) : body;
  return jsonFetch(`${FONBNK_BASE_URL}${endpoint}`, {
    method,
    headers: buildSignedHeaders(endpoint),
    body: payload
  });
};

const extractOrder = (payload) => {
  if (!payload || typeof payload !== "object") return {};
  if (payload.data && typeof payload.data === "object") {
    if (payload.data.order && typeof payload.data.order === "object") return payload.data.order;
    return payload.data;
  }
  if (payload.order && typeof payload.order === "object") return payload.order;
  return payload;
};

const moneyValue = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
};

const getOrderAmount = (order) =>
  moneyValue(
    order?.deposit?.cashout?.amountBeforeFees ??
      order?.deposit?.cashout?.amountAfterFees ??
      order?.deposit?.amount ??
      order?.amount ??
      0
  );

function isFonbnkConfigured() {
  if (FONBNK_MOCK) return true;
  return !!(FONBNK_SOURCE && FONBNK_URL_SIGNATURE_SECRET && FONBNK_CLIENT_ID && FONBNK_CLIENT_SECRET);
}

async function getIpnId() {
  if (FONBNK_MOCK) return "MOCK_FONBNK_WEBHOOK";
  return FONBNK_WEBHOOK_URL || "FONBNK_WEBHOOK";
}

async function submitOrder({
  reference,
  amount,
  currency = "KES",
  callbackUrl,
  billingAddress,
  method
}) {
  const resolvedReference = clean(reference) || `ep_${crypto.randomUUID().replace(/-/g, "")}`;
  const resolvedAmount = Number(amount);
  if (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0) {
    throw new Error("amount must be a positive number");
  }

  const callbackBase = clean(callbackUrl || FONBNK_CALLBACK_URL || "");
  if (!callbackBase) {
    throw new Error("FONBNK_CALLBACK_URL is required");
  }

  if (!FONBNK_SOURCE) {
    throw new Error("FONBNK_SOURCE is required");
  }
  if (!FONBNK_URL_SIGNATURE_SECRET) {
    throw new Error("FONBNK_URL_SIGNATURE_SECRET is required");
  }

  if (FONBNK_MOCK) {
    const redirectBase = appendQueryParam(callbackBase, "merchant_reference", resolvedReference);
    const redirectWithId = appendQueryParam(redirectBase, "tracking_id", resolvedReference);
    const redirectUrl = appendQueryParam(redirectWithId, "status", "success");
    mockOrders.set(resolvedReference, {
      reference: resolvedReference,
      amount: resolvedAmount,
      currency
    });
    return {
      redirect_url: redirectUrl,
      order_tracking_id: resolvedReference,
      merchant_reference: resolvedReference
    };
  }

  const callbackWithReference = appendQueryParam(callbackBase, "merchant_reference", resolvedReference);
  const redirectWithId = appendQueryParam(callbackWithReference, "tracking_id", "{orderId}");
  const redirectUrl = appendQueryParam(redirectWithId, "status", "{status}");
  const signature = signWidgetJwt({
    uid: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000)
  });

  const params = new URLSearchParams({
    source: FONBNK_SOURCE,
    signature,
    amount: String(moneyValue(resolvedAmount)),
    currency: "local",
    countryIsoCode: FONBNK_COUNTRY_ISO_CODE || "KE",
    currencyIsoCode: clean(currency || "KES").toUpperCase() || "KES",
    paymentChannel: normalizePaymentChannel(method),
    orderParams: resolvedReference,
    freezeAmount: "1",
    callbackUrl: callbackWithReference,
    redirectUrl
  });
  const email = clean(billingAddress?.email_address || "");
  if (email) params.set("email", email);

  const checkoutUrl = `${FONBNK_WIDGET_BASE_URL}?${params.toString()}`;
  return {
    redirect_url: checkoutUrl,
    order_tracking_id: resolvedReference,
    merchant_reference: resolvedReference
  };
}

const fetchOrderBy = async (query) => {
  const params = new URLSearchParams(query);
  const endpoint = `/api/v2/order?${params.toString()}`;
  return fonbnkAuthedFetch(endpoint, { method: "GET" });
};

async function getTransactionStatus(orderTrackingId) {
  const providerRef = clean(orderTrackingId);
  if (!providerRef) throw new Error("reference required");

  if (FONBNK_MOCK) {
    const order = mockOrders.get(providerRef);
    if (!order) {
      return {
        status_code: 0,
        payment_status_description: "deposit_awaiting",
        merchant_reference: providerRef
      };
    }
    return {
      status_code: 1,
      payment_status_description: "payout_successful",
      amount: Number(order.amount || 0),
      currency: order.currency || "KES",
      merchant_reference: providerRef
    };
  }

  const attempts = [{ orderId: providerRef }, { orderParams: providerRef }];
  let data = null;
  let lastError = null;
  for (const query of attempts) {
    try {
      data = await fetchOrderBy(query);
      const order = extractOrder(data);
      if (order && typeof order === "object" && clean(order.status)) break;
    } catch (err) {
      lastError = err;
      if (Number(err?.status || 0) !== 404) break;
    }
  }
  if (!data) throw lastError || new Error("Failed to fetch order status from Fonbnk");

  const order = extractOrder(data);
  const status = clean(order?.status || "deposit_awaiting").toLowerCase();
  return {
    status_code: mapStatus(status),
    payment_status_description: status || "deposit_awaiting",
    amount: getOrderAmount(order),
    currency: clean(order?.deposit?.currencyCode || order?.deposit?.currency_code || "KES").toUpperCase(),
    merchant_reference: clean(order?.merchantOrderParams || order?.merchant_order_params || providerRef),
    provider_payload: data
  };
}

module.exports = {
  isFonbnkConfigured,
  getIpnId,
  submitOrder,
  getTransactionStatus,
  // Backward-compatible aliases
  isPesapalConfigured: isFonbnkConfigured
};
