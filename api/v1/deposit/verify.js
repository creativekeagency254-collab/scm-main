import { createClient } from "@supabase/supabase-js";
import { getTransactionStatus, isKoraConfigured } from "../../lib/pesapal.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getAdmin = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

const getBearerToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  if (!header) return "";
  return header.startsWith("Bearer ") ? header.slice(7) : header;
};

const getAuthUser = async (supabaseAdmin, req) => {
  const token = getBearerToken(req);
  if (!token) return { user: null, error: "missing token" };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { user: null, error: error?.message || "invalid token" };
  return { user: data.user, error: null };
};

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

const isAdminUser = async (supabaseAdmin, userId) => {
  if (!userId) return false;
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("profile_data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return hasAdminRole(data?.profile_data);
};

const normalizeStatus = (payload) => {
  const desc = String(payload?.payment_status_description || payload?.payment_status || "").toLowerCase();
  const codeRaw = payload?.status_code ?? payload?.statusCode;
  const code = Number.isFinite(Number(codeRaw)) ? Number(codeRaw) : null;
  if (code === 1 || desc === "completed") return "success";
  if (code === 2 || code === 0 || code === 3 || ["failed", "invalid", "reversed"].includes(desc)) return "failed";
  return "pending";
};

const toMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Number(n.toFixed(2));
};

const readClientIp = (req) =>
  String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "")
    .split(",")[0]
    .trim();

const loadDepositRow = async (supabaseAdmin, merchantReference) => {
  if (!merchantReference) return null;
  const { data, error } = await supabaseAdmin
    .from("deposits")
    .select("deposit_id,user_id,amount,status,tier_at_deposit")
    .eq("provider_reference", merchantReference)
    .maybeSingle();
  if (error) return null;
  return data || null;
};

const maybeLogPaymentEvent = async (
  supabaseAdmin,
  { req, source, trackingId, merchantReference, decision, expectedAmount, providerAmount, currency, payload }
) => {
  try {
    await supabaseAdmin.from("payment_audit_events").insert({
      provider: "kora",
      source,
      tracking_id: trackingId || null,
      merchant_reference: merchantReference || null,
      decision,
      expected_amount: expectedAmount,
      provider_amount: providerAmount,
      currency: currency || null,
      ip: readClientIp(req),
      user_agent: String(req.headers["user-agent"] || "").slice(0, 512),
      payload: payload && typeof payload === "object" ? payload : {}
    });
  } catch (e) {
    // Keep payment flow resilient if telemetry table is not deployed yet.
  }
};

const maybeFlagPaymentIssue = async (
  supabaseAdmin,
  { source, reason, trackingId, merchantReference, expectedAmount, providerAmount, currency, payload }
) => {
  try {
    await supabaseAdmin.from("payment_flags").insert({
      provider: "kora",
      source,
      reason,
      tracking_id: trackingId || null,
      merchant_reference: merchantReference || null,
      expected_amount: expectedAmount,
      provider_amount: providerAmount,
      currency: currency || null,
      payload: payload && typeof payload === "object" ? payload : {}
    });
  } catch (e) {
    // Keep payment flow resilient if telemetry table is not deployed yet.
  }
};

const applyDepositSuccess = async (supabaseAdmin, merchantReference) => {
  if (!merchantReference) return { updated: false, reason: "missing_reference" };
  const { data, error } = await supabaseAdmin.rpc("confirm_deposit_success", {
    p_provider_reference: merchantReference
  });
  if (error) return { updated: false, reason: error?.message || "confirm_failed" };
  const row = Array.isArray(data) ? data[0] : data;
  return { updated: true, already: !!row?.already };
};

const applyDepositFailure = async (supabaseAdmin, merchantReference) => {
  if (!merchantReference) return;
  await supabaseAdmin
    .from("deposits")
    .update({ status: "failed" })
    .eq("provider_reference", merchantReference)
    .neq("status", "success");
};

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "supabase not configured" });
  }
  if (!isKoraConfigured()) {
    return res.status(500).json({ error: "Kora is not configured." });
  }

  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }
  const { user, error: authError } = await getAuthUser(supabaseAdmin, req);
  if (authError || !user?.id) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const adminAccess = await isAdminUser(supabaseAdmin, user.id);

  const trackingId =
    String(
      req.query?.tracking_id ||
        req.query?.orderTrackingId ||
        req.query?.OrderTrackingId ||
        req.query?.reference ||
        req.query?.merchant_reference ||
        ""
    ).trim();
  const merchantReference =
    String(req.query?.merchant_reference || req.query?.reference || req.query?.OrderMerchantReference || "").trim();

  if (!trackingId) {
    return res.status(400).json({ error: "tracking_id required" });
  }

  try {
    const statusPayload = await getTransactionStatus(trackingId);
    const status = normalizeStatus(statusPayload);
    const providerAmount =
      toMoney(
        statusPayload?.amount ??
          statusPayload?.data?.amount ??
          statusPayload?.amount_paid ??
          statusPayload?.data?.amount_paid
      );
    const currency =
      String(statusPayload?.currency || statusPayload?.data?.currency || "").trim().toUpperCase() || null;
    const depositRow = await loadDepositRow(supabaseAdmin, merchantReference);
    if (depositRow && !adminAccess && String(depositRow.user_id || "") !== String(user.id)) {
      return res.status(403).json({ error: "forbidden" });
    }
    const expectedAmount = toMoney(depositRow?.amount);
    const amountMismatch =
      status === "success" &&
      providerAmount !== null &&
      expectedAmount !== null &&
      Math.abs(providerAmount - expectedAmount) > 0.009;

    if (status === "success") {
      if (!merchantReference) {
        await maybeFlagPaymentIssue(supabaseAdmin, {
          source: "verify",
          reason: "missing_merchant_reference",
          trackingId,
          merchantReference,
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        await maybeLogPaymentEvent(supabaseAdmin, {
          req,
          source: "verify",
          trackingId,
          merchantReference,
          decision: "rejected",
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        return res.status(400).json({ error: "merchant_reference required", tracking_id: trackingId });
      }
      if (!depositRow) {
        await maybeFlagPaymentIssue(supabaseAdmin, {
          source: "verify",
          reason: "deposit_not_found",
          trackingId,
          merchantReference,
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        await maybeLogPaymentEvent(supabaseAdmin, {
          req,
          source: "verify",
          trackingId,
          merchantReference,
          decision: "rejected",
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        return res.status(404).json({ error: "deposit not found", tracking_id: trackingId, merchant_reference: merchantReference });
      }
      if (amountMismatch) {
        await maybeFlagPaymentIssue(supabaseAdmin, {
          source: "verify",
          reason: "amount_mismatch",
          trackingId,
          merchantReference,
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        await applyDepositFailure(supabaseAdmin, merchantReference);
        await maybeLogPaymentEvent(supabaseAdmin, {
          req,
          source: "verify",
          trackingId,
          merchantReference,
          decision: "rejected",
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        return res.status(409).json({
          error: "payment amount mismatch",
          expected_amount: expectedAmount,
          provider_amount: providerAmount,
          tracking_id: trackingId,
          merchant_reference: merchantReference
        });
      }
      const applied = await applyDepositSuccess(supabaseAdmin, merchantReference);
      if (!applied?.updated) {
        const isMissing = String(applied?.reason || "").toLowerCase().includes("not found");
        await maybeFlagPaymentIssue(supabaseAdmin, {
          source: "verify",
          reason: applied?.reason || "confirm_failed",
          trackingId,
          merchantReference,
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        await maybeLogPaymentEvent(supabaseAdmin, {
          req,
          source: "verify",
          trackingId,
          merchantReference,
          decision: "error",
          expectedAmount,
          providerAmount,
          currency,
          payload: statusPayload
        });
        return res.status(isMissing ? 404 : 500).json({
          error: applied?.reason || "failed to confirm deposit",
          status,
          tracking_id: trackingId,
          merchant_reference: merchantReference
        });
      }
      await maybeLogPaymentEvent(supabaseAdmin, {
        req,
        source: "verify",
        trackingId,
        merchantReference,
        decision: "success",
        expectedAmount,
        providerAmount,
        currency,
        payload: statusPayload
      });
    } else if (status === "failed") {
      await applyDepositFailure(supabaseAdmin, merchantReference);
      await maybeLogPaymentEvent(supabaseAdmin, {
        req,
        source: "verify",
        trackingId,
        merchantReference,
        decision: "failed",
        expectedAmount,
        providerAmount,
        currency,
        payload: statusPayload
      });
    } else {
      await maybeLogPaymentEvent(supabaseAdmin, {
        req,
        source: "verify",
        trackingId,
        merchantReference,
        decision: "pending",
        expectedAmount,
        providerAmount,
        currency,
        payload: statusPayload
      });
    }
    return res.status(200).json({
      status,
      tracking_id: trackingId,
      merchant_reference: merchantReference,
      kora_status:
        statusPayload?.payment_status_description ||
        statusPayload?.payment_status ||
        statusPayload?.transaction_status ||
        ""
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "failed to verify payment" });
  }
}
