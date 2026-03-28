import crypto from "node:crypto";

const clean = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");
const boolFlag = (value) => ["1", "true", "yes", "on"].includes(clean(value).toLowerCase());

const FONBNK_BASE_URL = clean(process.env.FONBNK_BASE_URL || "https://api.fonbnk.com");
const FONBNK_WIDGET_BASE_URL = clean(process.env.FONBNK_WIDGET_BASE_URL || "https://pay.fonbnk.com");
const FONBNK_CLIENT_ID = clean(process.env.FONBNK_CLIENT_ID);
const FONBNK_CLIENT_SECRET = clean(process.env.FONBNK_CLIENT_SECRET);
const FONBNK_SOURCE = clean(process.env.FONBNK_SOURCE);
const FONBNK_URL_SIGNATURE_SECRET = clean(process.env.FONBNK_URL_SIGNATURE_SECRET);
const FONBNK_CALLBACK_URL = clean(process.env.FONBNK_CALLBACK_URL);
const FONBNK_WEBHOOK_URL = clean(process.env.FONBNK_WEBHOOK_URL);
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
      // Fall back to raw secret below.
    }
  }
  return Buffer.from(value, "utf8");
};

const base64UrlEncode = (value) =>
  Buffer.from(String(value))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const signWidgetJwt = (payload, secret) => {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const toSign = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", String(secret))
    .update(toSign)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${toSign}.${signature}`;
};

const appendQueryParam = (rawUrl, key, value) => {
  const base = clean(rawUrl);
  if (!base) return "";
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
};

const withSearchParams = (baseUrl, params) => {
  const base = clean(baseUrl);
  if (!base) return "";
  const query = new URLSearchParams(params);
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}${query.toString()}`;
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

const buildWidgetCheckoutUrl = ({ reference, amount, email, callbackUrl, paymentChannel, currencyCode }) => {
  if (!FONBNK_SOURCE) throw new Error("FONBNK_SOURCE is required");
  if (!FONBNK_URL_SIGNATURE_SECRET) throw new Error("FONBNK_URL_SIGNATURE_SECRET is required");
  const callbackBase = clean(callbackUrl || FONBNK_CALLBACK_URL);
  if (!callbackBase) throw new Error("FONBNK_CALLBACK_URL is required");

  const callbackWithReference = appendQueryParam(callbackBase, "merchant_reference", reference);
  const redirectWithTrackingId = appendQueryParam(callbackWithReference, "tracking_id", "{orderId}");
  const redirectUrl = appendQueryParam(redirectWithTrackingId, "status", "{status}");

  const signature = signWidgetJwt(
    {
      uid: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000)
    },
    FONBNK_URL_SIGNATURE_SECRET
  );
  const params = {
    source: FONBNK_SOURCE,
    signature,
    amount: String(moneyValue(amount)),
    currency: "local",
    countryIsoCode: FONBNK_COUNTRY_ISO_CODE || "KE",
    currencyIsoCode: clean(currencyCode || "KES").toUpperCase() || "KES",
    paymentChannel: normalizePaymentChannel(paymentChannel),
    orderParams: reference,
    freezeAmount: "1",
    callbackUrl: callbackWithReference,
    redirectUrl
  };
  if (email) params.email = email;

  return withSearchParams(FONBNK_WIDGET_BASE_URL || "https://pay.fonbnk.com", params);
};

export const isFonbnkConfigured = () =>
  FONBNK_MOCK ||
  (Boolean(FONBNK_SOURCE) &&
    Boolean(FONBNK_URL_SIGNATURE_SECRET) &&
    Boolean(FONBNK_CLIENT_ID) &&
    Boolean(FONBNK_CLIENT_SECRET));

export const isPesapalConfigured = isFonbnkConfigured;

export const registerIpn = async ({ url } = {}) => {
  const webhook = clean(url || FONBNK_WEBHOOK_URL);
  return {
    ipn_id: webhook || "FONBNK_WEBHOOK",
    ipnId: webhook || "FONBNK_WEBHOOK"
  };
};

export const submitOrder = async (payload = {}) => {
  const reference = clean(payload.reference || payload.id);
  const amount = Number(payload.amount || 0);
  const currency = clean(payload.currency || "KES").toUpperCase();
  const callbackUrl = clean(payload.callbackUrl || payload.callback_url || FONBNK_CALLBACK_URL);
  const billingAddress = payload.billingAddress || payload.billing_address || {};
  const customerEmail = clean(payload.email || billingAddress?.email_address);
  const method = clean(payload.method || payload.paymentMethod || "");

  if (!reference) throw new Error("reference is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount must be positive");
  if (!callbackUrl) throw new Error("FONBNK_CALLBACK_URL is required");

  if (FONBNK_MOCK) {
    mockOrders.set(reference, { amount, currency });
    const redirectBase = appendQueryParam(callbackUrl, "merchant_reference", reference);
    const redirectWithId = appendQueryParam(redirectBase, "tracking_id", reference);
    return {
      redirect_url: appendQueryParam(redirectWithId, "status", "success"),
      redirectUrl: appendQueryParam(redirectWithId, "status", "success"),
      order_tracking_id: reference,
      orderTrackingId: reference,
      merchant_reference: reference,
      merchantReference: reference
    };
  }

  const redirectUrl = buildWidgetCheckoutUrl({
    reference,
    amount,
    email: customerEmail,
    callbackUrl,
    paymentChannel: method,
    currencyCode: currency
  });
  if (!redirectUrl) throw new Error("Fonbnk did not return a checkout URL.");

  return {
    redirect_url: redirectUrl,
    redirectUrl,
    order_tracking_id: reference,
    orderTrackingId: reference,
    merchant_reference: reference,
    merchantReference: reference
  };
};

const fetchOrderBy = async (query) => {
  const params = new URLSearchParams(query);
  const endpoint = `/api/v2/order?${params.toString()}`;
  return fonbnkAuthedFetch(endpoint, { method: "GET" });
};

export const getTransactionStatus = async (reference) => {
  const providerRef = clean(reference);
  if (!providerRef) throw new Error("reference required");

  if (FONBNK_MOCK) {
    const mock = mockOrders.get(providerRef);
    if (!mock) {
      return {
        status_code: 0,
        payment_status_description: "deposit_awaiting",
        merchant_reference: providerRef
      };
    }
    return {
      status_code: 1,
      payment_status_description: "payout_successful",
      merchant_reference: providerRef,
      order_tracking_id: providerRef,
      amount: Number(mock.amount || 0),
      currency: mock.currency || "KES"
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
  const orderStatus = clean(order?.status || "deposit_awaiting");
  const merchantReference = clean(order?.merchantOrderParams || order?.merchant_order_params || providerRef);
  const orderId = clean(order?._id || order?.id || providerRef);
  const currency = clean(order?.deposit?.currencyCode || order?.deposit?.currency_code || "KES").toUpperCase();

  return {
    ...data,
    status_code: mapStatus(orderStatus),
    payment_status_description: orderStatus || "deposit_awaiting",
    merchant_reference: merchantReference,
    order_tracking_id: orderId,
    amount: getOrderAmount(order),
    currency: currency || "KES"
  };
};
