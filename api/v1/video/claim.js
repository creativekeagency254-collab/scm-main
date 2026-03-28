import { createClient } from "@supabase/supabase-js";
import { getTierBonusUnit } from "../../../src/features/config/tiers.js";
import { applyApiSecurity, readClientIp } from "../../../lib/api/http-security.js";
import { checkRateLimit } from "../../../lib/api/rate-limit.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_VIDEO_UNIT = Number.isFinite(Number(process.env.VIDEO_REWARD_UNIT))
  ? Number(process.env.VIDEO_REWARD_UNIT)
  : 50;

const getAdmin = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

const getBearerToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  if (!header) return "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : String(header || "").trim();
};

const getAuthUser = async (supabaseAdmin, req) => {
  const token = getBearerToken(req);
  if (!token) return { user: null, error: "missing token" };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) return { user: null, error: error?.message || "invalid token" };
  return { user: data.user, error: null };
};

const roundMoney = (value, digits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Number(n.toFixed(digits));
};

const normalizeKind = (value) => {
  const raw = String(value || "manual").trim().toLowerCase();
  return raw === "bonus" ? "bonus" : "manual";
};

const toNairobiDayKey = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);

const normalizeEventId = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, "")
    .slice(0, 80);

const hasDepositForTier = async (supabaseAdmin, userId, tier) => {
  try {
    const { data, error } = await supabaseAdmin.rpc("has_active_deposit", {
      p_user: userId,
      p_tier: tier
    });
    if (error) return false;
    return data === true;
  } catch (_e) {
    return false;
  }
};

const getVideoCounts = async (supabaseAdmin, userId, dayKey) => {
  const { data, error } = await supabaseAdmin
    .from("video_views")
    .select("is_required")
    .eq("user_id", userId)
    .eq("watched_day", dayKey)
    .limit(500);

  if (error || !Array.isArray(data)) return { required: 0, optional: 0 };
  let required = 0;
  let optional = 0;
  for (const row of data) {
    if (row?.is_required === true) required += 1;
    else optional += 1;
  }
  return { required, optional };
};

const countClaimedSlots = async (supabaseAdmin, userId, dayKey, kindKey) => {
  const prefix = `claim:${kindKey}:${userId}:${dayKey}:`;
  const legacy = `claim:${kindKey}:${userId}:${dayKey}`;

  const [slotRowsRes, legacyRes] = await Promise.all([
    supabaseAdmin
      .from("transactions")
      .select("reference")
      .eq("user_id", userId)
      .eq("type", "accrual")
      .like("reference", `${prefix}%`)
      .limit(200),
    supabaseAdmin
      .from("transactions")
      .select("reference")
      .eq("user_id", userId)
      .eq("type", "accrual")
      .eq("reference", legacy)
      .limit(1)
      .maybeSingle()
  ]);

  const slotCount = Array.isArray(slotRowsRes?.data) ? slotRowsRes.data.length : 0;
  const legacyClaimed = !!legacyRes?.data?.reference;
  return { slotCount, legacyClaimed };
};

const readWalletBalance = async (supabaseAdmin, userId) => {
  const { data } = await supabaseAdmin
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  const n = Number(data?.balance);
  return Number.isFinite(n) ? n : 0;
};

const applyWalletCredit = async (supabaseAdmin, { userId, amount, reference, relatedId = null, type = "accrual" }) => {
  const { data, error } = await supabaseAdmin.rpc("apply_wallet_tx", {
    p_user_id: userId,
    p_type: type,
    p_amount: amount,
    p_related_id: relatedId,
    p_reference: reference
  });
  if (error) return { ok: false, error: error.message || "wallet update failed" };
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, newBalance: Number(row?.new_balance) };
};

const applyReferralForEarning = async (supabaseAdmin, { sourceUserId, earningAmount, claimReference }) => {
  if (!sourceUserId || !Number.isFinite(Number(earningAmount)) || Number(earningAmount) <= 0) {
    return { total: 0 };
  }

  const { data: level1Row } = await supabaseAdmin
    .from("users")
    .select("referrer_id")
    .eq("user_id", sourceUserId)
    .maybeSingle();

  const level1 = level1Row?.referrer_id || null;
  if (!level1 || String(level1) === String(sourceUserId)) return { total: 0 };

  let level2 = null;
  const { data: level2Row } = await supabaseAdmin
    .from("users")
    .select("referrer_id")
    .eq("user_id", level1)
    .maybeSingle();
  if (level2Row?.referrer_id && String(level2Row.referrer_id) !== String(sourceUserId) && String(level2Row.referrer_id) !== String(level1)) {
    level2 = level2Row.referrer_id;
  }

  const level1Amount = roundMoney(Number(earningAmount) * 0.1);
  const level2Amount = roundMoney(Number(earningAmount) * 0.02);
  let total = 0;

  if (Number.isFinite(level1Amount) && level1Amount > 0) {
    const res = await applyWalletCredit(supabaseAdmin, {
      userId: level1,
      amount: level1Amount,
      reference: `ref:earn:l1:${claimReference}`,
      type: "referral"
    });
    if (res.ok) total += level1Amount;
  }

  if (level2 && Number.isFinite(level2Amount) && level2Amount > 0) {
    const res = await applyWalletCredit(supabaseAdmin, {
      userId: level2,
      amount: level2Amount,
      reference: `ref:earn:l2:${claimReference}`,
      type: "referral"
    });
    if (res.ok) total += level2Amount;
  }

  return { total: roundMoney(total) };
};

export default async function handler(req, res) {
  const security = applyApiSecurity(req, res, { methods: ["POST", "OPTIONS"] });
  if (!security.ok) {
    return res.status(403).json({ error: security.error || "forbidden" });
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "supabase not configured" });
  }

  const { user, error: authError } = await getAuthUser(supabaseAdmin, req);
  if (authError || !user?.id) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const rateKey = `video-claim:${user.id}:${readClientIp(req) || "unknown"}`;
  const rate = checkRateLimit(rateKey, { windowMs: 60_000, max: 140 });
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(Math.max(Math.ceil(rate.retryAfterMs / 1000), 1)));
    return res.status(429).json({ error: "too many requests" });
  }

  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const kind = normalizeKind(body.kind || body.p_kind || "manual");
  const qtyRaw = Number(body.qty ?? body.p_qty ?? 1);
  const qtyRequested = Math.max(1, Math.min(10, Number.isFinite(qtyRaw) ? Math.floor(qtyRaw) : 1));
  // Keep parsing for backward-compat payloads even though slot references are deterministic.
  const eventId = normalizeEventId(body.event_id || body.p_event_id || "");

  const { data: userRow, error: userErr } = await supabaseAdmin
    .from("users")
    .select("user_id,tier")
    .eq("user_id", user.id)
    .maybeSingle();

  if (userErr || !userRow?.user_id) {
    return res.status(404).json({ error: "profile not found" });
  }

  const tier = Number(userRow.tier);
  const tierId = Number.isFinite(tier) && tier > 0 ? tier : 1;

  const hasDeposit = await hasDepositForTier(supabaseAdmin, user.id, tierId);
  if (!hasDeposit) {
    return res.status(400).json({ error: "deposit required for tier" });
  }

  const dayKey = toNairobiDayKey();
  const counts = await getVideoCounts(supabaseAdmin, user.id, dayKey);
  const kindKey = kind === "bonus" ? "bonus" : "req";
  const claimedState = await countClaimedSlots(supabaseAdmin, user.id, dayKey, kindKey);

  const watchedCount = kind === "bonus" ? counts.optional : counts.required;
  let claimedSlots = claimedState.slotCount;
  if (claimedState.legacyClaimed) claimedSlots = watchedCount;

  const remaining = Math.max(0, watchedCount - claimedSlots);
  const slotsToClaim = Math.max(0, Math.min(remaining, qtyRequested));

  const bonusUnit = Number(getTierBonusUnit({ id: tierId })) || 0;
  const unit = kind === "bonus" ? bonusUnit : BASE_VIDEO_UNIT;
  if (!Number.isFinite(unit) || unit <= 0) {
    return res.status(400).json({ error: "invalid reward unit" });
  }

  let walletBalance = await readWalletBalance(supabaseAdmin, user.id);
  if (slotsToClaim <= 0) {
    return res.status(200).json({
      credited_amount: 0,
      new_balance: roundMoney(walletBalance),
      claim_day: dayKey,
      event_id: eventId || null,
      tier: tierId,
      required_count: counts.required,
      optional_count: counts.optional,
      bonus_amount: 0,
      referral_credited: 0
    });
  }

  let credited = 0;
  let referralCredited = 0;
  let slotCursor = claimedSlots;

  for (let i = 0; i < slotsToClaim; i++) {
    slotCursor += 1;
    const slotRef = `claim:${kindKey}:${user.id}:${dayKey}:${slotCursor}`;
    const finalRef = slotRef;

    const { data: preExisting } = await supabaseAdmin
      .from("transactions")
      .select("tx_id")
      .eq("reference", finalRef)
      .limit(1)
      .maybeSingle();

    const applyRes = await applyWalletCredit(supabaseAdmin, {
      userId: user.id,
      amount: unit,
      reference: finalRef,
      type: "accrual"
    });

    if (!applyRes.ok) {
      return res.status(500).json({ error: applyRes.error || "failed to credit earning" });
    }

    if (!preExisting?.tx_id) {
      credited += unit;
      if (Number.isFinite(applyRes.newBalance)) walletBalance = applyRes.newBalance;
      const refRes = await applyReferralForEarning(supabaseAdmin, {
        sourceUserId: user.id,
        earningAmount: unit,
        claimReference: finalRef
      });
      referralCredited += Number(refRes?.total || 0);
    }
  }

  return res.status(200).json({
    credited_amount: roundMoney(credited),
    new_balance: roundMoney(walletBalance),
    claim_day: dayKey,
    event_id: eventId || null,
    tier: tierId,
    required_count: counts.required,
    optional_count: counts.optional,
    bonus_amount: kind === "bonus" ? roundMoney(credited) : 0,
    referral_credited: roundMoney(referralCredited)
  });
}
