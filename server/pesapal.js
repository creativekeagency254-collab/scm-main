const crypto = require("crypto");

const PESAPAL_BASE_URL = process.env.PESAPAL_BASE_URL || "https://pay.pesapal.com/v3";
const PESAPAL_CHECKOUT_URL_BASE =
  process.env.PESAPAL_CHECKOUT_URL_BASE ||
  (PESAPAL_BASE_URL.includes("cybqa")
    ? "https://cybqa.pesapal.com/pesapaliframe/PesapalIframe3/Index"
    : "https://pay.pesapal.com/iframe/PesapalIframe3/Index");
const PESAPAL_MOCK = String(process.env.PESAPAL_MOCK || "").toLowerCase() === "1";

const TOKEN_PATH = "/api/Auth/RequestToken";
const SUBMIT_PATH = "/api/Transactions/SubmitOrderRequest";
const STATUS_PATH = "/api/Transactions/GetTransactionStatus";
const REGISTER_IPN_PATH = "/api/URLSetup/RegisterIPN";

let cachedToken = null;
let cachedTokenExpiry = 0;
let cachedIpnId = process.env.PESAPAL_IPN_ID || null;
const mockOrders = new Map();

function isPesapalConfigured() {
  if (PESAPAL_MOCK) return true;
  return !!process.env.PESAPAL_CONSUMER_KEY && !!process.env.PESAPAL_CONSUMER_SECRET;
}

function clampExpiry(expiryDate) {
  const parsed = Date.parse(expiryDate || "");
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  // Tokens are short-lived; fall back to 4 minutes from now if expiry missing.
  return Date.now() + 4 * 60 * 1000;
}

async function requestToken() {
  if (PESAPAL_MOCK) {
    cachedToken = "mock-token";
    cachedTokenExpiry = Date.now() + 10 * 60 * 1000;
    return cachedToken;
  }
  if (!isPesapalConfigured()) {
    throw new Error("PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET are required");
  }
  const payload = {
    consumer_key: process.env.PESAPAL_CONSUMER_KEY,
    consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
  };
  const res = await fetch(`${PESAPAL_BASE_URL}${TOKEN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.token) {
    throw new Error(json?.message || "Failed to fetch Pesapal token");
  }
  cachedToken = json.token;
  cachedTokenExpiry = clampExpiry(json.expiryDate || json.expiry_date || json.expires_at);
  return cachedToken;
}

async function getToken() {
  if (PESAPAL_MOCK) return "mock-token";
  const now = Date.now();
  if (cachedToken && cachedTokenExpiry - 30000 > now) {
    return cachedToken;
  }
  return requestToken();
}

async function authedRequest(path, opts = {}) {
  const token = await getToken();
  const res = await fetch(`${PESAPAL_BASE_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {})
    }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.message || json?.error || `Pesapal request failed (${res.status})`;
    const err = new Error(message);
    err.payload = json;
    throw err;
  }
  return json;
}

async function registerIpn({ url, type = "POST" } = {}) {
  if (!url) throw new Error("IPN url required");
  const payload = {
    url,
    ipn_notification_type: String(type || "POST").toUpperCase()
  };
  const json = await authedRequest(REGISTER_IPN_PATH, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return json;
}

async function getIpnId() {
  if (PESAPAL_MOCK) return "MOCK_IPN";
  if (cachedIpnId) return cachedIpnId;
  const ipnUrl = process.env.PESAPAL_IPN_URL;
  if (!ipnUrl) return null;
  const notifType = process.env.PESAPAL_IPN_NOTIFICATION_TYPE || "POST";
  const json = await registerIpn({ url: ipnUrl, type: notifType });
  cachedIpnId = json?.ipn_id || json?.ipnId || null;
  return cachedIpnId;
}

async function submitOrder({
  reference,
  amount,
  currency = "KES",
  description,
  callbackUrl,
  notificationId,
  billingAddress,
  cancellationUrl,
  redirectMode
}) {
  if (PESAPAL_MOCK) {
    const orderTrackingId = `psp_${crypto.randomUUID().replace(/-/g, "")}`;
    const merchantReference = reference;
    mockOrders.set(orderTrackingId, {
      reference: merchantReference,
      amount: Number(amount || 0),
      currency,
      created_at: Date.now()
    });
    const baseUrl =
      callbackUrl ||
      process.env.PESAPAL_MOCK_REDIRECT_URL ||
      "http://localhost:5000/";
    const joiner = baseUrl.includes("?") ? "&" : "?";
    const redirect_url = `${baseUrl}${joiner}OrderTrackingId=${encodeURIComponent(orderTrackingId)}&OrderMerchantReference=${encodeURIComponent(merchantReference)}`;
    return {
      redirect_url,
      order_tracking_id: orderTrackingId,
      merchant_reference: merchantReference
    };
  }
  const payload = {
    id: reference,
    currency,
    amount,
    description,
    callback_url: callbackUrl,
    notification_id: notificationId,
    billing_address: billingAddress
  };
  if (cancellationUrl) payload.cancellation_url = cancellationUrl;
  if (redirectMode) payload.redirect_mode = redirectMode;
  const json = await authedRequest(SUBMIT_PATH, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  const status = json?.status ?? json?.status_code ?? null;
  if (json?.error || (status && String(status) !== "200")) {
    const err = new Error(json?.error || `Pesapal returned status ${status}`);
    err.payload = json;
    throw err;
  }
  const redirectUrl = json?.redirect_url || json?.redirectUrl || null;
  const orderTrackingId = json?.order_tracking_id || json?.orderTrackingId || null;
  if (!redirectUrl && orderTrackingId) {
    json.redirect_url = `${PESAPAL_CHECKOUT_URL_BASE}?OrderTrackingId=${encodeURIComponent(orderTrackingId)}`;
  }
  return json;
}

async function getTransactionStatus(orderTrackingId) {
  if (!orderTrackingId) throw new Error("orderTrackingId required");
  if (PESAPAL_MOCK) {
    const order = mockOrders.get(orderTrackingId);
    if (!order) {
      return {
        status_code: 0,
        payment_status_description: "Pending"
      };
    }
    return {
      status_code: 1,
      payment_status_description: "Completed",
      amount: Number(order.amount || 0),
      currency: order.currency,
      merchant_reference: order.reference
    };
  }
  return authedRequest(`${STATUS_PATH}?orderTrackingId=${encodeURIComponent(orderTrackingId)}`, {
    method: "GET"
  });
}

module.exports = {
  isPesapalConfigured,
  getIpnId,
  submitOrder,
  getTransactionStatus
};
