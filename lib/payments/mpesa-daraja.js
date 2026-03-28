import crypto from "node:crypto";

const clean = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");
const boolFlag = (value) => ["1", "true", "yes", "on"].includes(clean(value).toLowerCase());

const MPESA_ENVIRONMENT = clean(process.env.MPESA_ENVIRONMENT || process.env.PAYMENTS_MODE || "sandbox")
  .toLowerCase()
  .includes("live")
  ? "live"
  : "sandbox";
const MPESA_API_BASE_URL = clean(
  process.env.MPESA_API_BASE_URL ||
    (MPESA_ENVIRONMENT === "live"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke")
).replace(/\/+$/, "");
const MPESA_CONSUMER_KEY = clean(process.env.MPESA_CONSUMER_KEY || process.env.DARAJA_CONSUMER_KEY);
const MPESA_CONSUMER_SECRET = clean(
  process.env.MPESA_CONSUMER_SECRET || process.env.DARAJA_CONSUMER_SECRET
);
const MPESA_PASSKEY = clean(process.env.MPESA_PASSKEY || process.env.DARAJA_PASSKEY);
const MPESA_SHORTCODE = clean(process.env.MPESA_SHORTCODE || process.env.DARAJA_SHORTCODE || "174379");
const MPESA_CALLBACK_SECRET = clean(process.env.MPESA_CALLBACK_SECRET);
const MPESA_CALLBACK_SIGNATURE_ENFORCE = boolFlag(process.env.MPESA_CALLBACK_SIGNATURE_ENFORCE || "0");

let oauthCache = {
  token: "",
  expiresAt: 0
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

const parseJsonResponse = async (res) => {
  const raw = await res.text().catch(() => "");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (_e) {
    return { raw };
  }
};

const readErrorMessage = (data, fallback = "M-Pesa request failed.") => {
  const raw =
    data?.errorMessage ||
    data?.errorCode ||
    data?.message ||
    data?.ResponseDescription ||
    data?.ResultDesc ||
    data?.error ||
    data?.detail ||
    data?.raw ||
    fallback;
  return typeof raw === "string" ? raw : JSON.stringify(raw);
};

const pad2 = (value) => String(value).padStart(2, "0");

const buildTimestamp = () => {
  // Daraja timestamps are expected in East Africa time (UTC+3).
  const eatMs = Date.now() + 3 * 60 * 60 * 1000;
  const eat = new Date(eatMs);
  const yyyy = eat.getUTCFullYear();
  const mm = pad2(eat.getUTCMonth() + 1);
  const dd = pad2(eat.getUTCDate());
  const hh = pad2(eat.getUTCHours());
  const min = pad2(eat.getUTCMinutes());
  const ss = pad2(eat.getUTCSeconds());
  return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
};

const buildPassword = (timestamp) =>
  Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString("base64");

export const normalizeMpesaPhone = (value) => {
  const digits = clean(value).replace(/[^\d+]/g, "");
  if (!digits) return "";
  const strippedPlus = digits.startsWith("+") ? digits.slice(1) : digits;
  if (/^254\d{9}$/.test(strippedPlus)) return strippedPlus;
  if (/^0\d{9}$/.test(strippedPlus)) return `254${strippedPlus.slice(1)}`;
  if (/^\d{9}$/.test(strippedPlus)) return `254${strippedPlus}`;
  return "";
};

const secureEqual = (a, b) => {
  const left = String(a || "");
  const right = String(b || "");
  if (!left || !right) return false;
  const aBuf = Buffer.from(left);
  const bBuf = Buffer.from(right);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

const getOAuthToken = async () => {
  if (!MPESA_CONSUMER_KEY) throw new Error("MPESA_CONSUMER_KEY is required");
  if (!MPESA_CONSUMER_SECRET) throw new Error("MPESA_CONSUMER_SECRET is required");
  const now = Date.now();
  if (oauthCache.token && oauthCache.expiresAt > now + 15_000) {
    return oauthCache.token;
  }

  const basicAuth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");
  const url = `${MPESA_API_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`;
  const data = await withTimeout(async (signal) => {
    const res = await fetch(url, {
      method: "GET",
      signal,
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: "application/json"
      }
    });
    const payload = await parseJsonResponse(res);
    if (!res.ok) {
      const err = new Error(readErrorMessage(payload, `Daraja OAuth failed (${res.status})`));
      err.status = res.status;
      err.data = payload;
      throw err;
    }
    return payload;
  });

  const token = clean(data?.access_token);
  if (!token) {
    throw new Error("Daraja OAuth response did not include access_token.");
  }
  const expiresIn = Number(data?.expires_in);
  oauthCache = {
    token,
    expiresAt: now + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) * 1000
  };
  return token;
};

const darajaFetch = async (path, { method = "GET", body, timeoutMs = 25_000 } = {}) => {
  const token = await getOAuthToken();
  const payload = body && typeof body === "object" ? JSON.stringify(body) : body;
  const fullPath = String(path || "").startsWith("/") ? path : `/${String(path || "")}`;
  const url = `${MPESA_API_BASE_URL}${fullPath}`;

  return withTimeout(async (signal) => {
    const res = await fetch(url, {
      method,
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: payload
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      const err = new Error(readErrorMessage(data, `Daraja request failed (${res.status})`));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }, timeoutMs);
};

export const isMpesaConfigured = () =>
  Boolean(MPESA_API_BASE_URL && MPESA_CONSUMER_KEY && MPESA_CONSUMER_SECRET && MPESA_PASSKEY && MPESA_SHORTCODE);

export const isMpesaSandbox = () => MPESA_ENVIRONMENT === "sandbox";

export const getMpesaEnvironment = () => MPESA_ENVIRONMENT;

export const mapMpesaResultCodeToStatus = (resultCode) => {
  const code = Number(resultCode);
  if (!Number.isFinite(code)) return "pending";
  if (code === 0) return "success";
  return "failed";
};

export const parseMpesaCallbackMetadata = (callbackPayload = {}) => {
  const items = Array.isArray(callbackPayload?.CallbackMetadata?.Item)
    ? callbackPayload.CallbackMetadata.Item
    : [];
  const map = new Map();
  items.forEach((entry) => {
    const name = clean(entry?.Name);
    if (!name) return;
    map.set(name, entry?.Value);
  });

  const amountRaw = map.get("Amount");
  const amountNum = Number(amountRaw);
  const txDateRaw = map.get("TransactionDate");
  const txDateText = clean(txDateRaw);

  return {
    amount: Number.isFinite(amountNum) ? Number(amountNum.toFixed(2)) : null,
    receipt: clean(map.get("MpesaReceiptNumber")),
    phoneNumber: normalizeMpesaPhone(map.get("PhoneNumber")),
    transactionDateRaw: txDateText || "",
    transactionDateIso: /^\d{14}$/.test(txDateText)
      ? `${txDateText.slice(0, 4)}-${txDateText.slice(4, 6)}-${txDateText.slice(6, 8)}T${txDateText.slice(8, 10)}:${txDateText.slice(10, 12)}:${txDateText.slice(12, 14)}+03:00`
      : ""
  };
};

export const initiateMpesaStkPush = async ({
  amountKes,
  phoneNumber,
  reference,
  callbackUrl,
  accountReference = "",
  transactionDesc = "Sandbox payment"
}) => {
  if (!isMpesaConfigured()) {
    throw new Error("M-Pesa Daraja is not configured.");
  }
  const amount = Math.round(Number(amountKes));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("amount must be a positive number");
  }
  const phone = normalizeMpesaPhone(phoneNumber);
  if (!phone) throw new Error("invalid phone number");
  const safeReference = clean(reference);
  if (!safeReference) throw new Error("reference is required");
  const safeCallback = clean(callbackUrl);
  if (!safeCallback) throw new Error("callbackUrl is required");

  const timestamp = buildTimestamp();
  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: buildPassword(timestamp),
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: safeCallback,
    AccountReference: clean(accountReference || safeReference).slice(0, 12) || safeReference.slice(0, 12),
    TransactionDesc: clean(transactionDesc || "Sandbox payment").slice(0, 80) || "Sandbox payment"
  };

  const response = await darajaFetch("/mpesa/stkpush/v1/processrequest", {
    method: "POST",
    body: payload
  });

  const responseCode = clean(response?.ResponseCode);
  if (responseCode && responseCode !== "0") {
    throw new Error(readErrorMessage(response, "Daraja STK push request failed."));
  }

  return {
    success: responseCode === "0" || clean(response?.CheckoutRequestID),
    message:
      clean(response?.CustomerMessage || response?.ResponseDescription) ||
      "STK prompt sent to phone.",
    responseCode,
    merchantRequestId: clean(response?.MerchantRequestID),
    checkoutRequestId: clean(response?.CheckoutRequestID),
    raw: response
  };
};

export const queryMpesaStkPush = async ({ checkoutRequestId }) => {
  if (!isMpesaConfigured()) {
    throw new Error("M-Pesa Daraja is not configured.");
  }
  const checkoutId = clean(checkoutRequestId);
  if (!checkoutId) throw new Error("checkoutRequestId is required");

  const timestamp = buildTimestamp();
  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: buildPassword(timestamp),
    Timestamp: timestamp,
    CheckoutRequestID: checkoutId
  };
  const response = await darajaFetch("/mpesa/stkpushquery/v1/query", {
    method: "POST",
    body: payload
  });

  const resultCodeRaw = response?.ResultCode;
  const responseCode = clean(response?.ResponseCode);
  const resultDesc = clean(response?.ResultDesc || response?.ResponseDescription);
  const status = (() => {
    if (resultCodeRaw !== undefined && resultCodeRaw !== null && String(resultCodeRaw).trim() !== "") {
      return mapMpesaResultCodeToStatus(resultCodeRaw);
    }
    if (responseCode === "0") return "pending";
    return "failed";
  })();

  return {
    status,
    resultCode:
      resultCodeRaw !== undefined && resultCodeRaw !== null && String(resultCodeRaw).trim() !== ""
        ? Number(resultCodeRaw)
        : null,
    resultDesc: resultDesc || "",
    responseCode: responseCode || "",
    checkoutRequestId: clean(response?.CheckoutRequestID || checkoutId),
    merchantRequestId: clean(response?.MerchantRequestID || ""),
    raw: response
  };
};

export const createMpesaCallbackSignature = (payload) => {
  if (!MPESA_CALLBACK_SECRET) return "";
  const raw = JSON.stringify(payload || {});
  return crypto.createHmac("sha256", MPESA_CALLBACK_SECRET).update(raw).digest("hex");
};

export const verifyMpesaCallbackSignature = (payload, signature) => {
  if (!MPESA_CALLBACK_SECRET) {
    return {
      ok: !MPESA_CALLBACK_SIGNATURE_ENFORCE,
      reason: MPESA_CALLBACK_SIGNATURE_ENFORCE ? "callback signature secret not configured" : "not_configured"
    };
  }
  const provided = clean(signature).replace(/^sha256=/i, "").toLowerCase();
  if (!provided) {
    return {
      ok: !MPESA_CALLBACK_SIGNATURE_ENFORCE,
      reason: MPESA_CALLBACK_SIGNATURE_ENFORCE ? "missing signature" : "missing_signature"
    };
  }
  const expected = createMpesaCallbackSignature(payload);
  const ok = secureEqual(provided, expected);
  return { ok, reason: ok ? "" : "invalid signature" };
};

