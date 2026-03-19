const crypto = require("crypto");

const clean = (value) => String(value || "").trim();
const boolFlag = (value) => {
  const v = clean(value).toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
};
const withQueryParam = (url, key, value) => {
  const base = clean(url);
  if (!base) return "";
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
};

const KORA_BASE_URL = clean(process.env.KORA_BASE_URL || "https://api.korapay.com");
const KORA_SECRET_KEY = clean(
  process.env.KORA_SECRET_KEY ||
    process.env.KORA_SECRET ||
    process.env.PESAPAL_CONSUMER_SECRET ||
    process.env.PESAPAL_CONSUMER_KEY
);
const KORA_WEBHOOK_URL = clean(process.env.KORA_WEBHOOK_URL || process.env.PESAPAL_IPN_URL);
const KORA_CALLBACK_URL = clean(process.env.KORA_CALLBACK_URL || process.env.PESAPAL_CALLBACK_URL);
const KORA_MOCK = boolFlag(process.env.KORA_MOCK || process.env.PESAPAL_MOCK);

const mockOrders = new Map();

function mapStatus(statusRaw) {
  const status = clean(statusRaw).toLowerCase();
  if (["success", "successful", "paid", "completed", "complete"].includes(status)) {
    return { status, statusCode: 1, success: true };
  }
  if (["failed", "abandoned", "cancelled", "canceled", "expired", "declined", "error"].includes(status)) {
    return { status, statusCode: 2, success: false };
  }
  return { status: status || "pending", statusCode: 0, success: false };
}

function isKoraConfigured() {
  if (KORA_MOCK) return true;
  return !!KORA_SECRET_KEY;
}

async function koraRequest(path, { method = "GET", body } = {}) {
  if (!isKoraConfigured()) {
    throw new Error("KORA_SECRET_KEY is required");
  }
  const res = await fetch(`${KORA_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${KORA_SECRET_KEY}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  const okFlag = json?.status === true || json?.status === "success" || json?.success === true;
  if (!res.ok || !okFlag) {
    const message =
      json?.message ||
      json?.error?.message ||
      json?.error ||
      `Kora request failed (${res.status})`;
    const err = new Error(message);
    err.payload = json;
    err.status = res.status;
    throw err;
  }
  return json;
}

async function getIpnId() {
  if (KORA_MOCK) return "MOCK_KORA_WEBHOOK";
  return KORA_WEBHOOK_URL || "KORA_WEBHOOK";
}

async function submitOrder({
  reference,
  amount,
  currency = "KES",
  description,
  callbackUrl,
  billingAddress,
  notificationUrl
}) {
  const resolvedReference = clean(reference) || `ep_${crypto.randomUUID().replace(/-/g, "")}`;
  const resolvedAmount = Number(amount);
  if (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0) {
    throw new Error("amount must be a positive number");
  }

  if (KORA_MOCK) {
    const redirectBase = clean(callbackUrl || KORA_CALLBACK_URL || "http://localhost:5000/");
    const redirectUrl = withQueryParam(redirectBase, "reference", resolvedReference);
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

  const customerName = [billingAddress?.first_name, billingAddress?.last_name]
    .map((part) => clean(part))
    .filter(Boolean)
    .join(" ");
  const customerEmail = clean(billingAddress?.email_address || "");
  const redirectBase = clean(callbackUrl || KORA_CALLBACK_URL || "");
  const webhookUrl = clean(notificationUrl || KORA_WEBHOOK_URL || "");
  const redirectUrl = withQueryParam(redirectBase, "reference", resolvedReference);
  if (!redirectUrl) {
    throw new Error("KORA_CALLBACK_URL is required");
  }

  const payload = {
    reference: resolvedReference,
    amount: resolvedAmount,
    currency: clean(currency || "KES").toUpperCase(),
    redirect_url: redirectUrl,
    notification_url: webhookUrl || undefined,
    customer: {
      name: customerName || "Client",
      email: customerEmail || undefined
    },
    narration: clean(description || "")
  };

  const json = await koraRequest("/merchant/api/v1/charges/initialize", {
    method: "POST",
    body: payload
  });

  const checkoutUrl =
    json?.data?.checkout_url ||
    json?.data?.checkoutUrl ||
    json?.data?.redirect_url ||
    "";
  const providerRef = clean(json?.data?.reference || resolvedReference);
  if (!checkoutUrl) {
    throw new Error("Kora did not return a checkout URL.");
  }

  return {
    redirect_url: checkoutUrl,
    order_tracking_id: providerRef,
    merchant_reference: providerRef
  };
}

async function getTransactionStatus(orderTrackingId) {
  const providerRef = clean(orderTrackingId);
  if (!providerRef) throw new Error("reference required");

  if (KORA_MOCK) {
    const order = mockOrders.get(providerRef);
    if (!order) {
      return {
        status_code: 0,
        payment_status_description: "pending",
        merchant_reference: providerRef
      };
    }
    return {
      status_code: 1,
      payment_status_description: "success",
      amount: Number(order.amount || 0),
      currency: order.currency || "KES",
      merchant_reference: providerRef
    };
  }

  const json = await koraRequest(`/merchant/api/v1/charges/${encodeURIComponent(providerRef)}`, {
    method: "GET"
  });
  const rawStatus =
    json?.data?.status ||
    json?.data?.transaction_status ||
    json?.data?.payment_status ||
    "";
  const mapped = mapStatus(rawStatus);

  return {
    status_code: mapped.statusCode,
    payment_status_description: mapped.status,
    amount: Number(json?.data?.amount || json?.data?.amount_paid || 0),
    currency: clean(json?.data?.currency || "KES").toUpperCase(),
    merchant_reference: clean(json?.data?.reference || providerRef),
    provider_payload: json
  };
}

module.exports = {
  isKoraConfigured,
  getIpnId,
  submitOrder,
  getTransactionStatus,
  // Backward-compatible aliases
  isPesapalConfigured: isKoraConfigured
};
