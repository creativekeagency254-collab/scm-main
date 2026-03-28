const clean = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");

const PAYNECTA_API_URL = clean(process.env.PAYNECTA_API_URL || "https://paynecta.co.ke/api/v1");
const PAYNECTA_API_KEY = clean(process.env.PAYNECTA_API_KEY);
const PAYNECTA_USER_EMAIL = clean(process.env.PAYNECTA_USER_EMAIL);
const PAYNECTA_PAYMENT_LINK_CODE = clean(process.env.PAYNECTA_PAYMENT_LINK_CODE);
let PAYNECTA_DISCOVERED_LINK_CODE = "";

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

const normalizeIntegerAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n);
};

const safeBody = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});

const buildUrl = (path) => {
  const base = PAYNECTA_API_URL.replace(/\/+$/, "");
  const p = String(path || "").trim();
  if (!p) return base;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return `${base}${p.startsWith("/") ? "" : "/"}${p}`;
};

const paynectaFetch = async (path, { method = "GET", body, userEmail = "" } = {}) => {
  if (!PAYNECTA_API_KEY) throw new Error("PAYNECTA_API_KEY is required");
  const headerEmail = clean(PAYNECTA_USER_EMAIL || userEmail || "");
  const payload = body && typeof body === "object" ? JSON.stringify(body) : body;
  return withTimeout(async (signal) => {
    const res = await fetch(buildUrl(path), {
      method,
      signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-API-Key": PAYNECTA_API_KEY,
        ...(headerEmail ? { "X-User-Email": headerEmail } : {})
      },
      body: payload
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      const err = new Error(readErrorMessage(data, `Paynecta request failed (${res.status})`));
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
      "approved",
      "processing"
    ].includes(value)
  ) {
    return value === "processing" ? "pending" : "success";
  }
  if (["failed", "declined", "cancelled", "canceled", "invalid", "expired", "reversed"].includes(value)) {
    return "failed";
  }
  return "pending";
};

const normalizePhoneKe = (value) => {
  const digits = clean(value).replace(/[^\d+]/g, "");
  if (!digits) return "";
  const strippedPlus = digits.startsWith("+") ? digits.slice(1) : digits;
  if (/^254\d{9}$/.test(strippedPlus)) return strippedPlus;
  if (/^0\d{9}$/.test(strippedPlus)) return `254${strippedPlus.slice(1)}`;
  if (/^\d{9}$/.test(strippedPlus)) return `254${strippedPlus}`;
  return "";
};

const extractLinkCode = (payload) => {
  const list = payload?.data?.links;
  if (!Array.isArray(list) || !list.length) return "";
  const candidate = list[0] || {};
  return clean(candidate?.unique_code || candidate?.code || candidate?.slug || "");
};

const resolvePaymentLinkCode = async (userEmail = "") => {
  if (PAYNECTA_PAYMENT_LINK_CODE) return PAYNECTA_PAYMENT_LINK_CODE;
  if (PAYNECTA_DISCOVERED_LINK_CODE) return PAYNECTA_DISCOVERED_LINK_CODE;
  try {
    const links = await paynectaFetch("/links", {
      method: "GET",
      userEmail: clean(PAYNECTA_USER_EMAIL || userEmail || "")
    });
    const discovered = extractLinkCode(links);
    if (discovered) {
      PAYNECTA_DISCOVERED_LINK_CODE = discovered;
      return discovered;
    }
  } catch (_e) {}
  return "";
};

export const isPaynectaConfigured = () =>
  Boolean(PAYNECTA_API_URL && PAYNECTA_API_KEY);

const assertPaynectaConfig = () => {
  if (!PAYNECTA_API_URL) throw new Error("PAYNECTA_API_URL is required");
  if (!PAYNECTA_API_KEY) throw new Error("PAYNECTA_API_KEY is required");
};

export const initiatePaynectaStkPush = async ({
  phoneNumber,
  amountKes,
  reference,
  planId,
  userId,
  userEmail = "",
  metadata = {}
}) => {
  assertPaynectaConfig();
  const phone = normalizePhoneKe(phoneNumber);
  if (!phone) throw new Error("invalid phone number");
  const amount = normalizeIntegerAmount(amountKes);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount must be positive");
  const ref = clean(reference);
  if (!ref) throw new Error("reference is required");

  const paymentCode =
    clean(metadata?.paymentCode) ||
    (await resolvePaymentLinkCode(clean(PAYNECTA_USER_EMAIL || userEmail || "")));

  const payload = {
    code: paymentCode || undefined,
    mobile_number: phone,
    amount,
    email: clean(PAYNECTA_USER_EMAIL || userEmail || metadata?.userEmail || ""),
    transaction_reference: ref,
    reference: ref,
    plan_id: planId,
    planId,
    user_id: clean(userId),
    userId: clean(userId),
    metadata: {
      reference: ref,
      planId,
      userId: clean(userId),
      ...safeBody(metadata)
    }
  };

  if (!payload.code) {
    throw new Error(
      "Paynecta link code required. Set PAYNECTA_PAYMENT_LINK_CODE or create an active link in your Paynecta account."
    );
  }

  const response = await paynectaFetch("/payment/initialize", {
    method: "POST",
    body: payload,
    userEmail: clean(PAYNECTA_USER_EMAIL || userEmail || metadata?.userEmail || "")
  });

  const rawSuccess = pick(response, ["success", "data.success", "status"]);
  const successFlag =
    rawSuccess === true ||
    String(rawSuccess || "")
      .trim()
      .toLowerCase() === "success";
  const transactionReference = clean(
    pick(response, [
      "data.transaction_reference",
      "data.reference",
      "transaction_reference",
      "reference"
    ]) || ""
  );
  const message = clean(pick(response, ["message", "data.message"]) || "M-Pesa prompt sent to your phone.");

  if (!successFlag && !transactionReference) {
    throw new Error(message || "Failed to initiate Paynecta payment");
  }

  const normalizedSuccess = successFlag || Boolean(transactionReference);

  return {
    success: normalizedSuccess,
    message,
    providerReference: transactionReference || ref,
    raw: response
  };
};

export const verifyPaynectaPayment = async ({ reference, userEmail = "" }) => {
  assertPaynectaConfig();
  const ref = clean(reference);
  if (!ref) throw new Error("reference required");

  const response = await paynectaFetch(
    `/payment/status?transaction_reference=${encodeURIComponent(ref)}`,
    {
      method: "GET",
      userEmail: clean(PAYNECTA_USER_EMAIL || userEmail || "")
    }
  );

  const statusRaw = pick(response, ["data.status", "status", "data.transaction.status"]);
  const amountRaw = pick(response, [
    "data.amount",
    "amount",
    "data.transaction.amount",
    "data.formatted_amount"
  ]);
  const receipt = clean(
    pick(response, ["data.mpesa_receipt_number", "mpesa_receipt_number", "data.receipt"]) || ""
  );
  const transactionReference =
    clean(
      pick(response, [
        "data.transaction_reference",
        "transaction_reference",
        "data.reference",
        "reference"
      ]) || ""
    ) || ref;

  return {
    status: normalizeStatus(statusRaw),
    providerStatus: clean(statusRaw),
    amount: normalizeAmount(amountRaw),
    currency: "KES",
    reference: transactionReference,
    receipt,
    raw: response
  };
};
