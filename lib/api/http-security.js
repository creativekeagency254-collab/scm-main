const clean = (value) => String(value || "").trim();
const boolFlag = (value) => ["1", "true", "yes", "on"].includes(clean(value).toLowerCase());

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const DEFAULT_ALLOWED_HEADERS = [
  "Authorization",
  "Content-Type",
  "X-Webhook-Token",
  "X-Fonbnk-Webhook-Token",
  "X-Signature",
  "X-Fonbnk-Signature",
  "X-Webhook-Timestamp",
  "X-Fonbnk-Timestamp",
  "X-Timestamp"
];

const readHeader = (req, key) => {
  const value = req?.headers?.[key];
  return Array.isArray(value) ? clean(value[0]) : clean(value);
};

const normalizeHost = (rawHost) =>
  clean(rawHost)
    .split(",")[0]
    .trim()
    .replace(/\.$/, "")
    .toLowerCase();

const hostWithoutPort = (host) => String(host || "").split(":")[0].toLowerCase();

const isLocalHost = (host) => LOCAL_HOSTS.has(hostWithoutPort(host));

const normalizeOrigin = (value) => {
  const raw = clean(value);
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch (_e) {
    return "";
  }
};

const normalizeBaseUrl = (value, fallbackProtocol = "https") => {
  const raw = clean(value);
  if (!raw) return "";
  const withProtocol = raw.includes("://") ? raw : `${fallbackProtocol}://${raw}`;
  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}`;
  } catch (_e) {
    return "";
  }
};

const parseOriginList = () => {
  const parts = [
    process.env.CORS_ORIGIN,
    process.env.ALLOWED_ORIGINS,
    process.env.PUBLIC_APP_URL,
    process.env.APP_BASE_URL,
    process.env.SITE_URL,
    process.env.VITE_AUTH_REDIRECT_URL
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(/[,\s]+/))
    .map((value) => value.trim())
    .filter(Boolean);

  const all = new Set();
  parts.forEach((entry) => {
    if (entry === "*") {
      all.add("*");
      return;
    }
    const normalized = normalizeOrigin(entry) || normalizeBaseUrl(entry);
    if (normalized) all.add(normalized);
  });
  return all;
};

const isProductionRuntime = () => {
  const env = clean(process.env.NODE_ENV || process.env.VERCEL_ENV).toLowerCase();
  return env === "production";
};

const isOriginAllowed = (req, origin) => {
  const list = parseOriginList();
  if (list.has("*") || boolFlag(process.env.CORS_ALLOW_ALL_ORIGINS || process.env.CORS_ALLOW_ALL)) {
    return true;
  }

  if (list.has(origin)) return true;

  const requestHost = normalizeHost(readHeader(req, "x-forwarded-host") || readHeader(req, "host"));
  if (requestHost) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      if (originHost === requestHost) return true;
    } catch (_e) {}
  }

  if (!isProductionRuntime()) {
    try {
      const originHost = new URL(origin).hostname.toLowerCase();
      if (LOCAL_HOSTS.has(originHost)) return true;
    } catch (_e) {}
  }

  return false;
};

export const readClientIp = (req) =>
  String(readHeader(req, "x-forwarded-for") || req?.socket?.remoteAddress || "")
    .split(",")[0]
    .trim();

export const applyApiSecurity = (
  req,
  res,
  {
    methods = ["GET", "OPTIONS"],
    allowNoOrigin = true,
    allowWildcardOrigin = false,
    allowHeaders = DEFAULT_ALLOWED_HEADERS
  } = {}
) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Access-Control-Allow-Methods", methods.join(", "));
  res.setHeader("Access-Control-Allow-Headers", allowHeaders.join(", "));
  res.setHeader("Vary", "Origin");

  const origin = normalizeOrigin(readHeader(req, "origin"));
  if (!origin) {
    return { ok: !!allowNoOrigin };
  }

  if (allowWildcardOrigin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return { ok: true };
  }

  if (!isOriginAllowed(req, origin)) {
    return { ok: false, error: "origin not allowed" };
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  return { ok: true };
};

export const isSecurePublicUrl = (rawUrl) => {
  const value = clean(rawUrl);
  if (!value) return false;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:") return true;
    if (parsed.protocol === "http:" && isLocalHost(parsed.host)) return true;
    return false;
  } catch (_e) {
    return false;
  }
};

export const resolveRuntimeBaseUrl = (req) => {
  const envBase =
    normalizeBaseUrl(process.env.PUBLIC_APP_URL) ||
    normalizeBaseUrl(process.env.APP_BASE_URL) ||
    normalizeBaseUrl(process.env.SITE_URL) ||
    normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeBaseUrl(process.env.VERCEL_URL, "https");

  if (envBase) return envBase;

  const host = normalizeHost(readHeader(req, "x-forwarded-host") || readHeader(req, "host"));
  if (!host) return "";

  const protoRaw = clean(readHeader(req, "x-forwarded-proto") || "https");
  const proto = protoRaw.split(",")[0].trim().toLowerCase();

  if (proto === "https") return `https://${host}`;
  if (proto === "http" && isLocalHost(host)) return `http://${host}`;
  return "";
};

export const isLivePaymentsMode = () => {
  const mode = clean(process.env.PAYMENTS_MODE || process.env.VITE_PAYMENTS_MODE || "live").toLowerCase();
  return mode === "live" || mode === "production" || mode === "prod";
};

