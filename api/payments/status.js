import {
  getAuthUser,
  getSupabaseAdmin,
  isAdminUser,
  isSafeReference,
  isSupabaseConfigured
} from "../../lib/api/payment-common.js";
import { applyApiSecurity, readClientIp } from "../../lib/api/http-security.js";
import { checkRateLimit } from "../../lib/api/rate-limit.js";

const clean = (value) => String(value || "").trim();
const defaultEnvironment = String(process.env.MPESA_ENVIRONMENT || "sandbox")
  .trim()
  .toLowerCase()
  .includes("live")
  ? "live"
  : "sandbox";

export default async function handler(req, res) {
  const security = applyApiSecurity(req, res, { methods: ["GET", "OPTIONS"] });
  if (!security.ok) {
    return res.status(403).json({ error: security.error || "forbidden" });
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const { user, error: authError } = await getAuthUser(supabaseAdmin, req);
  if (authError || !user?.id) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const rateKey = `payments-status:${user.id}:${readClientIp(req) || "unknown"}`;
  const rate = checkRateLimit(rateKey, { windowMs: 60_000, max: 80 });
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(Math.max(Math.ceil(rate.retryAfterMs / 1000), 1)));
    return res.status(429).json({ error: "too many requests" });
  }

  const isAdmin = await isAdminUser(supabaseAdmin, user.id);
  const scope = clean(req.query?.scope || "").toLowerCase();
  const includeAll = isAdmin && scope === "all";
  const limitRaw = Number(req.query?.limit);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 300)) : 100;
  const reference = clean(req.query?.reference || "");

  if (reference && !isSafeReference(reference)) {
    return res.status(400).json({ error: "invalid reference" });
  }

  let query = supabaseAdmin
    .from("payments")
    .select(
      "id,user_id,plan_id,provider,amount,currency,status,reference,payment_reference,payment_type,environment,payment_timestamp,provider_transaction_id,mpesa_receipt,phone_number,course_id,created_at,updated_at,callback_received_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!includeAll) {
    query = query.eq("user_id", user.id);
  }
  if (reference) {
    query = query.eq("reference", reference);
  }

  let { data, error } = await query;
  if (error) {
    const fallbackQuery = supabaseAdmin
      .from("payments")
      .select("id,user_id,plan_id,provider,amount,currency,status,reference,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    let fallback = fallbackQuery;
    if (!includeAll) fallback = fallback.eq("user_id", user.id);
    if (reference) fallback = fallback.eq("reference", reference);
    const fallbackRes = await fallback;
    data = fallbackRes.data;
    error = fallbackRes.error;
  }
  if (error) {
    return res.status(500).json({ error: error.message || "failed to fetch payments" });
  }

  const normalizedPayments = Array.isArray(data)
    ? data.map((row) => ({
        ...row,
        provider: (() => {
          const providerRaw = clean(row?.provider).toLowerCase();
          const referenceRaw = clean(row?.payment_reference || row?.reference).toLowerCase();
          if (providerRaw === "paystack" || referenceRaw.startsWith("paystack_") || referenceRaw.startsWith("pay-")) return "paystack";
          return row?.provider || "";
        })(),
        environment: clean(row?.environment).toLowerCase() === "live" ? "live" : row?.environment || defaultEnvironment
      }))
    : [];

  return res.status(200).json({
    payments: normalizedPayments,
    count: normalizedPayments.length,
    scope: includeAll ? "all" : "mine"
  });
}
