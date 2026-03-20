const clean = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");
const KORA_BASE = clean(process.env.KORA_BASE_URL || "https://api.korapay.com");
const KORA_SECRET_KEY = clean(
  process.env.KORA_SECRET_KEY ||
    process.env.KORA_SECRET ||
    process.env.PESAPAL_CONSUMER_SECRET ||
    process.env.PESAPAL_CONSUMER_KEY
);
const KORA_CALLBACK_URL = clean(process.env.KORA_CALLBACK_URL || process.env.PESAPAL_CALLBACK_URL);
const KORA_WEBHOOK_URL = clean(process.env.KORA_WEBHOOK_URL || process.env.PESAPAL_IPN_URL);
const KORA_MOCK = ["1", "true", "yes", "on"].includes(
  clean(process.env.KORA_MOCK || process.env.PESAPAL_MOCK).toLowerCase()
);

const mockOrders = new Map();

const mapStatus = (statusRaw) => {
  const status = clean(statusRaw).toLowerCase();
  if (["success", "successful", "paid", "completed", "complete"].includes(status)) return 1;
  if (["failed", "abandoned", "cancelled", "canceled", "expired", "declined", "error"].includes(status)) return 2;
  return 0;
};

const withQueryParam = (url, key, value) => {
  const base = clean(url);
  if (!base) return "";
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
};

const hasSuccessFlag = (data) => {
  const rawStatus =
    data?.status ??
    data?.success ??
    data?.statusCode ??
    data?.code ??
    "";
  const normalized = String(rawStatus).trim().toLowerCase();
  if (data?.status === true || data?.success === true) return true;
  if (Number(data?.statusCode) === 200 || Number(data?.code) === 200) return true;
  return ["success", "successful", "ok", "true", "200"].includes(normalized);
};

const hasUsefulPayload = (data) => {
  const payload = data?.data;
  const payloadHasKeys =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    Object.keys(payload).length > 0;
  return Boolean(
    payloadHasKeys ||
      data?.checkout_url ||
      data?.redirect_url ||
      data?.authorization_url
  );
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
  const raw = await res.text().catch(() => "");
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (e) {
    data = { raw };
  }
  const okFlag = hasSuccessFlag(data);
  if (!res.ok || (!okFlag && !hasUsefulPayload(data))) {
    const msgRaw =
      data?.message ||
      data?.error?.message ||
      data?.errors?.[0]?.message ||
      data?.error ||
      data?.detail ||
      data?.raw ||
      "Kora request failed";
    const msg =
      typeof msgRaw === "string" ? msgRaw : JSON.stringify(msgRaw);
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

const koraAuthedFetch = async (path, options = {}) => {
  if (!KORA_SECRET_KEY) throw new Error("KORA_SECRET_KEY is required");
  return jsonFetch(`${KORA_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${KORA_SECRET_KEY}`,
      ...(options.headers || {})
    }
  });
};

export const isKoraConfigured = () => KORA_MOCK || !!KORA_SECRET_KEY;
export const isPesapalConfigured = isKoraConfigured;

export const registerIpn = async ({ url } = {}) => {
  const webhook = clean(url || KORA_WEBHOOK_URL);
  return {
    ipn_id: webhook || "KORA_WEBHOOK",
    ipnId: webhook || "KORA_WEBHOOK"
  };
};

export const submitOrder = async (payload = {}) => {
  const reference = clean(payload.reference || payload.id);
  const amount = Number(payload.amount || 0);
  const currency = clean(payload.currency || "KES").toUpperCase();
  const callbackUrl = clean(payload.callbackUrl || payload.callback_url || KORA_CALLBACK_URL);
  const notificationUrl = clean(payload.notificationUrl || payload.notification_url || KORA_WEBHOOK_URL);
  const billingAddress = payload.billingAddress || payload.billing_address || {};
  const customerName = [
    clean(billingAddress?.first_name),
    clean(billingAddress?.last_name)
  ].filter(Boolean).join(" ");
  const customerEmail = clean(billingAddress?.email_address);
  const redirectUrl = withQueryParam(callbackUrl, "reference", reference);

  if (!reference) throw new Error("reference is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount must be positive");
  if (!redirectUrl) throw new Error("KORA_CALLBACK_URL is required");

  if (KORA_MOCK) {
    mockOrders.set(reference, { amount, currency });
    return {
      redirect_url: redirectUrl,
      redirectUrl,
      order_tracking_id: reference,
      orderTrackingId: reference,
      merchant_reference: reference,
      merchantReference: reference
    };
  }

  const data = await koraAuthedFetch("/merchant/api/v1/charges/initialize", {
    method: "POST",
    body: JSON.stringify({
      reference,
      amount,
      currency,
      redirect_url: redirectUrl,
      notification_url: notificationUrl || undefined,
      narration: clean(payload.description || ""),
      customer: {
        name: customerName || "Client",
        email: customerEmail || undefined
      }
    })
  });

  const checkout =
    data?.data?.checkout_url ||
    data?.data?.checkoutUrl ||
    data?.data?.redirect_url ||
    data?.data?.redirectUrl ||
    data?.data?.authorization_url ||
    data?.data?.authorizationUrl ||
    data?.data?.checkout?.url ||
    data?.checkout_url ||
    data?.redirect_url ||
    data?.authorization_url ||
    "";
  if (!checkout) throw new Error("Kora did not return a checkout URL.");
  const providerRef = clean(
    data?.data?.reference ||
      data?.data?.payment_reference ||
      data?.data?.id ||
      reference
  );
  return {
    ...data,
    redirect_url: checkout,
    redirectUrl: checkout,
    order_tracking_id: providerRef,
    orderTrackingId: providerRef,
    merchant_reference: providerRef,
    merchantReference: providerRef
  };
};

export const getTransactionStatus = async (reference) => {
  const providerRef = clean(reference);
  if (!providerRef) throw new Error("reference required");

  if (KORA_MOCK) {
    const mock = mockOrders.get(providerRef);
    if (!mock) {
      return {
        status_code: 0,
        payment_status_description: "pending",
        merchant_reference: providerRef
      };
    }
    return {
      status_code: 1,
      payment_status_description: "success",
      merchant_reference: providerRef,
      amount: Number(mock.amount || 0),
      currency: mock.currency || "KES"
    };
  }

  const data = await koraAuthedFetch(`/merchant/api/v1/charges/${encodeURIComponent(providerRef)}`, {
    method: "GET"
  });
  const rawStatus =
    data?.data?.status ||
    data?.data?.transaction_status ||
    data?.data?.payment_status ||
    "";
  return {
    ...data,
    status_code: mapStatus(rawStatus),
    payment_status_description: clean(rawStatus || "pending"),
    merchant_reference: clean(data?.data?.reference || providerRef),
    amount: Number(data?.data?.amount || data?.data?.amount_paid || 0),
    currency: clean(data?.data?.currency || "KES").toUpperCase()
  };
};
