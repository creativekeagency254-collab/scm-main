const cleanEnv = (val) => String(val || "").trim().replace(/^['"]|['"]$/g, "");
const PESAPAL_ENV = cleanEnv(process.env.PESAPAL_ENV || "live").toLowerCase();
const PESAPAL_BASE =
  PESAPAL_ENV === "sandbox" || PESAPAL_ENV === "demo"
    ? "https://cybqa.pesapal.com/pesapalv3/api"
    : "https://pay.pesapal.com/v3/api";
const PESAPAL_CONSUMER_KEY = cleanEnv(
  process.env.PESAPAL_CONSUMER_KEY || process.env.PESAPAL_KEY || process.env.VITE_PESAPAL_CONSUMER_KEY
);
const PESAPAL_CONSUMER_SECRET = cleanEnv(
  process.env.PESAPAL_CONSUMER_SECRET || process.env.PESAPAL_SECRET || process.env.VITE_PESAPAL_CONSUMER_SECRET
);

let cachedToken = "";
let cachedExpiry = 0;

const nowMs = () => Date.now();

const jsonFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error?.message || "Pesapal request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const isPesapalConfigured = () => !!(PESAPAL_CONSUMER_KEY && PESAPAL_CONSUMER_SECRET);

export const getPesapalToken = async () => {
  if (!isPesapalConfigured()) return "";
  if (cachedToken && cachedExpiry && nowMs() < cachedExpiry - 30000) return cachedToken;
  const data = await jsonFetch(`${PESAPAL_BASE}/Auth/RequestToken`, {
    method: "POST",
    body: JSON.stringify({
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET
    })
  });
  const nextToken = cleanEnv(data?.token || data?.access_token || "");
  if (!nextToken) {
    const msg = data?.message || data?.error?.message || "Pesapal token missing from response.";
    throw new Error(msg);
  }
  cachedToken = nextToken;
  const expiry = data?.expiryDate ? Date.parse(data.expiryDate) : 0;
  cachedExpiry = Number.isFinite(expiry) && expiry > 0 ? expiry : nowMs() + 4 * 60 * 1000;
  return cachedToken;
};

export const registerIpn = async ({ url, type = "GET" }) => {
  const token = await getPesapalToken();
  if (!token) throw new Error("Missing Pesapal token");
  return jsonFetch(`${PESAPAL_BASE}/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      url,
      ipn_notification_type: type
    })
  });
};

export const submitOrder = async (payload) => {
  const token = await getPesapalToken();
  if (!token) throw new Error("Missing Pesapal token");
  return jsonFetch(`${PESAPAL_BASE}/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
};

export const getTransactionStatus = async (orderTrackingId) => {
  const token = await getPesapalToken();
  if (!token) throw new Error("Missing Pesapal token");
  const url = `${PESAPAL_BASE}/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`;
  return jsonFetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
};
