import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { TIERS } from "../../src/features/config/tiers.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_ROLE_TOKENS = new Set([
  "admin",
  "admins",
  "administrator",
  "administrators",
  "superadmin",
  "super_admin",
  "owner"
]);

const normalizeRoleToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const parseRoleList = (raw) => {
  if (Array.isArray(raw)) return raw.map((v) => normalizeRoleToken(v)).filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(/[,\|]/)
      .map((v) => normalizeRoleToken(v))
      .filter(Boolean);
  }
  return [];
};

const hasAdminRole = (profileData) => {
  const profile = profileData && typeof profileData === "object" ? profileData : {};
  const directRole = normalizeRoleToken(profile.role || profile.user_role || "");
  const categoryRole = normalizeRoleToken(profile.category || profile.user_category || "");
  const roleList = parseRoleList(profile.roles);
  return (
    ADMIN_ROLE_TOKENS.has(directRole) ||
    ADMIN_ROLE_TOKENS.has(categoryRole) ||
    roleList.some((role) => ADMIN_ROLE_TOKENS.has(role))
  );
};

const roundMoney = (value, digits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Number(n.toFixed(digits));
};

const normalizeEnvironment = (value) => {
  const raw = clean(value).toLowerCase();
  if (["live", "production", "prod"].includes(raw)) return "live";
  return "sandbox";
};

const envFxRate = roundMoney(
  process.env.PAYMENTS_FX_KES_PER_USD || process.env.VITE_FX_KES_PER_USD || 130,
  6
);

const FX_KES_PER_USD = Number.isFinite(envFxRate) && envFxRate > 0 ? envFxRate : 130;

const buildTierAmountMap = () => {
  const map = {};
  for (const tier of Array.isArray(TIERS) ? TIERS : []) {
    const tierId = Number(tier?.id);
    const depositKes = roundMoney(tier?.deposit);
    if (!Number.isInteger(tierId) || tierId <= 0 || !Number.isFinite(depositKes) || depositKes <= 0) continue;
    map[tierId] = depositKes;
  }
  return map;
};

const REQUIRED_TIER_DEPOSITS = buildTierAmountMap();

const clean = (value) => String(value || "").trim();

const toIsoCurrency = (value, fallback = "KES") => {
  const normalized = clean(value).toUpperCase();
  if (/^[A-Z]{3}$/.test(normalized)) return normalized;
  return fallback;
};

const safeJson = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});

const parsePathOrAbsoluteUrl = (value) => {
  const raw = clean(value);
  if (!raw) return "";
  if (raw.startsWith("/")) return raw;
  try {
    const parsed = new URL(raw);
    return parsed.toString();
  } catch (_e) {
    return "";
  }
};

const appendQueryParams = (rawUrl, params = {}) => {
  const base = clean(rawUrl);
  if (!base) return "";
  try {
    const parsed = new URL(base, base.startsWith("http") ? undefined : "https://example.com");
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") return;
      parsed.searchParams.set(String(k), String(v));
    });
    if (base.startsWith("/")) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return parsed.toString();
  } catch (_e) {
    return base;
  }
};

export const isSupabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

export const getSupabaseAdmin = () => {
  if (!isSupabaseConfigured()) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

export const getBearerToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  if (!header) return "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : clean(header);
};

export const getAuthUser = async (supabaseAdmin, req) => {
  const token = getBearerToken(req);
  if (!token) return { user: null, error: "missing token" };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { user: null, error: error?.message || "invalid token" };
  return { user: data.user, error: null };
};

export const isAdminUser = async (supabaseAdmin, userId) => {
  if (!userId) return false;
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("profile_data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return hasAdminRole(data?.profile_data);
};

export const normalizeAmount = (value, digits = 2) => roundMoney(value, digits);

export const normalizeEmail = (value) => clean(value).toLowerCase();

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value));

export const normalizePhoneKe = (value) => {
  const digits = clean(value).replace(/[^\d+]/g, "");
  if (!digits) return "";
  const strippedPlus = digits.startsWith("+") ? digits.slice(1) : digits;
  if (/^254\d{9}$/.test(strippedPlus)) return strippedPlus;
  if (/^0\d{9}$/.test(strippedPlus)) return `254${strippedPlus.slice(1)}`;
  if (/^\d{9}$/.test(strippedPlus)) return `254${strippedPlus}`;
  return "";
};

export const isSafeReference = (value) => /^[A-Za-z0-9._:-]{4,128}$/.test(clean(value));

export const sanitizePlanId = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n)) return null;
  if (!Object.prototype.hasOwnProperty.call(REQUIRED_TIER_DEPOSITS, n)) return null;
  return n;
};

export const expectedKesForPlan = (planId) => {
  const id = sanitizePlanId(planId);
  if (!id) return null;
  return REQUIRED_TIER_DEPOSITS[id];
};

export const expectedTopUpKesForPlans = (fromPlanId, toPlanId) => {
  const fromId = sanitizePlanId(fromPlanId);
  const toId = sanitizePlanId(toPlanId);
  if (!fromId || !toId) return null;
  if (toId <= fromId) return null;
  const fromKes = expectedKesForPlan(fromId);
  const toKes = expectedKesForPlan(toId);
  if (!Number.isFinite(fromKes) || !Number.isFinite(toKes) || toKes <= fromKes) return null;
  return roundMoney(toKes - fromKes);
};

export const resolveExpectedKesForCharge = ({ planId, upgradeFromTier }) => {
  const targetPlan = sanitizePlanId(planId);
  if (!targetPlan) return null;
  const directKes = expectedKesForPlan(targetPlan);
  const fromTier = sanitizePlanId(upgradeFromTier);
  if (!fromTier || fromTier >= targetPlan) return directKes;
  const topUpKes = expectedTopUpKesForPlans(fromTier, targetPlan);
  if (!Number.isFinite(topUpKes) || topUpKes <= 0) return directKes;
  return topUpKes;
};

export const convertKesToUsd = (kesAmount) => {
  const kes = roundMoney(kesAmount);
  if (!Number.isFinite(kes)) return NaN;
  return roundMoney(kes / FX_KES_PER_USD, 2);
};

export const resolveCardCurrency = (value) => {
  const requested = toIsoCurrency(value, "USD");
  return requested === "KES" ? "KES" : "USD";
};

export const newReference = (prefix = "pay") =>
  `${clean(prefix || "pay").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "pay"}_${crypto
    .randomUUID()
    .replace(/-/g, "")}`;

export const generateReference = () =>
  `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

export const buildPublicUrl = (baseUrl, pathOrUrl = "/", query = {}) => {
  const safeBase = clean(baseUrl);
  const safePath = parsePathOrAbsoluteUrl(pathOrUrl || "/") || "/";
  if (!safeBase && safePath.startsWith("/")) {
    return appendQueryParams(safePath, query);
  }
  try {
    const url = new URL(safePath, safeBase || "https://example.com");
    Object.entries(query || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") return;
      url.searchParams.set(String(k), String(v));
    });
    return url.toString();
  } catch (_e) {
    return appendQueryParams(safePath, query);
  }
};

export const readBodyObject = (req) => safeJson(req.body);

export const ensureUserIdentity = ({ authUser, userId, email }) => {
  const normalizedUserId = clean(userId);
  const normalizedEmail = normalizeEmail(email);
  if (!authUser?.id) {
    return { ok: false, error: "unauthorized" };
  }
  if (normalizedUserId && normalizedUserId !== authUser.id) {
    return { ok: false, error: "user mismatch" };
  }
  if (normalizedEmail && authUser?.email && normalizeEmail(authUser.email) !== normalizedEmail) {
    return { ok: false, error: "email mismatch" };
  }
  return { ok: true, userId: authUser.id, email: normalizedEmail || normalizeEmail(authUser.email || "") };
};

export const createPendingPaymentRecords = async (
  supabaseAdmin,
  {
    userId,
    planId,
    amount,
    depositAmount = amount,
    currency,
    provider,
    reference,
    paymentReference = reference,
    paymentType = "wallet_deposit",
    environment = process.env.MPESA_ENVIRONMENT || process.env.PAYMENTS_MODE || "sandbox",
    paymentTimestamp = new Date().toISOString(),
    phoneNumber = "",
    courseId = null,
    metadata = {},
    depositProviderLabel,
    depositCreatedAt = new Date().toISOString()
  }
) => {
  const safeCurrency = toIsoCurrency(currency, "KES");
  const safeEnvironment = normalizeEnvironment(environment);
  const safePaymentType = clean(paymentType || "wallet_deposit").slice(0, 120) || "wallet_deposit";
  const safeReference =
    clean(reference) ||
    `${clean(provider || "pay")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase() || "pay"}_${crypto.randomUUID().replace(/-/g, "")}`;
  const safePaymentReference = clean(paymentReference || safeReference) || safeReference;
  const safePhone = normalizePhoneKe(phoneNumber);
  const safeMetadata = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
  const paymentPayloadExtended = {
    user_id: userId,
    plan_id: planId,
    provider,
    amount,
    currency: safeCurrency,
    status: "pending",
    reference: safeReference,
    payment_reference: safePaymentReference,
    payment_type: safePaymentType,
    environment: safeEnvironment,
    payment_timestamp: paymentTimestamp,
    phone_number: safePhone || null,
    course_id: courseId || null,
    metadata: safeMetadata,
    created_at: depositCreatedAt,
    updated_at: depositCreatedAt
  };
  const providerRaw = clean(provider).toLowerCase();
  const needsLegacyProviderFallback = providerRaw === "mpesa_daraja" || providerRaw === "paystack";
  const legacyProviderCandidates = ["paynecta", "payflee"];

  const isProviderConstraintError = (message = "") =>
    String(message).includes("payments_provider_check") || String(message).includes("provider_check");

  const isColumnMissingError = (message = "") =>
    String(message).includes("schema cache") ||
    String(message).includes("does not exist") ||
    String(message).includes("undefined column") ||
    String(message).includes("unknown column");

  const isNullPaymentReferenceError = (message = "") => {
    const msg = String(message || "").toLowerCase();
    return (
      msg.includes('null value in column "payment_reference"') ||
      msg.includes("null value in column 'payment_reference'") ||
      (msg.includes("payment_reference") && msg.includes("not-null constraint"))
    );
  };

  const insertWithLegacyProviderFallback = async (payload) => {
    let latestResult = await supabaseAdmin.from("payments").insert(payload);
    if (!latestResult.error || !needsLegacyProviderFallback) return latestResult;

    const initialMsg = String(latestResult.error?.message || "").toLowerCase();
    if (!isProviderConstraintError(initialMsg)) return latestResult;

    for (const compatProvider of legacyProviderCandidates) {
      latestResult = await supabaseAdmin
        .from("payments")
        .insert({ ...payload, provider: compatProvider });
      if (!latestResult.error) return latestResult;
      const compatMsg = String(latestResult.error?.message || "").toLowerCase();
      if (!isProviderConstraintError(compatMsg)) break;
    }

    return latestResult;
  };

  let paymentInsert = await insertWithLegacyProviderFallback(paymentPayloadExtended);
  if (paymentInsert.error) {
    const errMsg = String(paymentInsert.error?.message || "").toLowerCase();
    if (isColumnMissingError(errMsg)) {
      const compatPayloadWithReference = {
        user_id: userId,
        plan_id: planId,
        provider,
        amount,
        currency: safeCurrency,
        status: "pending",
        reference: safeReference,
        payment_reference: safePaymentReference,
        created_at: depositCreatedAt
      };
      paymentInsert = await insertWithLegacyProviderFallback(compatPayloadWithReference);
    }
  }
  if (paymentInsert.error) {
    const errMsg = String(paymentInsert.error?.message || "");
    if (isNullPaymentReferenceError(errMsg)) {
      const forcedReferencePayload = {
        ...paymentPayloadExtended,
        reference: safeReference,
        payment_reference: safeReference
      };
      paymentInsert = await insertWithLegacyProviderFallback(forcedReferencePayload);
      if (paymentInsert.error) {
        const forcedCompatPayload = {
          user_id: userId,
          plan_id: planId,
          provider,
          amount,
          currency: safeCurrency,
          status: "pending",
          reference: safeReference,
          payment_reference: safeReference,
          created_at: depositCreatedAt
        };
        paymentInsert = await insertWithLegacyProviderFallback(forcedCompatPayload);
      }
    }
  }
  if (paymentInsert.error) {
    const finalError = String(paymentInsert.error?.message || "failed to create payment row");
    if (isNullPaymentReferenceError(finalError)) {
      return {
        ok: false,
        error:
          "payments.payment_reference constraint error. Apply migration 20260327_payments_reference_guard.sql in Supabase and retry."
      };
    }
    return { ok: false, error: finalError };
  }

  const depositInsert = await supabaseAdmin.from("deposits").insert({
    user_id: userId,
    amount: depositAmount,
    tier_at_deposit: planId,
    status: "pending",
    provider: depositProviderLabel || provider,
    provider_reference: safeReference,
    created_at: depositCreatedAt
  });

  if (depositInsert.error) {
    await supabaseAdmin.from("payments").delete().eq("reference", safeReference);
    return { ok: false, error: depositInsert.error?.message || "failed to create deposit row" };
  }

  return { ok: true, reference: safeReference, paymentReference: safePaymentReference };
};

export const updatePaymentChargeDetails = async (
  supabaseAdmin,
  { reference, amount, currency }
) => {
  const safeReference = clean(reference);
  const safeCurrency = toIsoCurrency(currency, "USD");
  const safeAmount = roundMoney(amount);
  if (!safeReference) return { ok: false, error: "reference required" };
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) return { ok: false, error: "invalid amount" };

  const { error } = await supabaseAdmin
    .from("payments")
    .update({ amount: safeAmount, currency: safeCurrency })
    .eq("reference", safeReference);
  if (error) {
    return { ok: false, error: error.message || "failed to update payment amount/currency" };
  }
  return { ok: true };
};

export const patchPaymentRecord = async (
  supabaseAdmin,
  { reference, patch = {} }
) => {
  const safeReference = clean(reference);
  const safePatch = patch && typeof patch === "object" ? { ...patch } : {};
  if (!safeReference) return { ok: false, error: "reference required" };
  if (!Object.keys(safePatch).length) return { ok: true };

  safePatch.updated_at = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("payments")
    .update(safePatch)
    .eq("reference", safeReference);
  if (error) {
    return { ok: false, error: error.message || "failed to patch payment row" };
  }
  return { ok: true };
};

export const updatePaymentRecordsStatus = async (
  supabaseAdmin,
  { reference, status, confirmedAt = null }
) => {
  const safeStatus = clean(status).toLowerCase();
  if (!["pending", "success", "failed"].includes(safeStatus)) {
    return { ok: false, error: "invalid status" };
  }

  const paymentPatch = { status: safeStatus, updated_at: new Date().toISOString() };
  if (safeStatus === "success" && confirmedAt) {
    paymentPatch.callback_received_at = confirmedAt;
  }
  let paymentUpdate = await supabaseAdmin
    .from("payments")
    .update(paymentPatch)
    .eq("reference", reference);
  if (paymentUpdate.error) {
    const msg = String(paymentUpdate.error?.message || "").toLowerCase();
    const columnMissing =
      msg.includes("schema cache") || msg.includes("column") || msg.includes("does not exist");
    if (columnMissing) {
      paymentUpdate = await supabaseAdmin
        .from("payments")
        .update({ status: safeStatus })
        .eq("reference", reference);
    }
  }
  if (paymentUpdate.error) {
    return { ok: false, error: paymentUpdate.error?.message || "failed to update payment row" };
  }

  if (safeStatus === "success") return { ok: true };

  const depositUpdatePayload = safeStatus === "failed" ? { status: "failed" } : { status: "pending" };
  if (confirmedAt) depositUpdatePayload.confirmed_at = confirmedAt;
  await supabaseAdmin
    .from("deposits")
    .update(depositUpdatePayload)
    .eq("provider_reference", reference)
    .neq("status", "success");
  return { ok: true };
};

export const rekeyPaymentReference = async (supabaseAdmin, { currentReference, nextReference }) => {
  const current = clean(currentReference);
  const next = clean(nextReference);
  if (!current || !next || current === next) return { ok: true, reference: current || next };

  const paymentUpdate = await supabaseAdmin
    .from("payments")
    .update({ reference: next })
    .eq("reference", current);
  if (paymentUpdate.error) {
    return { ok: false, error: paymentUpdate.error?.message || "failed to update payment reference" };
  }

  const depositUpdate = await supabaseAdmin
    .from("deposits")
    .update({ provider_reference: next })
    .eq("provider_reference", current);
  if (depositUpdate.error) {
    await supabaseAdmin.from("payments").update({ reference: current }).eq("reference", next);
    return { ok: false, error: depositUpdate.error?.message || "failed to update deposit reference" };
  }

  return { ok: true, reference: next };
};

export const fetchPaymentByReference = async (supabaseAdmin, reference) => {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("id,user_id,plan_id,provider,amount,currency,status,reference,payment_reference,payment_type,environment,payment_timestamp,provider_transaction_id,mpesa_receipt,metadata,created_at,updated_at,callback_received_at")
    .eq("reference", reference)
    .maybeSingle();
  if (error) return { row: null, error: error.message || "failed to load payment" };
  return { row: data || null, error: null };
};

export const fetchDepositByReference = async (supabaseAdmin, reference) => {
  const { data, error } = await supabaseAdmin
    .from("deposits")
    .select("deposit_id,user_id,amount,status,tier_at_deposit,provider,provider_reference,created_at,confirmed_at")
    .eq("provider_reference", reference)
    .maybeSingle();
  if (error) return { row: null, error: error.message || "failed to load deposit" };
  return { row: data || null, error: null };
};

export const applyDepositSuccess = async (supabaseAdmin, reference) => {
  const { data, error } = await supabaseAdmin.rpc("confirm_deposit_success", {
    p_provider_reference: reference
  });
  if (error) return { ok: false, error: error?.message || "failed to confirm deposit" };
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, row: row || null };
};

export const amountMatches = (expected, actual, tolerance = 0.009) => {
  const a = roundMoney(expected);
  const b = roundMoney(actual);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= tolerance;
};

export const parseProviderStatus = (rawStatus) => {
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

export const extractNested = (payload, paths = []) => {
  const obj = safeJson(payload);
  for (const path of paths) {
    const parts = String(path || "")
      .split(".")
      .map((p) => p.trim())
      .filter(Boolean);
    let cursor = obj;
    let ok = true;
    for (const p of parts) {
      if (!cursor || typeof cursor !== "object" || !(p in cursor)) {
        ok = false;
        break;
      }
      cursor = cursor[p];
    }
    if (ok && cursor !== undefined && cursor !== null && cursor !== "") return cursor;
  }
  return null;
};
