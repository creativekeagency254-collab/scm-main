import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import React from "react";
import { createClient } from "@supabase/supabase-js";
import { Fonts, GlobalStyles } from "./src/features/layout/AppStyles.jsx";
import { I, PaymentLogo, BrandMark, PAYMENT_ICON_SOURCES, AnimNum, LazyVideo } from "./src/features/shared/ui-primitives.jsx";
import { TIERS, V_PRICE, getTierRequiredEarn, getTierDailyTotal, getTierBonusUnit } from "./src/features/config/tiers.js";
import { AVATAR_PRESETS } from "./src/features/profile/avatar-presets.js";

/* "" SUPABASE (optional) "" */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_BASE = import.meta.env.VITE_API_BASE || "";
const ANDROID_APK_URL = String(import.meta.env.VITE_ANDROID_APK_URL || "").trim();
const IOS_APP_URL = String(import.meta.env.VITE_IOS_APP_URL || "").trim();
const PAYMENTS_MODE = String(import.meta.env.VITE_PAYMENTS_MODE || "live").toLowerCase();
const WITHDRAWALS_MODE = String(import.meta.env.VITE_WITHDRAWALS_MODE || PAYMENTS_MODE || "auto").toLowerCase();
const MANUAL_WITHDRAWALS = WITHDRAWALS_MODE !== "auto";
const FX_KES_PER_USD = 130;
const CURRENCY_STORAGE_KEY = "ep:currency";
const DISPLAY_CURRENCIES = { KES: "KES", USD: "USD" };
let ACTIVE_DISPLAY_CURRENCY = DISPLAY_CURRENCIES.KES;
const ORIGINAL_CURRENCY_TEXT = new WeakMap();

const normalizeDisplayCurrency = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  return raw === DISPLAY_CURRENCIES.USD ? DISPLAY_CURRENCIES.USD : DISPLAY_CURRENCIES.KES;
};
const setActiveDisplayCurrency = (value) => {
  ACTIVE_DISPLAY_CURRENCY = normalizeDisplayCurrency(value);
};
const getActiveDisplayCurrency = () => ACTIVE_DISPLAY_CURRENCY;
const toDisplayAmount = (kesAmount, currency = getActiveDisplayCurrency()) => {
  const n = Number(kesAmount);
  if (!Number.isFinite(n)) return 0;
  return currency === DISPLAY_CURRENCIES.USD ? (n / FX_KES_PER_USD) : n;
};
const toKesAmount = (amount, currency = getActiveDisplayCurrency()) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return NaN;
  if (currency === DISPLAY_CURRENCIES.USD) return Math.round(n * FX_KES_PER_USD);
  return n;
};
const formatMoney = (kesAmount, opts = {}) => {
  const {
    currency = getActiveDisplayCurrency(),
    compact = false,
    minFractionDigits,
    maxFractionDigits
  } = opts || {};
  const kes = Number(kesAmount);
  const safeKes = Number.isFinite(kes) ? kes : 0;
  if (currency === DISPLAY_CURRENCIES.USD) {
    const usd = safeKes / FX_KES_PER_USD;
    const min = Number.isFinite(minFractionDigits) ? minFractionDigits : 2;
    const max = Number.isFinite(maxFractionDigits) ? maxFractionDigits : 2;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: compact ? "compact" : "standard",
      minimumFractionDigits: min,
      maximumFractionDigits: max
    }).format(usd);
  }
  const min = Number.isFinite(minFractionDigits) ? minFractionDigits : 0;
  const max = Number.isFinite(maxFractionDigits) ? maxFractionDigits : 0;
  const value = new Intl.NumberFormat("en-US", {
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: min,
    maximumFractionDigits: max
  }).format(safeKes);
  return `KES ${value}`;
};
const parseKesNumberWithSuffix = (numPart = "", suffix = "") => {
  const n = Number(String(numPart || "").replace(/,/g, ""));
  if (!Number.isFinite(n)) return NaN;
  const tag = String(suffix || "").toUpperCase();
  if (tag === "K") return n * 1_000;
  if (tag === "M") return n * 1_000_000;
  if (tag === "B") return n * 1_000_000_000;
  return n;
};
const convertKesTextToSelectedCurrency = (text, currency = getActiveDisplayCurrency()) => {
  const raw = String(text || "");
  if (currency !== DISPLAY_CURRENCIES.USD) return raw;
  const withAmounts = raw.replace(/([+-]?)\s*(KES|KSH)\s*([0-9][0-9,]*(?:\.[0-9]+)?)([KMBkmb]?)(\+?)/gi, (full, sign, _cur, numPart, suffix, trailingPlus) => {
    const unsignedKes = parseKesNumberWithSuffix(numPart, suffix);
    if (!Number.isFinite(unsignedKes)) return full;
    const signedKes = sign === "-" ? -unsignedKes : unsignedKes;
    const useCompact = !!suffix;
    const usdLabel = formatMoney(signedKes, {
      currency: DISPLAY_CURRENCIES.USD,
      compact: useCompact,
      minFractionDigits: useCompact ? 0 : 2,
      maxFractionDigits: useCompact ? 1 : 2
    });
    const plusPrefix = sign === "+" ? "+" : "";
    return `${plusPrefix}${usdLabel}${trailingPlus || ""}`;
  });
  return withAmounts
    .replace(/\bKSH\b/gi, "USD")
    .replace(/\bKES\b/gi, "USD");
};
const isCurrencyStaticNode = (node) => {
  let el = node?.parentElement || null;
  while (el) {
    if (el?.dataset?.currencyStatic === "1") return true;
    const tag = String(el.tagName || "").toUpperCase();
    if (tag === "SCRIPT" || tag === "STYLE") return true;
    el = el.parentElement;
  }
  return false;
};
const applyCurrencyToTextNode = (textNode, currency = getActiveDisplayCurrency()) => {
  if (!textNode || textNode.nodeType !== 3) return;
  if (isCurrencyStaticNode(textNode)) return;
  const current = String(textNode.nodeValue || "");
  if (!current) return;
  if (currency === DISPLAY_CURRENCIES.USD) {
    if (/(KES|KSH)/i.test(current)) ORIGINAL_CURRENCY_TEXT.set(textNode, current);
    const source = ORIGINAL_CURRENCY_TEXT.get(textNode) || current;
    const converted = convertKesTextToSelectedCurrency(source, currency);
    if (converted !== current) textNode.nodeValue = converted;
    return;
  }
  if (!ORIGINAL_CURRENCY_TEXT.has(textNode)) return;
  const original = ORIGINAL_CURRENCY_TEXT.get(textNode);
  if (typeof original === "string" && original !== current) {
    textNode.nodeValue = original;
  }
};
const applyCurrencyToSubtree = (rootNode, currency = getActiveDisplayCurrency()) => {
  if (!rootNode) return;
  if (rootNode.nodeType === 3) {
    applyCurrencyToTextNode(rootNode, currency);
    return;
  }
  if (rootNode.nodeType !== 1) return;
  if (rootNode?.dataset?.currencyStatic === "1") return;
  const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    applyCurrencyToTextNode(node, currency);
    node = walker.nextNode();
  }
};
const DEPOSIT_METHODS = [
  { id: "mpesa", value: "M-Pesa", title: "M-Pesa", subtitle: "M-Pesa", logo: "M-Pesa" },
  { id: "airtel", value: "Airtel Money", title: "Airtel Money", subtitle: "Airtel Money", logo: "Airtel Money" },
  { id: "visa", value: "Visa", title: "Visa", subtitle: "Visa", logo: "Visa" },
  { id: "mastercard", value: "Mastercard", title: "Mastercard", subtitle: "Mastercard", logo: "Mastercard" },
  { id: "bank", value: "Bank Transfer", title: "Bank Transfer", subtitle: "Bank Transfer" },
  { id: "crypto", value: "USDT / BTC", title: "Crypto", subtitle: "USDT / BTC", logo: "USDT" }
];
const CLIENT_DASH_TAB_ITEMS = [
  { id: "overview", label: "Overview", ic: "grid" },
  { id: "videos", label: "Videos", ic: "play" },
  { id: "analytics", label: "Analytics", ic: "chart" },
  { id: "referrals", label: "Referrals", ic: "gift" },
  { id: "withdraw", label: "Wallet", ic: "wallet" },
  { id: "settings", label: "Settings", ic: "settings" }
];
const ADMIN_DASH_TAB_ITEMS = [
  { id: "overview", label: "Overview", ic: "grid" },
  { id: "users", label: "Users", ic: "users" },
  { id: "transactions", label: "Transactions", ic: "wallet" },
  { id: "withdrawals", label: "Withdrawals", ic: "up" },
  { id: "risk", label: "Fraud Flags", ic: "shield" },
  { id: "settings", label: "Settings", ic: "settings" }
];
const supabase = SUPABASE_URL && SUPABASE_ANON ? createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
    }) : null;
const SUPABASE_ENABLED = !!supabase;
const getApiBase = () => {
  const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
  const configured = String(API_BASE || "").trim().replace(/\/+$/, "");
  if (!configured) return origin;
  return configured;
};
const getAccessToken = async () => {
  if (!supabase) return "";
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || "";
  } catch (e) {
    return "";
  }
};

const formatDepositError = (msg) => {
  const raw = String(msg || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower.includes("amount") && lower.includes("limit")) {
    return "Payment limit reached for this account. Ask Kora support to raise your limit or try a lower tier amount.";
  }
  if (lower.includes("ipn")) {
    return "Payment gateway is not fully configured yet. Please contact support.";
  }
  if (lower.includes("not configured")) {
    return "Payment gateway is not configured. Please contact support.";
  }
  return raw;
};

const normalizeRefCode = (input) => {
  const raw = String(input || "").trim().toUpperCase();
  const cleaned = raw.replace(/[^A-Z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned.slice(0, 32);
    };

const makeRefCode = (seed) => {
  const base = String(seed || "EDISONPAY");
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  const tail = (h % 0xFFFFFFF).toString(36).toUpperCase().padStart(6, "0").slice(-6);
  return `EDP-${tail}`;
    };

async function fetchTable(table, opts = {}) {
  if (!supabase) return null;
  try {
    const { userId, limit = 200, orderBy, ascending = false, filters } = opts || {};
    let q = supabase.from(table).select("*");
    if (userId) q = q.eq("user_id", userId);
    if (filters && typeof filters === "object") {
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== null && v !== "") q = q.eq(k, v);
      }
    }
    if (orderBy) q = q.order(orderBy, { ascending });
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
    }

async function fetchDashboardOverviewRow(activeTierId) {
  if (!supabase) return null;
  try {
    const tier = Number(activeTierId);
    const params = Number.isInteger(tier) && tier > 0 ? { p_tier: tier } : {};
    const { data, error } = await supabase.rpc("get_my_dashboard_overview", params);
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    return row && typeof row === "object" ? row : null;
  } catch (e) {
    return null;
  }
    }

async function loadProfileRow(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("user_id,email,phone,full_name,signup_at,tier,referral_code,status,profile_data,wallets(balance,available_for_withdrawal,hold)")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    const wallet = Array.isArray(data.wallets) ? data.wallets[0] : data.wallets;
    const meta = data.profile_data || {};
    const rawStatus = String(data.status || "active");
    const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
    return {
      id: data.user_id,
      name: data.full_name || meta.name || "",
      email: data.email || "",
      phone: data.phone || "",
      avatar_url: meta.avatar_url || meta.avatar || "",
      balance: Number(wallet?.balance ?? 0),
      join_number: meta.join_number ?? null,
      ref_code: data.referral_code || meta.ref_code || "",
      referred_by: meta.referred_by || "",
      tier_selected: meta.tier_selected === true,
      tier_selected_at: meta.tier_selected_at || null,
      role: String(meta.role || "client").toLowerCase(),
      category: meta.category || "Client",
      status,
      tier: data.tier ?? 1,
      created_at: data.signup_at || null,
      updated_at: meta.updated_at || null
    };
  } catch (e) {
    return null;
  }
    };

async function upsertProfileRow(payload) {
  if (!supabase) return null;
  try {
    const userId = payload?.id || payload?.user_id;
    if (!userId) return null;

    const tierIdx = resolveTierIndex(payload.tier);
    const tierVal = tierIdx !== null ? tierIdx + 1 : (Number.isFinite(Number(payload.tier)) ? Number(payload.tier) : 1);

    const statusRaw = String(payload.status || "active").toLowerCase();
    const status = statusRaw.startsWith("susp") ? "suspended" : statusRaw.startsWith("ban") ? "banned" : "active";

    let prevMeta = {};
    let prevTier = 1;
    let prevReferralCode = null;
    let prevStatus = "active";
    try {
      const { data: prev } = await supabase
        .from("users")
        .select("profile_data,tier,referral_code,status")
        .eq("user_id", userId)
        .maybeSingle();
      prevMeta = prev?.profile_data || {};
      prevTier = Number.isFinite(Number(prev?.tier)) ? Number(prev.tier) : 1;
      prevReferralCode = prev?.referral_code ?? null;
      prevStatus = String(prev?.status || "active").toLowerCase();
    } catch (e) {
      prevMeta = {};
      prevTier = 1;
      prevReferralCode = null;
      prevStatus = "active";
    }

    const nextMeta = {
      avatar_url: payload.avatar_url ?? payload.avatar ?? prevMeta.avatar_url,
      role: payload.role ?? prevMeta.role,
      category: payload.category ?? prevMeta.category,
      join_number: payload.join_number ?? payload.joinNumber ?? prevMeta.join_number,
      referred_by: payload.referred_by ?? payload.referredBy ?? prevMeta.referred_by,
      tier_selected: payload.tier_selected ?? payload.tierSelected ?? prevMeta.tier_selected,
      tier_selected_at: payload.tier_selected_at ?? payload.tierSelectedAt ?? prevMeta.tier_selected_at,
      updated_at: payload.updated_at || new Date().toISOString()
    };

    const row = {
      user_id: userId,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      full_name: payload.name ?? payload.full_name ?? null,
      profile_data: nextMeta
    };

    row.tier = (payload.tier === undefined || payload.tier === null) ? prevTier : tierVal;
    row.referral_code = payload.ref_code ?? payload.referral_code ?? prevReferralCode ?? null;
    row.status = (payload.status === undefined || payload.status === null) ? prevStatus : status;

    const { error } = await supabase
      .from("users")
      .upsert(row, { onConflict: "user_id" })
      .select()
      .single();
    if (error) return null;

    try {
      await supabase.from("wallets").upsert({ user_id: userId }, { onConflict: "user_id" });
    } catch (e) {}

    return await loadProfileRow(userId);
  } catch (e) {
    return null;
  }
    };

const REF_STORAGE_KEY = "ep:ref";
const TIER_INTENT_KEY = "ep:tier-intent";
let DEPOSIT_WALLET_BANNER_DISMISSED = false;
const getBaseUrl = () => {
  if (typeof window === "undefined") return "https://edisonpay.co.ke";
  return window.location.origin;
    };
const getRefFromUrl = () => {
  if (typeof window === "undefined") return "";
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref") || url.searchParams.get("referral") || url.searchParams.get("code");
    return normalizeRefCode(ref);
  } catch (e) {
    return "";
  }
    };
const getPaymentParams = () => {
  if (typeof window === "undefined") return { trackingId: "", merchantReference: "" };
  try {
    const url = new URL(window.location.href);
    const trackingId =
      url.searchParams.get("OrderTrackingId") ||
      url.searchParams.get("orderTrackingId") ||
      url.searchParams.get("order_tracking_id") ||
      url.searchParams.get("tracking_id") ||
      "";
    const merchantReference =
      url.searchParams.get("OrderMerchantReference") ||
      url.searchParams.get("orderMerchantReference") ||
      url.searchParams.get("merchant_reference") ||
      url.searchParams.get("reference") ||
      url.searchParams.get("trxref") ||
      url.searchParams.get("ref") ||
      "";
    if (url.hash && url.hash.length > 1) {
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const hashTracking =
        hash.get("OrderTrackingId") ||
        hash.get("orderTrackingId") ||
        hash.get("order_tracking_id") ||
        hash.get("tracking_id") ||
        "";
      const hashRef =
        hash.get("OrderMerchantReference") ||
        hash.get("orderMerchantReference") ||
        hash.get("merchant_reference") ||
        hash.get("reference") ||
        hash.get("trxref") ||
        "";
      return {
        trackingId: String(trackingId || hashTracking || ""),
        merchantReference: String(merchantReference || hashRef || "")
      };
    }
    return {
      trackingId: String(trackingId || ""),
      merchantReference: String(merchantReference || "")
    };
  } catch (e) {
    return { trackingId: "", merchantReference: "" };
  }
    };
const clearPaymentParams = () => {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    [
      "OrderTrackingId",
      "orderTrackingId",
      "order_tracking_id",
      "tracking_id",
      "OrderMerchantReference",
      "orderMerchantReference",
      "merchant_reference",
      "reference",
      "trxref",
      "ref"
    ].forEach(k => url.searchParams.delete(k));
    url.hash = "";
    window.history.replaceState({}, document.title, url.pathname);
  } catch (e) {}
    };
const getStoredRef = () => {
  if (typeof window === "undefined") return "";
  try { return normalizeRefCode(localStorage.getItem(REF_STORAGE_KEY)) || ""; } catch (e) { return ""; }
    };
const storeRef = (ref) => {
  if (!ref || typeof window === "undefined") return;
  try { localStorage.setItem(REF_STORAGE_KEY, ref); } catch (e) {}
    };
const storeTierIntent = (tierId) => {
  if (typeof window === "undefined") return;
  const n = Number(tierId);
  if (!Number.isFinite(n) || n < 1 || n > TIERS.length) return;
  try { localStorage.setItem(TIER_INTENT_KEY, String(n)); } catch (e) {}
    };
const getTierIntent = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = Number(localStorage.getItem(TIER_INTENT_KEY));
    return Number.isFinite(raw) ? raw : null;
  } catch (e) {
    return null;
  }
    };
const clearTierIntent = () => {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(TIER_INTENT_KEY); } catch (e) {}
    };

const pickAvatarForSeed = (seed) => {
  const s = String(seed || "0");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_PRESETS[h % AVATAR_PRESETS.length];
    };

const resolveTierIndex = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).toLowerCase().trim();
  const num = Number(raw);
  if (Number.isFinite(num)) {
    const n = Math.round(num);
    if (n >= 1 && n <= TIERS.length) return n - 1;
  }
  const idx = TIERS.findIndex(t => t.name.toLowerCase() === raw || t.tag.toLowerCase() === raw);
  return idx >= 0 ? idx : null;
    };

const getTierCardImage = (tierId) => {
  const arts = [
    LANDING_STICKER_TOP_IMAGE,
    LANDING_STICKER_BOTTOM_IMAGE,
    LANDING_STICKER_TIER_IMAGE,
    HOME_BALANCE_SIDE_IMAGE,
    DASH_BOT_GUIDE_IMAGE
  ];
  const num = Number(tierId);
  const idx = Number.isFinite(num) ? Math.max(0, num - 1) : 0;
  return arts[idx % arts.length] || arts[0];
};

function Landing({ go }) {
  const [scrollPx, setScrollPx] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);
  const [isHeroMenuOpen, setIsHeroMenuOpen] = useState(false);
  const heroMenuRef = useRef(null);
  const handleTierPick = (tierId) => {
    storeTierIntent(tierId);
    go("signup");
  };

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 80);
    let raf;
    const tick = () => { setScrollPx(p => p + 0.55); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!isHeroMenuOpen) return undefined;
    const closeMenuOnOutside = (event) => {
      if (heroMenuRef.current && !heroMenuRef.current.contains(event.target)) {
        setIsHeroMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenuOnOutside);
    document.addEventListener("touchstart", closeMenuOnOutside);
    return () => {
      document.removeEventListener("mousedown", closeMenuOnOutside);
      document.removeEventListener("touchstart", closeMenuOnOutside);
    };
  }, [isHeroMenuOpen]);

  const payments = [
    "Google Pay","USDT","Flutterwave","Binance Pay","M-Pesa","Visa","Mastercard","Bitcoin","BNB",
    "PayPal","Apple Pay","Samsung Pay","Stripe","Alipay","WeChat Pay","Skrill","Neteller","Ethereum","Litecoin","USDC","Cash App","Payoneer",
    "Airtel Money"
  ];
  const processSteps = [
    { icon: "user", title: "Sign Up", desc: "Choose your tier and create your account.", timeline: "Quick Registration" },
    { icon: "wallet", title: "Deposit", desc: "Pay the fixed starting balance for your tier.", timeline: "Secure Deposit" },
    { icon: "play", title: "Watch Videos", desc: "Earn KES 50 per video and unlock bonuses automatically.", timeline: "Daily Earnings" },
    { icon: "gift", title: "Refer Friends", desc: "Get 10% bonus whenever someone joins using your code.", timeline: "Referral Boost" },
    { icon: "up", title: "Withdraw", desc: "Cash out from KES 1,000 every Tuesday and Friday to your phone.", timeline: "Payout Window" }
  ];
  const [activeProcessStep, setActiveProcessStep] = useState(0);
  const [processAutoPaused, setProcessAutoPaused] = useState(false);
  const processResumeTimerRef = useRef(null);
  const processProgress = processSteps.length > 1
    ? (activeProcessStep / (processSteps.length - 1)) * 100
    : 100;
  const activeProcessLabel = processSteps[activeProcessStep]?.title || "Sign Up";
  const pauseProcessAutoAdvance = useCallback(() => {
    if (processResumeTimerRef.current) window.clearTimeout(processResumeTimerRef.current);
    setProcessAutoPaused(true);
    processResumeTimerRef.current = window.setTimeout(() => {
      setProcessAutoPaused(false);
    }, 7000);
  }, []);
  const handleProcessStepFocus = useCallback((stepIndex) => {
    if (!Number.isFinite(stepIndex)) return;
    const bounded = Math.max(0, Math.min(stepIndex, processSteps.length - 1));
    setActiveProcessStep(bounded);
    pauseProcessAutoAdvance();
  }, [pauseProcessAutoAdvance, processSteps.length]);

  useEffect(() => {
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
    if (prefersReducedMotion || processAutoPaused) return undefined;
    const timer = window.setInterval(() => {
      setActiveProcessStep((step) => (step + 1) % processSteps.length);
    }, 2300);
    return () => window.clearInterval(timer);
  }, [processSteps.length, processAutoPaused]);
  useEffect(() => () => {
    if (processResumeTimerRef.current) window.clearTimeout(processResumeTimerRef.current);
  }, []);
  const landingNavLinks = [
    { label: "Features", ic: "play", target: "landing-features" },
    { label: "Tiers", ic: "star", target: "landing-tiers" },
    { label: "How It Works", ic: "activity", target: "landing-how-it-works" },
    { label: "Pricing", ic: "wallet", target: "landing-tiers" }
  ];
  const scrollToSection = useCallback((sectionId) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const anim = (delay = 0) => ({ animation: `fadeUp .55s ease both`, animationDelay: `${delay}ms`, opacity: heroVisible ? 1 : 0 });
  const heroHighlights = [
    "Choose your tier and activate your account in minutes.",
    "Watch required videos and earn KES 50 per video.",
    "Invite friends and receive 10% referral bonus automatically.",
    "Withdraw every Tuesday and Friday straight to your phone."
  ];
  const isBlackHeroHighlight = (line) =>
    line === "Choose your tier and activate your account in minutes." ||
    line === "Withdraw every Tuesday and Friday straight to your phone.";

  return (
    <div className="ep-landing-root" style={{ fontFamily: "Manrope, Sora, Geist, sans-serif", background: "#ffffff", color: "#0f172a", minHeight: "100vh", position:"relative", overflowX:"hidden" }}>

      <div style={{ maxWidth:1300, margin:"0 auto", padding:"24px 5vw 24px", position:"relative", zIndex:3 }}>
        <div ref={heroMenuRef} style={{ position:"relative", display:"flex", justifyContent:"center", marginBottom:24 }}>
          <div className="ep-landing-pill-header">
            <button
              type="button"
              className="ep-landing-pill-action ep-landing-pill-action-signin"
              onClick={() => {
                setIsHeroMenuOpen(false);
                go("login");
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className="ep-landing-pill-center"
              aria-label="Open quick menu"
              aria-expanded={isHeroMenuOpen}
              onClick={() => setIsHeroMenuOpen((open) => !open)}
            >
              <I n="menu" s={16} c="#0f172a" />
            </button>
            <button
              type="button"
              className="ep-landing-pill-action ep-landing-pill-action-signup"
              onClick={() => {
                setIsHeroMenuOpen(false);
                go("signup");
              }}
            >
              Sign Up
            </button>
          </div>
          <div className={`ep-landing-pill-menu-panel ${isHeroMenuOpen ? "open" : ""}`}>
            {landingNavLinks.map(({ label, ic, target }) => (
              <button
                key={label}
                type="button"
                className="ep-landing-pill-menu-link"
                onClick={() => {
                  scrollToSection(target);
                  setIsHeroMenuOpen(false);
                }}
              >
                <I n={ic} s={13} c="#0f766e" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <section className="ep-landing-hero-clean">
          <div className="ep-landing-hero-copy" style={{ display:"flex", flexDirection:"column", justifyContent:"center", minWidth:0 }}>
            <div style={{ ...anim(0), display:"inline-flex", alignItems:"center", gap:8, width:"fit-content", padding:"8px 14px", borderRadius:999, border:"1px solid #bbf7d0", background:"#ecfdf5", color:"#047857", fontSize:12, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase" }}>
              <BrandMark size={20} />
              Smart Video Earnings
            </div>
            <h1 style={{ ...anim(60), marginTop:18, fontSize:"clamp(34px,4.8vw,60px)", lineHeight:1.03, letterSpacing:"-0.03em", color:"#0f172a", fontWeight:900 }}>
              Earn KES 50 for every video.
              <span style={{ display:"block", marginTop:10, color:"#0f766e", fontFamily:"Instrument Serif, serif", fontStyle:"italic", fontWeight:400 }}>
                Simple. Fast. Trusted.
              </span>
            </h1>
            <p style={{ ...anim(120), marginTop:16, maxWidth:560, color:"#334155", fontSize:17, lineHeight:1.7 }}>
              Watch short videos, invite friends, and grow your earnings daily with five flexible tiers built for every budget.
            </p>
            <div className="ep-landing-hero-highlights ep-landing-hero-highlights-desktop" style={anim(180)}>
              {heroHighlights.map((line, index) => (
                <div
                  key={line}
                  className={`ep-landing-hero-highlight ${index % 2 ? "is-right" : "is-left"} ${isBlackHeroHighlight(line) ? "is-black" : ""}`}
                >
                  {line}
                </div>
              ))}
            </div>
            <div style={{ ...anim(260), marginTop:24, display:"flex", flexWrap:"wrap", gap:10 }}>
              <button
                type="button"
                className="ep-landing-hero-cta-btn ep-landing-hero-cta-btn-primary"
                onClick={() => go("signup")}
              >
                Create Account
              </button>
              <button
                type="button"
                className="ep-landing-hero-cta-btn ep-landing-hero-cta-btn-secondary"
                onClick={() => go("login")}
              >
                Sign In
              </button>
            </div>
          </div>

          <div className="ep-landing-hero-image-shell" style={anim(120)}>
            <div className="ep-landing-hero-sentence-orbit" aria-hidden="true">
              {heroHighlights.map((line, index) => (
                <div
                  key={`mobile-${line}`}
                  className={`ep-landing-hero-sentence-chip chip-${index + 1} ${isBlackHeroHighlight(line) ? "is-black" : ""}`}
                >
                  {line}
                </div>
              ))}
            </div>
            <img
              src={LANDING_STICKER_TIER_IMAGE.primary}
              alt="EdisonPay hero"
              referrerPolicy="no-referrer"
              onError={(e) => setFallbackSrc(e, LANDING_STICKER_TIER_IMAGE)}
              className="ep-landing-hero-image"
            />
          </div>
        </section>
      </div>

      {/* "" SCROLLING LOGOS "" */}
      <div style={{ borderTop: "1px solid rgba(148,163,184,0.3)", borderBottom: "1px solid rgba(148,163,184,0.3)", background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", padding: "14px 0 12px", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 34, width: "max-content", animation: "ticker 30.8s linear infinite", alignItems:"flex-start" }}>
          {[...payments, ...payments].map((p, i) => (
            <div key={i} style={{ minWidth: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PaymentLogo name={p} />
            </div>
          ))}
        </div>
      </div>
      <section id="landing-features" className="ep-landing-balance-video-wrap">
        <div className="ep-landing-balance-video-card">
          <div className="ep-landing-balance-video-head">
            <span style={{ color:"#ede9fe" }}>YOUR BALANCE TODAY</span>
            <span style={{ color:"#c4b5fd" }}>LIVE VIEW</span>
          </div>
          <div className="ep-landing-balance-video-frame">
            {HOME_BALANCE_VIDEO ? (
              <LazyVideo
                src={HOME_BALANCE_VIDEO}
                fallbackSrc={HOME_BALANCE_VIDEO_FALLBACK}
                eager
                autoPlay
                muted
                loop
                playsInline
                style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain", background:"#020617", zIndex:1 }}
              />
            ) : (
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(130deg, #0f172a 0%, #6d28d9 52%, #0f172a 100%)", zIndex:1 }} />
            )}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg, rgba(2,6,23,0.2) 0%, rgba(2,6,23,0.62) 100%)", zIndex:2 }} />
            <img
              className="ep-landing-balance-video-side-art"
              src={HOME_BALANCE_SIDE_IMAGE.primary}
              alt=""
              referrerPolicy="no-referrer"
              onError={(e) => setFallbackSrc(e, HOME_BALANCE_SIDE_IMAGE)}
            />
          </div>
        </div>
      </section>

      {/* "" TIERS SECTION "" */}
      <section id="landing-tiers" style={{ padding: "88px 5vw", background: "#fff" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", position:"relative" }}>
          <img
            src={LANDING_STICKER_TIER_IMAGE.primary}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => setFallbackSrc(e, LANDING_STICKER_TIER_IMAGE)}
            className="ep-hide-mobile"
            style={{ position:"absolute", right:-18, top:-24, width:130, height:130, objectFit:"contain", pointerEvents:"none", opacity:0.95 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48, flexWrap: "wrap", gap: 20 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", background: "#F0F4FF", border: "1px solid #C7D9FF", borderRadius: 50, marginBottom: 16 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#0066FF" }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: "#0066FF", letterSpacing: "0.1em" }}>INVESTMENT PLANS</span>
              </div>
              <h2 style={{ fontSize: "clamp(30px,3.2vw,50px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, color: "#111" }}>
                Five tiers.<br />
                <span style={{ fontFamily: "Instrument Serif,serif", fontStyle: "italic", fontWeight: 400 }}>One goal.</span>
              </h2>
            </div>
            <div style={{ maxWidth: 320 }}>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.7 }}>Daily rewards are based on your tier, required videos, and referral bonuses.</p>
              <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
                {[["KES 50","per required video"],["Tiered","daily rewards"],["KES 1,000+","min withdrawal"]].map(([v,l],i) => (
                  <div key={i}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#111", letterSpacing: "-0.04em" }}>{v}</div>
                    <div style={{ fontSize: 11, color: "#BBB", marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="ep-tier-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {TIERS.map((t, i) => (
              <TierCard key={i} t={t} go={go} featured={i === 2} onSelectTier={handleTierPick} />
            ))}
          </div>
        </div>
      </section>

      {/* "" HOW IT WORKS "" */}
      <section id="landing-how-it-works" style={{ padding: "96px 5vw 104px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
        <div style={{ maxWidth: 1220, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#64748B", textTransform: "uppercase", marginBottom: 14 }}>Process</div>
            <h2 style={{ fontSize: "clamp(28px,3vw,44px)", fontWeight: 900, letterSpacing: "-0.04em", color:"#111" }}>Up and running in minutes</h2>
            <p style={{ marginTop: 12, fontSize: 14, color: "#64748B", lineHeight: 1.65 }}>
              Follow this timeline from account setup to payout.
            </p>
            <div className="ep-process-auto-pill">
              <span
                className="ep-process-auto-dot"
                style={processAutoPaused ? { background: "#F59E0B", boxShadow: "0 0 0 5px rgba(245,158,11,0.16)", animation: "none" } : undefined}
              />
              <span>{processAutoPaused ? `Pinned step: ${activeProcessLabel}` : `Interactive timeline: ${activeProcessLabel}`}</span>
            </div>
          </div>
          <div className="ep-process-wrap">
            <div className="ep-process-grid" style={{ "--process-progress": `${processProgress}%` }}>
              <div className="ep-process-line" />
              {processSteps.map(({ icon, title, desc, timeline }, i) => {
                const status = i < activeProcessStep ? "is-done" : i === activeProcessStep ? "is-active" : "is-pending";
                return (
                <article
                  key={i}
                  className={`ep-process-item ${status}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Preview step ${i + 1}: ${title}`}
                  onClick={() => handleProcessStepFocus(i)}
                  onMouseEnter={() => handleProcessStepFocus(i)}
                  onFocus={() => handleProcessStepFocus(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleProcessStepFocus(i);
                      return;
                    }
                    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                      e.preventDefault();
                      handleProcessStepFocus((i + 1) % processSteps.length);
                      return;
                    }
                    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      e.preventDefault();
                      handleProcessStepFocus((i - 1 + processSteps.length) % processSteps.length);
                    }
                  }}
                >
                  <div className="ep-process-node">
                    <span className="ep-process-count">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="ep-process-card">
                    <div className="ep-process-card-head">
                      <div className="ep-process-icon">
                        <I n={icon} s={15} c="#0F172A" />
                      </div>
                      <div>
                        <div className="ep-process-title">{title}</div>
                        <div className="ep-process-meta">Step {i + 1} of {processSteps.length}</div>
                      </div>
                    </div>
                    <div className="ep-process-time">{timeline}</div>
                    <div className="ep-process-desc">{desc}</div>
                  </div>
                </article>
              )})}
            </div>
          </div>
        </div>
      </section>

      {/* "" FOOTER "" */}
      <footer className="ep-footer" style={{ background:"#000", color:"#fff", padding:"34px 5vw 20px" }}>
        <div style={{ maxWidth:1300, margin:"0 auto", border:"1px solid #1f1f1f", borderRadius:22, background:"#050505", padding:"30px clamp(16px, 3vw, 34px) 18px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:"24px clamp(18px, 4vw, 56px)" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <BrandMark size={28} />
                <span style={{ fontWeight:900, fontSize:18, letterSpacing:"-0.03em" }}>EdisonPay</span>
              </div>
              <p style={{ maxWidth:360, fontSize:13, color:"#A3A3A3", lineHeight:1.55, marginBottom:16 }}>
                We offer reliable earning tools for daily growth: watch videos, invite friends, and manage payouts easily.
              </p>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {[["Instagram","star"],["Facebook","users"],["X","xmark"],["YouTube","play"]].map(([name, icon]) => (
                  <button key={name} type="button" aria-label={name}
                    style={{ width:30, height:30, borderRadius:"50%", border:"none", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                    <I n={icon} s={12} c="#0a0a0a" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize:13, fontWeight:800, color:"#F5F5F5", marginBottom:10 }}>Extra links</div>
              {["Home","Buyers","Sellers","Our team","About Us"].map((item) => (
                <div key={item} style={{ fontSize:13, color:"#BDBDBD", marginBottom:10, lineHeight:1.3, cursor:"pointer" }}>
                  {item}
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize:13, fontWeight:800, color:"#F5F5F5", marginBottom:10 }}>Contact</div>
              <div style={{ fontSize:13, color:"#BDBDBD", lineHeight:1.55 }}>
                <div>Business Bay, Downtown Dubai</div>
                <div>Dubai, United Arab Emirates</div>
                <div style={{ marginTop:10 }}>support@eddisonpay.ae</div>
                <div style={{ marginTop:10 }}>+971 4 555 0100</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop:18, paddingTop:14, borderTop:"1px solid #1f1f1f", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:"#808080" }}>(c) 2025 EdisonPay Ltd. All rights reserved.</span>
            <div style={{ display:"flex", gap:12, fontSize:11, color:"#808080", flexWrap:"wrap" }}>
              {["Privacy","Terms","Cookies"].map((item) => <span key={item} style={{ cursor:"pointer" }}>{item}</span>)}
              <button
                type="button"
                onClick={() => go("login")}
                style={{ cursor:"pointer", background:"transparent", border:"none", color:"#A3E635", fontSize:11, fontWeight:800, padding:0, fontFamily:"inherit" }}
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
    }

function TierRow({ t, go, onSelectTier }) {
  const [hov, setHov] = useState(false);
  const currency = getActiveDisplayCurrency();
  const handlePick = () => {
    if (onSelectTier) { onSelectTier(t?.id); return; }
    go("signup");
  };
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={handlePick}
      style={{ display: "flex", alignItems: "center", padding: "20px 24px", background: hov ? "#FAFAFA" : "#fff", cursor: "pointer", borderBottom: "1px solid #EBEBEB", transition: "background .15s", gap: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: hov ? t.acc : t.lgt, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s", flexShrink: 0 }}>
        <I n="bolt" s={16} c={hov ? "#fff" : t.acc} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{t.name}</div>
        <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{t.videos} videos/day  -  {t.bonus} bonus rewards</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 900, fontSize: 16, color: "#111", letterSpacing: "-0.03em" }}>
          {formatMoney(t.deposit, {
            currency,
            minFractionDigits: currency === DISPLAY_CURRENCIES.USD ? 2 : 0,
            maxFractionDigits: currency === DISPLAY_CURRENCIES.USD ? 2 : 0
          })}
        </div>
        <div style={{ fontSize: 11, color: "#BBB" }}>starting balance</div>
      </div>
      <I n="chevR" s={16} c={hov ? "#111" : "#DDD"} />
    </div>
  );
    }

function TierCard({ t, go, featured, onSelectTier }) {
  const [hov, setHov] = useState(false);
  const currency = getActiveDisplayCurrency();
  const daily = getTierDailyTotal(t);
  const amountLabel = formatMoney(t.deposit, {
    currency,
    minFractionDigits: currency === DISPLAY_CURRENCIES.USD ? 2 : 0,
    maxFractionDigits: currency === DISPLAY_CURRENCIES.USD ? 2 : 0
  });
  const dailyLabel = formatMoney(daily, {
    currency,
    minFractionDigits: currency === DISPLAY_CURRENCIES.USD ? 2 : 0,
    maxFractionDigits: currency === DISPLAY_CURRENCIES.USD ? 2 : 0
  });
  const themePurple = "#6d28d9";
  const baseShadow = hov ? "0 24px 38px rgba(109,40,217,0.28)" : "0 16px 30px rgba(15,23,42,0.24)";
  const cardStyle = {
    borderRadius: 24,
    border: "1.5px solid rgba(167,139,250,0.6)",
    background: hov
      ? "linear-gradient(180deg, #7c3aed 0%, #0B1220 100%)"
      : "linear-gradient(180deg, #6d28d9 0%, #090F1B 100%)",
    padding: "8px",
    cursor: "pointer",
    transition: "all .24s ease",
    transform: hov ? "translateY(-3px)" : "none",
    boxShadow: baseShadow,
    position: "relative",
    overflow: "hidden",
    minHeight: 430
  };
  const handlePick = () => {
    if (onSelectTier) { onSelectTier(t?.id); return; }
    go("signup");
  };
  const tierArt = getTierCardImage(t?.id);
  const cardClasses = ["ep-tier-mobile-image-host", "ep-tier-mobile-image-host-landing"].join(" ");
  const includes = [
    `${t.videos} required videos per day`,
    t.bonus > 0 ? `${t.bonus} bonus reward${t.bonus > 1 ? "s" : ""} per day` : "No bonus rewards",
    `${dailyLabel} projected daily total`,
    "Live wallet sync + secure payout cycle"
  ];
  return (
    <div className="ep-tier-card-shell">
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={handlePick}
        className={`${cardClasses} ep-tier-card-lively`}
        style={cardStyle}>
        <div className="ep-tier-mobile-image-content ep-tier-mobile-image-content-landing" style={{ display:"flex", flexDirection:"column", minHeight:"100%", width:"100%", maxWidth:"100%", position:"relative", zIndex:2 }}>
          <div style={{ background:"linear-gradient(90deg, #ffffff 0%, #ffffff 66%, rgba(255,255,255,0.88) 84%, rgba(255,255,255,0.52) 100%)", border:"1px solid #ddd6fe", borderRadius:18, padding:"16px 14px 14px", paddingRight:"40%", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 16px rgba(15,23,42,0.1)", minHeight:330 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
              <div>
                <div style={{ fontSize:"clamp(22px, 2.6vw, 34px)", lineHeight:1.06, fontWeight:900, letterSpacing:"-0.04em", color:"#0B1220", maxWidth:260, textWrap:"balance" }}>{t.name}</div>
                <div style={{ marginTop:3, fontSize:12, fontWeight:700, color:"#64748B" }}>Billed yearly</div>
              </div>
              {featured && (
                <div style={{ display:"inline-flex", alignItems:"center", gap:7, borderRadius:999, border:`1.5px solid ${themePurple}`, background:"#f5f3ff", padding:"5px 10px", fontSize:10, fontWeight:900, color:themePurple, letterSpacing:"0.06em", boxShadow:"0 8px 14px rgba(109,40,217,0.16)" }}>
                  <span style={{ width:16, height:16, borderRadius:"50%", background:themePurple, color:"#fff", display:"grid", placeItems:"center", fontSize:9 }}>
                    <I n="star" s={9} c="#fff" />
                  </span>
                  MOST PICKED
                </div>
              )}
            </div>

            <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #ddd6fe", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
              <button
                onClick={(e) => { e.stopPropagation(); handlePick(); }}
                style={{ padding:"9px 15px", borderRadius:999, border:"none", background:"linear-gradient(140deg,#6d28d9 0%, #1f143f 100%)", color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:"0 8px 14px rgba(109,40,217,0.32)", fontFamily:"Geist,sans-serif" }}
              >
                Get Started
              </button>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"clamp(20px, 2.4vw, 26px)", lineHeight:1, fontWeight:900, letterSpacing:"-0.04em", color:"#0B1220" }}>{amountLabel}</div>
                <div style={{ marginTop:3, fontSize:11, color:"#64748B", fontWeight:700 }}>per user / month</div>
              </div>
            </div>

            <div style={{ marginTop:12, fontSize:12, fontWeight:900, color:"#0B1220" }}>Includes</div>
            <div style={{ marginTop:10, display:"grid", gap:8, maxWidth:320 }}>
              {includes.map((label, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#334155", fontWeight:700 }}>
                  <div style={{ width:19, height:19, borderRadius:"50%", background:"#ede9fe", border:"1px solid #c4b5fd", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <I n="check" s={11} c="#6d28d9" />
                  </div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); handlePick(); }}
            style={{ marginTop:10, width:"100%", padding:"13px 12px", borderRadius:14, border:"1.5px solid rgba(196,181,253,0.5)", background:"linear-gradient(96deg, #100826 0%, #6d28d9 56%, #251148 100%)", color:"#f5f3ff", fontSize:14, fontWeight:900, cursor:"pointer", fontFamily:"Geist,sans-serif", letterSpacing:"-0.01em", boxShadow:"0 10px 18px rgba(2,6,23,0.34)" }}
          >
            Upgrade to {t.name}
          </button>
        </div>

        <img
          className="ep-tier-mobile-image ep-tier-mobile-image-landing"
          src={tierArt.primary}
          alt=""
          referrerPolicy="no-referrer"
          onError={(e) => setFallbackSrc(e, tierArt)}
          style={{ opacity:1, zIndex:3, filter:"saturate(1.05) contrast(1.06) drop-shadow(0 18px 28px rgba(2,6,23,0.38))" }}
        />
        <div
          aria-hidden="true"
          style={{
            position:"absolute",
            left:0,
            right:0,
            bottom:0,
            height:"30%",
            background:"linear-gradient(0deg, rgba(2,6,23,0.9) 0%, rgba(2,6,23,0.72) 38%, rgba(109,40,217,0.26) 76%, rgba(109,40,217,0) 100%)",
            pointerEvents:"none",
            zIndex:1
          }}
        />
      </div>
    </div>
  );
    }

/* 
   AUTH PAGES
 */
function Auth({ type, go, from, authMessage }) {
  const isLogin = type === "login";
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", ref: getStoredRef() });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const set = k => v => { setF(p => ({ ...p, [k]: v })); setErr(""); };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const stored = getStoredRef();
    if (stored && !f.ref) setF(p => ({ ...p, ref: stored }));
  }, []);
  
  useEffect(() => {
    if (authMessage) {
      setInfo(authMessage);
      setErr("");
    }
  }, [authMessage]);

  useEffect(() => {
    if (!isLogin) return;
    const url = window.location.href;
    const hasRecovery =
      /type=recovery/i.test(url) ||
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem("ep:recovery") === "1");
    if (hasRecovery) {
      setRecoveryMode(true);
      setResetMode(false);
      setInfo("Set a new password for your account.");
    }
  }, [isLogin]);

  const clearRecovery = () => {
    try { sessionStorage.removeItem("ep:recovery"); } catch (e) {}
    try {
      const url = new URL(window.location.href);
      url.search = "";
      url.hash = "";
      window.history.replaceState({}, document.title, url.pathname);
    } catch (e) {}
    setRecoveryMode(false);
  };

  const handleResetRequest = async () => {
    setErr("");
    setInfo("");
    if (!f.email) { setErr("Email is required."); return; }
    if (!supabase) { setErr("Supabase is not configured."); return; }
    setLoading(true);
    const redirectTo = `${window.location.origin}/?type=recovery`;
    const { error } = await supabase.auth.resetPasswordForEmail(f.email, { redirectTo });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setInfo("Password reset link sent. Check your email.");
  };

  const handlePasswordUpdate = async () => {
    setErr("");
    setInfo("");
    if (!f.password) { setErr("New password is required."); return; }
    if (f.password !== f.confirm) { setErr("Passwords don't match."); return; }
    if (!supabase) { setErr("Supabase is not configured."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: f.password });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setInfo("Password updated. Please sign in.");
    clearRecovery();
    try { await supabase.auth.signOut(); } catch (e) {}
    setTimeout(() => { setResetMode(false); go("login"); }, 900);
  };

  const submit = async () => {
    if (resetMode) return handleResetRequest();
    if (recoveryMode) return handlePasswordUpdate();
    setErr("");
    setInfo("");
    if (!f.email) { setErr("Email is required."); return; }
    if (!f.password) { setErr("Password is required."); return; }
    if (!isLogin && f.password !== f.confirm) { setErr("Passwords don't match."); return; }
    if (!supabase) {
      setErr("Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }
    setLoading(true);
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
      if (error) { setErr(error.message); setLoading(false); return; }
      setLoading(false);
      go(from || "dashboard");
      return;
    }
    const refBy = normalizeRefCode(f.ref);
    const signupWithSupabase = async () => {
      const { data, error } = await supabase.auth.signUp({
        email: f.email,
        password: f.password,
        options: {
          data: {
            full_name: f.name || "",
            referred_by: refBy || null
          }
        }
      });
      if (error) return { ok:false, msg:error.message || "Unable to create account." };
      if (data?.session?.access_token && data?.session?.refresh_token) {
        try {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });
        } catch (e) {}
        return { ok:true, redirect:true };
      }
      return { ok:true, msg:"Account created. Check your email, then sign in." };
    };
    const apiBase = getApiBase();
    if (!apiBase) {
      const fallback = await signupWithSupabase();
      if (!fallback.ok) setErr(fallback.msg);
      else if (fallback.redirect) go(from || "dashboard");
      else setInfo(fallback.msg || "Account created. Please sign in.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: f.email,
          password: f.password,
          full_name: f.name || "",
          referred_by: refBy || ""
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fallback = await signupWithSupabase();
        if (!fallback.ok) setErr(data?.error || fallback.msg || "Unable to create account.");
        else if (fallback.redirect) go(from || "dashboard");
        else setInfo(fallback.msg || "Account created. Please sign in.");
        setLoading(false);
        return;
      }
      if (data?.session?.access_token && data?.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
        setLoading(false);
        go(from || "dashboard");
        return;
      }
      setLoading(false);
      setInfo(data?.message || "Account created. Please sign in.");
    } catch (e) {
      const fallback = await signupWithSupabase();
      if (!fallback.ok) setErr(fallback.msg || "Unable to create account. Please try again.");
      else if (fallback.redirect) go(from || "dashboard");
      else setInfo(fallback.msg || "Account created. Please sign in.");
      setLoading(false);
    }
  };
  const handleGoogle = async () => {
    setErr("");
    setInfo("");
    if (!supabase) { setErr("Supabase is not configured."); return; }
    setLoading(true);
    const redirectTo = `${window.location.origin}/?auth=google`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
    if (error) { setErr(error.message); setLoading(false); }
  };
  const authTitle = recoveryMode ? "Set new password" : resetMode ? "Forgot password" : (isLogin ? "Welcome back" : "Create account");
  const authSubtitle = recoveryMode
    ? "Choose a new secure password for your account."
    : resetMode
      ? "We will email you a secure reset link."
      : (isLogin ? "Sign in to your EdisonPay account." : "Start earning in under 2 minutes.");
  const submitLabel = loading
    ? (recoveryMode ? "Updating password..." : resetMode ? "Sending link..." : (isLogin ? "Signing in..." : "Creating account..."))
    : (recoveryMode ? "Update Password" : resetMode ? "Send Reset Link" : (isLogin ? "Sign In" : "Create Account"));

  return (
    <div className="ep-auth-grid ep-auth-shell" style={{ minHeight: "100%", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.08fr 0.92fr", fontFamily: "IBM Plex Sans, Geist, sans-serif", background: "linear-gradient(145deg,#f7fbff 0%, #eff6ff 48%, #ecfeff 100%)", position: "relative", overflow: "hidden" }}>

      {/* LEFT - brand panel */}
      <div className="ep-auth-left" style={{ background: "linear-gradient(160deg,#0f172a 0%, #111827 54%, #052e16 100%)", display: isMobile ? "none" : "flex", flexDirection: "column", padding: "44px 48px", position: "relative", overflow: "hidden" }}>
        {/* Subtle grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)", backgroundSize: "36px 36px", opacity: 0.24, pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 64, zIndex: 1 }}>
          <BrandMark size={34} />
          <span style={{ fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: "-0.03em" }}>EdisonPay</span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 1 }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 20 }}>
            Earn while<br /><span style={{ fontFamily: "Instrument Serif,serif", fontStyle: "italic", fontWeight: 400, color: "#0066FF" }}>you sleep.</span>
          </h2>
          <p style={{ color: "rgba(226,232,240,0.82)", fontSize: 15, lineHeight: 1.7, marginBottom: 40, maxWidth: 420 }}>Join 1,000+ earners across Kenya collecting daily passive income from video watching and referrals.</p>

          {/* Feature pills */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[["play","KES 50 earned per video watched"],["users","10% referral bonus - earn from your network"],["shield","Secure withdrawals - Tue & Fri"]].map(([ic, t], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(15,23,42,0.44)", border: "1px solid rgba(148,163,184,0.28)", borderRadius: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(12,74,110,0.35)", border: "1px solid rgba(125,211,252,0.5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <I n={ic} s={13} c="#7DD3FC" />
                </div>
                <span style={{ fontSize: 13, color: "rgba(241,245,249,0.9)" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: "rgba(148,163,184,0.7)", zIndex: 1 }}>(c) 2025 EdisonPay Ltd.</div>
      </div>

      {/* RIGHT - form */}
      <div className="ep-auth-right" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "28px 18px 36px" : "48px 56px" }}>
        <div className="ep-auth-form-card" style={{ width: "100%", maxWidth: 560, animation: "scaleIn .35s ease both", borderRadius: isMobile ? 18 : 24, border: "1.5px solid #111", background: "#FFFFFF", boxShadow: "0 10px 0 #111, 0 24px 34px rgba(15,23,42,0.18)", padding: isMobile ? "21px 18px" : "31px 30px" }}>
          <div style={{ marginBottom: 26 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, border: "1px solid #BFDBFE", background: "#EFF6FF", marginBottom: 10 }}>
              <I n="shield" s={10} c="#1D4ED8" />
              <span style={{ fontSize: 10, fontWeight: 900, color: "#1D4ED8", letterSpacing: "0.08em" }}>SECURE ACCESS</span>
            </div>
            <h1 style={{ fontSize: isMobile ? 28 : 34, fontWeight: 900, letterSpacing: "-0.04em", color: "#111", marginBottom: 10 }}>
              {authTitle}
            </h1>
            <p style={{ fontSize: isMobile ? 13 : 14, color: "#64748B", lineHeight: 1.62, maxWidth: 420 }}>{authSubtitle}</p>
          </div>

          {!isLogin && !resetMode && !recoveryMode && <Field label="Full Name" ph="Alex Johnson" val={f.name} set={set("name")} ic="user" />}
          {!recoveryMode && <Field label="Email" type="email" ph="alex@example.com" val={f.email} set={set("email")} ic="user" />}
          {!resetMode && (
            <Field label={recoveryMode ? "New Password" : "Password"} type="password" ph="" val={f.password} set={set("password")} ic="lock" />
          )}
          {(recoveryMode || (!isLogin && !resetMode)) && (
            <Field label="Confirm Password" type="password" ph="" val={f.confirm} set={set("confirm")} ic="lock" />
          )}
          {!isLogin && !resetMode && !recoveryMode && (
            <Field label="Referral Code (optional)" ph="EDP-1A2B3C" val={f.ref} set={set("ref")} ic="gift" />
          )}

          {isLogin && !resetMode && !recoveryMode && (
            <div style={{ textAlign: "right", marginBottom: 14 }}>
              <span
                style={{ fontSize: 12, color: "#1D4ED8", fontWeight: 800, cursor: "pointer" }}
                onClick={() => { setResetMode(true); setInfo(""); setErr(""); }}
              >
                Forgot password?
              </span>
            </div>
          )}

          {err && (
            <div style={{ padding: "10px 12px", background: "#FFF1F2", border: "1px solid #FECACA", borderRadius: 10, fontSize: 12, color: "#B91C1C", fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
              <I n="xmark" s={12} c="#B91C1C" /> {err}
            </div>
          )}
          {info && (
            <div style={{ padding: "10px 12px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, fontSize: 12, color: "#1D4ED8", fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
              <I n="check" s={12} c="#1D4ED8" /> {info}
            </div>
          )}

          {(!resetMode && !recoveryMode) && (
            <>
            <button onClick={handleGoogle} disabled={loading || !SUPABASE_ENABLED}
              style={{ width: "100%", padding: "11px 14px", background: "#fff", color: "#111", border: "1.5px solid #CBD5E1", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: (loading || !SUPABASE_ENABLED) ? "not-allowed" : "pointer", fontFamily: "Geist,sans-serif", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: !SUPABASE_ENABLED ? 0.7 : 1 }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: "conic-gradient(#4285F4 0 90deg, #34A853 90deg 180deg, #FBBC05 180deg 270deg, #EA4335 270deg 360deg)", display: "grid", placeItems: "center" }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 800, color: "#4285F4", fontFamily: "Geist,sans-serif" }}>G</span>
              </span>
              Continue with Google
            </button>
            {!SUPABASE_ENABLED && (
              <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700, marginBottom: 10 }}>
                Connect Google in Supabase to enable.
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ height: 1, background: "#E2E8F0", flex: 1 }} />
              <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 800, letterSpacing: "0.08em" }}>OR</span>
              <div style={{ height: 1, background: "#E2E8F0", flex: 1 }} />
            </div>
            </>
          )}

          <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "13px", background: loading ? "#94A3B8" : "linear-gradient(120deg,#0f172a 0%, #1e293b 52%, #0f172a 100%)", color: "#fff", border: "1px solid #111", borderRadius: 12, fontWeight: 900, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", fontFamily: "Geist,sans-serif", marginBottom: 14, letterSpacing: "-0.01em", transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading ? "none" : "0 8px 14px rgba(15,23,42,0.24)" }}>
            {loading ? (
              <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> {submitLabel}</>
            ) : submitLabel}
          </button>

          {(!resetMode && !recoveryMode) && (
            <div style={{ textAlign: "center", fontSize: 12, color: "#64748B", fontWeight: 700 }}>
              {isLogin ? "No account? " : "Have an account? "}
              <span onClick={() => go(isLogin ? "signup" : "login")} style={{ color: "#0F172A", fontWeight: 900, cursor: "pointer" }}>{isLogin ? "Sign Up" : "Sign In"}</span>
            </div>
          )}

          {(resetMode || recoveryMode) && (
            <div style={{ textAlign: "center", fontSize: 12, color: "#64748B", fontWeight: 700 }}>
              <span onClick={() => { setResetMode(false); clearRecovery(); setErr(""); setInfo(""); }} style={{ color: "#0F172A", fontWeight: 900, cursor: "pointer" }}>Back to sign in</span>
            </div>
          )}

          <div onClick={() => go("landing")} style={{ textAlign: "center", marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", color: "#334155", border: "1px solid #CBD5E1", borderRadius: 11, padding: "9px 12px", background: "#F8FAFC", fontSize: 12, fontWeight: 800 }}>
            <I n="chevL" s={12} c="#334155" /> Back to home
          </div>
        </div>
      </div>
    </div>
  );
    }

function FixedPromoSticker({ src, alt, onClose, showClose = true, style }) {
  const source = typeof src === "string" ? { primary: src, fallback: "" } : (src || { primary: "", fallback: "" });
  const [activeSrc, setActiveSrc] = useState(source.primary || "");
  const [imgOk, setImgOk] = useState(true);
  useEffect(() => {
    setActiveSrc(source.primary || "");
    setImgOk(true);
  }, [source.primary]);
  if (!activeSrc) return null;
  if (!imgOk) return null;
  return (
    <div style={{ position:"fixed", zIndex:95, pointerEvents: showClose ? "auto" : "none", ...style }}>
      {showClose && typeof onClose === "function" && (
        <button
          onClick={onClose}
          aria-label={`Close ${alt}`}
          style={{
            position:"absolute",
            top:-8,
            right:-8,
            width:24,
            height:24,
            borderRadius:"50%",
            border:"1.5px solid rgba(15,23,42,0.55)",
            background:"rgba(255,255,255,0.95)",
            color:"#0f172a",
            cursor:"pointer",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            fontSize:13,
            fontWeight:900,
            boxShadow:"0 6px 14px rgba(2,6,23,0.2)"
          }}
        >
          x
        </button>
      )}
      <img
        src={activeSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => {
          if (source.fallback && activeSrc !== source.fallback) {
            setActiveSrc(source.fallback);
            return;
          }
          setImgOk(false);
        }}
        style={{
          display:"block",
          width:"100%",
          height:"100%",
          objectFit:"contain",
          filter:"drop-shadow(0 10px 20px rgba(2,6,23,0.35))"
        }}
      />
    </div>
  );
    }

function TierSelect({ go, authUser, profileRow, onPreviewToVideos }) {
  const [selected, setSelected] = useState(() => {
    const intent = getTierIntent();
    return Number(profileRow?.tier) || intent || 1;
  });
  const [err, setErr] = useState("");
  const [panel, setPanel] = useState("");
  const [depPhone, setDepPhone] = useState("");
  const [depName, setDepName] = useState("");
  const depMethod = "M-Pesa";
  const [depLoading, setDepLoading] = useState(false);
  const [depError, setDepError] = useState("");
  const depErrorMsg = formatDepositError(depError);
  useEffect(() => {
    const intent = getTierIntent();
    if (!Number.isFinite(Number(profileRow?.tier)) && Number.isFinite(intent)) {
      setSelected(intent);
    } else if (Number.isFinite(Number(profileRow?.tier))) {
      setSelected(Number(profileRow.tier));
    }
  }, [profileRow?.tier]);
  useEffect(() => {
    if (profileRow?.phone && !depPhone) setDepPhone(String(profileRow.phone));
    if ((profileRow?.name || profileRow?.full_name) && !depName) {
      setDepName(String(profileRow?.name || profileRow?.full_name));
    }
  }, [profileRow?.phone, profileRow?.name, profileRow?.full_name]);
  const profileTierSelected = profileRow?.tier_selected === true;
  const currency = getActiveDisplayCurrency();
  const currencyFractionDigits = currency === DISPLAY_CURRENCIES.USD ? 2 : 0;

  const handlePick = (tierId) => {
    if (!tierId) return;
    setSelected(tierId);
    setErr("");
    setDepError("");
    setPanel("");
    storeTierIntent(tierId);
  };

  const togglePanel = (next) => {
    setPanel((prev) => (prev === next ? "" : next));
  };

  const handlePayNow = async (tier) => {
    if (!tier) return;
    setErr("");
    setDepError("");
    storeTierIntent(tier.id);
    await submitTierDeposit(tier);
  };

  const handlePreview = async (tierId) => {
    setErr("");
    setDepError("");
    if (profileTierSelected !== true) {
      setErr("Complete your tier deposit first to unlock dashboard access.");
      return;
    }
    if (typeof onPreviewToVideos === "function") {
      onPreviewToVideos();
      return;
    }
    go("dashboard");
  };

  const submitTierDeposit = async (tier) => {
    if (!tier) return;
    if (!authUser?.id) {
      setDepError("Please sign in to pay.");
      return;
    }
    const apiBase = getApiBase();
    if (!apiBase) {
      setDepError("Payment service is not configured. Please contact support.");
      return;
    }
    const email = authUser?.email || profileRow?.email || "";
    if (!email) {
      setDepError("Email is required for checkout.");
      return;
    }
    const amount = Number(tier.deposit);
    setDepError("");
    setDepLoading(true);
    try {
      const token = await getAccessToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const requestBody = {
        amount,
        user_id: authUser.id,
        email,
        tier: tier.id,
        method: depMethod || "M-Pesa",
        payment_mode: PAYMENTS_MODE === "live" ? "live" : "test",
        phone: depPhone || profileRow?.phone || "",
        name: depName || profileRow?.name || authUser?.user_metadata?.full_name || ""
      };
      let res = await fetch(`${apiBase}/api/v1/deposit/create`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      });
      let data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const rawMsg = data?.error || data?.message || data?.detail || "Failed to start checkout.";
        const msg =
          String(rawMsg || "").toLowerCase().includes("ipn")
            ? "Payment gateway not configured yet. Please contact support."
            : rawMsg;
        setDepError(msg);
        return;
      }
      const url = data?.authorization_url || data?.redirect_url || data?.auth_url || data?.url;
      if (data?.manual) {
        setDepError("Direct payment checkout is unavailable right now. Please contact support.");
        return;
      }
      if (!url) {
        setDepError("Payment gateway did not return a checkout URL.");
        return;
      }
      window.location.href = url;
    } catch (e) {
      setDepError("Network error. Please try again.");
    } finally {
      setDepLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#F6F3FF 0%, #F8FAFC 52%, #F1EDFF 100%)", display:"flex", justifyContent:"center", padding:"56px 16px 64px", fontFamily:"Geist,sans-serif" }}>
      <div style={{ width:"min(1220px, 94vw)" }}>
        <div style={{ textAlign:"center", marginBottom:34 }}>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.16em", color:"#6d28d9", textTransform:"uppercase", marginBottom:10 }}>Choose Your Tier</div>
          <div style={{ fontSize:"clamp(26px,3vw,38px)", fontWeight:900, letterSpacing:"-0.04em", color:"#111", marginBottom:10 }}>
            Pick a tier to enter your dashboard
          </div>
          <div style={{ fontSize:14, color:"#6B7280", lineHeight:1.6 }}>
            You can explore any tier. Earnings and withdrawals unlock after your self deposit clears.
          </div>
        </div>

        {err && (
          <div style={{ padding:"10px 14px", background:"#FFF0F0", borderRadius:11, fontSize:13, color:"#DC2626", fontWeight:600, marginBottom:16, display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 18px rgba(220,38,38,0.12)" }}>
            <I n="xmark" s={14} c="#DC2626" /> {err}
          </div>
        )}

        <div className="ep-tier-grid" style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:22, alignItems:"stretch" }}>
          {TIERS.map((tier) => {
            const isActive = Number(selected) === Number(tier.id);
            const daily = getTierDailyTotal(tier);
            const tierArt = getTierCardImage(tier.id);
            const showDepositCta = !profileTierSelected;
            const depositLabel = formatMoney(tier.deposit, {
              currency,
              minFractionDigits: currencyFractionDigits,
              maxFractionDigits: currencyFractionDigits
            });
            const dailyLabel = formatMoney(daily, {
              currency,
              minFractionDigits: currencyFractionDigits,
              maxFractionDigits: currencyFractionDigits
            });
            const perVideoLabel = formatMoney(V_PRICE, {
              currency,
              minFractionDigits: currencyFractionDigits,
              maxFractionDigits: currencyFractionDigits
            });
            const selectorVideosLine = `${tier.videos} videos x ${perVideoLabel} each`;
            const selectorBonusByTier = Number(tier.id) >= 2 ? dailyLabel : "";
            const selectorRuleLine = Number(tier.id) === 1
              ? selectorVideosLine
              : `${selectorVideosLine} + bonus ${selectorBonusByTier}`;
            const bonusLabel = Number(tier.id) >= 2 ? selectorBonusByTier : "Tier 1 has no bonus";
            return (
              <div
                key={tier.id}
                className="ep-tier-mobile-image-host ep-tier-mobile-image-host-select"
                style={{
                  background:"linear-gradient(154deg,#FFFFFF 0%, #FAF5FF 56%, #F5F3FF 100%)",
                  borderRadius:22,
                  border:"none",
                  padding:"26px 24px 22px",
                  minHeight:372,
                  boxShadow:isActive ? "0 20px 34px rgba(15,23,42,0.16)" : "0 10px 24px rgba(15,23,42,0.1)",
                  position:"relative",
                  overflow:"visible",
                  transition:"transform .22s ease, box-shadow .22s ease"
                }}
              >
                <div style={{ position:"absolute", right:-12, top:10, bottom:6, width:"47%", background:"linear-gradient(170deg, rgba(15,23,42,0.01) 0%, rgba(109,40,217,0.2) 100%)", pointerEvents:"none", zIndex:1, borderRadius:24 }} />
                <div
                  aria-hidden="true"
                  style={{
                    position:"absolute",
                    left:0,
                    right:0,
                    top:0,
                    height:"28%",
                    background:"linear-gradient(180deg, rgba(2,6,23,0.82) 0%, rgba(2,6,23,0.78) 28%, rgba(109,40,217,0.32) 70%, rgba(109,40,217,0) 100%)",
                    pointerEvents:"none",
                    zIndex:2,
                    borderTopLeftRadius:22,
                    borderTopRightRadius:22
                  }}
                />
                <div className="ep-tier-mobile-image-content ep-tier-mobile-image-content-select" style={{ position:"relative", zIndex:4 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:14, paddingBottom:12 }}>
                    <div>
                      <div style={{ fontSize:10, letterSpacing:"0.12em", fontWeight:800, color:"#6d28d9" }}>TIER {tier.id}</div>
                      <div style={{ fontSize:18, fontWeight:900, letterSpacing:"-0.03em", color:"#111", marginTop:2 }}>{tier.name}</div>
                      <div style={{ fontSize:30, fontWeight:900, color:"#0F172A", letterSpacing:"-0.05em", lineHeight:1, marginTop:8 }}>{depositLabel}</div>
                      <div style={{ fontSize:11, color:"#6B7280", marginTop:3 }}>starting deposit</div>
                    </div>
                    {isActive && (
                      <div style={{ padding:"4px 10px", borderRadius:999, background:"#0F172A", color:"#fff", fontSize:10, fontWeight:800, whiteSpace:"nowrap" }}>
                        Selected
                      </div>
                    )}
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:8, marginBottom:14 }}>
                    <div style={{ borderRadius:11, background:"rgba(255,255,255,0.86)", padding:"8px 10px", boxShadow:"0 6px 14px rgba(15,23,42,0.06)" }}>
                      <div style={{ fontSize:10, color:"#94A3B8", fontWeight:700 }}>Tier earnings</div>
                      <div style={{ fontSize:13, fontWeight:800, color:"#0F172A", marginTop:2 }}>{dailyLabel}</div>
                    </div>
                    <div style={{ borderRadius:11, background:"rgba(255,255,255,0.86)", padding:"8px 10px", boxShadow:"0 6px 14px rgba(15,23,42,0.06)" }}>
                      <div style={{ fontSize:10, color:"#94A3B8", fontWeight:700 }}>Videos per day</div>
                      <div style={{ fontSize:13, fontWeight:800, color:"#0F172A", marginTop:2 }}>{tier.videos}</div>
                    </div>
                  </div>
                  <div style={{ marginTop:-6, marginBottom:14, borderRadius:11, background:"rgba(15,23,42,0.04)", border:"1px solid rgba(148,163,184,0.25)", padding:"8px 10px", fontSize:11, fontWeight:700, color:"#0F172A", lineHeight:1.45 }}>
                    {selectorRuleLine}
                  </div>

                  {!isActive && (
                    <button
                      disabled={depLoading}
                      onClick={() => handlePick(tier.id)}
                      style={{
                        width:"100%",
                        padding:"11px 14px",
                        borderRadius:11,
                        border:"none",
                        background:"#6d28d9",
                        color:"#FFFFFF",
                        fontWeight:900,
                        fontSize:13,
                        cursor:depLoading ? "not-allowed" : "pointer",
                        fontFamily:"Geist,sans-serif",
                        boxShadow:"0 8px 16px rgba(109,40,217,0.26)"
                      }}
                    >
                      Select Tier
                    </button>
                  )}
                  {isActive && (
                    <>
                      <div
                        className="ep-tier-select-actionbar"
                        style={{ gridTemplateColumns:showDepositCta ? "repeat(3,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))" }}
                      >
                        <button
                          className={`ep-tier-select-action-btn${panel==="earn" ? " is-active" : ""}`}
                          disabled={depLoading}
                          onClick={() => togglePanel("earn")}
                        >
                          Earnings
                        </button>
                        {showDepositCta && (
                          <button
                            className="ep-tier-select-action-btn ep-tier-select-action-btn-deposit ep-tier-deposit-btn"
                            disabled={depLoading}
                            onClick={() => handlePayNow(tier)}
                          >
                            {depLoading ? "Opening..." : "Deposit Now"}
                          </button>
                        )}
                        <button
                          className={`ep-tier-select-action-btn ep-tier-select-action-btn-preview${showDepositCta ? " is-preview" : ""}`}
                          disabled={depLoading || !profileTierSelected}
                          onClick={() => handlePreview(tier.id)}
                        >
                          Preview
                        </button>
                      </div>

                      {panel === "earn" && (
                        <div style={{ padding:"12px 14px", borderRadius:12, background:"rgba(248,250,252,0.92)", marginBottom:10, boxShadow:"inset 0 1px 0 rgba(255,255,255,0.85), 0 8px 16px rgba(15,23,42,0.06)" }}>
                          <div style={{ fontSize:10, letterSpacing:"0.14em", fontWeight:800, color:"#64748B", textTransform:"uppercase", marginBottom:10 }}>Earnings Breakdown</div>
                          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:10 }}>
                            <div>
                              <div style={{ fontSize:10, color:"#94A3B8", fontWeight:700 }}>Required videos</div>
                              <div style={{ fontSize:13, fontWeight:800, color:"#111" }}>{tier.videos} per day</div>
                            </div>
                            <div>
                              <div style={{ fontSize:10, color:"#94A3B8", fontWeight:700 }}>Per video</div>
                              <div style={{ fontSize:13, fontWeight:800, color:"#111" }}>{perVideoLabel}</div>
                            </div>
                            <div>
                              <div style={{ fontSize:10, color:"#94A3B8", fontWeight:700 }}>Bonus</div>
                              <div style={{ fontSize:13, fontWeight:800, color:"#111" }}>{bonusLabel}</div>
                            </div>
                            <div>
                              <div style={{ fontSize:10, color:"#94A3B8", fontWeight:700 }}>Daily total</div>
                              <div style={{ fontSize:13, fontWeight:900, color:"#0F172A" }}>{dailyLabel}</div>
                            </div>
                            <div style={{ gridColumn:"1 / -1" }}>
                              <div style={{ fontSize:10, color:"#94A3B8", fontWeight:700 }}>Tier rule</div>
                              <div style={{ fontSize:13, fontWeight:800, color:"#111" }}>{selectorRuleLine}</div>
                            </div>
                          </div>
                        </div>
                      )}
                      {depErrorMsg && (
                        <div style={{ marginTop:8, fontSize:11, color:"#DC2626", fontWeight:700, background:"#FFF1F2", padding:"8px 10px", borderRadius:8, boxShadow:"0 6px 14px rgba(220,38,38,0.12)" }}>
                          {depErrorMsg}
                        </div>
                      )}
                      {!showDepositCta && (
                        <div style={{ marginTop:8, fontSize:11, color:"#64748B" }}>
                          Tier already selected. Use Wallet checkout to deposit anytime.
                        </div>
                      )}
                    </>
                  )}
                </div>
                <img
                  className="ep-tier-mobile-image ep-tier-mobile-image-select"
                  src={tierArt.primary}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={(e) => setFallbackSrc(e, tierArt)}
                  style={{ display:"block", position:"absolute", right:"-4px", bottom:"-8px", top:"auto", transform:"none", width:"44%", height:"auto", maxHeight:"90%", objectFit:"contain", objectPosition:"right bottom", opacity:1, zIndex:3, filter:"saturate(1.03) contrast(1.04) drop-shadow(0 16px 24px rgba(15,23,42,0.24))" }}
                />
              </div>
            );
          })}
        </div>

        <div style={{ textAlign:"center", marginTop:20, fontSize:12, color:"#9CA3AF" }}>
          Signed in as {authUser?.email || "your account"}.
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", ph, val, set, ic }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: focus ? "#0F172A" : "#94A3B8", transition: "color .15s", pointerEvents: "none" }}>
          <I n={ic} s={14} c="currentColor" />
        </div>
        <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ width: "100%", padding: "13px 14px 13px 38px", background: "#F8FAFC", border: `1.5px solid ${focus ? "#0F172A" : "#D5DFEA"}`, borderRadius: 11, fontSize: 15, color: "#111", outline: "none", fontFamily: "Geist,sans-serif", transition: "border-color .15s, box-shadow .15s", boxSizing: "border-box", boxShadow: focus ? "0 0 0 3px rgba(59,130,246,0.12)" : "none" }} />
      </div>
    </div>
  );
    }

/* 
   CLIENT DASHBOARD
 */
const CLIENT_NAV = [
  { id: "overview",  label: "Overview",  ic: "grid"   },
  { id: "videos",    label: "Videos",    ic: "play"   },
  { id: "analytics", label: "Analytics", ic: "chart"  },
  { id: "referrals", label: "Referrals", ic: "gift"   },
  { id: "withdraw",  label: "Wallet",  ic: "wallet" },
];
const DASH_GUIDE_STEPS = [
  { title:"Welcome", text:"Welcome to EdisonPay. I am your onboarding assistant, and I will guide you through the platform in under a minute." },
  { title:"What EdisonPay Does", text:"EdisonPay helps you manage your account and grow your balance through a guided dashboard, wallet tools, and daily earning actions." },
  { title:"Key Features", text:"Use the Dashboard for progress, Videos for daily earnings, and Referrals to earn from users who join through your link." },
  { title:"Get Started", text:"You are all set. Tap Next to explore now, and open Settings then Guide / Tutorial whenever you want to replay this tour." }
];
const DASH_GUIDE_SEEN_KEY = "ep:dashboard-guide-seen";
const REFERRAL_GUIDE_SEEN_KEY = "ep:referrals-guide-seen";
const guideSeenKeyForUser = (baseKey, userId) => `${baseKey}:${userId || "anon"}`;

const LIVE_SYMBOLS = [
  { ch:"+", x:"6%",  y:"14%", size:26, dur:20, delay:-2 },
  { ch:"=", x:"16%", y:"42%", size:22, dur:24, delay:-8 },
  { ch:"-", x:"30%", y:"22%", size:24, dur:19, delay:-5 },
  { ch:"+", x:"44%", y:"10%", size:28, dur:26, delay:-12 },
  { ch:"=", x:"58%", y:"36%", size:20, dur:18, delay:-3 },
  { ch:"-", x:"72%", y:"20%", size:26, dur:23, delay:-9 },
  { ch:"+", x:"84%", y:"50%", size:22, dur:21, delay:-6 },
  { ch:"=", x:"12%", y:"72%", size:24, dur:27, delay:-10 },
  { ch:"-", x:"36%", y:"78%", size:22, dur:25, delay:-7 },
  { ch:"+", x:"60%", y:"70%", size:26, dur:30, delay:-14 },
  { ch:"=", x:"78%", y:"80%", size:20, dur:22, delay:-4 },
];
// Video sources: use CDN in production (override with VITE_CDN_BASE).
const DEFAULT_CDN_BASE = "https://cdn.jsdelivr.net/gh/creativekeagency254-collab/scm-main@main/public";
const CDN_BASE = import.meta.env.VITE_CDN_BASE || (import.meta.env.PROD ? DEFAULT_CDN_BASE : "");
const cdnUrl = (path) => (CDN_BASE ? `${CDN_BASE}${path.startsWith("/") ? path : `/${path}`}` : path);
const PLAN_BG_VIDEO = cdnUrl("/plan-actions.mp4");
const HOME_BALANCE_VIDEO = cdnUrl("/home-balance.mp4");
const ACCOUNT_GOAL_VIDEO = cdnUrl("/account-goal.mp4");
const HOME_HERO_BG_IMAGE = import.meta.env.VITE_HOME_HERO_BG_IMAGE || cdnUrl("/hero-space-money.png");
const HOME_HERO_BOT_IMAGE = import.meta.env.VITE_HOME_HERO_BOT_IMAGE || cdnUrl("/hero-casino-bot.png");
const proxyImageUrl = (rawUrl) => `https://proxy.duckduckgo.com/iu/?u=${encodeURIComponent(rawUrl)}&f=1`;
const imageSource = (rawUrl) => ({ primary: rawUrl, fallback: proxyImageUrl(rawUrl) });
const LANDING_STICKER_TOP_IMAGE = imageSource("https://i.postimg.cc/vBhjCY5X/BG12-removebg-preview.png");
const LANDING_STICKER_BOTTOM_IMAGE = imageSource("https://i.postimg.cc/1RNtLBB0/BG6_removebg_preview.png");
const LANDING_STICKER_TIER_IMAGE = imageSource("https://i.postimg.cc/7hXLPsRL/BG5_removebg_preview.png");
const DASH_BOT_GUIDE_IMAGE = imageSource("https://i.postimg.cc/RFKkTW1c/BG8-removebg-preview.png");
const HOME_BALANCE_SIDE_IMAGE = imageSource("https://i.postimg.cc/fyLdGYVG/BG1_removebg_preview.png");
const REFERRAL_WORK_BOT_IMAGE = imageSource("https://i.postimg.cc/jSrH5wm8/BG2_removebg_preview.png");
const WALLET_EARNINGS_BOT_IMAGE = imageSource("https://i.postimg.cc/vBhjCY5X/BG12-removebg-preview.png");
const WALLET_DEPOSIT_BOT_IMAGE = imageSource("https://i.postimg.cc/rFPrSsf7/BG4_removebg_preview_(2).png");
const setFallbackSrc = (e, srcObj) => {
  const fallback = srcObj?.fallback || "";
  if (!fallback) return;
  const cur = e?.currentTarget?.src || "";
  if (cur && cur.includes(encodeURIComponent(fallback))) return;
  if (cur && cur.includes(fallback)) return;
  if (e?.currentTarget) e.currentTarget.src = fallback;
};
const PLAN_BG_VIDEO_FALLBACK = CDN_BASE ? "/plan-actions.mp4" : "";
const HOME_BALANCE_VIDEO_FALLBACK = CDN_BASE ? "/home-balance.mp4" : "";
const ACCOUNT_GOAL_VIDEO_FALLBACK = CDN_BASE ? "/account-goal.mp4" : "";
const HOME_HERO_BG_IMAGE_FALLBACK = CDN_BASE ? "/hero-space-money.png" : "";
const HOME_HERO_BOT_IMAGE_FALLBACK = CDN_BASE ? "/hero-casino-bot.png" : "";
const LIVE_COLORS_LIGHT = [
  "rgba(59,130,246,0.16)",
  "rgba(99,102,241,0.14)",
  "rgba(16,185,129,0.14)",
  "rgba(249,115,22,0.14)",
  "rgba(236,72,153,0.12)",
  "rgba(14,165,233,0.14)"
];
const LIVE_COLORS_DARK = [
  "rgba(255,255,255,0.14)",
  "rgba(147,197,253,0.16)",
  "rgba(196,181,253,0.14)",
  "rgba(110,231,183,0.14)",
  "rgba(252,211,77,0.14)"
];

function LiveMathBackground({ tone = "light", symbols = LIVE_SYMBOLS, opacity = 1, zIndex = 0 }) {
  const isDark = tone === "dark";
  const colors = isDark ? LIVE_COLORS_DARK : LIVE_COLORS_LIGHT;
  const glowA = isDark
    ? "radial-gradient(circle at 18% 22%, rgba(59,130,246,0.18), rgba(15,23,42,0) 55%)"
    : "radial-gradient(circle at 18% 22%, rgba(99,102,241,0.25), rgba(255,255,255,0) 55%)";
  const glowB = isDark
    ? "radial-gradient(circle at 78% 70%, rgba(16,185,129,0.18), rgba(15,23,42,0) 55%)"
    : "radial-gradient(circle at 78% 70%, rgba(14,165,233,0.22), rgba(255,255,255,0) 55%)";
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden", opacity, zIndex }}>
      <div style={{ position:"absolute", inset:"-20%", background:glowA, opacity:isDark?0.45:0.6, animation:"ep-ambient 26s ease-in-out infinite" }} />
      <div style={{ position:"absolute", inset:"-30%", background:glowB, opacity:isDark?0.4:0.55, animation:"ep-ambient-alt 32s ease-in-out infinite" }} />
      {symbols.map((s, i) => (
        <span key={`${s.ch}-${i}`} style={{
          position:"absolute",
          left:s.x,
          top:s.y,
          fontSize:s.size,
          fontWeight:800,
          color: colors[i % colors.length],
          fontFamily:"IBM Plex Sans, Geist, sans-serif",
          letterSpacing:"0.08em",
          animation:`ep-symbol-float ${s.dur || 22}s ease-in-out infinite`,
          animationDelay:`${s.delay || 0}s`,
          userSelect:"none",
          textShadow: isDark ? "0 0 12px rgba(255,255,255,0.08)" : "0 4px 10px rgba(15,23,42,0.06)"
        }}>{s.ch}</span>
      ))}
    </div>
  );
    }

function ClientDash({ t, go, authUser, profileRow, onSignOut, onReplayGuide, externalTab, onTabChange, displayCurrency, onChangeDisplayCurrency }) {
  const [open, setOpen] = useState(true);
  const normalizeClientTab = useCallback((tabId) => {
    const tab = String(tabId || "").toLowerCase();
    return ["overview","videos","analytics","referrals","withdraw","settings"].includes(tab) ? tab : "overview";
  }, []);
  const [tabState, setTabState] = useState(() => normalizeClientTab(externalTab || "overview"));
  const isClientTabControlled = typeof externalTab === "string";
  const tab = isClientTabControlled ? normalizeClientTab(externalTab) : tabState;
  const setTab = useCallback((nextTab) => {
    const resolvedRaw = typeof nextTab === "function" ? nextTab(tab) : nextTab;
    const resolved = normalizeClientTab(resolvedRaw);
    if (!isClientTabControlled) setTabState(resolved);
    if (onTabChange) onTabChange(resolved);
  }, [isClientTabControlled, normalizeClientTab, onTabChange, tab]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState(() => {
    try {
      const raw = localStorage.getItem("ep:dash-notifs");
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (e) {}
    return [
      { ic:"check", title:"Withdrawal Approved", sub:"KES 1,200 sent to M-Pesa", time:"2h ago", c:"#059669", read:false },
      { ic:"play",  title:"Bonus credited", sub:"14 videos  -  KES 280 earned", time:"5h ago", c:t.acc, read:false },
      { ic:"gift",  title:"New referral joined", sub:"Amina K. signed up via your link", time:"1d ago", c:"#E8820C", read:false },
    ];
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [depositFocus, setDepositFocus] = useState(false);
  const [depositBannerDismissed, setDepositBannerDismissed] = useState(() => DEPOSIT_WALLET_BANNER_DISMISSED);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 769);
  const [isTiny, setIsTiny] = useState(window.innerWidth < 380);
  const [overviewMediaReady, setOverviewMediaReady] = useState(() => window.innerWidth >= 769);
  const [stripHidden, setStripHidden] = useState(false);
  const [stripToggleHidden, setStripToggleHidden] = useState(false);
  const lastScrollRef = useRef(0);
  const authId = authUser?.id || null;
  const tierSelected = profileRow?.tier_selected === true;
  const [hasTierDeposit, setHasTierDeposit] = useState(null);
  const [depositCheckBusy, setDepositCheckBusy] = useState(false);
  const [firstDepositAmount, setFirstDepositAmount] = useState(null);
  const [progressLockBusy, setProgressLockBusy] = useState(false);
  const progressLockTriggeredRef = useRef(false);
  const [profile, setProfile] = useState({
    id: null,
    name: "Alex Johnson",
    email: "alex@example.com",
    phone: "0712 345 678",
    avatar: "",
    balance: null,
    joinNumber: null,
    refCode: null,
    referredBy: null,
  });
  const [draftProfile, setDraftProfile] = useState({
    id: null,
    name: "Alex Johnson",
    email: "alex@example.com",
    phone: "0712 345 678",
    avatar: "",
    balance: null,
    joinNumber: null,
    refCode: null,
    referredBy: null,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [settingsUpgradeBusy, setSettingsUpgradeBusy] = useState(false);
  const [settingsUpgradeDone, setSettingsUpgradeDone] = useState(false);
  const [settingsUpgradeError, setSettingsUpgradeError] = useState("");
  const avatarUrlRef = useRef(null);
  const [clientTx, setClientTx] = useState([]);
  const [clientRefs, setClientRefs] = useState([]);
  const [clientRefTable, setClientRefTable] = useState([]);
  const [dashboardOverview, setDashboardOverview] = useState(null);
  useEffect(() => {
    try { localStorage.setItem("ep:dash-notifs", JSON.stringify(notifs)); } catch (e) {}
  }, [notifs]);
  const baseEarn = 0;
  const USE_LOCAL_WALLET = !SUPABASE_ENABLED;
  const [earnBonus, setEarnBonus] = useState(() => {
    if (!USE_LOCAL_WALLET) return 0;
    try {
      const v = Number(localStorage.getItem("ep:earn-bonus") || 0);
      return Number.isFinite(v) ? v : 0;
    } catch (e) {
      return 0;
    }
  });
  const [walletBalance, setWalletBalance] = useState(() => {
    if (!USE_LOCAL_WALLET) return null;
    try {
      const v = Number(localStorage.getItem("ep:wallet-balance"));
      return Number.isFinite(v) ? v : null;
    } catch (e) {
      return null;
    }
  });
  useEffect(() => {
    if (!USE_LOCAL_WALLET) return;
    try { localStorage.setItem("ep:earn-bonus", String(earnBonus)); } catch (e) {}
  }, [earnBonus, USE_LOCAL_WALLET]);

  useEffect(() => {
    if (!USE_LOCAL_WALLET) return;
    if (!Number.isFinite(walletBalance)) return;
    try { localStorage.setItem("ep:wallet-balance", String(walletBalance)); } catch (e) {}
  }, [walletBalance, USE_LOCAL_WALLET]);
  const serverBalanceVal = Number(profile.balance);
  const serverBalance = Number.isFinite(serverBalanceVal) ? serverBalanceVal : null;
  const depositRequired = !USE_LOCAL_WALLET && hasTierDeposit === false;
  const DEPOSIT_AUTO_OPEN_SECS = 60;
  const [depositCountdown, setDepositCountdown] = useState(DEPOSIT_AUTO_OPEN_SECS);
  const timerMinutes = Math.floor(depositCountdown / 60);
  const timerSeconds = depositCountdown % 60;
  const depositTimerLabel = `${String(timerMinutes).padStart(2, "0")}:${String(timerSeconds).padStart(2, "0")}`;
  const depositTimerPct = Math.max(0, Math.min(100, Math.round((depositCountdown / DEPOSIT_AUTO_OPEN_SECS) * 100)));

  useEffect(() => {
    if (!supabase || !authId || USE_LOCAL_WALLET) {
      setHasTierDeposit(null);
      setFirstDepositAmount(null);
      setDashboardOverview(null);
      return;
    }
    const activeTierId = Number(t?.id || 1);
    let ignore = false;
    (async () => {
      setDepositCheckBusy(true);
      const overview = await fetchDashboardOverviewRow(activeTierId);
      if (ignore) return;

      if (overview) {
        setDashboardOverview(overview);
        setHasTierDeposit(overview.tier_has_success_deposit === true);
        const firstAmount = Number(overview.first_success_deposit_amount);
        setFirstDepositAmount(Number.isFinite(firstAmount) && firstAmount > 0 ? firstAmount : null);
        setDepositCheckBusy(false);
        return;
      }

      setDashboardOverview(null);
      const [{ data: depData, error: depError }, { data: firstData, error: firstError }] = await Promise.all([
        supabase
          .from("deposits")
          .select("deposit_id")
          .eq("user_id", authId)
          .eq("status", "success")
          .eq("tier_at_deposit", activeTierId)
          .limit(1),
        supabase
          .from("deposits")
          .select("amount")
          .eq("user_id", authId)
          .eq("status", "success")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
      ]);

      if (ignore) return;
      setHasTierDeposit(!depError && Array.isArray(depData) && depData.length > 0);
      const amount = Number(firstData?.amount);
      setFirstDepositAmount(!firstError && Number.isFinite(amount) && amount > 0 ? amount : null);
      setDepositCheckBusy(false);
    })();
    return () => { ignore = true; };
  }, [authId, t?.id, USE_LOCAL_WALLET]);
  useEffect(() => {
    if (!depositRequired) {
      setDepositCountdown(DEPOSIT_AUTO_OPEN_SECS);
      return;
    }
    setDepositCountdown(DEPOSIT_AUTO_OPEN_SECS);
  }, [depositRequired, authId, t?.id, DEPOSIT_AUTO_OPEN_SECS]);
  useEffect(() => {
    if (!depositRequired) return;
    const id = setInterval(() => {
      setDepositCountdown(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [depositRequired]);
  useEffect(() => {
    if (!depositRequired) return;
    if (depositCountdown > 0) return;
    setTab("withdraw");
    setDepositFocus(true);
  }, [depositRequired, depositCountdown]);
  useEffect(() => {
    if (!depositRequired) return;
    if (tab !== "videos") return;
    setDepositFocus(true);
    setTab("withdraw");
  }, [depositRequired, tab]);
  const earn = Number.isFinite(serverBalance) ? serverBalance : (baseEarn + earnBonus);
  const goal = getTierDailyTotal(t) * 7;
  const pct = Math.round((earn / goal) * 100);
  const profileName = profile.name || "Account";
  const profileParts = profileName.split(" ").filter(Boolean);
  const profileInitials = profileParts.map(n=>n[0]).join("").slice(0,2).toUpperCase() || "EP";
  const profileShort = profileParts.length > 1 ? `${profileParts[0]} ${profileParts[1][0]}.` : profileName;
  const balanceVal = Number(profile.balance);
  const baseBalance = Number.isFinite(balanceVal) ? balanceVal : (Number.isFinite(serverBalance) ? serverBalance : (baseEarn + earnBonus));
  const balance = Number.isFinite(serverBalance) ? serverBalance : (Number.isFinite(walletBalance) ? walletBalance : baseBalance);
  const joinSeed = (profile.email || profile.name || "EP").split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const joinNumberVal = Number(profile.joinNumber);
  const joinNumber = Number.isFinite(joinNumberVal)
    ? joinNumberVal
    : (Number.isFinite(Number(profile.id)) ? Number(profile.id) : 1000 + (joinSeed % 9000));
  const joinLabel = Number.isFinite(joinNumber) ? String(joinNumber).padStart(4, "0") : "0000";
  const joinCardLabel = `**** **** 500 ${joinLabel}`;
  const refCode = normalizeRefCode(profile.refCode) || makeRefCode(profile.email || profile.id || joinLabel);
  const nextTier = TIERS[t.id];
  const canUpgrade = !!nextTier;
  const settingsNeedsUnlock = hasTierDeposit === false;
  const currentTierDeposit = Number(t?.deposit) || 0;
  const nextTierDeposit = Number(nextTier?.deposit) || 0;
  const settingsUpgradeAmount = settingsNeedsUnlock
    ? currentTierDeposit
    : (nextTier ? Math.max(nextTierDeposit - currentTierDeposit, 0) : 0);
  const settingsTargetTierId = settingsNeedsUnlock ? t.id : (nextTier?.id || t.id);
  const settingsCanUpgradePay = settingsUpgradeAmount > 0;
  const overviewProgressTarget = Number(dashboardOverview?.progress_target_amount);
  const overviewProgressEarned = Number(dashboardOverview?.progress_earned_amount);
  const overviewProgressPct = Number(dashboardOverview?.progress_percent);
  const progressBaseDeposit = Number.isFinite(Number(firstDepositAmount)) && Number(firstDepositAmount) > 0
    ? Number(firstDepositAmount)
    : (Number(t?.deposit) || 0);
  const progressTarget =
    Number.isFinite(overviewProgressTarget) && overviewProgressTarget > 0
      ? overviewProgressTarget
      : (progressBaseDeposit > 0 ? progressBaseDeposit * 3 : 0);
  const progressTxTotals = useMemo(() => {
    const rows = Array.isArray(clientTx) ? clientTx : [];
    return rows.reduce((acc, tx) => {
      const amount = Number(tx?.amt);
      if (!Number.isFinite(amount) || amount <= 0) return acc;
      const icon = String(tx?.ic || "").toLowerCase();
      const text = `${String(tx?.text || "")} ${String(tx?.sub || "")}`.toLowerCase();
      const isReferral = icon === "gift" || text.includes("referral");
      const isEarning = icon === "play" || icon === "activity" || text.includes("video") || text.includes("bonus") || text.includes("earn");
      if (isReferral) {
        acc.referral += amount;
        return acc;
      }
      if (isEarning) acc.earnings += amount;
      return acc;
    }, { earnings: 0, referral: 0 });
  }, [clientTx]);
  const progressReferralTableTotal = useMemo(() => {
    const rows = Array.isArray(clientRefs) ? clientRefs : [];
    return rows.reduce((sum, r) => {
      const status = String(r?.status || "").toLowerCase();
      if (status && status !== "active") return sum;
      const bonus = Number(r?.bonus ?? r?.ref_bonus ?? r?.bonus_amount ?? r?.commission_amount ?? 0);
      return Number.isFinite(bonus) && bonus > 0 ? sum + bonus : sum;
    }, 0);
  }, [clientRefs]);
  const progressReferralTotal = progressTxTotals.referral > 0 ? progressTxTotals.referral : progressReferralTableTotal;
  const progressEarnedTotal =
    Number.isFinite(overviewProgressEarned) && overviewProgressEarned >= 0
      ? overviewProgressEarned
      : Math.max(0, progressTxTotals.earnings + progressReferralTotal);
  const progressPctRaw =
    Number.isFinite(overviewProgressPct) && overviewProgressPct >= 0
      ? overviewProgressPct
      : (progressTarget > 0 ? (progressEarnedTotal / progressTarget) * 100 : 0);
  const progressPct = Math.max(0, Math.min(100, Math.round(progressPctRaw)));
  const progressFill = progressPct <= 60 ? "#22C55E" : progressPct <= 85 ? "#EAB308" : "#F97316";
  const progressTrack = "#DCE4EE";
  useEffect(() => {
    if (!supabase || !authId || progressLockBusy) return;
    if (progressTarget <= 0 || progressEarnedTotal < progressTarget) {
      progressLockTriggeredRef.current = false;
      return;
    }
    if (progressLockTriggeredRef.current) return;
    const currentStatus = String(profileRow?.status || "Active").toLowerCase();
    if (currentStatus !== "active") return;
    let cancelled = false;
    (async () => {
      progressLockTriggeredRef.current = true;
      setProgressLockBusy(true);
      try {
        await supabase
          .from("users")
          .update({ status: "suspended" })
          .eq("user_id", authId);
        if (cancelled) return;
        try {
          window.alert("Progress reached 300%. Account has been locked.");
        } catch (e) {}
        try {
          await supabase.auth.signOut();
        } catch (e) {}
      } finally {
        if (!cancelled) setProgressLockBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authId, profileRow?.status, progressEarnedTotal, progressTarget, progressLockBusy]);
  const activeDisplayCurrency = normalizeDisplayCurrency(displayCurrency || getActiveDisplayCurrency());
  const today = new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});
  const canWithdraw = ["Tuesday","Friday"].includes(new Date().toLocaleDateString("en-US",{weekday:"long"}));
  const SIDEBAR_W = isMobile ? (isTiny ? 220 : 260) : 260;
  const ICON_W = 60;
  const headingFont = "Sora, Geist, sans-serif";
  const pagePad = isMobile ? (isTiny ? "10px 12px 126px" : "14px 16px 132px") : "26px 34px 48px";
  const headerPad = isMobile ? (isTiny ? "10px 12px 0" : "12px 16px 0") : "18px 28px 0";
  const upgradeBtnActive = {
    background:"linear-gradient(180deg,#FDE047 0%, #F59E0B 45%, #F97316 100%)",
    border:"2px solid #111",
    color:"#111",
    boxShadow:"0 6px 0 #111, 0 14px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.65)"
  };
  const upgradeBtnHeaderActive = {
    background:"linear-gradient(180deg,#F8FAFC 0%, #D1D5DB 45%, #F8FAFC 100%)",
    border:"2px solid #111",
    color:"#111",
    boxShadow:"0 6px 0 #111, 0 14px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.9)"
  };
  const upgradeBtnDisabled = {
    background:"#E5E7EB",
    border:"2px solid #9CA3AF",
    color:"#6B7280",
    boxShadow:"none"
  };
  const goDeposit = (focus = false) => {
    setDepositFocus(!!focus);
    setTab("withdraw");
  };
  const dismissDepositBanner = () => {
    DEPOSIT_WALLET_BANNER_DISMISSED = true;
    setDepositBannerDismissed(true);
  };
  useEffect(() => {
    if (tab !== "withdraw" && depositFocus) setDepositFocus(false);
  }, [tab, depositFocus]);
  const pushNotif = useCallback((item) => {
    if (!item) return;
    setNotifs(prev => {
      const base = Array.isArray(prev) ? prev : [];
      return [
        {
          ic: item.ic || "bell",
          title: item.title || "Account update",
          sub: item.sub || "",
          time: item.time || "Just now",
          c: item.c || t.acc,
          read: false
        },
        ...base
      ].slice(0, 40);
    });
  }, [t.acc]);
  const addClientTx = useCallback((tx) => {
    setClientTx(prev => [tx, ...(Array.isArray(prev) ? prev : [])]);
    if (!tx) return;
    pushNotif({
      ic: tx.ic || "wallet",
      title: tx.text || "Wallet update",
      sub: tx.sub || "New activity on your account.",
      time: tx.time || "Just now",
      c: tx.c || t.acc
    });
  }, [pushNotif, t.acc]);
  const makeEventId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  };
  const handleEarning = useCallback(async (payload, source = "manual") => {
    const isObj = payload && typeof payload === "object";
    const kind = (isObj ? payload.kind : source) || source;
    const isBonus = kind === "bonus";
    const qtyRaw = isObj ? Number(payload.qty) : 0;
    const unit = isObj && Number.isFinite(payload.unit)
      ? Number(payload.unit)
      : (isBonus ? getTierBonusUnit(t) : V_PRICE);
    const amtRaw = isObj ? Number(payload.amount) : Number(payload);
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0
      ? qtyRaw
      : (Number.isFinite(amtRaw) && unit > 0 ? Math.max(1, Math.round(amtRaw / unit)) : 0);
    const amt = Number.isFinite(amtRaw) && amtRaw > 0
      ? Math.round(amtRaw)
      : (qty > 0 ? Math.round(qty * unit) : 0);
    if (!Number.isFinite(amt) || amt <= 0) return;

    if (supabase && authUser?.id && !USE_LOCAL_WALLET) {
      try {
        const { data, error } = await supabase.rpc("claim_earning", {
          p_kind: isBonus ? "bonus" : "manual",
          p_qty: qty || 1,
          p_event_id: makeEventId()
        });
        if (error) return;
        const row = Array.isArray(data) ? data[0] : data;
        const credited = Number(row?.credited_amount ?? amt);
        const newBalance = Number(row?.new_balance);
        if (Number.isFinite(newBalance)) {
          setWalletBalance(newBalance);
          setProfile(p => ({ ...p, balance: newBalance }));
        }
        if (Number.isFinite(credited) && credited > 0) {
          addClientTx({
            ic: isBonus ? "activity" : "play",
            text: isBonus ? "Bonus credited" : "Video earnings credited",
            sub: `KES ${credited.toLocaleString()} added to wallet`,
            time: "Just now",
            c: isBonus ? "#7C3AED" : "#059669",
            amt: credited
          });
        }
      } catch (e) {}
      return;
    }

    setEarnBonus(prev => prev + amt);
    setWalletBalance(prev => {
      const current = Number.isFinite(prev) ? prev : baseBalance;
      return current + amt;
    });
    addClientTx({
      ic: isBonus ? "activity" : "play",
      text: isBonus ? "Bonus credited" : "Video earnings credited",
      sub: `KES ${amt.toLocaleString()} added to wallet`,
      time: "Just now",
      c: isBonus ? "#7C3AED" : "#059669",
      amt
    });
  }, [authUser?.id, baseBalance, t, addClientTx, USE_LOCAL_WALLET, setProfile]);
  const applyBalance = useCallback((nextBalance) => {
    if (!Number.isFinite(nextBalance)) return;
    setWalletBalance(nextBalance);
    setProfile(p => ({ ...p, balance: nextBalance }));
  }, [setProfile]);
  const symScale = isMobile ? 0.85 : 1;
  const liveSymbols = (isMobile ? LIVE_SYMBOLS.slice(0,7) : LIVE_SYMBOLS).map(s => ({
    ...s,
    size: Math.round(s.size * symScale)
  }));

  useEffect(() => {
    if (!profileRow) return;
    const next = {
      id: profileRow.id ?? profile.id,
      name: profileRow.name ?? profile.name,
      email: profileRow.email ?? profile.email,
      phone: profileRow.phone ?? profile.phone,
      avatar: profileRow.avatar_url ?? profileRow.avatar ?? profile.avatar,
      balance: profileRow.balance ?? profile.balance,
      joinNumber: profileRow.join_number ?? profileRow.joinNumber ?? profile.joinNumber,
      refCode: profileRow.ref_code ?? profileRow.refCode ?? profile.refCode,
      referredBy: profileRow.referred_by ?? profileRow.referredBy ?? profile.referredBy,
    };
    setProfile(prev => ({ ...prev, ...next }));
    setDraftProfile(prev => ({ ...prev, ...next }));
  }, [profileRow?.id]);

  useEffect(() => {
    const fn = () => {
      const w = window.innerWidth;
      const m = w < 769;
      setIsMobile(m);
      setIsTiny(w < 380);
      if (m) setOpen(false);
    };
    window.addEventListener("resize", fn); fn();
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    if (!isMobile) { setOverviewMediaReady(true); return; }
    if (tab !== "overview") return;
    let id;
    const warm = () => setOverviewMediaReady(true);
    if ("requestIdleCallback" in window) {
      id = window.requestIdleCallback(warm, { timeout: 1200 });
    } else {
      id = setTimeout(warm, 600);
    }
    return () => {
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, [isMobile, tab]);
  const onBodyScroll = (e) => {
    if (!isMobile) return;
    const y = e.currentTarget.scrollTop;
    const delta = y - lastScrollRef.current;
    if (y > 80 && delta < -4) {
      setStripHidden(true);
    }
    if (delta > 6) {
      setStripToggleHidden(true);
    }
    if (delta < -6 || y < 12) {
      setStripToggleHidden(false);
    }
    lastScrollRef.current = y;
  };

  useEffect(() => {
    return () => {
      if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
    };
  }, []);

  useEffect(() => {
    setDraftProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (!supabase) return;
    let ignore = false;
    const fmtShort = (d) => {
      if (!d) return "-";
      const dt = new Date(d);
      return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("en-US", { month:"short", day:"numeric" });
    };
    const txIcon = (type) => {
      const t = String(type || "").toLowerCase();
      if (t.includes("withdraw")) return "up";
      if (t.includes("referral")) return "gift";
      if (t.includes("video") || t.includes("watch")) return "play";
      return "wallet";
    };
    const txColor = (type) => {
      const typeLower = String(type || "").toLowerCase();
      if (typeLower.includes("withdraw")) return "#E8820C";
      if (typeLower.includes("referral")) return "#0066FF";
      if (typeLower.includes("video") || typeLower.includes("watch")) return "#059669";
      return t.acc;
    };
    const normalizeTx = (r, i) => {
      const rawAmt = Number(r.amount ?? r.amt ?? r.value ?? r.earnings);
      const amt = Number.isFinite(rawAmt) ? rawAmt : null;
      return {
        ic: r.ic || txIcon(r.type),
        text: r.text || r.title || (r.type ? `${r.type} activity` : "Transaction"),
        sub: r.sub || r.method || r.note || "Processed",
        time: r.time || fmtShort(r.created_at || r.date),
        c: r.color || txColor(r.type),
        amt,
      };
    };
    const normalizeRef = (r, i) => {
      const refUser = r.referred_user || r.user || {};
      const name = r.name || r.full_name || refUser.full_name || refUser.name || `User ${i+1}`;
      const rawStatus = String(r.status || (r.commission_amount ? "Active" : "Pending"));
      const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
      const rawBonus = Number(r.bonus ?? r.ref_bonus ?? r.bonus_amount ?? r.commission_amount ?? r.amount ?? r.earnings);
      const bonus = Number.isFinite(rawBonus) ? rawBonus : undefined;
      return { name, init: name.split(" " ).map(n=>n[0]).join("").slice(0,2).toUpperCase(), status, bonus };
    };
    const normalizeRefRow = (r, i) => {
      const refUser = r.referred_user || r.user || {};
      const tierVal = refUser.tier ?? r.tier ?? r.plan;
      const tierLabel = Number.isFinite(Number(tierVal)) ? (TIERS[Number(tierVal)-1]?.name || tierVal) : (tierVal || "Regular");
      const rawStatus = String(r.status || (r.commission_amount ? "Active" : "Pending"));
      const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
      const rawBonus = Number(r.bonus ?? r.ref_bonus ?? r.bonus_amount ?? r.commission_amount ?? t.deposit * 0.1);
      const bonus = Number.isFinite(rawBonus) ? rawBonus : 0;
      return {
        name: r.name || r.full_name || refUser.full_name || refUser.name || `User ${i+1}`,
        email: r.email || r.user_email || refUser.email || "?",
        tier: tierLabel,
        date: fmtShort(r.date || r.created_at || refUser.signup_at),
        bonus,
        status,
        earnings: Number(r.earnings || r.total_earnings || 0),
      };
    };
    (async () => {
      if (SUPABASE_ENABLED && !authId) return;
      const txRows = await fetchTable("transactions", { userId: authId, orderBy: "created_at" });
      if (ignore) return;
      if (Array.isArray(txRows) && txRows.length) setClientTx(txRows.map(normalizeTx));

      let appliedRefs = false;
      if (supabase && authId) {
        try {
          const { data: refRows } = await supabase
            .from("referrals")
            .select("ref_id,referrer_id,referred_user_id,commission_amount,created_at")
            .eq("referrer_id", authId)
            .order("created_at", { ascending: false })
            .limit(200);

          if (!ignore && Array.isArray(refRows) && refRows.length) {
            const ids = Array.from(new Set(refRows.map(r => r.referred_user_id).filter(Boolean)));
            let userMap = {};
            if (ids.length) {
              const { data: refUsers } = await supabase
                .from("users")
                .select("user_id,full_name,email,tier,signup_at,status")
                .in("user_id", ids);
              if (Array.isArray(refUsers)) {
                userMap = Object.fromEntries(refUsers.map(u => [u.user_id, u]));
              }
            }
            const merged = refRows.map(r => ({ ...r, referred_user: userMap[r.referred_user_id] }));
            setClientRefs(merged.map(normalizeRef));
            setClientRefTable(merged.map(normalizeRefRow));
            appliedRefs = true;
          }
        } catch (e) {
          /* no-op */
        }
      }

      if (!appliedRefs && supabase && authId) {
        try {
          const { data } = await supabase
            .from("users")
            .select("user_id,full_name,email,tier,signup_at,status")
            .eq("referrer_id", authId)
            .order("signup_at", { ascending: false })
            .limit(200);
          if (!ignore && Array.isArray(data) && data.length) {
            const merged = data.map(u => ({ referred_user: u }));
            setClientRefs(merged.map(normalizeRef));
            setClientRefTable(merged.map(normalizeRefRow));
            appliedRefs = true;
          }
        } catch (e) {
          /* no-op */
        }
      }

      if (!appliedRefs) {
        setClientRefs([]);
        setClientRefTable([]);
      }
    })();;
    return () => { ignore = true; };
  }, [t.acc, t.deposit, authId, refCode]);

  const navItems = [
    { id:"overview",  label:"Overview",  ic:"grid"   },
    { id:"videos",    label:"Videos",    ic:"play",  badge: "2 left" },
    { id:"analytics", label:"Analytics", ic:"chart"  },
    { id:"referrals", label:"Referrals", ic:"gift",  badge: "8" },
    { id:"withdraw",  label:"Wallet",    ic:"wallet" },
    { id:"settings",  label:"Settings",  ic:"settings" },
  ];

  const activityFeed = Array.isArray(clientTx) && clientTx.length ? clientTx : undefined;
  const referralFeed = Array.isArray(clientRefs) && clientRefs.length ? clientRefs : undefined;

  const closeSidebar = () => { if (isMobile) setOpen(false); };
  const setProfileField = (key, value) => setDraftProfile(p => ({ ...p, [key]: value }));
  const profileDirty = ["name","email","phone","avatar"].some(k => (draftProfile[k] || "") !== (profile[k] || ""));

  const handleAvatarFile = (file) => {
    if (!file) return;
    if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
    const url = URL.createObjectURL(file);
    avatarUrlRef.current = url;
    setProfileField("avatar", url);
  };

  const saveProfile = async () => {
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileMsg("");
    const draftJoinRaw = draftProfile.joinNumber;
    const draftJoinVal = draftJoinRaw === null || draftJoinRaw === "" || typeof draftJoinRaw === "undefined" ? null : Number(draftJoinRaw);
    const joinNumberClean = Number.isFinite(draftJoinVal) ? draftJoinVal : profile.joinNumber;
    const cleaned = {
      id: authId ?? draftProfile.id ?? profile.id ?? null,
      name: (draftProfile.name || "").trim() || profile.name,
      email: (draftProfile.email || "").trim() || profile.email,
      phone: (draftProfile.phone || "").trim() || profile.phone,
      avatar: (draftProfile.avatar || "").trim(),
      joinNumber: joinNumberClean,
    };
    setProfile(prev => ({
      ...prev,
      id: cleaned.id ?? prev.id,
      name: cleaned.name,
      email: cleaned.email,
      phone: cleaned.phone,
      avatar: cleaned.avatar,
      joinNumber: Number.isFinite(Number(cleaned.joinNumber)) ? cleaned.joinNumber : prev.joinNumber,
    }));
    if (supabase) {
      const payload = {
        id: cleaned.id ?? undefined,
        name: cleaned.name,
        email: cleaned.email,
        phone: cleaned.phone,
        avatar_url: cleaned.avatar || null,
        join_number: Number.isFinite(Number(cleaned.joinNumber)) ? cleaned.joinNumber : null,
        updated_at: new Date().toISOString(),
      };
      if (payload.id == null) delete payload.id;
      if (!Number.isFinite(Number(payload.join_number))) delete payload.join_number;
      try {
        const updated = await upsertProfileRow(payload);
        setProfileMsg(updated ? "Profile updated." : "Saved locally - sync failed.");
      } catch (e) {
        setProfileMsg("Saved locally - sync failed.");
      }
    } else {
      setProfileMsg("Profile updated.");
    }
    setProfileSaving(false);
  };
  const startSettingsUpgradeCheckout = async () => {
    setSettingsUpgradeError("");
    setSettingsUpgradeDone(false);
    if (settingsUpgradeBusy) return;
    if (!settingsCanUpgradePay) {
      setSettingsUpgradeError(nextTier ? "No payment required right now." : "You are already at the top tier.");
      return;
    }
    if (!authUser?.id) {
      setSettingsUpgradeError("Please sign in to continue.");
      return;
    }
    const apiBase = getApiBase();
    if (!apiBase) {
      setSettingsUpgradeError("Payment service is not configured. Please contact support.");
      return;
    }
    const email = authUser?.email || profileRow?.email || draftProfile.email || "";
    if (!email) {
      setSettingsUpgradeError("Email is required for checkout.");
      return;
    }
    setSettingsUpgradeBusy(true);
    try {
      const token = await getAccessToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const requestBody = {
        amount: settingsUpgradeAmount,
        user_id: authUser.id,
        email,
        tier: settingsTargetTierId,
        upgrade_from_tier: t.id,
        method: "M-Pesa",
        payment_mode: PAYMENTS_MODE === "live" ? "live" : "test",
        phone: profileRow?.phone || draftProfile.phone || "",
        name: profileRow?.name || draftProfile.name || authUser?.user_metadata?.full_name || ""
      };
      const res = await fetch(`${apiBase}/api/v1/deposit/create`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const rawMsg = data?.error || data?.message || data?.detail || "Failed to start checkout.";
        setSettingsUpgradeError(formatDepositError(rawMsg));
        return;
      }
      const url = data?.authorization_url || data?.redirect_url || data?.auth_url || data?.url;
      if (data?.manual) {
        setSettingsUpgradeDone(true);
        setTimeout(() => setSettingsUpgradeDone(false), 2500);
        addClientTx?.({
          ic:"wallet",
          text:"Deposit requested",
          sub:`KES ${settingsUpgradeAmount.toLocaleString()} pending manual confirmation`,
          time:"Just now",
          c:"#0066FF",
          amt:settingsUpgradeAmount
        });
        return;
      }
      if (!url) {
        setSettingsUpgradeError("Payment gateway did not return a checkout URL.");
        return;
      }
      setSettingsUpgradeDone(true);
      setTimeout(() => setSettingsUpgradeDone(false), 2500);
      addClientTx?.({
        ic:"wallet",
        text:"Deposit initiated",
        sub:`KES ${settingsUpgradeAmount.toLocaleString()} via M-Pesa`,
        time:"Just now",
        c:"#0066FF",
        amt:settingsUpgradeAmount
      });
      window.location.href = url;
    } catch (e) {
      setSettingsUpgradeError("Network error. Please try again.");
    } finally {
      setSettingsUpgradeBusy(false);
    }
  };

  return (
    <div style={{ display:"flex", height:"calc(100vh - 44px)", background:"#fff", fontFamily:"IBM Plex Sans, Geist, sans-serif", color:"#111", position:"relative" }}>

      {/* "" Mobile overlay "" */}
      <div className={`ep-dash-overlay${isMobile && open ? " open" : ""}`} onClick={closeSidebar}
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:199, display:"none", backdropFilter:"blur(2px)" }}/>

      {/*  SIDEBAR  */}
      <aside className={`ep-dash-sidebar${isMobile && open ? " open" : ""}`}
        style={{
          width: isMobile ? SIDEBAR_W : (open ? SIDEBAR_W : ICON_W),
          minWidth: isMobile ? SIDEBAR_W : (open ? SIDEBAR_W : ICON_W),
          background:"#fff",
          borderRight:"1px solid #E8E8E8",
          transition: isMobile ? "transform .28s cubic-bezier(.4,0,.2,1)" : "width .28s cubic-bezier(.4,0,.2,1), min-width .28s cubic-bezier(.4,0,.2,1)",
          overflow:"hidden",
          display:"flex", flexDirection:"column",
          boxShadow: isMobile && open ? "4px 0 32px rgba(0,0,0,0.18)" : "2px 0 12px rgba(0,0,0,0.04)",
          zIndex:20, flexShrink:0
        }}>

        {/* "" Brand row "" */}
        <div style={{ height:62, display:"flex", alignItems:"center", padding: open?"0 18px":"0", justifyContent: open?"flex-start":"center", borderBottom:"1px solid #F0F0F0", flexShrink:0, gap:10 }}>
          <BrandMark size={34} />
          {open && <div style={{ overflow:"hidden", whiteSpace:"nowrap" }}>
            <div style={{ fontWeight:900, fontSize:15, letterSpacing:"-0.04em", color:"#111" }}>EdisonPay</div>
            <div style={{ fontSize:10, color:t.acc, fontWeight:800, letterSpacing:"0.06em", marginTop:1 }}>{t.name.toUpperCase()}</div>
          </div>}
        </div>

        {/* "" Nav "" */}
        <nav style={{ padding: open?"12px 10px":"10px 6px", flex:1, overflowY:"auto" }}>
          {open && <div style={{ fontSize:9, fontWeight:800, color:"#CCC", letterSpacing:"0.12em", padding:"0 10px 8px" }}>NAVIGATION</div>}
          {navItems.map(({ id, label, ic, badge }) => {
            const active = tab === id;
            return (
              <div key={id} title={!open ? label : undefined}
                onClick={() => { setTab(id); }}
                style={{ display:"flex", alignItems:"center", gap: open?10:0, padding: open?"9px 12px":"10px 0", justifyContent: open?"flex-start":"center", borderRadius:9, cursor:"pointer", marginBottom:2, background: active ? t.lgt : "transparent", color: active ? t.acc : "#999", fontWeight: active?700:500, fontSize:13, transition:"all .12s", position:"relative" }}>
                <I n={ic} s={16} c={active ? t.acc : "#BBBBBB"}/>
                {open && <span style={{ flex:1, whiteSpace:"nowrap" }}>{label}</span>}
                {open && badge && <span style={{ fontSize:9, fontWeight:800, color: active?t.acc:"#BBB", background: active?`${t.acc}20`:"#F0F0F0", borderRadius:50, padding:"2px 7px" }}>{badge}</span>}
                {!open && active && <div style={{ position:"absolute", left:0, top:"25%", width:3, height:"50%", background:t.acc, borderRadius:"0 3px 3px 0" }}/>}
              </div>
            );
          })}

          {open && t.id < 5 && (
            <button
              onClick={() => { if (canUpgrade) goDeposit(true); }}
              disabled={!canUpgrade}
              style={{
                margin:"8px 0 0",
                padding:"10px 12px",
                borderRadius:10,
                display:"flex",
                alignItems:"center",
                gap:9,
                cursor: canUpgrade ? "pointer" : "not-allowed",
                fontWeight:800,
                fontSize:12,
                transition:"transform .12s, box-shadow .12s",
                ...(canUpgrade ? upgradeBtnHeaderActive : upgradeBtnDisabled)
              }}>
              <I n="star" s={14} c={canUpgrade ? "#111" : "#6B7280"}/>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", gap:2 }}>
                <span>Upgrade to {nextTier?.name}</span>
                <span style={{ fontSize:10, fontWeight:800, color: canUpgrade ? "#111" : "#6B7280" }}>
                  {nextTier ? "Upgrade anytime" : "Max tier"}
                </span>
              </div>
            </button>
          )}

          {open && isMobile && (
            <div style={{ margin:"10px 0 0" }}>
              <button onClick={()=>setQuickOpen(o=>!o)}
                style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:"1px solid #E8E8E8", background:"#FAFAFA", fontSize:12, fontWeight:800, color:"#555", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, fontFamily:"Geist,sans-serif" }}>
                Quick Actions
                <I n="chevR" s={11} c="#BBB"/>
              </button>
              {quickOpen && (
                <div style={{ marginTop:8, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <button onClick={()=>setTab("videos")} style={{ padding:"8px 10px", background:"#111", color:"#fff", border:"none", borderRadius:8, fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"Geist,sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    <I n="play" s={11} c="#fff"/> Videos
                  </button>
                  <button onClick={()=>setTab("withdraw")} style={{ padding:"8px 10px", background:"#F5F5F5", color:"#111", border:"1px solid #E8E8E8", borderRadius:8, fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"Geist,sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    <I n="wallet" s={11} c="#111"/> Withdraw
                  </button>
                </div>
              )}
            </div>
          )}

          {open && !isMobile && (
            <div style={{ marginTop:12, padding:"11px 10px", border:"1px solid #E5E7EB", borderRadius:12, background:"linear-gradient(180deg,#FFFFFF 0%, #F8FAFC 100%)", display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ fontSize:9, fontWeight:900, letterSpacing:"0.11em", color:"#94A3B8" }}>WORKSPACE</div>
              <div style={{ display:"grid", gap:6 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"7px 8px", borderRadius:8, border:"1px solid #E5E7EB", background:"#fff" }}>
                  <span style={{ fontSize:10, fontWeight:800, color:"#64748B", letterSpacing:"0.06em" }}>TODAY</span>
                  <span style={{ fontSize:11, fontWeight:700, color:"#111", whiteSpace:"nowrap" }}>{today}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"7px 8px", borderRadius:8, border:`1px solid ${canWithdraw ? "#A7F3D0" : "#FECACA"}`, background:canWithdraw ? "#ECFDF5" : "#FEF2F2" }}>
                  <span style={{ fontSize:10, fontWeight:800, color:canWithdraw ? "#166534" : "#991B1B", letterSpacing:"0.06em" }}>PAYOUT</span>
                  <span style={{ fontSize:11, fontWeight:800, color:canWithdraw ? "#059669" : "#DC2626", whiteSpace:"nowrap" }}>
                    {canWithdraw ? "Open" : "Queued"}
                  </span>
                </div>
                <div style={{ padding:"8px 9px", borderRadius:8, border:`1px solid ${t.mid}`, background:t.lgt }}>
                  <div style={{ fontSize:9, color:t.acc, opacity:0.75, fontWeight:800, letterSpacing:"0.08em" }}>EARNINGS</div>
                  <div style={{ marginTop:3, fontSize:14, fontWeight:900, color:t.acc, letterSpacing:"-0.03em" }}>
                    {formatMoney(earn, {
                      currency: activeDisplayCurrency,
                      minFractionDigits: activeDisplayCurrency === DISPLAY_CURRENCIES.USD ? 2 : 0,
                      maxFractionDigits: activeDisplayCurrency === DISPLAY_CURRENCIES.USD ? 2 : 0
                    })}
                  </div>
                </div>
              </div>
              <div style={{ marginTop:2, display:"flex", justifyContent:"center" }}>
                <CurrencyPill
                  currency={activeDisplayCurrency}
                  onChange={(next) => { if (onChangeDisplayCurrency) onChangeDisplayCurrency(normalizeDisplayCurrency(next)); }}
                  compact
                />
              </div>
            </div>
          )}
        </nav>

        {/* Logout button (bottom) */}
        {open && (
          <div style={{ padding:"12px 14px", borderTop:"1px solid #F0F0F0", flexShrink:0 }}>
            <button
              onClick={() => (onSignOut ? onSignOut() : go("landing"))}
              style={{
                width:"100%",
                padding:"10px 12px",
                borderRadius:10,
                border:"1.5px solid #DC2626",
                background:"#FEE2E2",
                color:"#B91C1C",
                fontWeight:800,
                fontSize:12,
                cursor:"pointer",
                fontFamily:"Geist,sans-serif",
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                gap:8
              }}>
              <I n="logout" s={14} c="#B91C1C"/> Sign Out
            </button>
          </div>
        )}

        {/* Icon-only: logout at bottom */}
        {!open && (
          <div style={{ padding:"10px 0", display:"flex", justifyContent:"center", borderTop:"1px solid #F0F0F0" }}>
            <button onClick={() => (onSignOut ? onSignOut() : go("landing"))} title="Logout" style={{ width:36, height:36, borderRadius:9, border:"none", background:"#FFF0F0", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <I n="logout" s={15} c="#EF4444"/>
            </button>
          </div>
        )}
      </aside>

      {/*  MAIN  */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

        {/* "" TOP BAR "" */}
        <header className="ep-dash-topbar" style={{
          minHeight: isMobile ? 64 : 72,
          height: isMobile ? "auto" : 72,
          background: isMobile ? "#fff" : "linear-gradient(180deg,#FFFFFF 0%, #F8FAFC 100%)",
          borderBottom: isMobile ? "1px solid #E8E8E8" : "1px solid rgba(226,232,240,0.95)",
          display:"flex",
          alignItems:"center",
          position:"relative",
          padding: isMobile ? "10px 14px" : "10px 18px",
          gap: isMobile ? 8 : 12,
          flexShrink:0,
          boxShadow: isMobile ? "0 1px 4px rgba(0,0,0,0.04)" : "0 8px 16px rgba(15,23,42,0.05)",
          flexWrap:"nowrap"
        }}>

          {/* Toggle / Upgrade */}
          {!isMobile && (
            <button onClick={() => setOpen(o => !o)}
              className="ep-dash-icon-btn"
              style={{ width:36, height:36, borderRadius:9, border:"1.5px solid #E8E8E8", background:"#FAFAFA", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", flexShrink:0 }}
              onMouseEnter={e=>{e.currentTarget.style.background="#F0F0F0";}} onMouseLeave={e=>{e.currentTarget.style.background="#FAFAFA";}}>
              <I n="menu" s={16} c="#555"/>
            </button>
          )}
          <button
            onClick={() => { if (canUpgrade) goDeposit(true); }}
            disabled={!canUpgrade}
            title={nextTier ? `Upgrade to ${nextTier.name}` : "Max tier"}
            className="ep-upgrade-btn"
            style={{
              padding: isMobile ? "7px 12px" : "8px 12px",
              borderRadius:12,
              cursor: canUpgrade ? "pointer" : "not-allowed",
              display:"flex",
              alignItems:"center",
              gap:6,
              transition:"all .15s",
              flexShrink:0,
              zIndex:1,
              ...(canUpgrade ? upgradeBtnActive : upgradeBtnDisabled)
            }}>
            <span className="ep-upgrade-arrow" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
              <I n="trendUp" s={14} c={canUpgrade ? "#111" : "#6B7280"}/>
            </span>
            <span style={{ fontSize:11, fontWeight:900, color: canUpgrade ? "#111" : "#6B7280", letterSpacing:"0.02em" }}>
              {nextTier ? "Upgrade" : "Max Tier"}
            </span>
          </button>

          {/* Page heading */}
          {!isMobile && (
            <div style={{ display:"flex", flexDirection:"column", gap:2, minWidth:0, marginLeft:2 }}>
              <span style={{ fontSize:16, fontWeight:900, color:"#0F172A", letterSpacing:"-0.03em", lineHeight:1.1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {navItems.find(n=>n.id===tab)?.label || "Overview"}
              </span>
              <span style={{ fontSize:10, fontWeight:700, color:"#64748B", letterSpacing:"0.08em", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {t.name.toUpperCase()} TIER DASHBOARD
              </span>
            </div>
          )}

          {isMobile && (
            <div
              className="ep-dash-currency-slot"
              style={{
                position:"relative",
                left:"auto",
                top:"auto",
                transform:"none",
                zIndex:3,
                pointerEvents:"auto",
                marginLeft:isTiny ? 8 : 10,
                flexShrink:0
              }}
            >
              <CurrencyPill
                currency={activeDisplayCurrency}
                onChange={(next) => { if (onChangeDisplayCurrency) onChangeDisplayCurrency(normalizeDisplayCurrency(next)); }}
                compact={isMobile}
              />
            </div>
          )}

          <div style={{ flex:1, minWidth:0 }}/>

          {/* Notifications */}
          <div style={{ position:"relative" }}>
            <button onClick={()=>{setNotifOpen(o=>!o); setProfileOpen(false);}}
              className="ep-dash-icon-btn"
              style={{ width:36, height:36, borderRadius:9, border:"1.5px solid #E8E8E8", background:"#FAFAFA", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
              <I n="bell" s={15} c="#666"/>
              {notifs.some(n=>!n.read) && (
                <div style={{ position:"absolute", top:6, right:6, width:8, height:8, borderRadius:"50%", background:"#EF4444", border:"1.5px solid #fff" }}/>
              )}
            </button>
            {notifOpen && (
              <div style={{ position:"absolute", top:44, right:0, width:300, background:"#fff", border:"1px solid #E8E8E8", borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.12)", zIndex:999, padding:"14px 0", animation:"scaleIn .18s ease both", transformOrigin:"top right" }}>
                <div style={{ padding:"0 16px 10px", borderBottom:"1px solid #F5F5F5", display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:13, fontWeight:800 }}>Notifications</span>
                  <span onClick={()=>setNotifs(ns=>ns.map(n=>({ ...n, read:true })))} style={{ fontSize:11, color:t.acc, fontWeight:700, cursor:"pointer" }}>Mark all read</span>
                </div>
                {notifs.map((n,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, padding:"11px 16px", background:n.read?"#fff":"#FAFAFA", margin:"0 8px 4px", borderRadius:10, opacity:n.read?0.7:1 }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:`${n.c}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <I n={n.ic} s={14} c={n.c}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#111" }}>{n.title}</div>
                      <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{n.sub}</div>
                    </div>
                    <span style={{ fontSize:10, color:"#CCC", whiteSpace:"nowrap" }}>{n.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile */}
          <div style={{ position:"relative" }}>
            <div
              onClick={()=>{setProfileOpen(o=>!o); setNotifOpen(false);}}
              className="ep-dash-profile-trigger"
              style={{
                display:"flex",
                alignItems:"center",
                gap:8,
                cursor:"pointer",
                padding:isMobile ? "3px 8px 3px 3px" : "4px 10px 4px 4px",
                border:"1.5px solid #E8E8E8",
                borderRadius:50,
                background:"#FAFAFA",
                minHeight:36,
                flexShrink:0
              }}
            >
              <div
                style={{
                  width:isMobile ? 30 : 28,
                  height:isMobile ? 30 : 28,
                  minWidth:isMobile ? 30 : 28,
                  minHeight:isMobile ? 30 : 28,
                  borderRadius:"50%",
                  background:t.acc,
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  overflow:"hidden",
                  flexShrink:0
                }}
              >
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profileName} style={{ display:"block", width:"100%", height:"100%", objectFit:"cover" }} />
                ) : (
                  <span style={{ fontSize:11, fontWeight:900, color:"#fff" }}>{profileInitials}</span>
                )}
              </div>
              {!isMobile && <span style={{ fontSize:12, fontWeight:700, color:"#111", whiteSpace:"nowrap" }}>{profileShort}</span>}
              {!isMobile && <I n="chevR" s={12} c="#CCC"/>}
            </div>
            {profileOpen && (
              <div style={{ position:"absolute", top:46, right:0, width:220, background:"#fff", border:"1px solid #E8E8E8", borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.12)", zIndex:999, padding:"8px", animation:"scaleIn .18s ease both", transformOrigin:"top right" }}>
                <div style={{ padding:"10px 12px 12px", borderBottom:"1px solid #F5F5F5", marginBottom:4, display:"flex", gap:10, alignItems:"center" }}>
                  <div style={{ width:46, height:46, borderRadius:"50%", background:"linear-gradient(135deg,#111,#333)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", border:"2px solid #111", boxShadow:"0 6px 14px rgba(0,0,0,0.18)" }}>
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profileName} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    ) : (
                      <span style={{ fontSize:14, fontWeight:900, color:"#fff" }}>{profileInitials}</span>
                    )}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:800 }}>{profileName}</div>
                    <div style={{ fontSize:11, color:"#888", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{profile.email}</div>
                    <div style={{ marginTop:6, display:"inline-flex", alignItems:"center", gap:5, padding:"3px 8px", background:"#F8FAFC", border:"1px solid #E5E7EB", borderRadius:50 }}>
                      <div style={{ width:5, height:5, borderRadius:"50%", background:"#111" }}/>
                      <span style={{ fontSize:9, fontWeight:800, color:"#111" }}>{t.name.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                {[
                  ["user","My Profile","settings"],
                  ["settings","Settings","settings"],
                  ["shield","Security","settings"],
                  ["wallet","Wallet","withdraw"],
                  ["gift","Referrals","referrals"],
                  ["chart","Activity","analytics"],
                  ["link","Support","overview"]
                ].map(([ic,lbl,target])=>(
                  <div key={lbl} onClick={()=>{ setTab(target); setProfileOpen(false); }}
                    style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 12px", borderRadius:8, cursor:"pointer", fontSize:13, color:"#555", fontWeight:600 }}
                    onMouseEnter={e=>e.currentTarget.style.background="#F7F7F7"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <I n={ic} s={14} c="#BBB"/>{lbl}
                  </div>
                ))}
                <div style={{ borderTop:"1px solid #F5F5F5", marginTop:4, paddingTop:4 }}>
                  <div onClick={()=> (onSignOut ? onSignOut() : go("landing"))} style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 12px", borderRadius:8, cursor:"pointer", fontSize:13, color:"#EF4444", fontWeight:700 }}
                    onMouseEnter={e=>e.currentTarget.style.background="#FFF0F0"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <I n="logout" s={14} c="#EF4444"/> Sign Out
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* "" PAGE HEADER STRIP "" */}
        <div className="ep-dash-strip" style={{
          position:"sticky",
          top:0,
          zIndex:20,
          background:"#F2F4F8",
          borderBottom:"1px solid rgba(17,17,17,0.12)",
          display:"flex",
          alignItems:"center",
          justifyContent:"space-between",
          flexShrink:0,
          overflow:"hidden",
          padding: stripHidden ? "0 0" : headerPad,
          maxHeight: stripHidden ? 0 : 180,
          opacity: stripHidden ? 0 : 1,
          transform: stripHidden ? "translateY(-100%)" : "translateY(0)",
          transition:"transform .2s ease, opacity .2s ease, max-height .2s ease, padding .2s ease"
        }}>
          {!isMobile && (
            <div style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:12, color:"#64748B", fontWeight:700, letterSpacing:"0.03em" }}>
                  {today}  -  <span style={{ color:t.acc, fontWeight:800 }}>{t.name} Tier</span>  -  KES {earn.toLocaleString()} earned
                </p>
                <div style={{ marginTop:6, width:"min(420px, 60vw)" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:10, fontWeight:900, color:"#334155", letterSpacing:"0.08em", textTransform:"uppercase" }}>Progress</span>
                    <span style={{ fontSize:10, fontWeight:800, color:"#475569" }}>{progressPct}%</span>
                  </div>
                  <div style={{ height:7, borderRadius:999, background:progressTrack, border:"1px solid rgba(15,23,42,0.08)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${progressPct}%`, borderRadius:999, background:progressFill, transition:"width .3s ease" }} />
                  </div>
                </div>
              </div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"6px 10px", borderRadius:999, background:"#fff", border:"1px solid #E2E8F0" }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:t.acc }} />
                <span style={{ fontSize:11, fontWeight:900, color:"#0F172A", letterSpacing:"0.05em" }}>
                  {navItems.find(n=>n.id===tab)?.label || "Overview"}
                </span>
              </div>
            </div>
          )}

          {isMobile && (
            <div className="ep-dash-strip-mobile" style={{ width:"100%", display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                <h2 style={{ fontSize:isTiny?14:16, fontWeight:900, letterSpacing:"-0.04em", color:"#111", lineHeight:1.1, fontFamily: headingFont, flex:"1 1 140px", minWidth:0 }}>
                  {navItems.find(n=>n.id===tab)?.label || "Overview"}
                </h2>
                <span style={{ fontSize:isTiny?9:10, fontWeight:800, color:t.acc, background:t.lgt, border:`1px solid ${t.mid}`, borderRadius:99, padding:"4px 10px", whiteSpace:"nowrap", flexShrink:0 }}>
                  {t.name} Tier
                </span>
              </div>
              <div style={{ width:"100%" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:10, fontWeight:900, color:"#334155", letterSpacing:"0.08em", textTransform:"uppercase" }}>Progress</span>
                  <span style={{ fontSize:10, fontWeight:800, color:"#475569" }}>{progressPct}%</span>
                </div>
                <div style={{ height:7, borderRadius:999, background:progressTrack, border:"1px solid rgba(15,23,42,0.08)", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${progressPct}%`, borderRadius:999, background:progressFill, transition:"width .3s ease" }} />
                </div>
              </div>
              <div className="ep-dash-strip-mobile-meta" style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <span style={{ fontSize:isTiny?9:10, fontWeight:700, color:"#555", background:"#fff", border:"1px solid #E8E8E8", borderRadius:99, padding:"4px 8px" }}>{today}</span>
                <span style={{ fontSize:isTiny?9:10, fontWeight:700, color:"#111", background:"#fff", border:"1px solid #E8E8E8", borderRadius:99, padding:"4px 8px" }}>KES {earn.toLocaleString()} earned</span>
              </div>
              {tab !== "overview" && (
                <div style={{ display:"grid", gridTemplateColumns: isTiny ? "1fr" : "1fr 1fr", gap:8 }}>
                  <button onClick={()=>setTab("videos")} style={{ padding:"10px 0", background:"#111", color:"#fff", border:"none", borderRadius:10, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"IBM Plex Sans, Geist, sans-serif" }}>
                    Watch Now
                  </button>
                  <button onClick={()=>setTab("withdraw")} style={{ padding:"10px 0", background:"#fff", color:"#111", border:"1.5px solid #E8E8E8", borderRadius:10, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"IBM Plex Sans, Geist, sans-serif" }}>
                    Withdraw
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding: pagePad }} onScroll={onBodyScroll} onClick={()=>{setNotifOpen(false); setProfileOpen(false);}}>
          {isMobile && (
            <div style={{ position:"sticky", top:4, zIndex:30, display:"flex", justifyContent:"center", pointerEvents:"none", opacity: stripToggleHidden ? 0 : 1, transform: stripToggleHidden ? "translateY(-6px)" : "translateY(0)", transition:"opacity .2s ease, transform .2s ease", marginBottom:10 }}>
              <button onClick={()=>{ setStripHidden(s => !s); }}
                style={{
                  pointerEvents: stripToggleHidden ? "none" : "auto",
                  minWidth:180,
                  height:32,
                  padding:"0 18px",
                  borderRadius:6,
                  border:"1.5px solid #111",
                  background:"#fff",
                  color:"#111",
                  cursor:"pointer",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  gap:6,
                  boxShadow:"0 4px 0 #111, 0 10px 18px rgba(0,0,0,0.15)",
                  fontSize:11,
                  fontWeight:800,
                  letterSpacing:"0.02em",
                  transition:"transform .18s ease"
                }}>
                <div style={{ transform: stripHidden ? "rotate(90deg)" : "rotate(-90deg)", transition:"transform .18s ease" }}>
                  <I n="chevR" s={12} c="#111"/>
                </div>
                {stripHidden ? "Show Summary" : "Hide Summary"}
              </button>
            </div>
          )}
          {!tierSelected && (
            <div style={{ padding:"14px 16px", background:"#FFF7ED", border:"1px solid #FDBA74", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:10, background:"#F59E0B", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <I n="star" s={14} c="#fff"/>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:900, color:"#111" }}>Choose your tier to activate your account</div>
                  <div style={{ fontSize:11, color:"#9A3412", marginTop:2 }}>Select a tier to unlock earnings, deposits, and withdrawals.</div>
                </div>
              </div>
              <button onClick={()=>go("tier-select")}
                style={{ padding:"9px 14px", borderRadius:10, border:"1.5px solid #111", background:"#111", color:"#fff", fontSize:12, fontWeight:900, cursor:"pointer", fontFamily:"Geist,sans-serif", whiteSpace:"nowrap" }}>
                Choose Tier
              </button>
            </div>
          )}
          {depositRequired && !depositBannerDismissed && (
            <div style={{ position:"relative", background:"#000", border:"1px solid #171717", borderRadius:12, display:"grid", gridTemplateColumns:isMobile ? "minmax(0,1fr) 108px" : "minmax(0,1fr) minmax(170px, 230px)", alignItems:"stretch", minHeight:isMobile ? 106 : 116, overflow:"hidden", marginBottom:16 }}>
              <button
                type="button"
                aria-label="Dismiss deposit notice"
                onClick={dismissDepositBanner}
                style={{ position:"absolute", top:8, right:8, width:24, height:24, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.28)", background:"rgba(255,255,255,0.08)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", zIndex:3 }}
              >
                <I n="xmark" s={12} c="#fff" />
              </button>
              <div style={{ padding:isMobile ? "10px 12px" : "12px 18px", display:"flex", flexDirection:"column", justifyContent:"center", gap:10, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <I n="wallet" s={14} c="#111"/>
                  </div>
                  <div style={{ minWidth:0, paddingRight:20 }}>
                    <div style={{ fontSize:13, fontWeight:900, color:"#fff" }}>Deposit needed to unlock wallet</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.78)", marginTop:2 }}>Pay KES {t.deposit.toLocaleString()} once to unlock earnings and withdrawals.</div>
                  </div>
                </div>
                <button onClick={() => goDeposit(true)}
                  style={{ padding:isMobile ? "9px 13px" : "10px 16px", borderRadius:10, border:"1px solid rgba(187,247,208,0.7)", background:"linear-gradient(135deg,#22c55e 0%, #16a34a 58%, #15803d 100%)", color:"#ecfdf5", fontSize:12, fontWeight:900, cursor:"pointer", fontFamily:"Geist,sans-serif", whiteSpace:"nowrap", boxShadow:"0 8px 18px rgba(22,163,74,0.28)", alignSelf:"flex-start" }}>
                  Pay Now
                </button>
              </div>
              <div style={{ background:"#000", overflow:"hidden" }}>
                <img
                  src={LANDING_STICKER_BOTTOM_IMAGE.primary}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={(e) => setFallbackSrc(e, LANDING_STICKER_BOTTOM_IMAGE)}
                  style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center right", pointerEvents:"none", userSelect:"none" }}
                />
              </div>
            </div>
          )}
          {tab==="overview"  && <OverviewContent  t={t} earn={earn} goal={goal} pct={pct} balance={balance} joinCardLabel={joinCardLabel} setTab={setTab} isMobile={isMobile} activityData={activityFeed} referralData={referralFeed} refCode={refCode} goDeposit={goDeposit} stripHidden={stripHidden} mediaEager={overviewMediaReady} dashboardSummary={dashboardOverview}/>}
          {tab==="videos"    && (
            <VideosContent
              t={t}
              onEarning={handleEarning}
              authUser={authUser}
              depositRequired={depositRequired}
              onRequireDeposit={() => goDeposit(true)}
            />
          )}
          {tab==="analytics" && <AnalyticsContent t={t} earn={earn} isMobile={isMobile} refCode={refCode} />}
          {tab==="referrals" && <ReferralsContent t={t} earn={earn} refData={supabase ? clientRefTable : undefined} refCode={refCode} isMobile={isMobile} authUserId={authId} />}
          {tab==="withdraw"  && <WithdrawContent  t={t} earn={earn} balance={balance} authUser={authUser} profileRow={profileRow} focusDeposit={depositFocus} onFocusDone={()=>setDepositFocus(false)} onNewTx={addClientTx} onBalanceUpdate={applyBalance} hasDeposit={hasTierDeposit} historyData={activityFeed} referralHistory={clientRefTable}/>}
          {tab==="settings"  && (
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr", gap:18, alignItems:"start" }}>
              <div className="ep-card" style={{ borderRadius:16, padding:"20px 22px", background:"linear-gradient(160deg,#FFFFFF 0%, #F8FAFC 52%, #F4F8FF 100%)", border:"1px solid #E6ECF5", boxShadow:"0 10px 24px rgba(15,23,42,0.08)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:12, flexWrap:"wrap" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:900, color:"#111" }}>Profile Settings</div>
                    <div style={{ fontSize:11, color:"#888", marginTop:2 }}>Update your account details and photo.</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <button onClick={() => onReplayGuide?.()}
                      style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid #111", background:"#fff", color:"#111", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"Geist,sans-serif" }}>
                      Guide / Tutorial
                    </button>
                    <button onClick={saveProfile} disabled={!profileDirty || profileSaving}
                      style={{ padding:"8px 14px", borderRadius:9, border:"none", background: profileDirty ? "#111" : "#E5E7EB", color: profileDirty ? "#fff" : "#9CA3AF", fontSize:12, fontWeight:800, cursor: profileDirty ? "pointer" : "not-allowed", fontFamily:"Geist,sans-serif" }}>
                      {profileSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>

                {profileMsg && (
                  <div style={{ marginBottom:14, padding:"8px 12px", background:"#F8FAFC", border:"1px solid #E5E7EB", borderRadius:9, fontSize:11, color:"#475569", fontWeight:700 }}>
                    {profileMsg}
                  </div>
                )}

                <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "140px 1fr", gap:16 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                    <div style={{ width:88, height:88, borderRadius:"50%", background:"#111", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", border:"3px solid #F3F4F6" }}>
                      {draftProfile.avatar ? (
                        <img src={draftProfile.avatar} alt={profileName} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      ) : (
                        <span style={{ fontSize:20, fontWeight:900, color:"#fff" }}>{profileInitials}</span>
                      )}
                    </div>
                    <label style={{ fontSize:10, fontWeight:800, color:"#666", cursor:"pointer", background:"#F8FAFC", border:"1px solid #E5E7EB", padding:"6px 10px", borderRadius:9 }}>
                      Upload Photo
                      <input type="file" accept="image/*" onChange={e=>handleAvatarFile(e.target.files?.[0])} style={{ display:"none" }} />
                    </label>
                    {draftProfile.avatar && (
                      <button onClick={() => setProfileField("avatar", "")} style={{ fontSize:10, fontWeight:800, color:"#EF4444", background:"transparent", border:"none", cursor:"pointer" }}>
                        Remove
                      </button>
                    )}
                    <div style={{ width:"100%", marginTop:6 }}>
                      <div style={{ fontSize:10, fontWeight:800, color:"#666", marginBottom:6, textAlign:"center" }}>Choose Avatar</div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                        {AVATAR_PRESETS.map((src,i)=>(
                          <button key={i} onClick={()=>setProfileField("avatar", src)}
                            style={{ padding:2, borderRadius:"50%", border: draftProfile.avatar===src ? "2px solid #111" : "1px solid #E5E7EB", background:"#fff", cursor:"pointer" }}>
                            <img src={src} alt={`Avatar ${i+1}`} style={{ width:36, height:36, borderRadius:"50%" }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <label style={{ fontSize:11, fontWeight:700, color:"#666" }}>Full Name</label>
                      <input value={draftProfile.name} onChange={e=>setProfileField("name", e.target.value)} placeholder="Your full name"
                        style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #E8E8E8", borderRadius:9, fontSize:12, color:"#111", fontFamily:"Geist,sans-serif", background:"#fff", outline:"none" }}/>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <label style={{ fontSize:11, fontWeight:700, color:"#666" }}>Email</label>
                      <input type="email" value={draftProfile.email} onChange={e=>setProfileField("email", e.target.value)} placeholder="you@email.com"
                        style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #E8E8E8", borderRadius:9, fontSize:12, color:"#111", fontFamily:"Geist,sans-serif", background:"#fff", outline:"none" }}/>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <label style={{ fontSize:11, fontWeight:700, color:"#666" }}>Phone</label>
                      <input value={draftProfile.phone} onChange={e=>setProfileField("phone", e.target.value)} placeholder="07xx xxx xxx"
                        style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #E8E8E8", borderRadius:9, fontSize:12, color:"#111", fontFamily:"Geist,sans-serif", background:"#fff", outline:"none" }}/>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <label style={{ fontSize:11, fontWeight:700, color:"#666" }}>Avatar URL</label>
                      <input value={draftProfile.avatar} onChange={e=>setProfileField("avatar", e.target.value)} placeholder="https://"
                        style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #E8E8E8", borderRadius:9, fontSize:12, color:"#111", fontFamily:"Geist,sans-serif", background:"#fff", outline:"none" }}/>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ep-card" style={{ borderRadius:16, padding:"20px 22px", display:"flex", flexDirection:"column", gap:14, background:"linear-gradient(160deg,#FFFFFF 0%, #F8FAFC 54%, #EEF4FF 100%)", border:"1px solid #DEE7F5", boxShadow:"0 12px 24px rgba(15,23,42,0.09)" }}>
                <div style={{ padding:"12px 14px", borderRadius:14, background:"linear-gradient(135deg,#0B1220 0%, #111827 52%, #1E3A8A 100%)", boxShadow:"0 14px 26px rgba(15,23,42,0.24)" }}>
                  <div style={{ fontSize:10, fontWeight:800, color:"rgba(191,219,254,0.92)", letterSpacing:"0.12em" }}>UPGRADE CENTER</div>
                  <div style={{ fontSize:18, fontWeight:900, color:"#fff", letterSpacing:"-0.03em", marginTop:4 }}>
                    {nextTier ? `Apply For ${nextTier.name}` : "Top Tier Active"}
                  </div>
                  <div style={{ fontSize:11, color:"rgba(226,232,240,0.92)", marginTop:6, lineHeight:1.5 }}>
                    {settingsNeedsUnlock
                      ? "Complete your first tier deposit to unlock earnings, withdrawals, and all wallet actions."
                      : (nextTier
                        ? `Move from ${t.name} to ${nextTier.name} by paying only the difference.`
                        : "Your account is already on the highest tier.")}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:8, marginTop:10 }}>
                    <div style={{ borderRadius:9, padding:"7px 8px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(148,163,184,0.28)" }}>
                      <div style={{ fontSize:9, fontWeight:800, color:"rgba(191,219,254,0.85)", letterSpacing:"0.08em" }}>CURRENT</div>
                      <div style={{ fontSize:11, fontWeight:900, color:"#fff", marginTop:4 }}>{t.name}</div>
                    </div>
                    <div style={{ borderRadius:9, padding:"7px 8px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(148,163,184,0.28)" }}>
                      <div style={{ fontSize:9, fontWeight:800, color:"rgba(191,219,254,0.85)", letterSpacing:"0.08em" }}>TARGET</div>
                      <div style={{ fontSize:11, fontWeight:900, color:"#fff", marginTop:4 }}>{settingsNeedsUnlock ? t.name : (nextTier ? nextTier.name : "Top Tier")}</div>
                    </div>
                    <div style={{ borderRadius:9, padding:"7px 8px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(148,163,184,0.28)" }}>
                      <div style={{ fontSize:9, fontWeight:800, color:"rgba(191,219,254,0.85)", letterSpacing:"0.08em" }}>TO PAY</div>
                      <div style={{ fontSize:11, fontWeight:900, color:"#fff", marginTop:4 }}>KES {Math.max(settingsUpgradeAmount, 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:10 }}>
                  <div style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:12, padding:"11px 12px" }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"#64748B", letterSpacing:"0.08em" }}>DEPOSIT STATUS</div>
                    <div style={{ fontSize:13, fontWeight:900, color:"#0F172A", marginTop:6 }}>
                      {settingsNeedsUnlock ? "Pending Unlock" : "Unlocked"}
                    </div>
                  </div>
                  <div style={{ background:"#FFFFFF", border:"1px solid #E2E8F0", borderRadius:12, padding:"11px 12px" }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"#64748B", letterSpacing:"0.08em" }}>APPLY STATUS</div>
                    <div style={{ fontSize:13, fontWeight:900, color:"#0F172A", marginTop:6 }}>
                      {nextTier ? "Ready to apply" : "Top tier reached"}
                    </div>
                  </div>
                </div>

                <div style={{ padding:"11px 12px", borderRadius:12, background:"#F8FAFC", border:"1px solid #E2E8F0" }}>
                  <div style={{ fontSize:10, fontWeight:900, color:"#334155", letterSpacing:"0.12em", marginBottom:8 }}>HOW UPGRADE WORKS</div>
                  <div style={{ display:"grid", gap:6 }}>
                    {[
                      settingsNeedsUnlock
                        ? `1. Unlock ${t.name} by paying KES ${currentTierDeposit.toLocaleString()}.`
                        : `1. Apply to move from ${t.name} to ${nextTier ? nextTier.name : "Top Tier"}.`,
                      settingsNeedsUnlock
                        ? "2. Once unlocked, earnings and withdrawals activate immediately."
                        : `2. Pay only the top-up difference: KES ${Math.max(settingsUpgradeAmount, 0).toLocaleString()}.`,
                      "3. Complete checkout and your tier access updates after confirmation."
                    ].map((line, idx) => (
                      <div key={idx} style={{ fontSize:11, color:"#475569", fontWeight:700, lineHeight:1.45 }}>{line}</div>
                    ))}
                  </div>
                </div>

                <div style={{ position:"relative", borderRadius:13, background:"#000", border:"1px solid #171717", overflow:"hidden", display:"grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) 132px", minHeight:isMobile ? 202 : 184 }}>
                  <div style={{ padding:"13px 14px", display:"flex", flexDirection:"column", gap:8, justifyContent:"center", position:"relative", zIndex:2 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:9, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <I n="wallet" s={12} c="#111"/>
                      </div>
                      <div style={{ fontSize:12, fontWeight:900, color:"#fff" }}>Secure Tier Checkout</div>
                    </div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.78)", lineHeight:1.5 }}>
                      {settingsNeedsUnlock
                        ? "This payment unlocks your active tier so you can start earnings and withdrawals."
                        : (nextTier
                          ? "Use this apply action to pay the difference and move to the next tier."
                          : "No extra payment required. You already have full tier access.")}
                    </div>
                    <button
                      type="button"
                      onClick={startSettingsUpgradeCheckout}
                      disabled={!settingsCanUpgradePay || settingsUpgradeBusy || depositCheckBusy}
                      style={{
                        marginTop:3,
                        padding:"10px 12px",
                        borderRadius:9,
                        border:"1px solid rgba(187,247,208,0.72)",
                        background: (!settingsCanUpgradePay || depositCheckBusy)
                          ? "linear-gradient(135deg,#6B7280 0%, #4B5563 100%)"
                          : "linear-gradient(135deg,#22c55e 0%, #16a34a 55%, #15803d 100%)",
                        color:"#ECFDF5",
                        fontSize:12,
                        fontWeight:900,
                        cursor: (!settingsCanUpgradePay || settingsUpgradeBusy || depositCheckBusy) ? "not-allowed" : "pointer",
                        fontFamily:"Geist,sans-serif",
                        boxShadow: (!settingsCanUpgradePay || depositCheckBusy) ? "none" : "0 8px 18px rgba(22,163,74,0.26)"
                      }}>
                      {settingsUpgradeBusy
                        ? "Opening Checkout..."
                        : (!settingsCanUpgradePay
                          ? (nextTier ? "No Payment Needed" : "Top Tier Reached")
                          : (settingsNeedsUnlock
                            ? `Apply & Unlock - KES ${settingsUpgradeAmount.toLocaleString()}`
                            : `Apply For ${nextTier?.name || "Upgrade"} - KES ${settingsUpgradeAmount.toLocaleString()}`))}
                    </button>
                    {settingsUpgradeDone && (
                      <div style={{ fontSize:10, fontWeight:800, color:"#BBF7D0" }}>Application sent. Complete checkout to confirm your tier update.</div>
                    )}
                    {settingsUpgradeError && (
                      <div style={{ fontSize:10, fontWeight:800, color:"#FECACA" }}>{settingsUpgradeError}</div>
                    )}
                  </div>
                  <div style={{ background:"#000", overflow:"hidden", minHeight:isMobile ? 112 : "100%" }}>
                    <img
                      src={LANDING_STICKER_BOTTOM_IMAGE.primary}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => setFallbackSrc(e, LANDING_STICKER_BOTTOM_IMAGE)}
                      style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center right", pointerEvents:"none", userSelect:"none" }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => (onSignOut ? onSignOut() : go("landing"))}
                  style={{
                    marginTop: 4,
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: 10,
                    border: "1.5px solid #FCA5A5",
                    background: "#FFF1F2",
                    color: "#B91C1C",
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                    fontFamily: "Geist,sans-serif",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8
                  }}
                >
                  <I n="logout" s={14} c="#B91C1C" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* "" Mobile bottom nav "" */}
      {isMobile && (
        <nav
          style={{
            position:"fixed",
            left:"50%",
            bottom:"calc(14px + env(safe-area-inset-bottom, 0px))",
            transform:"translateX(-50%)",
            width:"calc(100% - 22px)",
            maxWidth:460,
            padding:"8px",
            borderRadius:999,
            background:"linear-gradient(180deg,#111827 0%, #020617 100%)",
            border:"1px solid rgba(148,163,184,0.34)",
            display:"flex",
            alignItems:"center",
            justifyContent:"space-between",
            gap:8,
            zIndex:150,
            boxShadow:"0 16px 28px rgba(2,6,23,0.42), 0 6px 10px rgba(2,6,23,0.32)",
            backdropFilter:"blur(10px)"
          }}>
          {navItems.filter(n=>["overview","videos","referrals","withdraw","settings"].includes(n.id)).map(({id,ic,label}) => {
            const active = tab===id;
            const isReferral = id==="referrals";
            const expandedWidth = active
              ? (isReferral ? (isTiny ? 126 : 146) : (isTiny ? 112 : 132))
              : (isReferral ? 52 : 44);
            const baseBg = active
              ? (isReferral ? "linear-gradient(135deg,#F59E0B 0%, #F97316 55%, #EA580C 100%)" : "#F8FAFC")
              : (isReferral ? "linear-gradient(135deg,rgba(245,158,11,0.96) 0%, rgba(249,115,22,0.96) 100%)" : "rgba(248,250,252,0.98)");
            const baseColor = isReferral ? "#FFFFFF" : (active ? "#0F172A" : "#111827");
            return (
              <button key={id} onClick={()=>{setTab(id); setOpen(false);}}
                style={{
                  height:isReferral ? 46 : 44,
                  width:expandedWidth,
                  minWidth:44,
                  border:"none",
                  borderRadius:999,
                  cursor:"pointer",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  gap:active ? 8 : 0,
                  padding:active ? "0 14px 0 12px" : 0,
                  background:baseBg,
                  color:baseColor,
                  boxShadow:isReferral
                    ? (active
                      ? "0 10px 20px rgba(249,115,22,0.46), 0 0 0 1px rgba(255,237,213,0.52) inset"
                      : "0 8px 16px rgba(249,115,22,0.38), 0 0 0 1px rgba(255,237,213,0.32) inset")
                    : (active ? "0 8px 14px rgba(15,23,42,0.25)" : "0 3px 8px rgba(2,6,23,0.26)"),
                  transform:isReferral ? (active ? "translateY(-2px)" : "translateY(-1px)") : (active ? "translateY(-1px)" : "translateY(0)"),
                  transition:"all .24s cubic-bezier(.4,0,.2,1)",
                  fontFamily:"IBM Plex Sans, Geist, sans-serif",
                  flexShrink:0,
                  position:"relative"
                }}>
                {isReferral && !active && (
                  <span style={{ position:"absolute",top:6,right:7,width:7,height:7,borderRadius:"50%",background:"#FDE68A",boxShadow:"0 0 0 4px rgba(254,243,199,0.18)" }} />
                )}
                <I n={ic} s={active ? 18 : 17} c={baseColor}/>
                {active && (
                  <span style={{ fontSize:13, fontWeight:800, whiteSpace:"nowrap", letterSpacing:"0.01em", color:baseColor }}>
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

    </div>
  );
    }

/* "" REFERRAL MINI CARD (shown in overview) "" */
function ReferralMiniCard({ t, data, frame, refCode, compact }) {
  const [copied, setCopied] = useState(false);
  const safeCode = normalizeRefCode(refCode) || makeRefCode(t.tag || t.name || "EDISONPAY");
  const link = `${getBaseUrl()}/?ref=${safeCode}`;
  const copy = () => { try { navigator.clipboard?.writeText(link); } catch(e){} setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const baseRefs = [
    { name:"John M.", bonus: t.deposit*.1, status:"Active", when:"2d ago" },
    { name:"Amina K.", bonus: t.deposit*.1, status:"Active", when:"5d ago" },
    { name:"Peter O.", bonus: t.deposit*.1, status:"Pending", when:"1w ago" },
  ];
  const mapRef = (r, i) => {
    const name = r.name || r.full_name || r.user || `User ${i+1}`;
    const first = name.split(" ").filter(Boolean)[0] || name;
    const init = (r.init || name.split(" ").map(n=>n[0]).join("").slice(0,2)).toUpperCase();
    const rawStatus = String(r.status || "Pending");
    const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
    const rawBonus = Number(r.bonus ?? r.ref_bonus);
    const bonus = Number.isFinite(rawBonus) ? rawBonus : t.deposit * 0.1;
    return { name, first, init, status, bonus, when: r.when || r.date || r.created_at || "" };
  };
  const refList = Array.isArray(data) && data.length ? data.map(mapRef) : baseRefs.map(mapRef);
  const referrals = refList.slice(0,4);
  const earned = refList.filter(r=>r.status==="Active").reduce((sum,r)=>sum + (Number.isFinite(r.bonus)?r.bonus:0),0);
  const activeCount = refList.filter(r=>r.status==="Active").length;
  const pendingCount = refList.filter(r=>r.status!=="Active").length;
  const showTracking = !compact;

  return (
    <div className={`${frame ? "ep-frame-dark " : ""}ep-referral-mini`} style={{ background:"#fff", borderRadius:16, border:"1px solid #111", boxShadow:`0 10px 24px rgba(0,0,0,0.08)`, overflow:"hidden" }}>
      {/* Header stripe */}
      <div style={{ background:`linear-gradient(135deg, #0D1B36 0%, ${t.acc}DD 100%)`, padding:"18px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <I n="gift" s={18} c="#fff"/>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:900, color:"#fff", letterSpacing:"-0.02em" }}>Your Referral Link</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:2 }}>Earn 10% of every deposit your friends make</div>
          </div>
        </div>
        <div className="ep-referral-mini-header-stats" style={{ display:"flex", gap:20 }}>
          {[[`${refList.length}`,"Referrals"],[`KES ${earned.toLocaleString()}`,"Total Earned"],["10%","Your Bonus"]].map(([v,l],i) => (
            <div key={i} style={{ textAlign:"right" }}>
              <div style={{ fontSize:16, fontWeight:900, color:"#fff", letterSpacing:"-0.03em" }}>{v}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", fontWeight:600, letterSpacing:"0.06em" }}>{l.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:0 }}>
        {/* Link + copy */}
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #F0F0F0", display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <I n="link" s={14} c={t.acc}/>
            <span style={{ fontSize:10, fontWeight:800, color:"#64748B", letterSpacing:"0.14em" }}>YOUR LINK</span>
          </div>
          <a href={link} style={{ fontSize:12, fontWeight:800, color:"#111", textDecoration:"none", border:"1px solid #E2E8F0", borderRadius:10, padding:"8px 10px", background:"#F8FAFC", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {link}
          </a>
          <div className="ep-referral-mini-actions" style={{ display:"flex", gap:8 }}>
            <button onClick={copy} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", background: copied?"#ECFDF5":"#111", color: copied?"#059669":"#fff", border:"none", borderRadius:8, fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"Geist,sans-serif", transition:"all .2s", whiteSpace:"nowrap" }}>
              <I n={copied?"check":"copy"} s={12} c={copied?"#059669":"#fff"}/> {copied?"Copied!":"Copy"}
            </button>
            <a href={link} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", background:"#fff", color:"#111", border:"1px solid #111", borderRadius:8, fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"Geist,sans-serif", textDecoration:"none" }}>
              Open Signup
            </a>
          </div>
        </div>

        {/* Recent 3 referrals inline */}
        <div style={{ padding:"14px 20px", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
          {referrals.map((r,i) => (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:r.status==="Active"?t.lgt:"#F5F5F5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:r.status==="Active"?t.acc:"#BBB", border:`1.5px solid ${r.status==="Active"?t.mid:"#E8E8E8"}` }}>{r.name[0]}</div>
              <div style={{ fontSize:9, fontWeight:700, color:"#555", whiteSpace:"nowrap" }}>{r.first}</div>
            </div>
          ))}
          <div style={{ paddingLeft:8, borderLeft:"1px solid #F0F0F0" }}>
            <div style={{ fontSize:11, fontWeight:800, color:t.acc, cursor:"pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:4 }}>
              View all <I n="chevR" s={11} c={t.acc}/>
            </div>
          </div>
        </div>
      </div>

      {showTracking && (
        <div style={{ padding:"14px 18px 18px", background:"#FBFBFB", borderTop:"1px solid #F0F0F0" }}>
          <div style={{ fontSize:10, fontWeight:900, letterSpacing:"0.14em", color:"#94A3B8", marginBottom:10 }}>REFERRAL TRACKING</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10 }}>
            {[
              [`${refList.length}`,"Tracked"],
              [`${activeCount}`,"Active"],
              [`${pendingCount}`,"Pending"],
              [`KES ${earned.toLocaleString()}`,"Rewards"],
            ].map(([v,l],i)=>(
              <div key={i} style={{ padding:"10px 12px", background:"#fff", borderRadius:12, border:"1px solid #111" }}>
                <div style={{ fontSize:12, fontWeight:900, color:"#111", letterSpacing:"-0.02em" }}>{v}</div>
                <div style={{ fontSize:10, color:"#94A3B8", marginTop:4, letterSpacing:"0.08em" }}>{l.toUpperCase()}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:10, fontSize:11, color:"#64748B", fontWeight:600 }}>
            Every signup through your link is traced and rewarded automatically.
          </div>
        </div>
      )}
    </div>
  );
    }

/* "" OVERVIEW "" */
function OverviewContent({ t, earn, goal, pct, balance, joinCardLabel, setTab, isMobile, activityData, referralData, refCode, goDeposit, stripHidden, mediaEager, dashboardSummary }) {
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const todayIdx = (new Date().getDay() + 6) % 7;
  const dailyEarn = useMemo(() => getTierDailyTotal(t), [t]);
  const activeDisplayCurrency = normalizeDisplayCurrency(getActiveDisplayCurrency());
  const formatOverviewMoney = useCallback((amountKes) => {
    const useUsd = activeDisplayCurrency === DISPLAY_CURRENCIES.USD;
    const formatted = formatMoney(amountKes, {
      currency: activeDisplayCurrency,
      minFractionDigits: useUsd ? 2 : 0,
      maxFractionDigits: useUsd ? 2 : 0
    });
    return useUsd ? formatted : formatted.replace(/^KES\s+/i, "KSH ");
  }, [activeDisplayCurrency]);
  const summary = dashboardSummary && typeof dashboardSummary === "object" ? dashboardSummary : {};
  const summaryDepositsCount = Number(summary.total_deposits_count);
  const summaryWithdrawalsCount = Number(summary.total_withdrawals_count);
  const summaryPendingWithdrawalsCount = Number(summary.pending_withdrawals_count);
  const summaryTransactionsCount = Number(summary.total_transactions_count);
  const summaryVideoEarnings = Number(summary.video_earnings_total);
  const summaryReferralEarnings = Number(summary.referral_earnings_total);
  const summaryReferralCount = Number(summary.referral_count);
  const summaryActiveReferralCount = Number(summary.active_referral_count);
  const summaryTierUpgradeCount = Number(summary.tier_upgrade_count);
  const summaryProgressPct = Number(summary.progress_percent);

  const depositsLabel = Number.isFinite(summaryDepositsCount) ? `${summaryDepositsCount} total` : "-";
  const withdrawalsLabel = Number.isFinite(summaryWithdrawalsCount)
    ? `${summaryWithdrawalsCount} total${Number.isFinite(summaryPendingWithdrawalsCount) && summaryPendingWithdrawalsCount > 0 ? ` (${summaryPendingWithdrawalsCount} pending)` : ""}`
    : "-";
  const transactionsLabel = Number.isFinite(summaryTransactionsCount)
    ? `${summaryTransactionsCount} records`
    : (Array.isArray(activityData) ? `${activityData.length} records` : "-");
  const videoEarningsLabel = `KES ${Math.max(0, Number.isFinite(summaryVideoEarnings) ? summaryVideoEarnings : 0).toLocaleString()}`;
  const referralEarningsLabel = `KES ${Math.max(0, Number.isFinite(summaryReferralEarnings) ? summaryReferralEarnings : 0).toLocaleString()}`;
  const referralsLabel = Number.isFinite(summaryReferralCount)
    ? `${summaryReferralCount} total${Number.isFinite(summaryActiveReferralCount) ? ` (${summaryActiveReferralCount} active)` : ""}`
    : `${Array.isArray(referralData) ? referralData.length : 0} total`;
  const upgradesLabel = Number.isFinite(summaryTierUpgradeCount) ? `${summaryTierUpgradeCount}` : "0";
  const progressSummaryLabel = `${Number.isFinite(summaryProgressPct) ? Math.max(0, Math.round(summaryProgressPct)) : Math.max(0, Math.round(pct))}%`;

  const parseKesAmountFromText = useCallback((...parts) => {
    const text = parts
      .map((p) => String(p || ""))
      .join(" ")
      .trim();
    if (!text) return NaN;
    const match = text.match(/([+-]?)\s*(?:KES|KSH)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
    if (!match) return NaN;
    const raw = Number(String(match[2]).replace(/,/g, ""));
    if (!Number.isFinite(raw)) return NaN;
    return match[1] === "-" ? -raw : raw;
  }, []);

  const resolveTxDirection = useCallback((tx) => {
    const raw = Number(tx?.amt ?? tx?.amount ?? tx?.amount_kes ?? tx?.value);
    if (Number.isFinite(raw) && raw < 0) return -1;
    const type = String(tx?.type || tx?.category || tx?.kind || "").toLowerCase();
    const text = `${String(tx?.text || tx?.title || "")} ${String(tx?.sub || "")}`.toLowerCase();
    const icon = String(tx?.ic || "").toLowerCase();
    if (type.includes("withdraw") || text.includes("withdraw") || text.includes("payout") || icon === "up") return -1;
    if (type.includes("deposit") || text.includes("deposit") || icon === "wallet") return 1;
    if (type.includes("earn") || type.includes("referral") || type.includes("ref_bonus") || type.includes("bonus") || text.includes("earn") || text.includes("referral") || text.includes("bonus") || icon === "play" || icon === "activity" || icon === "gift" || icon === "users") return 1;
    return Number.isFinite(raw) && raw > 0 ? 1 : 0;
  }, []);

  const readTxAmountKes = useCallback((tx, opts = {}) => {
    const { absolute = false } = opts || {};
    const raw = Number(tx?.amt ?? tx?.amount ?? tx?.amount_kes ?? tx?.value ?? tx?.bonus ?? tx?.bonus_amount ?? tx?.earnings);
    let amount = Number.isFinite(raw) ? raw : parseKesAmountFromText(tx?.sub, tx?.text, tx?.title, tx?.note);
    if (!Number.isFinite(amount)) return NaN;
    const direction = resolveTxDirection(tx);
    if (direction < 0) amount = -Math.abs(amount);
    else if (direction > 0) amount = Math.abs(amount);
    return absolute ? Math.abs(amount) : amount;
  }, [parseKesAmountFromText, resolveTxDirection]);

  const isEarningTx = useCallback((tx) => {
    const type = String(tx?.type || tx?.category || tx?.kind || "").toLowerCase();
    const text = String(tx?.text || tx?.title || "").toLowerCase();
    const ic = String(tx?.ic || "").toLowerCase();

    if (type.includes("withdraw") || type.includes("deposit")) return false;
    if (text.includes("withdraw") || text.includes("deposit")) return false;

    if (type.includes("earn") || type.includes("referral") || type.includes("ref_bonus") || type.includes("bonus") || type.includes("signup")) return true;
    if (text.includes("earn") || text.includes("referral") || text.includes("bonus") || text.includes("signup")) return true;

    return ic === "play" || ic === "activity" || ic === "gift" || ic === "users";
  }, []);

  const isReferralTx = useCallback((tx) => {
    const type = String(tx?.type || tx?.category || tx?.kind || "").toLowerCase();
    const text = String(tx?.text || tx?.title || "").toLowerCase();
    const ic = String(tx?.ic || "").toLowerCase();
    return type.includes("referral") || type.includes("ref_bonus") || type.includes("ref bonus") || text.includes("referral") || text.includes("signup") || text.includes("bonus") || ic === "gift" || ic === "users";
  }, []);

  const txColorFor = useCallback((tx) => {
    const provided = String(tx?.c || tx?.color || "").trim();
    if (provided) return provided;
    const type = String(tx?.type || tx?.category || tx?.kind || "").toLowerCase();
    const text = `${String(tx?.text || tx?.title || "")} ${String(tx?.sub || "")}`.toLowerCase();
    if (type.includes("withdraw") || text.includes("withdraw")) return "#E8820C";
    if (type.includes("referral") || text.includes("referral")) return "#0066FF";
    if (type.includes("video") || type.includes("bonus") || text.includes("video") || text.includes("bonus")) return "#059669";
    return t.acc;
  }, [t.acc]);

  const txIconFor = useCallback((tx) => {
    const provided = String(tx?.ic || "").trim();
    if (provided) return provided;
    const type = String(tx?.type || tx?.category || tx?.kind || "").toLowerCase();
    const text = `${String(tx?.text || tx?.title || "")} ${String(tx?.sub || "")}`.toLowerCase();
    if (type.includes("withdraw") || text.includes("withdraw")) return "up";
    if (type.includes("referral") || text.includes("referral")) return "gift";
    if (type.includes("video") || type.includes("bonus") || text.includes("video") || text.includes("bonus")) return "play";
    return "wallet";
  }, []);

  const txTimeFor = useCallback((tx) => {
    if (tx?.time) return String(tx.time);
    const rawDate = tx?.created_at || tx?.date || tx?.timestamp;
    if (!rawDate) return "-";
    const dt = new Date(rawDate);
    if (Number.isNaN(dt.getTime())) return String(rawDate);
    return dt.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  }, []);

  const activity = useMemo(() => {
    const baseRows = Array.isArray(activityData) ? [...activityData] : [];
    const hasReferralTx = baseRows.some((tx) => isReferralTx(tx));
    if (!hasReferralTx && Array.isArray(referralData) && referralData.length) {
      referralData.forEach((r, i) => {
        const bonusRaw = Number(r?.bonus ?? r?.ref_bonus ?? r?.bonus_amount ?? r?.amount ?? r?.earnings ?? 0);
        if (!Number.isFinite(bonusRaw) || bonusRaw <= 0) return;
        const status = String(r?.status || "").toLowerCase();
        if (status && (status.includes("pending") || status.includes("failed") || status.includes("inactive"))) return;
        const refName = String(r?.name || r?.full_name || r?.user || `Referral ${i + 1}`).trim();
        const firstName = refName.split(" ").filter(Boolean)[0] || refName;
        baseRows.push({
          type: "referral_bonus",
          ic: "gift",
          text: `Referral bonus from ${firstName}`,
          sub: `KES ${Math.round(bonusRaw).toLocaleString()} credited`,
          amount: Math.round(bonusRaw),
          created_at: r?.created_at || r?.date || null,
          time: r?.date || ""
        });
      });
    }
    if (!baseRows.length) return [];
    const rows = baseRows.map((tx, i) => {
      const amount = readTxAmountKes(tx);
      const rawDate = tx?.created_at || tx?.date || tx?.timestamp || "";
      const dt = rawDate ? new Date(rawDate) : null;
      const ts = dt && !Number.isNaN(dt.getTime()) ? dt.getTime() : null;
      return {
        ...tx,
        key: String(tx?.id || tx?.transaction_id || tx?.tx_id || `${tx?.time || tx?.text || "tx"}_${i}`),
        ic: txIconFor(tx),
        c: txColorFor(tx),
        text: tx?.text || tx?.title || (tx?.type ? `${tx.type} activity` : "Transaction"),
        sub: tx?.sub || tx?.method || tx?.note || "Processed",
        time: txTimeFor(tx),
        amt: Number.isFinite(amount) ? amount : null,
        _ts: ts
      };
    });
    return rows.sort((a, b) => {
      if (Number.isFinite(a._ts) && Number.isFinite(b._ts)) return b._ts - a._ts;
      if (Number.isFinite(a._ts)) return -1;
      if (Number.isFinite(b._ts)) return 1;
      return 0;
    });
  }, [activityData, referralData, isReferralTx, readTxAmountKes, txColorFor, txIconFor, txTimeFor]);

  const referralBonusTotal = useMemo(() => {
    if (!Array.isArray(referralData)) return 0;
    return referralData.reduce((sum, r) => {
      const raw = Number(r?.bonus ?? r?.ref_bonus ?? r?.bonus_amount ?? r?.amount ?? r?.earnings ?? 0);
      if (!Number.isFinite(raw) || raw <= 0) return sum;
      const status = String(r?.status || "").toLowerCase();
      if (status && status !== "active") return sum;
      return sum + raw;
    }, 0);
  }, [referralData]);

  const activityHasReferralAmount = useMemo(() => {
    if (!Array.isArray(activity) || activity.length === 0) return false;
    return activity.some((tx) => {
      if (!isReferralTx(tx)) return false;
      const amt = readTxAmountKes(tx, { absolute: true });
      return Number.isFinite(amt) && amt > 0;
    });
  }, [activity, isReferralTx, readTxAmountKes]);

  const activityEarnTotal = useMemo(() => {
    if (!Array.isArray(activity) || activity.length === 0) return 0;
    return activity.reduce((sum, tx) => {
      if (!isEarningTx(tx)) return sum;
      const amt = readTxAmountKes(tx, { absolute: true });
      return Number.isFinite(amt) && amt > 0 ? sum + amt : sum;
    }, 0);
  }, [activity, isEarningTx, readTxAmountKes]);

  const actualEarnTotal = useMemo(() => {
    const refAdd = activityHasReferralAmount ? 0 : referralBonusTotal;
    return activityEarnTotal + refAdd;
  }, [activityEarnTotal, referralBonusTotal, activityHasReferralAmount]);

  const incomeTotal = useMemo(() => {
    if (actualEarnTotal > 0) return actualEarnTotal;
    const liveEarn = Number(earn);
    return Number.isFinite(liveEarn) && liveEarn > 0 ? liveEarn : 0;
  }, [actualEarnTotal, earn]);

  const remainingEarn = useMemo(() => Math.max(goal - incomeTotal, 0), [goal, incomeTotal]);

  const weekData = useMemo(() => {
    const start = new Date();
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const buckets = days.map(d => ({ d, v: 0 }));
    if (!Array.isArray(activity) || activity.length === 0) return buckets;

    activity.forEach((tx) => {
      if (!isEarningTx(tx)) return;
      const amt = readTxAmountKes(tx, { absolute: true });
      if (!Number.isFinite(amt) || amt <= 0) return;
      const rawDate = tx?.created_at || tx?.date || tx?.timestamp;
      if (!rawDate) return;
      const dt = new Date(rawDate);
      if (Number.isNaN(dt.getTime())) return;
      if (dt < start || dt >= end) return;
      const idx = Math.floor((dt - start) / 86400000);
      if (idx >= 0 && idx < 7) buckets[idx].v += amt;
    });

    return buckets;
  }, [activity, isEarningTx, readTxAmountKes]);

  const maxV = useMemo(() => Math.max(...weekData.map(x=>x.v), 0), [weekData]);
  const daysLeft = useMemo(() => {
    if (dailyEarn <= 0) return 0;
    return Math.max(0, Math.ceil((goal - incomeTotal) / dailyEarn));
  }, [goal, incomeTotal, dailyEarn]);
  const canW = ["Tuesday","Friday"].includes(new Date().toLocaleDateString("en-US",{weekday:"long"}));
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const curMonth = new Date().getMonth();
  const [activeMonth, setActiveMonth] = useState(curMonth);
  const planSymbols = useMemo(
    () => (isMobile ? LIVE_SYMBOLS.slice(0,5) : LIVE_SYMBOLS.slice(0,7)).map(s => ({
      ...s,
      size: Math.max(12, Math.round(s.size * 0.7)),
      dur: (s.dur || 22) + 6
    })),
    [isMobile]
  );

  const defaultReferrals = useMemo(() => ([
    { name:"John M.", init:"JM", status:"Active" },
    { name:"Amina K.", init:"AK", status:"Active" },
    { name:"Peter O.", init:"PO", status:"Pending" },
    { name:"Grace W.", init:"GW", status:"Active" },
  ]), []);
  const referrals = useMemo(
    () => (Array.isArray(referralData) ? referralData : defaultReferrals),
    [referralData, defaultReferrals]
  );
  const txAmountLabel = useCallback((tx) => {
    const amt = Number(tx?.amt);
    if (!Number.isFinite(amt) || amt === 0) return "KES 0";
    return `${amt < 0 ? "-" : "+"}KES ${Math.abs(amt).toLocaleString()}`;
  }, []);
  const txAmountColor = useCallback((tx) => {
    const amt = Number(tx?.amt);
    if (!Number.isFinite(amt) || amt === 0) return tx?.c || "#334155";
    if (amt < 0) return "#DC2626";
    if (isReferralTx(tx)) return "#0066FF";
    return "#059669";
  }, [isReferralTx]);

  const [openSections, setOpenSections] = useState({
    income: true,
    transactions: false,
    referrals: false,
    mix: false,
    summary: false
  });

  const toggleSection = (id) => setOpenSections(s => ({ ...s, [id]: !s[id] }));
  const [deskOpen, setDeskOpen] = useState({ tx: true, mix: false, summary: false });
  const toggleDesk = (id) => setDeskOpen(s => ({ ...s, [id]: !s[id] }));

  const MobileSection = ({ id, title, children }) => {
    const open = !!openSections[id];
    return (
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", overflow:"hidden" }}>
        <button onClick={() => toggleSection(id)}
          style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"transparent", border:"none", cursor:"pointer", fontFamily:"Geist,sans-serif" }}>
          <span style={{ fontSize:13, fontWeight:800, color:"#111" }}>{title}</span>
          <div style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition:"transform .15s" }}>
            <I n="chevR" s={12} c="#999"/>
          </div>
        </button>
        {open && <div style={{ padding:"0 14px 14px" }}>{children}</div>}
      </div>
    );
  };

  const [actionsOpen, setActionsOpen] = useState(false);
  const nextTier = TIERS[t.id]; // next in list (t.id is 1-based)
  const canUpgrade = !!nextTier;
  const hasTierGlare = t.name === "Regular" || t.name === "Standard" || t.name === "Executive";
  const tierGlareTone = t.name === "Executive" ? "rgba(255,228,140,0.85)" : "rgba(255,255,255,0.85)";
  const upgradeBtnActive = {
    background:"linear-gradient(180deg,#FDE047 0%, #F59E0B 45%, #F97316 100%)",
    border:"2px solid #111",
    color:"#111",
    boxShadow:"0 6px 0 #111, 0 14px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.65)"
  };
  const upgradeBtnDisabled = {
    background:"#E5E7EB",
    border:"2px solid #9CA3AF",
    color:"#6B7280",
    boxShadow:"none"
  };
  const showOverviewMedia = !isMobile || mediaEager;
  const reducePlanMotion = !isMobile;
  const showPlanVideo = Boolean(PLAN_BG_VIDEO && showOverviewMedia && !reducePlanMotion);
  const showPlanAmbient = showOverviewMedia && !reducePlanMotion;
  const planActionsCard = (
    <div className="ep-frame-light" style={{ background:reducePlanMotion ? "linear-gradient(135deg,#F1F5F9 0%, #EFF6FF 52%, #F8FAFC 100%)" : "transparent", borderRadius:16, padding:"18px 20px", border:"1px solid #111", borderTopWidth:1, boxShadow:"0 6px 0 #111, 0 18px 30px rgba(0,0,0,0.22)", minHeight:230, position:"relative", overflow:"hidden" }}>
      {showPlanVideo && (
        <LazyVideo
          src={PLAN_BG_VIDEO}
          fallbackSrc={PLAN_BG_VIDEO_FALLBACK}
          autoPlay
          muted
          loop
          playsInline
          eager={showOverviewMedia}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity:0.78, filter:"saturate(1.15) contrast(1.08)", zIndex:0 }}
        />
      )}
      {showPlanAmbient && <LiveMathBackground tone="light" symbols={planSymbols} opacity={0.2} zIndex={1} />}
      <div style={{ position:"relative", zIndex:2 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:22, height:22, borderRadius:6, background:"#111", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <I n="lock" s={12} c="#fff"/>
              </div>
              <div style={{ fontSize:13, fontWeight:900, color:"#111" }}>Plan & Actions</div>
            </div>
            <div style={{ fontSize:11, color:"rgba(17,17,17,0.6)", marginTop:4, fontWeight:700 }}>{t.id} of 5 Tiers  -  Secured</div>
          </div>
          <BrandMark size={26} />
        </div>
        <div
          className={hasTierGlare && !reducePlanMotion ? "ep-tier-glare" : undefined}
          style={{ borderRadius:12, background:`linear-gradient(135deg, ${t.acc} 0%, ${t.acc}CC 100%)`, padding:"16px 14px", position:"relative", overflow:"hidden", border:"1.5px solid #111", boxShadow:"0 4px 0 rgba(0,0,0,0.25)", ...(hasTierGlare && !reducePlanMotion ? {"--glare": tierGlareTone} : {}) }}>
          <div style={{ fontSize:12, fontWeight:900, color:"rgba(255,255,255,0.9)", letterSpacing:"0.15em", marginBottom:10 }}>{t.name.toUpperCase()}</div>
          <div style={{ fontSize:20, fontWeight:900, color:"#fff", letterSpacing:"-0.04em", marginBottom:6 }}>KES {earn.toLocaleString()}</div>
          <div style={{ marginBottom:10, display:"flex", flexDirection:"column", gap:4 }}>
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.55)", letterSpacing:"0.18em" }}>ACCOUNT NO.</span>
            <span style={{ fontSize:12, fontWeight:800, color:"rgba(255,255,255,0.95)", letterSpacing:"0.16em", fontFamily:"IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              {joinCardLabel}
            </span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Deposit<br/><span style={{ color:"rgba(255,255,255,0.8)", fontWeight:700 }}>{formatOverviewMoney(t.deposit)}</span></div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", textAlign:"right" }}>Weekly Target<br/><span style={{ color:"rgba(255,255,255,0.8)", fontWeight:700 }}>{formatOverviewMoney(goal)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
  const accountGoalCard = (
    <div className="ep-frame-dark" style={{ background:"#0B0B0B", borderRadius:18, padding:"16px 16px 14px", border:"1px solid #111", position:"relative", overflow:"hidden" }}>
      {ACCOUNT_GOAL_VIDEO && showOverviewMedia && (
        <LazyVideo
          src={ACCOUNT_GOAL_VIDEO}
          fallbackSrc={ACCOUNT_GOAL_VIDEO_FALLBACK}
          autoPlay
          muted
          loop
          playsInline
          eager={showOverviewMedia}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity:0.55, filter:"saturate(1.05) contrast(1.08)", zIndex:0 }}
        />
      )}
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(160deg, rgba(5,7,12,0.7) 0%, rgba(5,7,12,0.4) 100%)", zIndex:1 }} />

      <div style={{ position:"relative", zIndex:2 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.12em", color:"#E2E8F0" }}>ACCOUNT + GOAL</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 8px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:99 }}>
            <I n="shield" s={10} c="#E2E8F0"/>
            <span style={{ fontSize:9, fontWeight:800, color:"#E2E8F0" }}>SECURE</span>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.16)", borderRadius:12, padding:"10px 12px", backdropFilter:"blur(6px)" }}>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.65)", fontWeight:800, letterSpacing:"0.1em", marginBottom:6 }}>ACCOUNT</div>
            <div style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.03em", color:"#fff" }}>KES {balance.toLocaleString()}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.65)", marginTop:4 }}>{t.name} Tier</div>
          </div>
          <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.16)", borderRadius:12, padding:"10px 12px", display:"flex", flexDirection:"column", justifyContent:"space-between", backdropFilter:"blur(6px)" }}>
            <div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.65)", fontWeight:800, letterSpacing:"0.1em", marginBottom:6 }}>GOAL</div>
              <div style={{ fontSize:16, fontWeight:900, letterSpacing:"-0.03em", color:"#fff" }}>KES {goal.toLocaleString()}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.65)", marginTop:4 }}>{pct}% complete</div>
            </div>
            <div style={{ height:6, background:"rgba(255,255,255,0.15)", borderRadius:99, overflow:"hidden", marginTop:10 }}>
              <div style={{ height:"100%", width:`${pct}%`, background:"#22C55E", borderRadius:99 }}/>
            </div>
          </div>
        </div>

        <div className="ep-frame-light" style={{ background:"rgba(0,0,0,0.6)", borderRadius:14, padding:"12px 14px", marginTop:12, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, border:"1px solid rgba(255,255,255,0.12)" }}>
          <div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.55)", fontWeight:800, letterSpacing:"0.12em" }}>NEXT TIER</div>
            <div style={{ fontSize:14, fontWeight:900, color:"#fff", letterSpacing:"-0.02em" }}>{nextTier ? nextTier.name : "Max Tier"}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.55)", marginTop:2 }}>
              {nextTier ? "Upgrade available anytime" : "You're already at the top"}
            </div>
          </div>
        <button onClick={()=>{ if (canUpgrade) (goDeposit ? goDeposit(true) : setTab("withdraw")); }} disabled={!canUpgrade}
          style={{ padding:"8px 12px", borderRadius:10, fontSize:11, fontWeight:900, cursor: canUpgrade ? "pointer" : "not-allowed", fontFamily:"IBM Plex Sans, Geist, sans-serif", ...(canUpgrade ? upgradeBtnActive : upgradeBtnDisabled) }}>
          {nextTier ? "Upgrade" : "Max Tier"}
        </button>
        </div>

        <div style={{ marginTop:8, fontSize:11, color:"rgba(255,255,255,0.6)" }}>Deposit and watch promotional videos to earn daily rewards.</div>
      </div>
    </div>
  );
  const mobileActions = (
    <div style={{ background:"#fff", borderRadius:12, border:"1px solid #E8E8E8", overflow:"hidden" }}>
      <button onClick={()=>setActionsOpen(o=>!o)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"#F8FAFC", border:"none", cursor:"pointer", fontFamily:"Geist,sans-serif" }}>
        <span style={{ fontSize:11, fontWeight:800, letterSpacing:"0.08em", color:"#64748B" }}>PULL DOWN FOR ACTIONS</span>
        <div style={{ transform: actionsOpen ? "rotate(-90deg)" : "rotate(90deg)", transition:"transform .2s" }}>
          <I n="chevR" s={12} c="#94A3B8"/>
        </div>
      </button>
      <div style={{ maxHeight: actionsOpen ? 140 : 0, overflow:"hidden", transition:"max-height .25s ease" }}>
        <div style={{ padding:"12px 14px", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          <button onClick={()=>setTab("videos")} style={{ padding:"10px 0", background:"#111", color:"#fff", border:"none", borderRadius:10, fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"IBM Plex Sans, Geist, sans-serif" }}>
            Watch
          </button>
          <button onClick={()=>setTab("withdraw")} style={{ padding:"10px 0", background:"#fff", color:"#111", border:"1px solid #E8E8E8", borderRadius:10, fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"IBM Plex Sans, Geist, sans-serif" }}>
            Withdraw
          </button>
          <button onClick={()=>goDeposit(false)} style={{ padding:"10px 0", background:"linear-gradient(180deg,#FDE68A 0%, #F59E0B 100%)", color:"#111", border:"1px solid #111", borderRadius:10, fontSize:11, fontWeight:900, cursor:"pointer", fontFamily:"IBM Plex Sans, Geist, sans-serif" }}>
            Deposit
          </button>
        </div>
      </div>
    </div>
  );
  const mobilePlan = (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {planActionsCard}

      <div className="ep-card" style={{ borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:canW?"#ECFDF5":"#FFF5F5", border:`1.5px solid ${canW?"#A7F3D0":"#FCA5A5"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <I n="wallet" s={14} c={canW?"#059669":"#EF4444"}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:800, color:"#111" }}>Withdrawal Window</div>
          <div style={{ fontSize:11, color:canW?"#059669":"#EF4444", fontWeight:700, marginTop:2 }}>
            {canW ? "Processing 08:30 - 17:30" : "Queued for next Tue/Fri"}
          </div>
        </div>
        {canW && <div style={{ width:7, height:7, borderRadius:"50%", background:"#059669", animation:"pulse 2s infinite", flexShrink:0 }}/>}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {mobilePlan}
        {mobileActions}
        {accountGoalCard}

        <MobileSection id="income" title="Income">
          <div className="ep-card" style={{ borderRadius:18, padding:"18px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
              <div>
                <div style={{ fontSize:11, color:"#AAA", fontWeight:700, letterSpacing:"0.06em", marginBottom:4 }}>INCOME</div>
                <div style={{ fontSize:22, fontWeight:900, color:"#111", letterSpacing:"-0.04em", lineHeight:1 }}>
                  <AnimNum target={incomeTotal} prefix="KES "/>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:6 }}>
                  <div style={{ width:18, height:18, borderRadius:5, background:`${t.acc}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <I n="trendUp" s={10} c={t.acc}/>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:t.acc }}>+28% this month</span>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", background:"#F7F7F7", border:"1px solid #EBEBEB", borderRadius:9, fontSize:11, color:"#888", fontWeight:600, cursor:"pointer" }}>
                30 days <I n="chevR" s={10} c="#CCC"/>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100, marginTop:18, paddingBottom:18, position:"relative" }}>
              {[0.25,0.5,0.75,1].map(p=>(
                <div key={p} style={{ position:"absolute", left:0, right:0, bottom:`${p*100}%`, height:1, background:"#F5F5F5", marginBottom:18 }}/>
              ))}
              {weekData.map((b,i)=> {
                const h = maxV > 0 ? (b.v / maxV) * 100 : 0;
                const isToday = i === todayIdx;
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, zIndex:1 }}>
                    <div style={{ width:"100%", height:h, background: isToday ? t.acc : `${t.acc}40`, borderRadius:"6px 6px 0 0", position:"relative", overflow:"hidden", transition:"height .8s ease" }} />
                    <div style={{ fontSize:9, color:isToday?"#111":"#CCC", fontWeight:isToday?800:500 }}>{b.d}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </MobileSection>

        <MobileSection id="transactions" title="Transactions">
          <div className="ep-card" style={{ borderRadius:18, padding:"16px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <h3 style={{ fontWeight:900, fontSize:14, letterSpacing:"-0.03em" }}>Transactions</h3>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:"#F7F7F7", border:"1px solid #EBEBEB", borderRadius:9, fontSize:11, color:"#888", fontWeight:600, cursor:"pointer" }}>
                This Week <I n="chevR" s={10} c="#CCC"/>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              {activity.length === 0 && (
                <div style={{ padding:"12px 10px", fontSize:11, color:"#AAA" }}>No recent activity yet.</div>
              )}
              {activity.map((a,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:12 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:`${a.c}14`, border:`1px solid ${a.c}22`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <I n={a.ic} s={14} c={a.c}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#111" }}>{a.text}</div>
                    <div style={{ fontSize:10, color:"#AAA", marginTop:2 }}>{a.sub}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:12, fontWeight:800, color:txAmountColor(a) }}>{txAmountLabel(a)}</div>
                    <div style={{ fontSize:9, color:"#CCC", marginTop:2 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MobileSection>

        <MobileSection id="referrals" title="Referrals">
          <div className="ep-card" style={{ borderRadius:16, padding:"16px 18px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:900, color:"#111" }}>Recent Referrals</div>
                <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>{referrals.length} Referrals</div>
              </div>
              <button onClick={()=>setTab("referrals")} style={{ width:28, height:28, borderRadius:8, background:t.acc, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <I n="chevR" s={12} c="#fff"/>
              </button>
            </div>
            <div style={{ display:"flex", gap:12, marginTop:12, flexWrap:"wrap" }}>
              {referrals.length === 0 && (
                <div style={{ fontSize:11, color:"#AAA" }}>No referrals yet.</div>
              )}
              {referrals.slice(0,4).map((r,i)=>(
                <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:r.status==="Active"?t.lgt:"#F5F5F5", border:`2px solid ${r.status==="Active"?t.mid:"#E8E8E8"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:r.status==="Active"?t.acc:"#BBB" }}>{r.init}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#555", textAlign:"center", maxWidth:50, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.name.split(" ")[0]}</div>
                </div>
              ))}
            </div>
          </div>

          <ReferralMiniCard t={t} data={referralData} frame refCode={refCode} compact />
        </MobileSection>

        <MobileSection id="mix" title="Earning Mix">
          <div className="ep-card" style={{ borderRadius:14, padding:"14px 16px" }}>
            <h3 style={{ fontWeight:900, fontSize:13, letterSpacing:"-0.02em", marginBottom:12 }}>Earning Mix</h3>
            {[["Videos",68,t.acc],["Bonus",22,t.mid],["Referrals",10,"#059669"]].map(([l,p,c],i)=>(
              <div key={i} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4 }}>
                  <span style={{ color:"#666", fontWeight:600 }}>{l}</span>
                  <span style={{ fontWeight:800, color:"#111" }}>{p}%</span>
                </div>
                <div style={{ height:5, background:"#F5F5F5", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${p}%`, background:c, borderRadius:99, transition:"width .9s ease" }}/>
                </div>
              </div>
            ))}
          </div>
        </MobileSection>

        <MobileSection id="summary" title="Account Summary">
          <div className="ep-card" style={{ padding:"16px 18px", borderRadius:16 }}>
            <div className="ep-grid-2" style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
              {[
                ["Tier", `${t.name} (#${t.id}/5)`, t.acc],
                ["Progress", progressSummaryLabel, "#111"],
                ["Deposits", depositsLabel, "#111"],
                ["Withdrawals", withdrawalsLabel, "#111"],
                ["Transactions", transactionsLabel, "#111"],
                ["Video Earnings", videoEarningsLabel, t.acc],
                ["Referral Earnings", referralEarningsLabel, "#0066FF"],
                ["Referrals", referralsLabel, "#059669"],
                ["Tier Upgrades", upgradesLabel, "#E8820C"],
              ].map(([l,v,c],i)=>(
                <div key={i} style={{ padding:"12px 12px", background:"#FAFAFA", borderRadius:12, border:"1px solid #F0F0F0" }}>
                  <div style={{ fontSize:9, color:"#BBB", fontWeight:700, letterSpacing:"0.06em", marginBottom:6 }}>{l.toUpperCase()}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:c, letterSpacing:"-0.02em" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </MobileSection>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

      {/* 
          MOBILE HERO - Image 2 inspired
          (mint green header + balance + actions)
       */}
      <div className="ep-mobile-only" style={{ borderRadius:20, background:`linear-gradient(160deg, #C8F5DE 0%, #A8EDCA 60%, ${t.acc}22 100%)`, padding:"28px 22px 22px", position:"relative", overflow:"hidden" }}>
        {/* Decorative circle */}
        <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,0.3)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:-20, left:-20, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.2)", pointerEvents:"none" }}/>

        {/* Top row: logo + grid button */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <BrandMark size={32} />
            <span style={{ fontSize:14, fontWeight:900, color:"#111", letterSpacing:"-0.03em" }}>EdisonPay</span>
          </div>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)" }}>
            <I n="grid" s={16} c="#111"/>
          </div>
        </div>

        {/* Dashboard title */}
        <div style={{ position:"relative", zIndex:1, marginBottom:20 }}>
          <div style={{ fontSize:28, fontWeight:900, color:"#111", letterSpacing:"-0.04em", lineHeight:1.1, marginBottom:6 }}>Financial<br/>Dashboard</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:12 }}>
            <div>
              <div style={{ fontSize:36, fontWeight:900, color:"#111", letterSpacing:"-0.05em", lineHeight:1 }}>KES {(earn/1000).toFixed(1)}K</div>
              <div style={{ fontSize:13, color:"rgba(0,0,0,0.55)", fontWeight:600, marginTop:4 }}>Total Balance</div>
            </div>
            {/* Toggle icon pills */}
            <div style={{ display:"flex", gap:6, marginBottom:6 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:t.acc, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <I n="link" s={16} c="#fff"/>
              </div>
              <div style={{ width:40, height:40, borderRadius:12, background:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <I n="chart" s={16} c="#555"/>
              </div>
            </div>
          </div>
        </div>

        {/* Withdraw / Watch Videos buttons */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18, position:"relative", zIndex:1 }}>
          <button onClick={()=>setTab("withdraw")} style={{ padding:"16px 12px", background:"rgba(255,255,255,0.8)", border:"none", borderRadius:14, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8, fontFamily:"Geist,sans-serif", backdropFilter:"blur(8px)" }}>
            <I n="up" s={20} c="#111"/>
            <span style={{ fontSize:13, fontWeight:800, color:"#111" }}>Withdraw</span>
          </button>
          <button onClick={()=>setTab("videos")} style={{ padding:"16px 12px", background:"rgba(255,255,255,0.8)", border:"none", borderRadius:14, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8, fontFamily:"Geist,sans-serif", backdropFilter:"blur(8px)" }}>
            <I n="down" s={20} c="#111"/>
            <span style={{ fontSize:13, fontWeight:800, color:"#111" }}>Watch Videos</span>
          </button>
        </div>

        {/* Month tabs */}
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, position:"relative", zIndex:1 }}>
          {months.map((m,i) => (
            <button key={m} onClick={()=>setActiveMonth(i)}
              style={{ padding:"6px 14px", borderRadius:50, border:"none", background: activeMonth===i?"#111":"rgba(255,255,255,0.5)", color: activeMonth===i?"#fff":"rgba(0,0,0,0.55)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"Geist,sans-serif", whiteSpace:"nowrap", flexShrink:0, position:"relative" }}>
              {m}
              {activeMonth===i && <div style={{ position:"absolute", bottom:-8, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:"50%", background:"#111" }}/>}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: Transaction count card */}
      <div className="ep-mobile-only" style={{ background:"#fff", borderRadius:16, border:"1px solid #EBEBEB", padding:"18px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:11, color:"#AAA", fontWeight:600, marginBottom:4 }}>Transactions  -  {months[activeMonth]}</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
              <span style={{ fontSize:11, color:"#AAA", fontWeight:600 }}>**** {t.deposit.toString().slice(-4)}</span>
            </div>
          </div>
          <div style={{ fontSize:11, color:canW?"#059669":"#EF4444", fontWeight:700, padding:"4px 10px", background:canW?"#ECFDF5":"#FFF5F5", borderRadius:50, border:`1px solid ${canW?"#A7F3D0":"#FCA5A5"}` }}>
            {canW?"Processing":"Queued"}
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div>
            <div style={{ fontSize:42, fontWeight:900, color:"#111", letterSpacing:"-0.05em", lineHeight:1 }}>{t.videos + t.bonus}</div>
            <div style={{ fontSize:12, color:"#888", marginTop:4 }}>Rewards today</div>
          </div>
          <div style={{ display:"flex", alignItems:"center" }}>
            {referrals.slice(0,3).map((r,i)=>(
              <div key={i} style={{ width:32, height:32, borderRadius:"50%", background:r.status==="Active"?t.acc:"#E0E0E0", border:"2px solid #fff", marginLeft:i>0?-10:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#fff" }}>{r.init[0]}</div>
            ))}
            <div style={{ width:32, height:32, borderRadius:"50%", background:t.acc, border:"2px solid #fff", marginLeft:-10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#fff" }}>+{referrals.length}</div>
          </div>
        </div>
      </div>

      {/* 
          DESKTOP - Image 1 style
          Top 3 stat cards
       */}
      <div className="ep-desktop-only" style={{ marginBottom:18 }}>
        {planActionsCard}
      </div>

      <div className="ep-grid-4 ep-desktop-only" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:18 }}>
        {/* Card 1 - Total Balance (dark) */}
        <div className="ep-hover-lift" style={{ borderRadius:18, background:"#111", padding:"22px 24px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-20, right:-20, width:120, height:120, borderRadius:"50%", background:`${t.acc}33`, pointerEvents:"none" }}/>
          <div style={{ width:36, height:36, borderRadius:11, background:`${t.acc}44`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
            <I n="wallet" s={16} c="#fff"/>
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", fontWeight:700, letterSpacing:"0.06em", marginBottom:8 }}>TOTAL EARNINGS</div>
          <div style={{ fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-0.05em", lineHeight:1, marginBottom:10 }}>KES {earn.toLocaleString()}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 8px", background:"rgba(74,222,128,0.2)", borderRadius:50 }}>
              <I n="trendUp" s={9} c="#4ADE80"/>
              <span style={{ fontSize:10, fontWeight:800, color:"#4ADE80" }}>+KES 500 today</span>
            </div>
          </div>
          <div style={{ height:3, background:"rgba(255,255,255,0.08)", borderRadius:99, marginTop:16 }}>
            <div style={{ height:"100%", width:`${pct}%`, background:t.acc, borderRadius:99 }}/>
          </div>
        </div>

        {/* Card 2 - Total Spending (Daily Potential) */}
        <div className="ep-hover-lift ep-card" style={{ borderRadius:18, padding:"22px 24px", position:"relative", overflow:"hidden", border:"1px solid #111", boxShadow:"0 8px 18px rgba(0,0,0,0.08)" }}>
          <div style={{ position:"absolute", top:-20, right:-20, width:120, height:120, borderRadius:"50%", background:`${t.acc}08`, pointerEvents:"none" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div style={{ width:36, height:36, borderRadius:11, background:`${t.acc}14`, border:`1px solid ${t.acc}22`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <I n="play" s={16} c={t.acc}/>
            </div>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.06em", color:"#BBB" }}> -  -  - </div>
          </div>
          <div style={{ fontSize:11, color:"#AAA", fontWeight:700, letterSpacing:"0.06em", marginBottom:8 }}>DAILY POTENTIAL</div>
          <div style={{ fontSize:28, fontWeight:900, color:"#111", letterSpacing:"-0.05em", lineHeight:1, marginBottom:10 }}>KES {dailyEarn.toLocaleString()}</div>
          <div style={{ fontSize:11, color:"#888", fontWeight:600 }}>{t.videos} required videos/day - bonus rewards {t.bonus}/day</div>
          <div style={{ height:3, background:"#F5F5F5", borderRadius:99, marginTop:16 }}>
            <div style={{ height:"100%", width:"100%", background:`${t.acc}55`, borderRadius:99 }}/>
          </div>
        </div>

        {/* Card 3 - Total Saved (Goal Progress) */}
        <div className="ep-hover-lift ep-card" style={{ borderRadius:18, padding:"22px 24px", position:"relative", overflow:"hidden", border:"1px solid #111", boxShadow:"0 8px 18px rgba(0,0,0,0.08)" }}>
          <div style={{ position:"absolute", top:-20, right:-20, width:120, height:120, borderRadius:"50%", background:"#05966908", pointerEvents:"none" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div style={{ width:36, height:36, borderRadius:11, background:"#ECFDF5", border:"1px solid #A7F3D044", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <I n="activity" s={16} c="#059669"/>
            </div>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.06em", color:"#BBB" }}> -  -  - </div>
          </div>
          <div style={{ fontSize:11, color:"#AAA", fontWeight:700, letterSpacing:"0.06em", marginBottom:8 }}>GOAL PROGRESS</div>
          <div style={{ fontSize:28, fontWeight:900, color:"#111", letterSpacing:"-0.05em", lineHeight:1, marginBottom:10 }}>{pct}%</div>
          <div style={{ fontSize:11, color:"#059669", fontWeight:700 }}>~{daysLeft} days to weekly target - KES {goal.toLocaleString()}</div>
          <div style={{ height:3, background:"#F5F5F5", borderRadius:99, marginTop:16 }}>
            <div style={{ height:"100%", width:`${pct}%`, background:"#059669", borderRadius:99, transition:"width 1.2s ease" }}/>
          </div>
        </div>
      </div>

      {/* 
          MAIN CONTENT GRID
          Left: Chart | Right: My Plan card + Referrals
       */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:18 }} className="ep-overview-chart-grid">

        {/* Left: Account + Goal + Income Chart + Transactions */}
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

          {accountGoalCard}

          {/* Income/Weekly Earnings Chart */}
          <div className="ep-card" style={{ borderRadius:18, padding:"24px 26px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
              <div>
                <div style={{ fontSize:11, color:"#AAA", fontWeight:700, letterSpacing:"0.06em", marginBottom:4 }}>INCOME</div>
                <div style={{ fontSize:26, fontWeight:900, color:"#111", letterSpacing:"-0.04em", lineHeight:1 }}>
                  <AnimNum target={incomeTotal} prefix="KES "/>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:6 }}>
                  <div style={{ width:18, height:18, borderRadius:5, background:`${t.acc}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <I n="trendUp" s={10} c={t.acc}/>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:t.acc }}>+28% this month</span>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", background:"#F7F7F7", border:"1px solid #EBEBEB", borderRadius:9, fontSize:12, color:"#888", fontWeight:600, cursor:"pointer" }}>
                30 days <I n="chevR" s={11} c="#CCC"/>
              </div>
            </div>

            {/* Bar chart */}
            <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:120, marginTop:22, paddingBottom:24, position:"relative" }}>
              {[0.25,0.5,0.75,1].map(p=>(
                <div key={p} style={{ position:"absolute", left:0, right:0, bottom:`${p*100}%`, height:1, background:"#F5F5F5", marginBottom:24 }}/>
              ))}
              {weekData.map((b,i)=>{
                const h = maxV > 0 ? (b.v / maxV) * 100 : 0;
                const isToday = i === todayIdx;
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, zIndex:1 }}>
                    {b.v===maxV && <div style={{ fontSize:9, fontWeight:800, color:"#fff", background:"#111", padding:"2px 6px", borderRadius:5, whiteSpace:"nowrap" }}>KES {(b.v/1000).toFixed(1)}K</div>}
                    <div style={{ width:"100%", height:h, background: isToday ? t.acc : `${t.acc}40`, borderRadius:"6px 6px 0 0", position:"relative", overflow:"hidden", transition:"height .8s ease" }}>
                      {isToday && <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"rgba(255,255,255,0.35)", borderRadius:"6px 6px 0 0" }}/>}
                    </div>
                    <div style={{ fontSize:10, color:isToday?"#111":"#CCC", fontWeight:isToday?800:500 }}>{b.d}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, paddingTop:14, borderTop:"1px solid #F5F5F5", marginTop:4 }}>
              {[[`KES ${incomeTotal.toLocaleString()}`, "Total earned", t.acc],[`KES ${remainingEarn.toLocaleString()}`, "Remaining", "#888"],[`${daysLeft} days`, "To weekly target", "#111"]].map(([v,l,c],i)=>( 
                <div key={i}>
                  <div style={{ fontSize:14, fontWeight:900, color:c, letterSpacing:"-0.03em" }}>{v}</div>
                  <div style={{ fontSize:11, color:"#BBB", marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions list - Image 1 right panel style */}
          <div className="ep-card" style={{ borderRadius:18, padding:"22px 24px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:deskOpen.tx?18:0 }}>
              <h3 style={{ fontWeight:900, fontSize:15, letterSpacing:"-0.03em" }}>Transactions</h3>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:"#F7F7F7", border:"1px solid #EBEBEB", borderRadius:9, fontSize:12, color:"#888", fontWeight:600, cursor:"pointer" }}>
                  This Week <I n="chevR" s={11} c="#CCC"/>
                </div>
                <button onClick={()=>toggleDesk("tx")} style={{ padding:"6px 10px", borderRadius:9, border:"1px solid #E8E8E8", background:"#fff", fontSize:11, fontWeight:800, color:"#555", cursor:"pointer" }}>
                  {deskOpen.tx ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {deskOpen.tx && (
              <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                {activity.length === 0 && (
                  <div style={{ padding:"12px", fontSize:12, color:"#AAA" }}>No recent activity yet.</div>
                )}
                {activity.map((a,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:12, transition:"background .12s", cursor:"default" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    {/* Icon circle (like brand icons in Image 1) */}
                    <div style={{ width:38, height:38, borderRadius:11, background:`${a.c}14`, border:`1px solid ${a.c}22`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <I n={a.ic} s={16} c={a.c}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#111" }}>{a.text}</div>
                      <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>{a.sub}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:txAmountColor(a) }}>{txAmountLabel(a)}</div>
                      <div style={{ fontSize:10, color:"#CCC", marginTop:2 }}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: My Plan Card + Recent Referrals - Image 1 right panel */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* "My Plan" card - like "My Cards" in Image 1 */}
          <div style={{ background:"#111", borderRadius:18, padding:"18px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:900, color:"#fff" }}>My Plan</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{t.id} of 5 Tiers</div>
              </div>
              <BrandMark size={28} />
            </div>

            {/* Plan card */}
            <div style={{ borderRadius:14, background:`linear-gradient(135deg, ${t.acc} 0%, ${t.acc}CC 100%)`, padding:"18px 16px", marginBottom:16, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.15)", pointerEvents:"none" }}/>
              <div style={{ position:"absolute", bottom:-15, left:-15, width:60, height:60, borderRadius:"50%", background:"rgba(255,255,255,0.1)", pointerEvents:"none" }}/>
              <div style={{ fontSize:12, fontWeight:900, color:"rgba(255,255,255,0.9)", letterSpacing:"0.15em", marginBottom:14, position:"relative", zIndex:1 }}>{t.name.toUpperCase()}</div>
              <div style={{ fontSize:22, fontWeight:900, color:"#fff", letterSpacing:"-0.04em", marginBottom:6, position:"relative", zIndex:1 }}>KES {earn.toLocaleString()}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", letterSpacing:"0.08em", marginBottom:14, position:"relative", zIndex:1 }}>**** **** {t.deposit.toString().slice(0,3)} {t.id.toString().padStart(4,"0")}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", position:"relative", zIndex:1 }}>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Deposit<br/><span style={{ color:"rgba(255,255,255,0.8)", fontWeight:700 }}>{formatOverviewMoney(t.deposit)}</span></div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", textAlign:"right" }}>Weekly Target<br/><span style={{ color:"rgba(255,255,255,0.8)", fontWeight:700 }}>{formatOverviewMoney(goal)}</span></div>
              </div>
            </div>

            {/* Send / Receive buttons - like Image 1 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <button onClick={()=>setTab("withdraw")}
                style={{ padding:"11px 0", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:11, fontSize:12, fontWeight:800, color:"#fff", cursor:"pointer", fontFamily:"Geist,sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"background .15s" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.18)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}>
                <I n="up" s={13} c="#fff"/> Withdraw
              </button>
              <button onClick={()=>setTab("videos")}
                style={{ padding:"11px 0", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:11, fontSize:12, fontWeight:800, color:"#fff", cursor:"pointer", fontFamily:"Geist,sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"background .15s" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.18)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}>
                <I n="play" s={13} c="#fff"/> Watch
              </button>
            </div>
          </div>

          {/* Recent Referrals - like "Recent Contacts" in Image 1 */}
          <div className="ep-card" style={{ borderRadius:18, padding:"18px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:900, color:"#111" }}>Recent Referrals</div>
                <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>{referrals.length} Referrals</div>
              </div>
              <button onClick={()=>setTab("referrals")} style={{ width:28, height:28, borderRadius:8, background:t.acc, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <I n="chevR" s={12} c="#fff"/>
              </button>
            </div>
            <div style={{ display:"flex", gap:14, marginTop:16, flexWrap:"wrap" }}>
              {referrals.length === 0 && (
                <div style={{ fontSize:11, color:"#AAA" }}>No referrals yet.</div>
              )}
              {referrals.slice(0,4).map((r,i)=>(
                <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:r.status==="Active"?t.lgt:"#F5F5F5", border:`2px solid ${r.status==="Active"?t.mid:"#E8E8E8"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:r.status==="Active"?t.acc:"#BBB" }}>{r.init}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#555", textAlign:"center", maxWidth:50, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.name.split(" ")[0]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Withdrawal window pill */}
          <div className="ep-card" style={{ borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"center", gap:12, border:"1px solid #111" }}>
            <div style={{ width:38, height:38, borderRadius:11, background:canW?"#ECFDF5":"#FFF5F5", border:`1.5px solid ${canW?"#A7F3D0":"#FCA5A5"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <I n="wallet" s={16} c={canW?"#059669":"#EF4444"}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:800, color:"#111" }}>Withdrawal Window</div>
              <div style={{ fontSize:11, color:canW?"#059669":"#EF4444", fontWeight:700, marginTop:2 }}>
                {canW ? "Processing 08:30 - 17:30" : "Queued for next Tue/Fri"}
              </div>
            </div>
            {canW && <div style={{ width:8, height:8, borderRadius:"50%", background:"#059669", animation:"pulse 2s infinite", flexShrink:0 }}/>}
          </div>

          {/* Earning Mix */}
          <div className="ep-card" style={{ borderRadius:14, padding:"16px 18px", border:"1px solid #111" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:deskOpen.mix?12:0 }}>
              <h3 style={{ fontWeight:900, fontSize:13, letterSpacing:"-0.02em" }}>Earning Mix</h3>
              <button onClick={()=>toggleDesk("mix")} style={{ padding:"4px 8px", borderRadius:8, border:"1px solid #E8E8E8", background:"#fff", fontSize:10, fontWeight:800, color:"#666", cursor:"pointer" }}>
                {deskOpen.mix ? "Hide" : "Show"}
              </button>
            </div>
            {deskOpen.mix && (
              <>
                {[["Videos",68,t.acc],["Bonus",22,t.mid],["Referrals",10,"#059669"]].map(([l,p,c],i)=>(
                  <div key={i} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4 }}>
                      <span style={{ color:"#666", fontWeight:600 }}>{l}</span>
                      <span style={{ fontWeight:800, color:"#111" }}>{p}%</span>
                    </div>
                    <div style={{ height:5, background:"#F5F5F5", borderRadius:99, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${p}%`, background:c, borderRadius:99, transition:"width .9s ease" }}/>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* "" Referral mini card "" */}
      <ReferralMiniCard t={t} data={referralData} refCode={refCode} frame />

      {/* "" Account Summary "" */}
      <div className="ep-card" style={{ padding:"22px 26px", borderRadius:18 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:deskOpen.summary?18:0 }}>
          <h3 style={{ fontWeight:900, fontSize:15, letterSpacing:"-0.03em" }}>Account Summary</h3>
          <button onClick={()=>toggleDesk("summary")} style={{ padding:"6px 10px", borderRadius:9, border:"1px solid #E8E8E8", background:"#fff", fontSize:11, fontWeight:800, color:"#555", cursor:"pointer" }}>
            {deskOpen.summary ? "Hide" : "Show"}
          </button>
        </div>
        {deskOpen.summary && (
          <div className="ep-grid-4" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            {[
              ["Tier", `${t.name} (#${t.id}/5)`, t.acc],
              ["Progress", progressSummaryLabel, "#111"],
              ["Deposits", depositsLabel, "#111"],
              ["Withdrawals", withdrawalsLabel, "#111"],
              ["Transactions", transactionsLabel, "#111"],
              ["Video Earnings", videoEarningsLabel, t.acc],
              ["Referral Earnings", referralEarningsLabel, "#0066FF"],
              ["Referrals", referralsLabel, "#059669"],
              ["Tier Upgrades", upgradesLabel, "#E8820C"],
            ].map(([l,v,c],i)=>(
              <div key={i} style={{ padding:"14px 16px", background:"#FAFAFA", borderRadius:12, border:"1px solid #F0F0F0" }}>
                <div style={{ fontSize:10, color:"#BBB", fontWeight:700, letterSpacing:"0.06em", marginBottom:6 }}>{l.toUpperCase()}</div>
                <div style={{ fontSize:14, fontWeight:800, color:c, letterSpacing:"-0.02em" }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
    }

/* "" VIDEO DATA - 16 YouTube-style videos "" */
const YT_VIDEOS = [
  { id:"dQw4w9WgXcQ", title:"How to Build Passive Income in 2025", channel:"Finance Lab", views:"2.1M", dur:"12:34", thumb:"https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" },
  { id:"9bZkp7q19f0", title:"Top 10 Kenyan Investment Tips You Need", channel:"Money Kenya", views:"890K", dur:"8:45", thumb:"https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg" },
  { id:"kJQP7kiw5Fk", title:"M-Pesa to Millions: The Real Strategy", channel:"Nairobi Wealth", views:"3.4M", dur:"15:22", thumb:"https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg" },
  { id:"OPf0YbXqDm0", title:"Why Referral Programs Actually Work", channel:"Growth Hacks", views:"512K", dur:"6:10", thumb:"https://img.youtube.com/vi/OPf0YbXqDm0/mqdefault.jpg" },
  { id:"60ItHLz5WEA", title:"Crypto vs Mobile Money in Africa 2025", channel:"Digital Finance", views:"1.8M", dur:"20:05", thumb:"https://img.youtube.com/vi/60ItHLz5WEA/mqdefault.jpg" },
  { id:"hT_nvWreIhg", title:"Daily Earning Systems That Actually Scale", channel:"Side Hustle Pro", views:"743K", dur:"9:58", thumb:"https://img.youtube.com/vi/hT_nvWreIhg/mqdefault.jpg" },
  { id:"e-ORhEE9VVg", title:"EdisonPay Tutorial: Getting Started", channel:"EdisonPay Official", views:"220K", dur:"5:30", thumb:"https://img.youtube.com/vi/e-ORhEE9VVg/mqdefault.jpg" },
  { id:"YnopHCL1lbs", title:"Bot Trading vs Video Earning: Which Wins?", channel:"Income Decoded", views:"1.1M", dur:"11:47", thumb:"https://img.youtube.com/vi/YnopHCL1lbs/mqdefault.jpg" },
  { id:"tgbNymZ7vqY", title:"How Referral Networks Generate Compound Returns", channel:"Compound Theory", views:"675K", dur:"14:20", thumb:"https://img.youtube.com/vi/tgbNymZ7vqY/mqdefault.jpg" },
  { id:"CevxZvSJLk8", title:"Understanding Tier-Based Investment Platforms", channel:"Invest Smart KE", views:"430K", dur:"7:55", thumb:"https://img.youtube.com/vi/CevxZvSJLk8/mqdefault.jpg" },
  { id:"2Vv-BfVoq4g", title:"The Psychology of Passive Income Goals", channel:"Wealth Mind", views:"2.9M", dur:"18:13", thumb:"https://img.youtube.com/vi/2Vv-BfVoq4g/mqdefault.jpg" },
  { id:"a01QQZyl-_I", title:"Withdraw Smart: When & How to Cash Out", channel:"Cash Flow Kenya", views:"318K", dur:"6:44", thumb:"https://img.youtube.com/vi/a01QQZyl-_I/mqdefault.jpg" },
  { id:"pRpeEdMmmQ0", title:"5 Mistakes New Earners Make Online", channel:"Digital Hustle", views:"995K", dur:"10:02", thumb:"https://img.youtube.com/vi/pRpeEdMmmQ0/mqdefault.jpg" },
  { id:"Zi_XLOBDo_Y", title:"Airtel Money vs M-Pesa for Payouts", channel:"Mobile Finance", views:"567K", dur:"8:18", thumb:"https://img.youtube.com/vi/Zi_XLOBDo_Y/mqdefault.jpg" },
  { id:"09R8_2nJtjg", title:"Diamond Tier: Is It Worth It?", channel:"EdisonPay Official", views:"184K", dur:"9:05", thumb:"https://img.youtube.com/vi/09R8_2nJtjg/mqdefault.jpg" },
  { id:"y6120QOlsfU", title:"Maximize Your Daily Video Earnings Strategy", channel:"Earn Daily Africa", views:"452K", dur:"7:33", thumb:"https://img.youtube.com/vi/y6120QOlsfU/mqdefault.jpg" },
];

/* "" VIDEOS CONTENT "" */
function VideosContent({ t, onEarning, authUser, depositRequired = false, onRequireDeposit }) {
  const MANUAL_COUNT = Math.max(1, Number(t?.videos) || 0);
  const MANUAL_SECONDS = 45;
  const BONUS_COUNT = Math.max(0, Number(t?.bonus) || 0);
  const bonusUnit = getTierBonusUnit(t);
  const bonusModeLabel = BONUS_COUNT === 0 ? "No bonus tier" : (t?.bonusType === "auto" ? "Auto Bonus" : "Claim Bonus");
  const bonusPotentialAmount = BONUS_COUNT * bonusUnit;
  const bonusPotentialLabel = formatMoney(bonusPotentialAmount);
  const videoDepositNeeded = Number(t?.deposit) || 0;
  const videoDepositLockMsg = `Deposit KES ${videoDepositNeeded.toLocaleString()} first to unlock videos.`;
  const depositBonusAmount = Math.round((Number(t?.deposit) || 0) * 0.1);
  const depositBonusLabel = formatMoney(depositBonusAmount);
  const [dayKey, setDayKey] = useState(() => new Date().toISOString().slice(0,10));
  const initialActivatedOn = (() => {
    try { return localStorage?.getItem("ep-bonus-activated-on") || ""; } catch (e) { return ""; }
  })();
  const initialWatched = (() => {
    try {
      const d = localStorage?.getItem("ep-manual-date") || "";
      const w = Number(localStorage?.getItem("ep-manual-watched") || 0);
      return d === dayKey ? Math.min(w, MANUAL_COUNT) : 0;
    } catch (e) {
      return 0;
    }
  })();
  // watched: 0 = none done, 1 = first done, 2 = both done
  const [watched, setWatched] = useState(initialWatched);
  // playing: null | 0 | 1 (which required video index)
  const [playing, setPlaying] = useState(null);
  const [showPlayer, setShowPlayer] = useState(null);
  const [timer, setTimer] = useState(MANUAL_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [bonusActivatedOn, setBotActivatedOn] = useState(initialActivatedOn);
  const [bonusPct, setBotPct] = useState(initialActivatedOn === dayKey ? 100 : 0);
  const [bonusDone, setBotDone] = useState(initialActivatedOn === dayKey ? BONUS_COUNT : 0);
  const [activeTab, setActiveTab] = useState("manual");
  const simpleVideosUI = true;
  const [imgErrors, setImgErrors] = useState({});
  const [imgLoaded, setImgLoaded] = useState({});
  const [showClaimBotPopup, setShowClaimBotPopup] = useState(false);
  const prevWatchedRef = useRef(watched);
  const prevBotRef = useRef(bonusDone);
  const isStandardOrAbove = Number(t?.id || 0) >= 2;

  const recordView = async (videoId, isRequired) => {
    if (depositRequired) return;
    if (!supabase || !authUser?.id) return;
    try {
      await supabase.from("video_views").insert({
        user_id: authUser.id,
        video_id: String(videoId),
        tier: Number(t?.id || 1),
        duration_watched: MANUAL_SECONDS,
        watched_at: new Date().toISOString(),
        verified_by: "client",
        is_required: !!isRequired
      });
    } catch (e) {}
  };

  // "" Manual video timer
  useEffect(() => {
    if (!timerRunning) return;
    if (timer <= 0) {
      setTimerRunning(false);
      setPlaying(null);
      setShowPlayer(null);
      setWatched(w => {
        const next = Math.min(w + 1, MANUAL_COUNT);
        return next;
      });
      return;
    }
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timerRunning, timer]);

  useEffect(() => {
    try {
      localStorage?.setItem("ep-manual-date", dayKey);
      localStorage?.setItem("ep-manual-watched", String(watched));
    } catch (e) {}
  }, [watched, dayKey]);

  useEffect(() => {
    const id = setInterval(() => {
      const key = new Date().toISOString().slice(0,10);
      if (key !== dayKey) {
        setDayKey(key);
        setWatched(0);
        setPlaying(null);
        setTimerRunning(false);
        setTimer(MANUAL_SECONDS);
        setShowPlayer(null);
        setBotActivatedOn("");
        setBotPct(0);
        setBotDone(0);
        setShowClaimBotPopup(false);
        try {
          localStorage?.setItem("ep-manual-date", key);
          localStorage?.setItem("ep-manual-watched", "0");
          localStorage?.setItem("ep-bonus-activated-on", "");
        } catch (e) {}
      }
    }, 60000);
    return () => clearInterval(id);
  }, [dayKey]);

  const bonusActive = bonusActivatedOn === dayKey;
  const canActivateBot = !bonusActive && watched >= MANUAL_COUNT;

  const activateBot = () => {
    if (!canActivateBot) return;
    setBotActivatedOn(dayKey);
    try { localStorage?.setItem("ep-bonus-activated-on", dayKey); } catch (e) {}
    setBotPct(0);
    setBotDone(0);
    if (isStandardOrAbove && BONUS_COUNT > 0) setShowClaimBotPopup(true);
  };

  useEffect(() => {
    if (!isStandardOrAbove || BONUS_COUNT <= 0) setShowClaimBotPopup(false);
  }, [isStandardOrAbove, BONUS_COUNT]);

  // "" Bot ticker (runs only after activation)
  useEffect(() => {
    if (!bonusActive || bonusPct >= 100) return;
    const id = setInterval(() => {
      setBotPct(p => {
        if (p >= 100) { clearInterval(id); return 100; }
        const next = Math.min(p + 0.2, 100);
        setBotDone(Math.floor((next / 100) * BONUS_COUNT));
        return next;
      });
    }, 120);
    return () => clearInterval(id);
  }, [bonusActive, bonusPct]);

  useEffect(() => {
    const wDelta = watched - prevWatchedRef.current;
    const bDelta = bonusDone - prevBotRef.current;
    if (wDelta > 0) {
      for (let i = 0; i < wDelta; i++) {
        const idx = (watched - wDelta) + i;
        const vid = YT_VIDEOS[idx]?.id || `required-${dayKey}-${idx + 1}`;
        recordView(vid, true);
      }
    }
    if (bDelta > 0 && t?.bonusType === "optional") {
      for (let i = 0; i < bDelta; i++) {
        const n = (bonusDone - bDelta) + i + 1;
        const vid = `bonus-${dayKey}-${n}`;
        recordView(vid, false);
      }
    }
    if (onEarning) {
      if (wDelta > 0) onEarning({ kind:"manual", qty:wDelta, unit: V_PRICE, amount: wDelta * V_PRICE }, "manual");
      if (bDelta > 0) onEarning({ kind:"bonus", qty:bDelta, unit: bonusUnit, amount: bDelta * bonusUnit }, "bonus");
    }
    prevWatchedRef.current = watched;
    prevBotRef.current = bonusDone;
  }, [watched, bonusDone, bonusUnit, onEarning, dayKey, t?.bonusType, t?.id, authUser?.id]);

  const startWatch = (idx) => {
    setErrMsg("");
    if (depositRequired) {
      setErrMsg(videoDepositLockMsg);
      onRequireDeposit?.();
      return;
    }
    // Video 0 always available. Video 1 only available after video 0 watched.
    if (idx === 1 && watched < 1) {
      setErrMsg("Watch Video 1 first to unlock Video 2.");
      return;
    }
    if (watched > idx) { setErrMsg("You've already earned from this video today."); return; }
    if (timerRunning) { setErrMsg("A video is already playing. Wait for it to finish."); return; }
    setPlaying(idx);
    setShowPlayer(idx);
    setTimer(MANUAL_SECONDS);
    setTimerRunning(true);
  };
  const closePlayer = () => {
    setTimerRunning(false);
    setPlaying(null);
    setShowPlayer(null);
    setTimer(MANUAL_SECONDS);
  };

  const todayEarn = watched * V_PRICE + (bonusDone * bonusUnit);
  const nextManual = playing !== null ? playing : (watched < MANUAL_COUNT ? watched : null);
  const manualStatus = playing !== null
    ? `Watching Video ${playing + 1}`
    : watched >= MANUAL_COUNT
      ? "All required videos completed"
      : `Ready for Video ${watched + 1}`;
  const manualPct = playing !== null
    ? Math.round(((MANUAL_SECONDS - timer) / MANUAL_SECONDS) * 100)
    : (watched >= MANUAL_COUNT ? 100 : 0);
  const manualUnlockPct = Math.min(100, Math.round((watched / MANUAL_COUNT) * 100));
  const casinoAccent = "#a3e635";
  const casinoPanel = {
    background:"linear-gradient(160deg, rgba(9,14,28,0.96) 0%, rgba(4,10,22,0.96) 46%, rgba(10,24,12,0.94) 100%)",
    border:"1px solid rgba(163,230,53,0.34)",
    boxShadow:"0 16px 36px rgba(2,6,23,0.62), 0 0 24px rgba(34,197,94,0.18)"
  };
  const casinoCard = {
    background:"linear-gradient(145deg, rgba(12,20,35,0.96) 0%, rgba(10,15,28,0.96) 100%)",
    border:"1px solid rgba(148,163,184,0.35)",
    boxShadow:"0 8px 18px rgba(2,6,23,0.42)"
  };

  return (
    <div className="ep-videos-shell" style={{ display:"flex",flexDirection:"column",gap:20, borderRadius:18, padding:16, background:"radial-gradient(120% 90% at 0% 0%, rgba(34,197,94,0.18) 0%, rgba(2,6,23,0.92) 38%, rgba(1,4,14,0.95) 100%)", border:"1px solid rgba(132,204,22,0.25)" }}>
      <div className="ep-videos-hero" style={{ borderRadius:14, padding:"18px 18px", minHeight:118, background:"linear-gradient(120deg, rgba(163,230,53,0.24) 0%, rgba(250,204,21,0.2) 45%, rgba(16,185,129,0.22) 100%)", border:"1px solid rgba(190,242,100,0.4)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", position:"relative", overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div className="ep-video-hero-icon">
            <I n="play" s={18} c="#052e16" />
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.13em", color:"#ecfccb" }}>REWARD STUDIO</div>
            <div className="ep-videos-hero-title" style={{ marginTop:5, fontSize:20, fontWeight:900, color:"#f8fafc", fontFamily:"Bungee, Sora, sans-serif", letterSpacing:"0.02em" }}>Daily Reward Command Deck</div>
          </div>
        </div>
        <div className="ep-videos-live-pill" style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px", borderRadius:999, background:"rgba(2,6,23,0.65)", border:"1px solid rgba(190,242,100,0.44)", color:"#d9f99d", fontSize:11, fontWeight:800 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80", animation:"pulse 1.2s infinite" }} />
          REWARDS LIVE
        </div>
        <img
          src={DASH_BOT_GUIDE_IMAGE.primary}
          alt=""
          referrerPolicy="no-referrer"
          onError={(e) => setFallbackSrc(e, DASH_BOT_GUIDE_IMAGE)}
          style={{ position:"absolute", right:-18, bottom:-18, width:130, height:130, objectFit:"contain", opacity:0.78, pointerEvents:"none" }}
        />
      </div>

      {showPlayer !== null && (
        <div style={{ position:"fixed", inset:0, background:"rgba(2,6,23,0.82)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ width:"100%", maxWidth:820, background:"#020617", borderRadius:16, overflow:"hidden", border:"1.5px solid rgba(163,230,53,0.46)", boxShadow:"0 20px 50px rgba(0,0,0,0.55), 0 0 28px rgba(34,197,94,0.2)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"linear-gradient(120deg, #14532d 0%, #0f172a 100%)", color:"#fff" }}>
              <div style={{ fontSize:13, fontWeight:800 }}>Watching Video {showPlayer + 1}</div>
              <button onClick={closePlayer} style={{ border:"1px solid rgba(190,242,100,0.5)", background:"rgba(2,6,23,0.45)", color:"#f7fee7", padding:"6px 10px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:700 }}>Close</button>
            </div>
            <div style={{ position:"relative", paddingTop:"56.25%", background:"#000" }}>
              <iframe
                title="EdisonPay Video"
                src={`https://www.youtube.com/embed/${YT_VIDEOS[showPlayer]?.id}?autoplay=1&controls=1&rel=0`}
                style={{ position:"absolute", inset:0, width:"100%", height:"100%", border:"0" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div style={{ padding:"10px 16px", fontSize:11, color:"#cbd5e1", fontWeight:700 }}>
              Keep this open for {MANUAL_SECONDS} seconds to earn your reward today.
            </div>
          </div>
        </div>
      )}

      {/* "" Error toast "" */}
      {errMsg && (
        <div style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 18px",background:"rgba(127,29,29,0.35)",border:"1.5px solid rgba(248,113,113,0.6)",borderRadius:12,fontSize:13,color:"#fecaca",fontWeight:700,animation:"slideUp .2s ease" }}>
          <I n="xmark" s={15} c="#fecaca"/>
          {errMsg}
          <button onClick={()=>setErrMsg("")} style={{ marginLeft:"auto",border:"none",background:"transparent",color:"#fecaca",cursor:"pointer",fontWeight:900,fontSize:16,lineHeight:1 }}>-</button>
        </div>
      )}

      {/* "" Summary bar "" */}
      <div className="ep-videos-summary-grid" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12 }}>
        {[
          [`${watched}/${MANUAL_COUNT}`,"Required Watched","#f8fafc"],
          [`KES ${(watched*V_PRICE).toLocaleString()}`,"Required Earned","#facc15"],
          [`KES ${todayEarn.toLocaleString()}`,"Total Today","#4ade80"],
        ].map(([v,l,c],i) => (
          <div key={i} className="ep-casino-border" style={{ ...casinoCard, borderRadius:12,padding:"14px 16px" }}>
            <div style={{ fontSize:10,color:"rgba(186,230,253,0.72)",fontWeight:700,letterSpacing:"0.08em",marginBottom:8 }}>{l.toUpperCase()}</div>
            <div style={{ fontSize:22,fontWeight:900,letterSpacing:"-0.04em",color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* "" Tab switcher "" */}
      <div className="ep-videos-tab-switch" style={{ display:simpleVideosUI?"none":"flex",gap:2,background:"rgba(15,23,42,0.7)",borderRadius:10,padding:3,width:"100%",justifyContent:"center",flexWrap:"wrap",border:"1px solid rgba(132,204,22,0.25)" }}>
        {[["manual",`Required (${MANUAL_COUNT})`],["bonus","Bonus"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{ padding:"8px 18px",borderRadius:8,border:"none",background:activeTab===id?"linear-gradient(135deg,#bef264 0%, #84cc16 55%, #16a34a 100%)":"transparent",color:activeTab===id?"#052e16":"rgba(226,232,240,0.7)",fontWeight:activeTab===id?800:600,fontSize:13,cursor:"pointer",fontFamily:"Sora, Geist, sans-serif",boxShadow:activeTab===id?"0 6px 14px rgba(132,204,22,0.35)":"none",transition:"all .15s" }}>
            {lbl}
          </button>
        ))}
      </div>

      {/*  MANUAL TAB  */}
      {activeTab === "manual" && (
        <div className="ep-casino-pop ep-videos-panel" style={{ ...casinoPanel, borderRadius:14,padding:simpleVideosUI?"18px 18px":"22px 24px" }}>
          {/* Header */}
          <div className="ep-videos-manual-head" style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
            <div>
              <h3 style={{ fontWeight:800,fontSize:16,letterSpacing:"-0.03em", color:"#f8fafc" }}>Your Required Daily Videos</h3>
              <p style={{ fontSize:13,color:"rgba(203,213,225,0.78)",marginTop:4 }}>
                Watch full {MANUAL_SECONDS} seconds to earn <strong style={{color:"#facc15"}}>KES {V_PRICE}</strong> per video.
              </p>
            </div>
            {watched === MANUAL_COUNT && (
              <div className="ep-videos-manual-done" style={{ padding:"7px 16px",background:"rgba(16,185,129,0.2)",border:"1px solid rgba(74,222,128,0.45)",borderRadius:50,fontSize:12,fontWeight:800,color:"#86efac",display:"flex",alignItems:"center",gap:6 }}>
                <I n="check" s={12} c="#86efac"/> All done  -  KES {(MANUAL_COUNT*V_PRICE).toLocaleString()} earned!
              </div>
            )}
          </div>

          {/* Now Playing / Status */}
          <div className="ep-videos-status-bar" style={{ display:simpleVideosUI?"none":"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"12px 14px",background:"rgba(15,23,42,0.66)",border:"1px solid rgba(148,163,184,0.35)",borderRadius:12,marginBottom:16,flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:10,color:"#93c5fd",fontWeight:800,letterSpacing:"0.12em",marginBottom:4 }}>REQUIRED STATUS</div>
              <div style={{ fontSize:14,fontWeight:900,color:"#f8fafc" }}>{manualStatus}</div>
              {nextManual !== null && (
                <div style={{ fontSize:11,color:"#cbd5e1",marginTop:3,display:"-webkit-box",WebkitLineClamp:1,WebkitBoxOrient:"vertical",overflow:"hidden" }}>
                  {YT_VIDEOS[nextManual]?.title}
                </div>
              )}
            </div>
            <div className="ep-videos-status-right" style={{ textAlign:"right",minWidth:90 }}>
              {playing !== null ? (
                <div style={{ fontSize:20,fontWeight:900,color:"#f8fafc",fontVariantNumeric:"tabular-nums" }}>{timer}s</div>
              ) : (
                <div style={{ fontSize:18,fontWeight:900,color:"#f8fafc" }}>{manualPct}%</div>
              )}
              <div style={{ fontSize:10,color:"#93c5fd" }}>{playing !== null ? "Time left" : "Progress"}</div>
            </div>
            <div style={{ flexBasis:"100%",height:6,background:"rgba(148,163,184,0.35)",borderRadius:99,overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${manualPct}%`,background:playing!==null?casinoAccent:"#22c55e",borderRadius:99,transition:"width .4s ease" }}/>
            </div>
          </div>

          {/* Unlock chain indicator */}
          <div className="ep-videos-chain" style={{ display:simpleVideosUI?"none":"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"rgba(15,23,42,0.6)",border:"1px solid rgba(148,163,184,0.32)",borderRadius:10,marginBottom:20,fontSize:12,color:"#cbd5e1" }}>
            {[1,2].map((n,i) => (
              <React.Fragment key={n}>
                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                  <div style={{ width:22,height:22,borderRadius:"50%",background:watched>=n?"#22c55e":watched===n-1&&timerRunning?"#f59e0b":"rgba(148,163,184,0.38)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .3s" }}>
                    {watched>=n ? <I n="check" s={11} c="#fff"/> : <span style={{fontSize:10,fontWeight:800,color:watched===n-1&&timerRunning?"#fff":"#e2e8f0"}}>{n}</span>}
                  </div>
                  <span style={{ fontWeight:700,color:watched>=n?"#86efac":watched===n-1?"#f8fafc":"#cbd5e1" }}>Video {n}{watched>=n?" OK":""}</span>
                </div>
                {i===0 && <div className="ep-videos-chain-link" style={{ flex:1,height:1,background:watched>=1?"#22c55e":"rgba(148,163,184,0.45)",transition:"background .5s" }}/>}
              </React.Fragment>
            ))}
          </div>

          {/* Video cards */}
          <div className="ep-videos-manual-grid" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:simpleVideosUI?12:16 }}>
            {YT_VIDEOS.slice(0, MANUAL_COUNT).map((vid, i) => {
              const isDone   = watched > i;
              const isActive = playing === i && timerRunning;
              const isLocked = i === 1 && watched < 1 && !timerRunning;
              const isReady  = !isDone && !isActive && !isLocked;
              const pct      = isActive ? ((MANUAL_SECONDS - timer) / MANUAL_SECONDS) * 100 : isDone ? 100 : 0;

              return (
                <div key={i} style={{ borderRadius:16,border:"1px solid rgba(148,163,184,0.35)",boxShadow:"0 10px 24px rgba(2,6,23,0.46)",overflow:"hidden",background:"linear-gradient(145deg, rgba(12,20,35,0.97) 0%, rgba(8,15,28,0.97) 100%)",transition:"all .25s",outline:isActive?`2px solid ${casinoAccent}`:"none" }}>

                  {/* Thumbnail */}
                  <div style={{ position:"relative",paddingTop:"56.25%",background:"#030712",overflow:"hidden",cursor:isReady?"pointer":"default" }}
                    onClick={()=>isReady&&startWatch(i)}>
                    {!imgErrors[vid.id] ? (
                      <>
                        {!imgLoaded[vid.id] && <div className="ep-shimmer" style={{ position:"absolute",inset:0 }} />}
                        <img src={vid.thumb} alt={vid.title}
                          onLoad={()=>setImgLoaded(s=>({...s,[vid.id]:true}))}
                          onError={()=>setImgErrors(e=>({...e,[vid.id]:true}))}
                          style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:isDone?.4:isLocked?.23:1,transition:"opacity .2s",filter:"saturate(1.18)" }}/>
                      </>
                    ) : (
                      <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,#0b1120,#13223f)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <I n="play" s={32} c="rgba(255,255,255,0.15)"/>
                      </div>
                    )}

                    {/* State overlay */}
                    <div style={{ position:"absolute",inset:0,background:"linear-gradient(180deg, rgba(2,6,23,0.18) 0%, rgba(2,6,23,0.5) 100%)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {isDone && (
                        <div style={{ width:52,height:52,borderRadius:"50%",background:"#22c55e",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(34,197,94,0.4)" }}>
                          <I n="check" s={24} c="#fff"/>
                        </div>
                      )}
                      {isActive && (
                        <div style={{ textAlign:"center" }}>
                          <div style={{ width:64,height:64,borderRadius:"50%",background:"rgba(2,6,23,0.66)",backdropFilter:"blur(8px)",border:"3px solid rgba(190,242,100,0.9)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px" }}>
                            <span style={{ fontSize:26,fontWeight:900,color:"#fff",fontFamily:"Geist,sans-serif",fontVariantNumeric:"tabular-nums" }}>{timer}</span>
                          </div>
                          <div style={{ fontSize:11,color:"#d9f99d",fontWeight:800,letterSpacing:"0.06em" }}>WATCHING...</div>
                        </div>
                      )}
                      {isLocked && (
                        <div style={{ textAlign:"center" }}>
                          <div style={{ width:48,height:48,borderRadius:"50%",background:"rgba(2,6,23,0.7)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px" }}>
                            <I n="lock" s={22} c="rgba(255,255,255,0.7)"/>
                          </div>
                          <div style={{ fontSize:11,color:"rgba(255,255,255,0.7)",fontWeight:700 }}>Locked</div>
                        </div>
                      )}
                      {isReady && (
                        <div style={{ width:52,height:52,borderRadius:"50%",background:"rgba(190,242,100,0.95)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                          <I n="play" s={22} c="#052e16"/>
                        </div>
                      )}
                    </div>

                    {/* Progress bar at bottom */}
                    <div style={{ position:"absolute",bottom:0,left:0,right:0,height:3,background:"rgba(148,163,184,0.35)" }}>
                      <div style={{ height:"100%",width:`${pct}%`,background:isDone?"#22c55e":casinoAccent,borderRadius:99,transition:isActive?"width 1s linear":"width .4s ease" }}/>
                    </div>

                    {/* Duration badge */}
                    <div style={{ position:"absolute",bottom:8,right:8,padding:"2px 7px",background:"rgba(2,6,23,0.86)",borderRadius:4,fontSize:10,color:"#f8fafc",fontWeight:700 }}>{vid.dur}</div>

                    {/* Video # badge */}
                    <div style={{ position:"absolute",top:8,left:8,padding:"3px 9px",background:isDone?"#22c55e":i===0?"#84cc16":"rgba(2,6,23,0.72)",borderRadius:50,fontSize:10,fontWeight:800,color:isDone?"#fff":"#052e16",letterSpacing:"0.06em" }}>
                      VIDEO {i+1}{i===1&&!isDone&&watched<1?" (locked)":""}
                    </div>
                  </div>

                  {/* Info row */}
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ fontSize:13,fontWeight:700,color:"#f8fafc",lineHeight:1.35,marginBottom:10,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{vid.title}</div>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:8 }}>
                      <div>
                        <div style={{ fontSize:11,color:"rgba(226,232,240,0.84)",fontWeight:600 }}>{vid.channel}</div>
                        <div style={{ fontSize:10,color:"rgba(148,163,184,0.9)",marginTop:2 }}>{vid.views} views</div>
                      </div>
                      <div style={{ flexShrink:0 }}>
                        {isDone && <div style={{ padding:"6px 12px",background:"rgba(22,163,74,0.25)",border:"1px solid rgba(74,222,128,0.45)",borderRadius:8,fontSize:12,fontWeight:900,color:"#86efac" }}>+KES {V_PRICE} OK</div>}
                        {isActive && (
                          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:700,color:casinoAccent }}>
                              <div style={{ width:6,height:6,borderRadius:"50%",background:casinoAccent,animation:"pulse 1s infinite" }}/> Earning...
                            </div>
                            <div style={{ fontSize:10,color:"#cbd5e1" }}>{timer}s left</div>
                          </div>
                        )}
                        {isReady && (
                          <button onClick={()=>startWatch(i)}
                            style={{ padding:"8px 16px",background:"linear-gradient(135deg,#facc15 0%, #84cc16 52%, #16a34a 100%)",color:"#052e16",border:"none",borderRadius:9,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Sora, Geist, sans-serif",display:"flex",alignItems:"center",gap:5,boxShadow:"0 8px 16px rgba(163,230,53,0.25)" }}>
                            <I n="play" s={11} c="#052e16"/> Watch
                          </button>
                        )}
                        {isLocked && (
                          <div style={{ padding:"7px 12px",background:"rgba(148,163,184,0.2)",border:"1px solid rgba(148,163,184,0.35)",borderRadius:9,fontSize:11,fontWeight:700,color:"#cbd5e1",display:"flex",alignItems:"center",gap:5 }}>
                            <I n="lock" s={11} c="#cbd5e1"/> Locked
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Unlock hint for video 2 */}
                    {i===1&&isLocked&&!simpleVideosUI&&(
                      <div style={{ marginTop:10,padding:"8px 12px",background:"rgba(30,64,175,0.22)",border:"1px solid rgba(147,197,253,0.45)",borderRadius:8,fontSize:11,color:"#bfdbfe",fontWeight:700,display:"flex",alignItems:"center",gap:6 }}>
                        <I n="lock" s={12} c="#bfdbfe"/> Complete Video 1 to unlock this
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {simpleVideosUI && (
        <div className="ep-casino-pop ep-videos-panel ep-bonus-loop-border" style={{ ...casinoPanel, borderRadius:14, padding:0, background:"transparent", border:"none", boxShadow:"0 18px 30px rgba(2,6,23,0.5)" }}>
          <div className="ep-bonus-loop-inner" style={{ padding:"18px 18px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:10 }}>
              <div>
                <h3 style={{ fontWeight:900,fontSize:16,letterSpacing:"-0.03em",color:"#f8fafc" }}>
                  Bonus
                </h3>
                <div style={{ marginTop:3, fontSize:11, fontWeight:800, color:"#93c5fd", letterSpacing:"0.07em" }}>
                  {bonusModeLabel.toUpperCase()} - {BONUS_COUNT} {BONUS_COUNT === 1 ? "SESSION" : "SESSIONS"}
                </div>
              </div>
              <div style={{ fontSize:12,fontWeight:900,color:"#4ade80" }}>
                {formatMoney(bonusDone * bonusUnit)} earned
              </div>
            </div>

            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8,marginBottom:12 }}>
              <div className="ep-bonus-ad-chip">
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.09em", color:"#93c5fd" }}>BONUS SESSION</div>
                <div style={{ marginTop:4, fontSize:14, fontWeight:900, color:"#f8fafc" }}>
                  {bonusPotentialLabel}
                </div>
              </div>
              <div className="ep-bonus-ad-chip">
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.09em", color:"#93c5fd" }}>DEPOSIT BONUS (10%)</div>
                <div style={{ marginTop:4, fontSize:14, fontWeight:900, color:"#f8fafc" }}>
                  {depositBonusLabel}
                </div>
              </div>
            </div>

            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"10px 12px",background:watched>=MANUAL_COUNT?"rgba(16,185,129,0.2)":"rgba(249,115,22,0.18)",border:`1px solid ${watched>=MANUAL_COUNT?"rgba(74,222,128,0.45)":"rgba(251,146,60,0.5)"}`,borderRadius:10,marginBottom:12,flexWrap:"wrap" }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:800,color:watched>=MANUAL_COUNT?"#86efac":"#fdba74" }}>
                <I n={watched>=MANUAL_COUNT?"check":"lock"} s={13} c={watched>=MANUAL_COUNT?"#86efac":"#fdba74"} />
                {watched>=MANUAL_COUNT ? "Bonus unlocked - required videos complete" : "Complete required videos to unlock bonus"}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ fontSize:11,fontWeight:800,color:watched>=MANUAL_COUNT?"#86efac":"#fdba74" }}>{watched}/{MANUAL_COUNT}</div>
                <div style={{ width:84,height:6,background:"rgba(148,163,184,0.35)",borderRadius:99,overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${manualUnlockPct}%`,background:watched>=MANUAL_COUNT?"#22c55e":"#f59e0b",borderRadius:99,transition:"width .3s ease" }} />
                </div>
              </div>
            </div>

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:10,flexWrap:"wrap" }}>
              <div style={{ fontSize:12, color:"rgba(226,232,240,0.92)", fontWeight:700 }}>
                {BONUS_COUNT === 0
                  ? "No bonus rewards on this tier."
                  : bonusActive
                    ? "Bonus activated for today."
                    : `Claim to run ${bonusModeLabel.toLowerCase()} and target ${bonusPotentialLabel}.`}
              </div>
              <button
                onClick={activateBot}
                disabled={!canActivateBot || BONUS_COUNT === 0}
                className={canActivateBot && BONUS_COUNT > 0 ? "ep-bonus-claim-btn" : ""}
                style={{ padding:"8px 14px",background:canActivateBot && BONUS_COUNT>0?"linear-gradient(135deg,#facc15 0%, #84cc16 52%, #16a34a 100%)":"rgba(148,163,184,0.22)",color:canActivateBot && BONUS_COUNT>0?"#052e16":"#94a3b8",border:canActivateBot && BONUS_COUNT>0?"none":"1px solid rgba(148,163,184,0.35)",borderRadius:9,fontSize:12,fontWeight:900,cursor:canActivateBot && BONUS_COUNT>0?"pointer":"not-allowed",fontFamily:"Sora, Geist, sans-serif" }}
              >
                {bonusActive ? "Activated Today" : (canActivateBot && BONUS_COUNT > 0 ? `Claim Bonus ${bonusPotentialLabel}` : "Claim Bonus")}
              </button>
            </div>

            <div style={{ marginBottom:10, fontSize:11, color:"#cbd5e1", fontWeight:700 }}>
              Deposit bonus preview: <span style={{ color:"#4ade80", fontWeight:900 }}>{depositBonusLabel}</span>
            </div>

            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ flex:1,height:7,background:"rgba(148,163,184,0.35)",borderRadius:99,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${bonusPct}%`,background:"linear-gradient(90deg,#facc15 0%, #22c55e 100%)",borderRadius:99,transition:"width .2s ease" }} />
              </div>
              <div style={{ minWidth:40,textAlign:"right",fontSize:12,fontWeight:900,color:"#86efac" }}>{Math.round(bonusPct)}%</div>
            </div>
          </div>
        </div>
      )}

      {/*  BONUS TAB  */}
      {!simpleVideosUI && activeTab === "bonus" && (
        <div className="ep-casino-pop ep-videos-panel ep-bonus-loop-border" style={{ ...casinoPanel, borderRadius:14, padding:0, background:"transparent", border:"none", boxShadow:"0 18px 30px rgba(2,6,23,0.5)" }}>
          <div className="ep-bonus-loop-inner" style={{ padding:"22px 24px" }}>
          <div className="ep-videos-bonus-head" style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
            <div>
              <h3 style={{ fontWeight:900,fontSize:16,letterSpacing:"-0.03em", color:"#f8fafc" }}>Bonus</h3>
              <p style={{ fontSize:13,color:"rgba(203,213,225,0.82)",marginTop:4 }}>{BONUS_COUNT} session{BONUS_COUNT === 1 ? "" : "s"} - {bonusModeLabel} - {formatMoney(bonusUnit)} per reward</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:14,fontWeight:900,color:"#4ade80" }}>{formatMoney(bonusDone*bonusUnit)} earned</div>
              <div style={{ fontSize:11,color:"rgba(186,230,253,0.75)",marginTop:2 }}>{bonusDone}/{BONUS_COUNT} complete  -  {Math.round(bonusPct)}%</div>
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:9,marginBottom:14 }}>
            <div className="ep-bonus-ad-chip">
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.09em", color:"#93c5fd" }}>BONUS SESSION</div>
              <div style={{ marginTop:4, fontSize:14, fontWeight:900, color:"#f8fafc" }}>{bonusPotentialLabel}</div>
            </div>
            <div className="ep-bonus-ad-chip">
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.09em", color:"#93c5fd" }}>DEPOSIT BONUS (10%)</div>
              <div style={{ marginTop:4, fontSize:14, fontWeight:900, color:"#f8fafc" }}>{depositBonusLabel}</div>
            </div>
          </div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"10px 12px",background:watched>=MANUAL_COUNT?"rgba(16,185,129,0.2)":"rgba(249,115,22,0.18)",border:`1px solid ${watched>=MANUAL_COUNT?"rgba(74,222,128,0.45)":"rgba(251,146,60,0.5)"}`,borderRadius:12,marginBottom:14,flexWrap:"wrap" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:800,color:watched>=MANUAL_COUNT?"#86efac":"#fdba74" }}>
              <I n={watched>=MANUAL_COUNT?"check":"lock"} s={13} c={watched>=MANUAL_COUNT?"#86efac":"#fdba74"}/>
              {watched>=MANUAL_COUNT ? "Bonus unlocked - required videos complete" : "Complete all required videos to unlock the bonus"}
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ fontSize:11,fontWeight:800,color:watched>=MANUAL_COUNT?"#86efac":"#fdba74" }}>{watched}/{MANUAL_COUNT}</div>
              <div style={{ width:84,height:6,background:"rgba(148,163,184,0.35)",borderRadius:99,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${manualUnlockPct}%`,background:watched>=MANUAL_COUNT?"#22c55e":"#f59e0b",borderRadius:99,transition:"width .3s ease" }}/>
              </div>
            </div>
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap" }}>
            <div style={{ fontSize:12, fontWeight:700, color: bonusActive ? "#86efac" : watched>=MANUAL_COUNT ? "#f8fafc" : "#fdba74" }}>
              {bonusActive ? "Bonus claimed today" : watched>=MANUAL_COUNT ? "Ready to activate once today." : `Finish ${MANUAL_COUNT - watched} required video${MANUAL_COUNT - watched === 1 ? "" : "s"} to enable.`}
            </div>
            <button onClick={activateBot} disabled={!canActivateBot}
              className={canActivateBot ? "ep-bonus-claim-btn" : ""}
              style={{ padding:"8px 14px", background:canActivateBot?"linear-gradient(135deg,#facc15 0%, #84cc16 52%, #16a34a 100%)":"rgba(148,163,184,0.22)", color:canActivateBot?"#052e16":"#94a3b8", border:canActivateBot?"none":"1px solid rgba(148,163,184,0.35)", borderRadius:9, fontSize:12, fontWeight:800, cursor:canActivateBot?"pointer":"not-allowed", fontFamily:"Sora, Geist, sans-serif" }}>
              {bonusActive ? "Activated Today" : canActivateBot ? `Claim Bonus ${bonusPotentialLabel}` : "Complete Required Videos"}
            </button>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:24 }}>
            <div style={{ flex:1,height:7,background:"rgba(148,163,184,0.35)",borderRadius:99,overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${bonusPct}%`,background:"linear-gradient(90deg,#facc15 0%, #22c55e 100%)",borderRadius:99,transition:"width .2s" }}/>
            </div>
            <span style={{ fontSize:12,fontWeight:800,color:"#86efac",minWidth:40 }}>{Math.round(bonusPct)}%</span>
          </div>
          <div className="ep-videos-bonus-grid" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14 }}>
            {YT_VIDEOS.slice(MANUAL_COUNT, MANUAL_COUNT + BONUS_COUNT).map((vid, i) => {
              const done = bonusActive && i < bonusDone;
              const isActive = bonusActive && i === bonusDone;
              return (
                <div key={i} style={{ borderRadius:12,border:"1px solid rgba(148,163,184,0.35)",boxShadow:"0 8px 18px rgba(2,6,23,0.44)",overflow:"hidden",background:done?"rgba(22,163,74,0.24)":isActive?"rgba(250,204,21,0.18)":"rgba(15,23,42,0.66)",transition:"all .3s" }}>
                  <div style={{ position:"relative",paddingTop:"52%",background:"#030712",overflow:"hidden" }}>
                    {!imgErrors[`bonus-${vid.id}`] ? (
                      <>
                        {!imgLoaded[`bonus-${vid.id}`] && <div className="ep-shimmer" style={{ position:"absolute",inset:0 }} />}
                        <img src={vid.thumb} alt={vid.title}
                          onLoad={()=>setImgLoaded(s=>({...s,[`bonus-${vid.id}`]:true}))}
                          onError={()=>setImgErrors(e=>({...e,[`bonus-${vid.id}`]:true}))}
                          style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:done?.45:isActive?.88:.32,transition:"opacity .2s",filter:"saturate(1.2)" }}/>
                      </>
                    ) : (
                      <div style={{ position:"absolute",inset:0,background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <I n="play" s={24} c="rgba(255,255,255,0.1)"/>
                      </div>
                    )}
                    <div style={{ position:"absolute",inset:0,background:"rgba(2,6,23,0.3)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {done?<div style={{ width:28,height:28,borderRadius:"50%",background:"#22c55e",display:"flex",alignItems:"center",justifyContent:"center" }}><I n="check" s={13} c="#fff"/></div>
                      :isActive?<div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}><div style={{ width:9,height:9,borderRadius:"50%",background:"#FCD34D",animation:"pulse 0.8s infinite" }}/><div style={{ fontSize:8,color:"#FCD34D",fontWeight:800,letterSpacing:"0.1em" }}>BONUS LIVE</div></div>
                      :<I n="lock" s={15} c="rgba(255,255,255,0.35)"/>}
                    </div>
                    <div style={{ position:"absolute",bottom:5,right:5,padding:"1px 5px",background:"rgba(2,6,23,0.84)",borderRadius:3,fontSize:9,color:"#f8fafc",fontWeight:700 }}>{vid.dur}</div>
                    <div style={{ position:"absolute",top:5,left:5,padding:"2px 6px",background:done?"#22c55e":isActive?"#F59E0B":bonusActive?"rgba(2,6,23,0.64)":"#334155",borderRadius:4,fontSize:8,fontWeight:800,color:done?"#052e16":"#fff" }}>
                      {!bonusActive ? "INACTIVE" : done?"BONUS OK":isActive?"LIVE":"BONUS"}
                    </div>
                  </div>
                  <div style={{ padding:"9px 11px" }}>
                    <div style={{ fontSize:11,fontWeight:700,color:"#f8fafc",lineHeight:1.3,marginBottom:4,display:"-webkit-box",WebkitLineClamp:1,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{vid.title}</div>
                    <div style={{ display:"flex",justifyContent:"space-between" }}>
                      <span style={{ fontSize:10,color:"#cbd5e1" }}>{vid.channel}</span>
                      {done?<span style={{ fontSize:10,fontWeight:800,color:"#86efac" }}>+KES {bonusUnit}</span>
                      :isActive?<span style={{ fontSize:10,fontWeight:800,color:"#F59E0B" }}>Watching...</span>
                      :<span style={{ fontSize:10,color:"#94a3b8" }}>Queued</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:18,padding:"12px 16px",background:"rgba(22,163,74,0.2)",borderRadius:10,border:"1px solid rgba(74,222,128,0.5)",fontSize:12,color:"#bbf7d0",display:"flex",alignItems:"center",gap:8 }}>
            <I n="shield" s={14} c="#86efac"/>
            Activate once per day to run the bonus. Earnings credit as each video completes.
          </div>
          </div>
        </div>
      )}

      {showClaimBotPopup && (
        <div style={{ position:"fixed", left:14, bottom:"calc(16px + env(safe-area-inset-bottom, 0px))", zIndex:9997, width:"min(330px, calc(100vw - 28px))", borderRadius:16, border:"1.5px solid rgba(163,230,53,0.58)", background:"linear-gradient(145deg, rgba(2,6,23,0.94) 0%, rgba(6,12,25,0.94) 100%)", boxShadow:"0 20px 32px rgba(2,6,23,0.5), 0 0 20px rgba(74,222,128,0.2)", padding:"11px 12px 12px", animation:"scaleIn .2s ease" }}>
          <button
            type="button"
            aria-label="Dismiss bonus popup"
            onClick={() => setShowClaimBotPopup(false)}
            style={{ position:"absolute", top:8, right:8, width:24, height:24, borderRadius:"50%", border:"1px solid rgba(148,163,184,0.48)", background:"rgba(15,23,42,0.72)", color:"#e2e8f0", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
          >
            <I n="xmark" s={12} c="#e2e8f0" />
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:10, paddingRight:24 }}>
            <img
              src={DASH_BOT_GUIDE_IMAGE.primary}
              alt="Bonus bot"
              referrerPolicy="no-referrer"
              onError={(e) => setFallbackSrc(e, DASH_BOT_GUIDE_IMAGE)}
              style={{ width:72, height:72, objectFit:"contain", flexShrink:0, filter:"drop-shadow(0 8px 16px rgba(15,23,42,0.4))" }}
            />
            <div>
              <div style={{ fontSize:10, fontWeight:900, letterSpacing:"0.1em", color:"#bef264" }}>BONUS CLAIMED</div>
              <div style={{ marginTop:4, fontSize:13, lineHeight:1.35, fontWeight:800, color:"#f8fafc" }}>
                Reward bot is now running your bonus session.
                <div style={{ marginTop:6, fontSize:11, color:"#86efac", fontWeight:900 }}>
                  Session target: {bonusPotentialLabel} | Deposit bonus: {depositBonusLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClaimBotPopup(false)}
                style={{ marginTop:8, padding:"6px 10px", borderRadius:999, border:"1px solid rgba(148,163,184,0.42)", background:"rgba(15,23,42,0.64)", color:"#cbd5e1", fontSize:10, fontWeight:800, cursor:"pointer", fontFamily:"Sora, Geist, sans-serif" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
    }

/* "" REFERRAL LINK CARD (shared) "" */
function ReferralLinkCard({ t, refCode, isMobile }) {
  const cardBorder = isMobile ? "1px solid #111" : "1.5px solid #111";
  const bonusUnit = getTierBonusUnit(t);
  const weeklyTarget = getTierDailyTotal(t) * 7;
  const requiredEarn = getTierRequiredEarn(t);
  const bonusAmount = Number(t?.bonusAmount) || 0;
  const bonusLine = bonusAmount > 0
    ? `Bonus earnings: KES ${bonusAmount.toLocaleString()} per day.`
    : `Bonus earnings: none for this tier.`;
  const moneyLines = [
    `Balance source: server wallet (wallets.balance).`,
    `Required earnings: ${t.videos} videos/day x KES ${V_PRICE} = KES ${requiredEarn.toLocaleString()} max.`,
    bonusLine,
    `Referral bonus: 10% on each direct referral deposit.`,
    `Withdrawals: request anytime; processed Tue/Fri; balance checked server-side.`,
    `Weekly target: KES ${weeklyTarget.toLocaleString()} (display target only).`,
  ];
  const chipBorder = isMobile ? "1px solid #111" : "1px solid #EBEBEB";
  const [copied, setCopied] = useState(false);
  const safeCode = normalizeRefCode(refCode) || makeRefCode(t.tag || t.name || "EDISONPAY");
  const link = `${getBaseUrl()}/?ref=${safeCode}`;
  const copy = () => { try { navigator.clipboard?.writeText(link); } catch(e){} setCopied(true); setTimeout(() => setCopied(false), 2e3); };
  const whatsappText = `Join me on EdisonPay with my referral link: ${link}`;
  const openWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappText);
    const appUrl = `whatsapp://send?text=${encoded}`;
    const webUrl = `https://wa.me/?text=${encoded}`;
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    if (isMobileDevice) {
      window.location.href = appUrl;
      setTimeout(() => {
        if (!document.hidden) window.open(webUrl, "_blank", "noopener,noreferrer");
      }, 700);
      return;
    }
    window.open(webUrl, "_blank", "noopener,noreferrer");
  };
  const socials = [
    { label:"WhatsApp", color:"#25D366", onClick: openWhatsApp },
    { label:"Telegram", color:"#2AABEE" },
    { label:"Facebook", color:"#1877F2" },
    { label:"X", color:"#111111" },
    { label:"Instagram", color:"#E1306C" },
    { label:"TikTok", color:"#000000" },
  ];

  return (
    <div style={{ background:"#fff",borderRadius:14,padding:"22px 24px",border:cardBorder,boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="ep-grid-2" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:24 }}>
        <div>
          <h3 style={{ fontWeight:800,fontSize:15,letterSpacing:"-0.02em",marginBottom:6 }}>Your Referral Link</h3>
          <p style={{ fontSize:12,color:"#888",marginBottom:14,lineHeight:1.6 }}>Share this link - when your friend signs up with your code and deposits, you earn <strong style={{ color:t.acc }}>10% of their deposit</strong> and they can start earning right away.</p>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap",alignItems:"center" }}>
            <div style={{ flex:1,display:"flex",alignItems:"center",gap:9,padding:"10px 12px",background:"#EFF6FF",border:`1.5px dashed ${t.mid}`,borderRadius:9,minWidth:180,backgroundImage:"linear-gradient(rgba(59,130,246,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.12) 1px, transparent 1px)",backgroundSize:"12px 12px" }}>
              <button onClick={copy} style={{ width:28,height:28,borderRadius:8,background:t.lgt,border:`1px solid ${t.mid}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0 }}>
                <I n="link" s={12} c={t.acc}/>
              </button>
              <span style={{ flex:1,fontSize:12,fontWeight:700,color:"#111",letterSpacing:"0.01em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{link}</span>
            </div>
            <button onClick={copy} style={{ padding:"10px 18px",background:copied?"#059669":"#111",color:"#fff",border:"none",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"background .2s",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap" }}>
              <I n={copied?"check":"copy"} s={12} c="#fff"/>{copied?"Copied!":"Copy Link"}
            </button>
          </div>
          <div style={{ display:"flex",gap:7,marginTop:10,flexWrap:"wrap" }}>
            {socials.map(({label,color,onClick})=>(
              <button key={label} onClick={onClick || copy} style={{ padding:"6px 12px",background:"#FAFAFA",border:chipBorder,borderRadius:8,fontSize:11,color:"#555",cursor:"pointer",fontWeight:700,fontFamily:"Geist,sans-serif",display:"flex",alignItems:"center",gap:5 }}>
                <div style={{ width:7,height:7,borderRadius:"50%",background:color }}/>{label}
              </button>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{ background:"#FAFAFA",borderRadius:12,padding:"16px 18px",border:cardBorder, position:"relative", overflow:"hidden" }}>
          <div style={{ fontSize:11,fontWeight:700,color:"#BBB",letterSpacing:"0.08em",marginBottom:14 }}>HOW REFERRALS WORK</div>
          <div style={{ paddingRight:isMobile ? 0 : "56%" }}>
            {[
              ["1","Friend signs up with your referral code",t.acc],
              ["2","They choose a tier and deposit",t.acc],
              ["3","You earn 10% of their deposit",t.acc],
              ["4","They can start earning right away",t.acc],
            ].map(([n,step,c],i) => (
              <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:10,marginBottom:10 }}>
                <div style={{ width:20,height:20,borderRadius:6,background:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:"#fff",flexShrink:0,marginTop:1 }}>{n}</div>
                <span style={{ fontSize:12,color:"#555",lineHeight:1.5 }}>{step}</span>
              </div>
            ))}
          </div>
          <img
            src={REFERRAL_WORK_BOT_IMAGE.primary}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => setFallbackSrc(e, REFERRAL_WORK_BOT_IMAGE)}
            style={isMobile
              ? { position:"absolute", right:6, bottom:-2, width:106, height:106, objectFit:"contain", pointerEvents:"none", userSelect:"none" }
              : { position:"absolute", right:0, top:0, width:"54%", height:"100%", objectFit:"cover", objectPosition:"center right", pointerEvents:"none", userSelect:"none" }}
          />
        </div>
      </div>
    </div>
  );
    }

/* "" ANALYTICS CONTENT "" */
function AnalyticsContent({ t, earn, refCode, isMobile }) {
  const dailyEarn = getTierDailyTotal(t);
  const refBonus = Math.round(t.deposit * 0.1);
  const cardBorder = isMobile ? "1px solid #111" : "1.5px solid #111";
  const bonusUnit = getTierBonusUnit(t);
  const weeklyTarget = getTierDailyTotal(t) * 7;
  const requiredEarn = getTierRequiredEarn(t);
  const bonusAmount = Number(t?.bonusAmount) || 0;
  const bonusLine = bonusAmount > 0
    ? `Bonus earnings: KES ${bonusAmount.toLocaleString()} per day.`
    : `Bonus earnings: none for this tier.`;
  const moneyLines = [
    `Balance source: server wallet (wallets.balance).`,
    `Required earnings: ${t.videos} videos/day x KES ${V_PRICE} = KES ${requiredEarn.toLocaleString()} max.`,
    bonusLine,
    `Referral bonus: 10% on each direct referral deposit.`,
    `Withdrawals: request anytime; processed Tue/Fri; balance checked server-side.`,
    `Weekly target: KES ${weeklyTarget.toLocaleString()} (display target only).`,
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
      <div className="ep-grid-3" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14 }}>
        {[
          [`KES ${earn.toLocaleString()}`,"Total Earned",t.acc],
          [`KES ${dailyEarn.toLocaleString()}`,"Daily Potential","#111"],
          [`KES ${refBonus.toLocaleString()}`,"Referral Bonus","#059669"],
        ].map(([v,l,c],i)=>(
          <div key={i} style={{ background:"#fff",borderRadius:12,padding:"14px 16px",border:cardBorder,boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:10,color:"#BBB",fontWeight:700,letterSpacing:"0.08em",marginBottom:8 }}>{l.toUpperCase()}</div>
            <div style={{ fontSize:20,fontWeight:900,letterSpacing:"-0.04em",color:c }}>{v}</div>
          </div>
        ))}
      </div>


      <div style={{ background:"#fff", borderRadius:12, padding:"16px 18px", border:cardBorder, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize:11, color:"#AAA", fontWeight:800, letterSpacing:"0.08em", marginBottom:10 }}>MONEY FLOW</div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {moneyLines.map((line,i)=>(
            <div key={i} style={{ fontSize:12, color:"#555", lineHeight:1.5 }}>{line}</div>
          ))}
        </div>
      </div>

      <ReferralLinkCard t={t} refCode={refCode} isMobile={isMobile} />
    </div>
  );
    }

/* "" REFERRALS CONTENT "" */
function ReferralsContent({ t, earn, refData, refCode, isMobile, authUserId }) {
  const [filter, setFilter] = useState("all");
  const [guideStep, setGuideStep] = useState(0);
  const referralGuideKey = guideSeenKeyForUser(REFERRAL_GUIDE_SEEN_KEY, authUserId);
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const scopedSeen = localStorage.getItem(referralGuideKey) === "1";
      const legacySeen = localStorage.getItem(REFERRAL_GUIDE_SEEN_KEY) === "1";
      if (!scopedSeen && legacySeen) localStorage.setItem(referralGuideKey, "1");
      return !(scopedSeen || legacySeen);
    } catch (e) {
      return true;
    }
  });
  const cardBorder = isMobile ? "1px solid #111" : "1.5px solid #111";
  const referralGuide = [
    { title:"Share Your Link", text:"Copy your referral link and send it on WhatsApp, Telegram, and social posts." },
    { title:"Friend Deposits", text:"Your referral chooses a tier and completes their fixed deposit." },
    { title:"Auto Bonus", text:"You get 10% bonus automatically on each direct referral deposit." },
    { title:"Upgrade Faster", text:"Use referral bonuses to move into higher tiers sooner and earn more daily." }
  ];
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const scopedSeen = localStorage.getItem(referralGuideKey) === "1";
      const legacySeen = localStorage.getItem(REFERRAL_GUIDE_SEEN_KEY) === "1";
      if (!scopedSeen && legacySeen) localStorage.setItem(referralGuideKey, "1");
      setShowGuide(!(scopedSeen || legacySeen));
    } catch (e) {
      setShowGuide(true);
    }
    setGuideStep(0);
  }, [referralGuideKey]);

  const fallbackRefs = [
    { name:"John Mwangi",    email:"j.mwangi@gmail.com",  tier:"Standard",     date:"Mar 8, 2025",  bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 3.2) },
    { name:"Amina Kariuki",  email:"amina.k@yahoo.com",   tier:"Regular",      date:"Mar 5, 2025",  bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 1.8) },
    { name:"Peter Otieno",   email:"p.otieno@gmail.com",  tier:"Executive",       date:"Mar 1, 2025",  bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 5.1) },
    { name:"Grace Wanjiku",  email:"grace.w@hotmail.com", tier:"Standard",     date:"Feb 22, 2025", bonus:t.deposit*.1,  status:"Pending", earnings: 0 },
    { name:"Samuel Njoroge", email:"sam.n@gmail.com",     tier:"Executive Pro",    date:"Feb 18, 2025", bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 2.4) },
    { name:"Faith Achieng",  email:"faith.a@gmail.com",   tier:"Regular",      date:"Feb 10, 2025", bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 0.9) },
    { name:"Kevin Odhiambo", email:"kevin.o@gmail.com",   tier:"Standard",     date:"Jan 30, 2025", bonus:t.deposit*.1,  status:"Inactive",earnings: 0 },
    { name:"Beatrice Njoki",  email:"b.njoki@yahoo.com",  tier:"Executive",       date:"Jan 25, 2025", bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 4.7) },
  ];
  const normalizeRefRow = (r, i) => {
    const name = r.name || r.full_name || r.user || `User ${i+1}`;
    const email = r.email || r.user_email || "-";
    const tier = r.tier || r.plan || "Regular";
    const date = r.date || r.created_at || "-";
    const rawBonus = Number(r.bonus ?? r.ref_bonus);
    const bonus = Number.isFinite(rawBonus) ? rawBonus : t.deposit * 0.1;
    const rawEarn = Number(r.earnings ?? r.total_earnings);
    const earnings = Number.isFinite(rawEarn) ? rawEarn : 0;
    const rawStatus = String(r.status || "Pending");
    const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
    const level = Number(r.level || r.ref_level || 1);
    return { name, email, tier, date, bonus, status, earnings, level };
  };
  const ALL_REFS = Array.isArray(refData) ? refData.map(normalizeRefRow) : fallbackRefs.map(normalizeRefRow);

  const filtered = filter === "all" ? ALL_REFS : ALL_REFS.filter(r => r.status.toLowerCase() === filter);
  const totalBonus = ALL_REFS.filter(r=>r.status==="Active").reduce((sum,r)=>sum + (Number.isFinite(r.bonus)?r.bonus:0),0);
  const activeCount = ALL_REFS.filter(r=>r.status==="Active").length;
  const pendingCount = ALL_REFS.filter(r=>r.status==="Pending").length;

  const statusColor = s => s==="Active" ? {bg:"#ECFDF5",col:"#059669"} : s==="Pending" ? {bg:"#FEF3C7",col:"#D97706"} : {bg:"#F5F5F5",col:"#888"};
  const tierColor = tn => TIERS.find(tr=>tr.name===tn)?.acc || "#888";
  const shortDate = (d) => {
    if (!d) return "-";
    const s = String(d);
    return s.includes(",") ? s.split(",")[0] : s;
  };

  const handleGuideNext = () => {
    if (guideStep === referralGuide.length - 1) {
      setShowGuide(false);
      try {
        localStorage.setItem(referralGuideKey, "1");
        localStorage.setItem(guideSeenKeyForUser(DASH_GUIDE_SEEN_KEY, authUserId), "1");
      } catch (e) {}
      return;
    }
    setGuideStep((prev) => Math.min(referralGuide.length - 1, prev + 1));
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:18 }}>
      {showGuide && (
      <div style={{ background:"linear-gradient(120deg, #052e16 0%, #0f172a 58%, #14532d 100%)", borderRadius:14, padding:isMobile ? "14px 14px" : "16px 18px", border:"1px solid rgba(163,230,53,0.38)", boxShadow:"0 12px 24px rgba(2,6,23,0.34)", display:"grid", gridTemplateColumns:isMobile ? "1fr" : "110px 1fr auto", gap:12, alignItems:"center" }}>
        <img
          src={DASH_BOT_GUIDE_IMAGE.primary}
          alt="Referral guide bot"
          referrerPolicy="no-referrer"
          onError={(e) => setFallbackSrc(e, DASH_BOT_GUIDE_IMAGE)}
          style={{ width:isMobile ? 92 : 104, height:isMobile ? 92 : 104, objectFit:"contain", justifySelf:isMobile ? "center" : "start" }}
        />
        <div>
          <div style={{ fontSize:10, color:"#86efac", fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase" }}>Referral Guide</div>
          <div style={{ marginTop:4, fontSize:16, color:"#f8fafc", fontWeight:900, letterSpacing:"-0.02em" }}>{referralGuide[guideStep].title}</div>
          <div style={{ marginTop:6, fontSize:12, color:"#cbd5e1", lineHeight:1.55 }}>{referralGuide[guideStep].text}</div>
        </div>
        <div style={{ display:"flex", flexDirection:isMobile ? "row" : "column", gap:8, justifySelf:isMobile ? "center" : "end" }}>
          <button onClick={() => setGuideStep((prev) => Math.max(0, prev - 1))} disabled={guideStep === 0}
            style={{ padding:"8px 12px", borderRadius:9, border:"1px solid rgba(148,163,184,0.4)", background:"rgba(15,23,42,0.48)", color:guideStep===0 ? "#94A3B8" : "#E2E8F0", fontSize:11, fontWeight:800, cursor:guideStep===0 ? "not-allowed" : "pointer" }}>
            Back
          </button>
          <button onClick={handleGuideNext}
            style={{ padding:"8px 12px", borderRadius:9, border:"1px solid rgba(187,247,208,0.55)", background:"linear-gradient(135deg,#22c55e 0%, #16a34a 56%, #15803d 100%)", color:"#ecfdf5", fontSize:11, fontWeight:900, cursor:"pointer" }}>
            {guideStep === referralGuide.length - 1 ? "Done" : "Next"}
          </button>
        </div>
      </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:14 }}>
        {[
          [ALL_REFS.length,"Total Referred","#111"],
          [activeCount,"Active","#059669"],
          [pendingCount,"Pending","#D97706"],
          ["10%","Your Bonus",t.acc],
          [`KES ${totalBonus.toLocaleString()}`,"Total Earned","#059669"],
        ].map(([v,l,c],i) => (
          <div key={i} style={{ background:"#fff",borderRadius:12,padding:"14px 16px",border:cardBorder,boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:10,color:"#BBB",fontWeight:700,letterSpacing:"0.08em",marginBottom:8 }}>{l.toUpperCase()}</div>
            <div style={{ fontSize:20,fontWeight:900,letterSpacing:"-0.04em",color:c }}>{v}</div>
          </div>
        ))}
      </div>

      <ReferralLinkCard t={t} refCode={refCode} isMobile={isMobile} />

      {/* Referral table/cards */}
      <div style={{ background:"#fff",borderRadius:14,padding:isMobile ? "16px 14px" : "22px 24px",border:cardBorder,boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10 }}>
          <div>
            <h3 style={{ fontWeight:800,fontSize:15,letterSpacing:"-0.02em" }}>Referral Records</h3>
            <p style={{ fontSize:12,color:"#BBB",marginTop:3 }}>{ALL_REFS.length} people referred  -  {activeCount} active</p>
          </div>
          {/* Filter pills */}
          <div style={{ display:"flex",gap:4,background:"#F5F5F5",borderRadius:8,padding:3,flexWrap:"wrap" }}>
            {[["all","All"],["active","Active"],["pending","Pending"],["inactive","Inactive"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setFilter(id)} style={{ padding:"5px 12px",borderRadius:6,border:"none",background:filter===id?"#fff":"transparent",color:filter===id?"#111":"#888",fontWeight:filter===id?700:500,fontSize:11,cursor:"pointer",fontFamily:"Geist,sans-serif",boxShadow:filter===id?"0 1px 3px rgba(0,0,0,0.08)":"none",transition:"all .12s" }}>{lbl}</button>
            ))}
          </div>
        </div>

        {!isMobile && (
          <div className="ep-referrals-table-scroll">
            <div className="ep-referrals-table-inner">
              <div style={{ display:"grid",gridTemplateColumns:"2fr 0.7fr 1.1fr 1fr 1fr 1fr 1fr",gap:8,padding:"8px 12px",marginBottom:4 }}>
                {["PERSON","LEVEL","TIER","JOINED","YOUR BONUS","THEIR EARNINGS","STATUS"].map(h => (
                  <span key={h} style={{ fontSize:9,color:"#BBB",fontWeight:800,letterSpacing:"0.1em" }}>{h}</span>
                ))}
              </div>

              {filtered.map((r, i) => {
                const sc = statusColor(r.status);
                const tc = tierColor(r.tier);
                return (
                  <div key={i} style={{ display:"grid",gridTemplateColumns:"2fr 0.7fr 1.1fr 1fr 1fr 1fr 1fr",gap:8,padding:"12px",borderRadius:10,background:i%2===0?"#FAFAFA":"#fff",alignItems:"center",marginBottom:2,transition:"background .15s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#F0F4FF"} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#FAFAFA":"#fff"}>
                    <div style={{ display:"flex",alignItems:"center",gap:10, minWidth:0 }}>
                      <div style={{ width:34,height:34,borderRadius:"50%",background:t.lgt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:t.acc,flexShrink:0 }}>{r.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:13,fontWeight:700,color:"#111", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.name}</div>
                        <div style={{ fontSize:10,color:"#BBB", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.email}</div>
                      </div>
                    </div>
                    <span style={{ fontSize:11,fontWeight:800,color:"#111" }}>L{r.level || 1}</span>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <div style={{ width:7,height:7,borderRadius:2,background:tc }}/>
                      <span style={{ fontSize:12,fontWeight:600,color:"#555" }}>{r.tier}</span>
                    </div>
                    <span style={{ fontSize:11,color:"#888" }}>{shortDate(r.date)}</span>
                    <span style={{ fontSize:13,fontWeight:800,color:"#059669" }}>+KES {r.bonus.toLocaleString()}</span>
                    <span style={{ fontSize:12,fontWeight:700,color: r.earnings > 0 ? "#111" : "#CCC" }}>{r.earnings > 0 ? `KES ${r.earnings.toLocaleString()}` : "-"}</span>
                    <span style={{ fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:50,background:sc.bg,color:sc.col,display:"inline-block",width:"fit-content" }}>{r.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isMobile && (
          <div style={{ display:"grid", gap:10 }}>
            {filtered.map((r, i) => {
              const sc = statusColor(r.status);
              const tc = tierColor(r.tier);
              return (
                <div key={i} style={{ border:"1px solid #E5E7EB", borderRadius:12, padding:"12px 12px", background:"#FAFAFA" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:9, minWidth:0 }}>
                      <div style={{ width:34,height:34,borderRadius:"50%",background:t.lgt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:t.acc,flexShrink:0 }}>{r.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:800, color:"#111", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.name}</div>
                        <div style={{ fontSize:10, color:"#94A3B8", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.email}</div>
                      </div>
                    </div>
                    <span style={{ fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:50,background:sc.bg,color:sc.col,whiteSpace:"nowrap" }}>{r.status}</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
                    <div style={{ fontSize:10, color:"#94A3B8" }}>Tier<div style={{ marginTop:2, fontSize:12, color:"#111", fontWeight:800 }}><span style={{ display:"inline-block", width:7, height:7, borderRadius:2, background:tc, marginRight:6 }} />{r.tier}</div></div>
                    <div style={{ fontSize:10, color:"#94A3B8" }}>Level<div style={{ marginTop:2, fontSize:12, color:"#111", fontWeight:800 }}>L{r.level || 1}</div></div>
                    <div style={{ fontSize:10, color:"#94A3B8" }}>Your Bonus<div style={{ marginTop:2, fontSize:12, color:"#059669", fontWeight:900 }}>+KES {r.bonus.toLocaleString()}</div></div>
                    <div style={{ fontSize:10, color:"#94A3B8" }}>Joined<div style={{ marginTop:2, fontSize:12, color:"#111", fontWeight:700 }}>{shortDate(r.date)}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ padding:"32px",textAlign:"center",color:"#BBB",fontSize:14 }}>No {filter} referrals yet.</div>
        )}

        {/* Totals footer */}
        <div style={{ marginTop:12,padding:"12px 14px",background:"#F7F9FC",borderRadius:10,border:cardBorder,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
          <div style={{ display:"flex",gap:24,flexWrap:"wrap" }}>
            <div><span style={{ fontSize:11,color:"#BBB" }}>Total bonus earned  </span><span style={{ fontSize:14,fontWeight:900,color:"#059669" }}>KES {totalBonus.toLocaleString()}</span></div>
            <div><span style={{ fontSize:11,color:"#BBB" }}>Avg per referral  </span><span style={{ fontSize:14,fontWeight:900,color:"#111" }}>KES {activeCount > 0 ? Math.round(totalBonus/activeCount).toLocaleString() : 0}</span></div>
          </div>
          <div style={{ fontSize:11,color:"#BBB" }}>Showing {filtered.length} of {ALL_REFS.length} records</div>
        </div>
      </div>
    </div>
  );
    }

/* "" WITHDRAW "" */
function WithdrawContent({ t, earn, balance, authUser, profileRow, focusDeposit, onFocusDone, onNewTx, onBalanceUpdate, hasDeposit, historyData, referralHistory }) {
  const MIN_WITHDRAWAL_KES = 1000;
  const [wdAmt,setWdAmt]=useState(""), [method,setMethod]=useState("M-Pesa"), [done,setDone]=useState(false);
  const [wdError, setWdError] = useState("");
  const [showWithdrawStatusBanner, setShowWithdrawStatusBanner] = useState(true);
  const [depPhone, setDepPhone] = useState("");
  const [depName, setDepName] = useState("");
  const [depMethod, setDepMethod] = useState("M-Pesa");
  const [depLoading, setDepLoading] = useState(false);
  const [depError, setDepError] = useState("");
  const [depDone, setDepDone] = useState(false);
  const depErrorMsg = formatDepositError(depError);
  const depositRef = useRef(null);
  const today=new Date().toLocaleDateString("en-US",{weekday:"long"});
  const can=["Tuesday","Friday"].includes(today);
  const canWithdrawNow = can && hasDeposit !== false;
  const currency = getActiveDisplayCurrency();
  const wdAmtNum = Number(wdAmt);
  const wdAmtKes = toKesAmount(wdAmtNum, currency);
  const hasValidWdAmt = Number.isFinite(wdAmtKes) && wdAmtKes >= MIN_WITHDRAWAL_KES;
  const canSubmitWithdrawal = canWithdrawNow && hasValidWdAmt;
  const nextTier = TIERS[t.id];
  const currentTierDeposit = Number(t?.deposit) || 0;
  const upgradeNeed = nextTier ? Math.max(nextTier.deposit - currentTierDeposit, 0) : 0;
  const needsUnlock = hasDeposit === false;
  const unlockNeed = needsUnlock ? currentTierDeposit : 0;
  const primaryNeed = needsUnlock ? unlockNeed : upgradeNeed;
  const canDeposit = primaryNeed > 0;
  const targetTierId = needsUnlock ? t.id : (nextTier?.id || t.id);
  useEffect(() => {
    if (!focusDeposit) return;
    if (depositRef.current) depositRef.current.scrollIntoView({ behavior:"smooth", block:"start" });
    if (onFocusDone) onFocusDone();
  }, [focusDeposit, onFocusDone]);
  useEffect(() => {
    if (!wdError) return;
    setWdError("");
  }, [wdAmt, method]);
  const submitDeposit = async (methodOverride = "") => {
    const selectedMethod = String(methodOverride || depMethod || "M-Pesa").trim() || "M-Pesa";
    const requiredAmt = Number(primaryNeed);
    if (!Number.isFinite(requiredAmt) || requiredAmt <= 0) {
      setDepError("No deposit is required right now.");
      return;
    }
    const amt = requiredAmt;
    if (!authUser?.id) {
      setDepError("Please log in to deposit.");
      return;
    }
    const apiBase = getApiBase();
    if (!apiBase) {
      setDepError("Payment service is not configured. Please contact support.");
      return;
    }
    const email = authUser?.email || profileRow?.email || "";
    if (!email) {
      setDepError("Email is required for checkout.");
      return;
    }
    setDepMethod(selectedMethod);
    setDepError("");
    setDepLoading(true);
    try {
      const token = await getAccessToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const requestBody = (mode = "live") => ({
        amount: amt,
        user_id: authUser.id,
        email,
        tier: targetTierId,
        upgrade_from_tier: t.id,
        method: selectedMethod,
        payment_mode: mode,
        phone: depPhone || profileRow?.phone || "",
        name: depName || profileRow?.name || authUser?.user_metadata?.full_name || ""
      });
      let res = await fetch(`${apiBase}/api/v1/deposit/create`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody("live"))
      });
      let data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const rawMsg = data?.error || data?.message || data?.detail || "Failed to start checkout.";
        const msg =
          String(rawMsg || "").toLowerCase().includes("ipn")
            ? "Payment gateway not configured yet. Please contact support."
            : rawMsg;
        setDepError(msg);
        return;
      }
      const url = data?.authorization_url || data?.redirect_url || data?.auth_url || data?.url;
      if (data?.manual) {
        setDepDone(true);
        setTimeout(() => setDepDone(false), 2500);
        onNewTx?.({
          ic:"wallet",
          text:"Deposit requested",
          sub:`KES ${amt.toLocaleString()} pending manual confirmation`,
          time:"Just now",
          c:"#0066FF",
          amt
        });
        return;
      }
      if (!url) {
        setDepError("Payment gateway did not return a checkout URL.");
        return;
      }
      setDepDone(true);
      setTimeout(()=>setDepDone(false), 2500);
      onNewTx?.({
        ic:"wallet",
        text:"Deposit initiated",
        sub:`KES ${amt.toLocaleString()} via ${selectedMethod || "Payment Gateway"}`,
        time:"Just now",
        c:"#0066FF",
        amt
      });
      window.location.href = url;
    } catch (e) {
      setDepError("Network error. Please try again.");
    } finally {
      setDepLoading(false);
    }
  };
  const requestWithdrawal = async (amount, methodLabel, payoutRef) => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < MIN_WITHDRAWAL_KES) return false;
    
    if (Number.isFinite(balance) && amt > balance) return false;
    if (supabase && authUser?.id) {
      try {
        const { data, error } = await supabase.rpc("request_withdrawal", {
          p_amount: amt,
          p_method: methodLabel || "M-Pesa",
          p_phone: String(payoutRef || profileRow?.phone || "")
        });
        if (error) return false;
        const row = Array.isArray(data) ? data[0] : data;
        let autoCompleted = false;
        if (!MANUAL_WITHDRAWALS && row?.payout_id) {
          try {
            const apiBase = getApiBase();
            const token = await getAccessToken();
            if (apiBase) {
              const headers = { "Content-Type": "application/json" };
              if (token) headers.Authorization = `Bearer ${token}`;
              const autoRes = await fetch(`${apiBase}/api/v1/payout/auto-complete`, {
                method: "POST",
                headers,
                body: JSON.stringify({ payout_id: row.payout_id })
              });
              autoCompleted = autoRes.ok;
            }
          } catch (e) {
            autoCompleted = false;
          }
        }
        const newBalance = Number(row?.new_balance);
        if (Number.isFinite(newBalance)) onBalanceUpdate?.(newBalance);
        onNewTx?.({
          ic:"up",
          text:autoCompleted ? "Withdrawal paid automatically" : "Withdrawal requested",
          sub:autoCompleted
            ? `KES ${amt.toLocaleString()} auto-paid via ${methodLabel || "M-Pesa"}`
            : `KES ${amt.toLocaleString()} via ${methodLabel || "M-Pesa"}`,
          time:"Just now",
          c:"#E8820C",
          amt: -amt
        });
        return true;
      } catch (e) {
        return false;
      }
    }
    return true;
  };

  const submitWithdrawal = async () => {
    setWdError("");
    if (hasDeposit === false) {
      setWdError(`Please deposit KES ${t.deposit.toLocaleString()} first to unlock withdrawals.`);
      return;
    }
    if (!can) {
      setWdError("Withdrawals are only available on Tuesday and Friday.");
      return;
    }
    if (!hasValidWdAmt) {
      setWdError(`Minimum withdrawal is KES ${MIN_WITHDRAWAL_KES.toLocaleString()}.`);
      return;
    }
    if (Number.isFinite(balance) && wdAmtKes > balance) {
      setWdError("Withdrawal amount cannot exceed available balance.");
      return;
    }
    const ok = await requestWithdrawal(wdAmtKes, method, profileRow?.phone || "");
    if (!ok) {
      setWdError("Unable to submit withdrawal right now. Please try again.");
      return;
    }
    setDone(true);
    setTimeout(()=>setDone(false), 3000);
  };

  const parseKesAmount = (rawText = "") => {
    const text = String(rawText || "");
    const m = text.match(/(?:KES|KSH)\s*([0-9,]+(?:\.[0-9]+)?)/i);
    if (!m) return null;
    const n = Number(String(m[1]).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  };
  const resolveTxType = (tx) => {
    const text = String(tx?.text || tx?.sub || "").toLowerCase();
    const icon = String(tx?.ic || "").toLowerCase();
    if (text.includes("withdraw") || icon === "up") return "Withdrawal";
    if (text.includes("referral") || icon === "gift") return "Referral";
    if (text.includes("deposit")) return "Deposit";
    if (text.includes("bonus") || text.includes("video") || text.includes("earning") || icon === "play" || icon === "activity") return "Earning";
    return "Transaction";
  };
  const resolveTxStatus = (tx) => {
    const full = `${String(tx?.text || "")} ${String(tx?.sub || "")}`.toLowerCase();
    if (full.includes("failed") || full.includes("rejected")) return "Failed";
    if (full.includes("pending") || full.includes("requested")) return "Pending";
    return "Completed";
  };
  const fallbackHistoryRows = [
    { date:"Mar 7", type:"Withdrawal", amount:1200, status:"Completed" },
    { date:"Feb 28", type:"Withdrawal", amount:3400, status:"Completed" },
    { date:"Feb 21", type:"Withdrawal", amount:800, status:"Completed" },
    { date:"Feb 14", type:"Withdrawal", amount:2100, status:"Pending" },
    { date:"Feb 7", type:"Withdrawal", amount:950, status:"Completed" },
  ];
  const mergedHistoryRows = (() => {
    const txRows = Array.isArray(historyData)
      ? historyData.map((tx, i) => {
        const amtRaw = Number(tx?.amt);
        const amt = Number.isFinite(amtRaw) ? Math.abs(amtRaw) : parseKesAmount(tx?.sub || tx?.text || "");
        return {
          key: `${tx?.time || "t"}_${tx?.text || "tx"}_${i}`,
          date: String(tx?.time || "-"),
          type: resolveTxType(tx),
          amount: Number.isFinite(amt) ? amt : 0,
          status: resolveTxStatus(tx)
        };
      })
      : [];
    const referralRows = Array.isArray(referralHistory)
      ? referralHistory.map((r, i) => {
          const bonusRaw = Number(r?.bonus);
          const bonus = Number.isFinite(bonusRaw) ? Math.abs(bonusRaw) : 0;
          const statusRaw = String(r?.status || "").toLowerCase();
          const status = statusRaw.includes("pending")
            ? "Pending"
            : statusRaw.includes("inactive") || statusRaw.includes("failed")
              ? "Failed"
              : "Completed";
          return {
            key: `ref_${r?.name || "user"}_${r?.date || "d"}_${i}`,
            date: String(r?.date || "-"),
            type: "Referral",
            amount: bonus,
            status
          };
        })
      : [];
    const merged = [...txRows, ...referralRows];
    return merged.length ? merged : fallbackHistoryRows.map((row, i) => ({ ...row, key:`fallback_${i}` }));
  })();
  const historyRows = mergedHistoryRows;
  const historyStatusStyle = (status) => status === "Completed"
    ? { bg:"#ECFDF5", col:"#059669" }
    : status === "Pending"
      ? { bg:"#FEF3C7", col:"#D97706" }
      : { bg:"#FEF2F2", col:"#DC2626" };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
      {showWithdrawStatusBanner && (
        <div style={{ padding:"14px 16px",borderRadius:10,border:`1px solid ${can?"#A7F3D0":"#FCA5A5"}`,background:can?"#ECFDF5":"#FFF0F0",display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:30,height:30,borderRadius:"50%",background:can?"#059669":"#DC2626",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <I n={can?"check":"xmark"} s={14} c="#fff"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:800,fontSize:14,color:can?"#065F46":"#991B1B" }}>{can?"Withdrawals processing today":"Withdrawals queued today"}</div>
            <div style={{ fontSize:12,color:"#888",marginTop:2 }}>Processing: Tue & Fri - 08:30 - 17:30</div>
            <div style={{ fontSize:11,color:"#64748B",marginTop:4 }}>Minimum withdrawal: KES {MIN_WITHDRAWAL_KES.toLocaleString()}.</div>
            {MANUAL_WITHDRAWALS && (
              <div style={{ fontSize:11,color:"#64748B",marginTop:4 }}>All withdrawals are manually approved by admin.</div>
            )}
          </div>
          <button
            type="button"
            aria-label="Dismiss withdrawal status"
            onClick={() => setShowWithdrawStatusBanner(false)}
            style={{ width:28,height:28,borderRadius:8,border:"1px solid rgba(148,163,184,0.45)",background:"rgba(255,255,255,0.7)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}
          >
            <I n="xmark" s={12} c={can?"#065F46":"#991B1B"} />
          </button>
        </div>
      )}
      {hasDeposit === false && (
        <div style={{ background:"#000", border:"1px solid #171717", borderRadius:12, display:"grid", gridTemplateColumns:"minmax(0,1fr) clamp(104px,22vw,180px)", alignItems:"stretch", minHeight:108, overflow:"hidden" }}>
          <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", justifyContent:"center", gap:10, minWidth:0 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#F8FAFC",fontWeight:800 }}>
              <I n="lock" s={13} c="#22C55E"/> Deposit KES {t.deposit.toLocaleString()} once to unlock withdrawals.
            </div>
            <button onClick={() => submitDeposit(depMethod)} disabled={depLoading || !canDeposit}
              style={{ padding:"8px 12px", borderRadius:10, border:(depLoading || !canDeposit) ? "1px solid rgba(148,163,184,0.5)" : "1px solid rgba(187,247,208,0.7)", background:(depLoading || !canDeposit) ? "rgba(30,41,59,0.6)" : "linear-gradient(135deg,#22c55e 0%, #16a34a 58%, #15803d 100%)", color:(depLoading || !canDeposit) ? "#94A3B8" : "#ECFDF5", fontSize:11, fontWeight:900, cursor:(depLoading || !canDeposit) ? "not-allowed" : "pointer", fontFamily:"Geist,sans-serif", alignSelf:"flex-start", boxShadow:(depLoading || !canDeposit) ? "none" : "0 8px 16px rgba(22,163,74,0.28)" }}>
              {depLoading ? "Opening..." : "Deposit Now"}
            </button>
          </div>
          <div style={{ background:"#000", overflow:"hidden" }}>
            <img
              src={WALLET_DEPOSIT_BOT_IMAGE.primary}
              alt=""
              referrerPolicy="no-referrer"
              onError={(e) => setFallbackSrc(e, WALLET_DEPOSIT_BOT_IMAGE)}
              style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center right", pointerEvents:"none", userSelect:"none" }}
            />
          </div>
        </div>
      )}
      {wdError && (
        <div style={{ padding:"10px 14px", background:"#FFF0F0", border:"1px solid #FCA5A5", borderRadius:9, fontSize:13, color:"#DC2626", fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
          <I n="xmark" s={14} c="#DC2626" /> {wdError}
        </div>
      )}

      <div ref={depositRef} style={{ background:"linear-gradient(180deg,#FFFFFF 0%, #F8FAFC 100%)",borderRadius:16,padding:"18px 20px",border:"1px solid #E5E7EB",boxShadow:"0 10px 26px rgba(15,23,42,0.08)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10 }}>
          <div>
            <div style={{ fontSize:13,fontWeight:900,color:"#0F172A",letterSpacing:"0.02em" }}>Checkout Gateway</div>
            <div style={{ fontSize:11,color:"#64748B",marginTop:4 }}>Choose a verified payment icon and tap to pay instantly.</div>
          </div>
          <div style={{ padding:"6px 10px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:999,fontSize:11,color:"#047857",fontWeight:800,display:"flex",alignItems:"center",gap:6 }}>
            <I n="lock" s={11} c="#047857" /> Trusted Secure Checkout
          </div>
        </div>

        <div style={{ border:"1px solid #E5E7EB",borderRadius:14,padding:"14px",background:"#FFFFFF",display:"flex",flexDirection:"column",gap:10 }}>
          <div style={{ borderRadius:12,background:"#0F172A",color:"#fff",padding:"12px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12 }}>
            <div>
              <div style={{ fontSize:10,letterSpacing:"0.22em",textTransform:"uppercase",opacity:0.7,fontWeight:700 }}>Secure Payment Gateway</div>
              <div style={{ fontSize:16,fontWeight:900,letterSpacing:"-0.01em",marginTop:4 }}>Secure checkout, instant wallet credit.</div>
            </div>
            <div style={{ padding:"6px 10px",borderRadius:999,background:"rgba(255,255,255,0.14)",border:"1px solid rgba(255,255,255,0.24)",fontSize:10,fontWeight:800,letterSpacing:"0.08em",whiteSpace:"nowrap" }}>
              VERIFIED
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8 }}>
            {[
              { label:"SSL Secured", icon:"lock" },
              { label:"Instant Confirmation", icon:"bolt" },
              { label:"Buyer Protection", icon:"shield" }
            ].map((b) => (
              <div key={b.label} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 10px",borderRadius:10,background:"#F8FAFC",border:"1px solid #E2E8F0",fontSize:11,fontWeight:700,color:"#0F172A" }}>
                <I n={b.icon} s={12} c="#0F172A" /> {b.label}
              </div>
            ))}
          </div>
          <div style={{ padding:"10px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",background:"#F8FAFC",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10 }}>
            <div>
              <div style={{ fontSize:9,fontWeight:800,color:"#94A3B8",letterSpacing:"0.12em" }}>LOCKED AMOUNT</div>
              <div style={{ fontSize:15,fontWeight:900,color:"#0F172A" }}>
                KES {Math.max(primaryNeed, 0).toLocaleString()}
              </div>
            </div>
            <div style={{ padding:"4px 8px",borderRadius:999,background:"#111827",color:"#fff",fontSize:10,fontWeight:800 }}>FIXED</div>
          </div>

          <div style={{ marginTop:10 }}>
            <div style={{ fontSize:10,letterSpacing:"0.14em",fontWeight:800,color:"#64748B",textTransform:"uppercase",marginBottom:8 }}>Payment Method</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(148px,1fr))",gap:8 }}>
              {DEPOSIT_METHODS.map((m) => {
                const active = depMethod === m.value;
                const logoSrc = m.logo ? (PAYMENT_ICON_SOURCES[m.logo] || PAYMENT_ICON_SOURCES["Google Pay"]) : "";
                return (
                  <button key={m.id} type="button" onClick={() => { setDepMethod(m.value); setDepError(""); }} disabled={depLoading || !canDeposit}
                    style={{
                      padding:"10px 10px",
                      borderRadius:10,
                      border:active ? "1.5px solid #111" : "1.5px solid #E2E8F0",
                      background:active ? "#111" : "#F8FAFC",
                      color:active ? "#fff" : "#111",
                      fontWeight:800,
                      fontSize:12,
                      cursor:(depLoading || !canDeposit) ? "not-allowed" : "pointer",
                      fontFamily:"Geist,sans-serif",
                      textAlign:"left",
                      minHeight:74,
                      opacity:(depLoading || !canDeposit) ? 0.7 : 1
                    }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        {logoSrc ? (
                          <img
                            src={logoSrc}
                            alt={`${m.title} logo`}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            style={{ width:36, height:20, objectFit:"contain", filter:active ? "none" : "grayscale(1) saturate(0) brightness(0.74)" }}
                          />
                        ) : (
                          <div style={{ minWidth:36, fontSize:9, fontWeight:900, letterSpacing:"0.05em", opacity:active ? 0.86 : 0.62 }}>
                            BANK
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize:12, fontWeight:900, lineHeight:1.2 }}>{m.title}</div>
                          <div style={{ fontSize:10, opacity:active ? 0.8 : 0.6, marginTop:2 }}>{m.subtitle}</div>
                        </div>
                      </div>
                      <div style={{ display:"inline-flex",alignItems:"center",gap:3,padding:"2px 6px",borderRadius:999,background:active ? "rgba(167,243,208,0.22)" : "#ECFDF5",border:active ? "1px solid rgba(167,243,208,0.4)" : "1px solid #A7F3D0",fontSize:9,color:active ? "#A7F3D0" : "#047857",fontWeight:800 }}>
                        <I n="check" s={10} c={active ? "#86EFAC" : "#059669"} />
                        Verified
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop:10,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10 }}>
            <input
              value={depPhone}
              onChange={e=>setDepPhone(e.target.value)}
              placeholder="Phone (M-Pesa only, optional)"
              style={{ width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",fontSize:12,fontFamily:"Geist,sans-serif",background:"#F8FAFC" }}
            />
            <input
              value={depName}
              onChange={e=>setDepName(e.target.value)}
              placeholder="Full name (optional)"
              style={{ width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",fontSize:12,fontFamily:"Geist,sans-serif",background:"#F8FAFC" }}
            />
          </div>
          <button onClick={() => submitDeposit(depMethod)} disabled={depLoading || !canDeposit} style={{ width:"100%",marginTop:12,padding:"12px 12px",background:(depLoading || !canDeposit)?"#E2E8F0":"linear-gradient(135deg,#22c55e 0%, #16a34a 48%, #15803d 100%)",color:(depLoading || !canDeposit)?"#94A3B8":"#ecfdf5",border: (depLoading || !canDeposit) ? "none" : "1px solid rgba(187,247,208,0.55)",borderRadius:11,fontWeight:900,fontSize:13,cursor:(depLoading || !canDeposit)?"not-allowed":"pointer",fontFamily:"Geist,sans-serif",boxShadow:(depLoading || !canDeposit)?"none":"0 12px 22px rgba(22,163,74,0.28)" }}>
            {depLoading
              ? "Opening checkout..."
              : (!canDeposit ? "No Deposit Required" : (depDone ? "Checkout Started" : "Pay Now"))}
          </button>
          {depErrorMsg && (
            <div style={{ marginTop:8, fontSize:11, color:"#DC2626", fontWeight:700, background:"#FFF1F2", border:"1px solid #FECACA", padding:"8px 10px", borderRadius:8 }}>
              {depErrorMsg}
            </div>
          )}
          <div style={{ marginTop:8, fontSize:11, color:"#64748B" }}>
            Pay by mobile money, card, or crypto. You’ll return here automatically after checkout.
          </div>
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14 }}>
        <div style={{ background:"linear-gradient(180deg,#FFFFFF 0%, #F8FAFC 100%)",borderRadius:16,padding:"20px 22px",border:"1px solid #E5E7EB",boxShadow:"0 10px 26px rgba(15,23,42,0.06)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10 }}>
            <div style={{ fontWeight:900,fontSize:15,letterSpacing:"-0.02em",color:"#0F172A" }}>Request Withdrawal</div>
            <div style={{ padding:"5px 10px",background:can?"#ECFDF5":"#FEF2F2",border:`1px solid ${can?"#BBF7D0":"#FECACA"}`,borderRadius:999,fontSize:10,color:can?"#166534":"#991B1B",fontWeight:800 }}>
              {can ? "Payout window open" : "Payouts next Tue/Fri"}
            </div>
          </div>
          <div style={{ marginBottom:14,borderRadius:12,background:"#000",border:"1px solid #171717",color:"#fff",display:"grid",gridTemplateColumns:"minmax(0,1fr) clamp(96px,20vw,150px)",alignItems:"stretch",overflow:"hidden",minHeight:96 }}>
            <div style={{ padding:"12px 14px",display:"flex",alignItems:"center",gap:10,minWidth:0 }}>
              <div style={{ width:44,height:44,borderRadius:10,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.26)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"inset 0 1px 0 rgba(255,255,255,0.12)" }}>
                <img
                  src={PAYMENT_ICON_SOURCES["M-Pesa"] || PAYMENT_ICON_SOURCES["Google Pay"]}
                  alt="M-Pesa"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  style={{ width:30, height:18, objectFit:"contain" }}
                />
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:10,opacity:0.6,letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:700 }}>Available Earnings</div>
                <div style={{ fontSize:28,fontWeight:900,letterSpacing:"-0.03em",marginTop:4 }}>KES {earn.toLocaleString()}</div>
              </div>
            </div>
            <div style={{ background:"#000",overflow:"hidden" }}>
              <img
                src={WALLET_EARNINGS_BOT_IMAGE.primary}
                alt=""
                referrerPolicy="no-referrer"
                onError={(e) => setFallbackSrc(e, WALLET_EARNINGS_BOT_IMAGE)}
                style={{ width:"100%",height:"100%",objectFit:"cover",objectPosition:"center right",pointerEvents:"none",userSelect:"none" }}
              />
            </div>
          </div>
          <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#64748B",marginBottom:6,letterSpacing:"0.08em" }}>
            Amount ({currency === DISPLAY_CURRENCIES.USD ? "USD" : "KSH"})
          </label>
          <input
            type="number"
            value={wdAmt}
            onChange={e=>setWdAmt(e.target.value)}
            placeholder={`Enter amount in ${currency === DISPLAY_CURRENCIES.USD ? "USD" : "KSH"}...`}
            style={{ width:"100%",padding:"11px 12px",background:"#F8FAFC",border:"1.5px solid #E2E8F0",borderRadius:10,fontSize:14,color:"#0F172A",outline:"none",fontFamily:"Geist,sans-serif",boxSizing:"border-box",marginBottom:12 }}
          />
          {currency === DISPLAY_CURRENCIES.USD && (
            <div data-currency-static="1" style={{ fontSize:10, color:"#64748B", marginTop:-6, marginBottom:8 }}>
              {`Converted using 1 USD = ${FX_KES_PER_USD} KSH.`}
            </div>
          )}
          <div style={{ fontSize:11, color:"#64748B", marginTop:-6, marginBottom:10 }}>
            Minimum withdrawal amount is KES {MIN_WITHDRAWAL_KES.toLocaleString()}.
          </div>
          <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#64748B",marginBottom:8,letterSpacing:"0.08em" }}>Method</label>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(132px,1fr))",gap:8,marginBottom:16 }}>
            {DEPOSIT_METHODS.map((m) => {
              const active = method === m.value;
              const logoSrc = m.logo ? (PAYMENT_ICON_SOURCES[m.logo] || PAYMENT_ICON_SOURCES["Google Pay"]) : "";
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.value)}
                  style={{
                    padding:"10px 9px",
                    borderRadius:10,
                    border:`1.5px solid ${active ? "#111827" : "#E2E8F0"}`,
                    background:active ? "#111827" : "#fff",
                    color:active ? "#fff" : "#64748B",
                    fontWeight:active ? 800 : 700,
                    cursor:"pointer",
                    fontSize:12,
                    fontFamily:"Geist,sans-serif",
                    transition:"all .15s",
                    textAlign:"left",
                    minHeight:68
                  }}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {logoSrc ? (
                      <img
                        src={logoSrc}
                        alt={`${m.title} logo`}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        style={{ width:34, height:18, objectFit:"contain", filter:active ? "none" : "grayscale(1) saturate(0) brightness(0.74)" }}
                      />
                    ) : (
                      <div style={{ minWidth:34, fontSize:9, fontWeight:900, letterSpacing:"0.05em", opacity:active ? 0.9 : 0.62 }}>
                        BANK
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize:12, fontWeight:900, lineHeight:1.2 }}>{m.title}</div>
                      <div style={{ fontSize:10, opacity:active ? 0.82 : 0.62, marginTop:2 }}>{m.subtitle}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={submitWithdrawal} disabled={!canSubmitWithdrawal} style={{ width:"100%",padding:"13px",background:canSubmitWithdrawal?"linear-gradient(135deg,#111827 0%, #0F172A 100%)":"#E2E8F0",color:canSubmitWithdrawal?"#fff":"#94A3B8",border:"none",borderRadius:11,fontWeight:800,fontSize:14,cursor:canSubmitWithdrawal?"pointer":"not-allowed",fontFamily:"Geist,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background .15s",boxShadow:canSubmitWithdrawal?"0 10px 20px rgba(15,23,42,0.18)":"none" }}>
            <I n={done?"check":"wallet"} s={14} c={canSubmitWithdrawal?"#fff":"#94A3B8"}/>{done?"Submitted!":"Submit Withdrawal"}
          </button>
        </div>
        <div style={{ background:"#FFFFFF",borderRadius:16,padding:"20px 22px",border:"1px solid #E5E7EB",boxShadow:"0 10px 26px rgba(15,23,42,0.06)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
            <div style={{ fontWeight:900,fontSize:15,letterSpacing:"-0.02em",color:"#0F172A" }}>History</div>
            <div style={{ fontSize:11,color:"#94A3B8",fontWeight:700 }}>{historyRows.length} transactions</div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1.1fr 1fr 1fr",gap:8,marginBottom:8 }}>
            {["Date","Type","Amount","Status"].map(h=>(
              <span key={h} style={{ fontSize:9,color:"#94A3B8",fontWeight:800,letterSpacing:"0.14em" }}>{h.toUpperCase()}</span>
            ))}
          </div>
          {historyRows.map((w)=>(
            <div key={w.key} style={{ display:"grid",gridTemplateColumns:"1fr 1.1fr 1fr 1fr",gap:8,padding:"10px 0",borderTop:"1px solid #F1F5F9",alignItems:"center" }}>
              <span style={{ fontSize:12,color:"#64748B" }}>{w.date}</span>
              <span style={{ fontSize:12,color:"#334155",fontWeight:700 }}>{w.type}</span>
              <span style={{ fontSize:13,fontWeight:800,letterSpacing:"-0.02em",color:"#0F172A" }}>KES {Number(w.amount || 0).toLocaleString()}</span>
              <span style={{ fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:999,background:historyStatusStyle(w.status).bg,color:historyStatusStyle(w.status).col,display:"inline-block",width:"fit-content" }}>{w.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
    }

/* 
   ADMIN DASHBOARD - FULL
 */

const ADMIN_USERS = [
  { id:"U001", name:"Alice Mwangi",    email:"alice.m@gmail.com",    tier:"Executive",       deposit:20000,  status:"Active",   joined:"Mar 1, 2025",  earn:9400,   phone:"0712 345 678" },
  { id:"U002", name:"Brian Kamau",     email:"brian.k@gmail.com",    tier:"Standard",     deposit:10000,  status:"Active",   joined:"Feb 25, 2025", earn:3200,   phone:"0723 456 789" },
  { id:"U003", name:"Carol Njoki",     email:"carol.n@yahoo.com",    tier:"Executive Pro",    deposit:50000,  status:"Active",   joined:"Feb 18, 2025", earn:28000,  phone:"0734 567 890" },
  { id:"U004", name:"David Otieno",    email:"david.o@gmail.com",    tier:"Regular",      deposit:5000,   status:"Pending",  joined:"Mar 8, 2025",  earn:0,      phone:"0745 678 901" },
  { id:"U005", name:"Emma Wanjiku",    email:"emma.w@hotmail.com",   tier:"Diamond",deposit:100000, status:"Active",   joined:"Jan 30, 2025", earn:71000,  phone:"0756 789 012" },
  { id:"U006", name:"Francis Odhiambo",email:"francis.o@gmail.com",  tier:"Standard",     deposit:10000,  status:"Active",   joined:"Feb 10, 2025", earn:5600,   phone:"0767 890 123" },
  { id:"U007", name:"Grace Achieng",   email:"grace.a@gmail.com",    tier:"Executive",       deposit:20000,  status:"Suspended",joined:"Jan 15, 2025", earn:12000,  phone:"0778 901 234" },
  { id:"U008", name:"Henry Muriuki",   email:"henry.m@gmail.com",    tier:"Regular",      deposit:5000,   status:"Active",   joined:"Mar 5, 2025",  earn:1200,   phone:"0789 012 345" },
  { id:"U009", name:"Irene Chebet",    email:"irene.c@gmail.com",    tier:"Executive Pro",    deposit:50000,  status:"Active",   joined:"Feb 1, 2025",  earn:34000,  phone:"0790 123 456" },
  { id:"U010", name:"James Kimani",    email:"james.k@yahoo.com",    tier:"Standard",     deposit:10000,  status:"Pending",  joined:"Mar 9, 2025",  earn:0,      phone:"0701 234 567" },
];

const ADMIN_WITHDRAWALS = [
  { id:"W001", user:"Alice Mwangi",   amount:2400,  method:"M-Pesa",      date:"Mar 8, 2025",  status:"Pending",  phone:"0712 345 678", tier:"Executive" },
  { id:"W002", user:"Brian Kamau",    amount:1200,  method:"M-Pesa",      date:"Mar 7, 2025",  status:"Pending",  phone:"0723 456 789", tier:"Standard" },
  { id:"W003", user:"Emma Wanjiku",   amount:8000,  method:"Visa",        date:"Mar 7, 2025",  status:"Approved", phone:"0756 789 012", tier:"Diamond" },
  { id:"W004", user:"Carol Njoki",    amount:5500,  method:"M-Pesa",      date:"Mar 6, 2025",  status:"Approved", phone:"0734 567 890", tier:"Executive Pro" },
  { id:"W005", user:"Francis Odhiambo",amount:800, method:"Airtel Money", date:"Mar 5, 2025",  status:"Paid",     phone:"0767 890 123", tier:"Standard" },
  { id:"W006", user:"Irene Chebet",   amount:4200,  method:"M-Pesa",      date:"Mar 4, 2025",  status:"Paid",     phone:"0790 123 456", tier:"Executive Pro" },
  { id:"W007", user:"Henry Muriuki",  amount:600,   method:"M-Pesa",      date:"Mar 3, 2025",  status:"Rejected", phone:"0789 012 345", tier:"Regular" },
  { id:"W008", user:"Alice Mwangi",   amount:1800,  method:"M-Pesa",      date:"Mar 1, 2025",  status:"Paid",     phone:"0712 345 678", tier:"Executive" },
  { id:"W009", user:"David Otieno",   amount:500,   method:"M-Pesa",      date:"Feb 28, 2025", status:"Rejected", phone:"0745 678 901", tier:"Regular" },
  { id:"W010", user:"Emma Wanjiku",   amount:12000, method:"Crypto",      date:"Feb 25, 2025", status:"Paid",     phone:"0756 789 012", tier:"Diamond" },
];

const ADMIN_TXS = [
  { id:"T001", user:"Emma Wanjiku",    type:"Withdrawal",  amount:8000,   method:"Visa",        date:"Mar 7, 2025",  status:"Approved" },
  { id:"T002", user:"Carol Njoki",     type:"Withdrawal",  amount:5500,   method:"M-Pesa",      date:"Mar 6, 2025",  status:"Approved" },
  { id:"T003", user:"Alice Mwangi",    type:"Deposit",     amount:20000,  method:"M-Pesa",      date:"Mar 5, 2025",  status:"Paid" },
  { id:"T004", user:"Francis Odhiambo",type:"Withdrawal", amount:800,    method:"Airtel Money", date:"Mar 5, 2025",  status:"Paid" },
  { id:"T005", user:"David Otieno",    type:"Deposit",     amount:5000,   method:"M-Pesa",      date:"Mar 4, 2025",  status:"Pending" },
  { id:"T006", user:"Irene Chebet",    type:"Withdrawal",  amount:4200,   method:"M-Pesa",      date:"Mar 4, 2025",  status:"Paid" },
  { id:"T007", user:"Henry Muriuki",   type:"Deposit",     amount:5000,   method:"M-Pesa",      date:"Mar 3, 2025",  status:"Paid" },
  { id:"T008", user:"Brian Kamau",     type:"Withdrawal",  amount:1200,   method:"M-Pesa",      date:"Mar 2, 2025",  status:"Pending" },
  { id:"T009", user:"Emma Wanjiku",    type:"Earning",     amount:3500,   method:"Bonus Rewards",  date:"Mar 1, 2025",  status:"Paid" },
  { id:"T010", user:"Grace Achieng",   type:"Deposit",     amount:20000,  method:"Visa",        date:"Feb 28, 2025", status:"Paid" },
  { id:"T011", user:"James Kimani",    type:"Deposit",     amount:10000,  method:"M-Pesa",      date:"Feb 27, 2025", status:"Pending" },
  { id:"T012", user:"Alice Mwangi",    type:"Earning",     amount:2400,   method:"Videos",      date:"Feb 26, 2025", status:"Paid" },
];

function AdminDash({ go, authUser, profileRow, onSignOut, externalTab, onTabChange }) {
  const [sideOpen, setSideOpen] = useState(true);
  const normalizeAdminTab = useCallback((tabId) => {
    const tab = String(tabId || "").toLowerCase();
    return ["overview","users","transactions","withdrawals","risk","settings"].includes(tab) ? tab : "overview";
  }, []);
  const [tabState, setTabState] = useState(() => normalizeAdminTab(externalTab || "overview"));
  const isAdminTabControlled = typeof externalTab === "string";
  const tab = isAdminTabControlled ? normalizeAdminTab(externalTab) : tabState;
  const setTab = useCallback((nextTab) => {
    const resolvedRaw = typeof nextTab === "function" ? nextTab(tab) : nextTab;
    const resolved = normalizeAdminTab(resolvedRaw);
    if (!isAdminTabControlled) setTabState(resolved);
    if (onTabChange) onTabChange(resolved);
  }, [isAdminTabControlled, normalizeAdminTab, onTabChange, tab]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 769);
  const [isTiny, setIsTiny] = useState(window.innerWidth < 380);
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [userCategory, setUserCategory] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [wdFilter, setWdFilter] = useState("all");
  const [users, setUsers] = useState(ADMIN_USERS);
  const [withdrawals, setWithdrawals] = useState(ADMIN_WITHDRAWALS);
  const [txs, setTxs] = useState(ADMIN_TXS);
  const [txFilter, setTxFilter] = useState("all");
  const [tierUpgradeEvents, setTierUpgradeEvents] = useState([]);
  const [riskFlags, setRiskFlags] = useState([]);
  const [riskFilter, setRiskFilter] = useState("open");
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditFilter, setAuditFilter] = useState("all");
  const [deposits, setDeposits] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [tierDistributionRows, setTierDistributionRows] = useState([]);
  const [adminSummary, setAdminSummary] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState("");
  const [syncError, setSyncError] = useState("");
  const [wdDays, setWdDays] = useState({ tue:true, wed:false, fri:true });
  const [videoPrice, setVideoPrice] = useState(50);
  const [maintenance, setMaintenance] = useState(false);
  const [payoutMode, setPayoutMode] = useState(MANUAL_WITHDRAWALS ? "manual" : "auto");
  const [notifOpen, setNotifOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const adminHeadingFont = "Sora, Geist, sans-serif";
  const ADMIN_LIST_LIMIT = 500;
  const ADMIN = {
    bg:"#F7F7F7",
    panel:"#FFFFFF",
    border:"#111111",
    text:"#111111",
    muted:"#6B7280",
    blue:"#2563EB",
    blueAlt:"#0EA5E9",
    green:"#16A34A",
    red:"#DC2626",
    redAlt:"#B91C1C"
  };
  const sideW = isMobile ? (isTiny ? 200 : 230) : 230;
  const adminName = profileRow?.name || (authUser?.email ? authUser.email.split("@")[0] : "Admin");
  const adminEmail = profileRow?.email || authUser?.email || "admin@edisonpay.co.ke";
  const symScale = isMobile ? 0.8 : 1;
  const liveSymbols = (isMobile ? LIVE_SYMBOLS.slice(0,6) : LIVE_SYMBOLS).map(s => ({
    ...s,
    size: Math.round(s.size * symScale)
  }));

  const fmtDate = (d) => {
    if (!d) return "-";
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  };
  const fmtDateTime = (d) => {
    if (!d) return "-";
    const dt = new Date(d);
    return Number.isNaN(dt.getTime())
      ? String(d)
      : dt.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
  };
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const normalizeUser = (u, i) => {
    const meta = (u?.profile_data && typeof u.profile_data === "object") ? u.profile_data : {};
    const wallet = Array.isArray(u.wallets) ? u.wallets[0] : u.wallets;
    const tierVal = u.tier ?? u.plan;
    const tierLabel = Number.isFinite(Number(tierVal)) ? (TIERS[Number(tierVal)-1]?.name || tierVal) : (tierVal || "Regular");
    const statusRaw = String(u.status || "active");
    const status = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1).toLowerCase();
    const tierSelectedRaw = String(meta.tier_selected ?? "").toLowerCase();
    const tierSelected = meta.tier_selected === true || ["1", "true", "yes", "on"].includes(tierSelectedRaw);
    const balance = num(wallet?.balance ?? u.balance);
    return {
      id: u.id || u.user_id || `U${String(i+1).padStart(3,"0")}`,
      name: u.name || u.full_name || u.username || "Unknown",
      email: u.email || u.user_email || "?",
      tier: tierLabel,
      deposit: num(u.deposit || u.deposit_amount || u.amount),
      status: status || "Active",
      joined: fmtDate(u.joined || u.signup_at || u.created_at || u.date),
      earn: num(u.earn || u.earnings || u.total_earnings || balance),
      phone: u.phone || u.msisdn || "?",
      category: meta.category || u.category || "Client",
      referredBy: meta.referred_by || "",
      referralCode: u.referral_code || meta.ref_code || "",
      tierSelected,
    };
  };
  const normalizeWithdrawal = (w, i) => {
    const rawStatus = String(w.status || "queued").toLowerCase();
    const statusMap = { queued: "Pending", processing: "Approved", completed: "Paid", failed: "Rejected" };
    const status = statusMap[rawStatus] || "Pending";
    const user = w.users || w.user || {};
    const tierVal = user.tier ?? w.tier ?? w.plan;
    const tierLabel = Number.isFinite(Number(tierVal)) ? (TIERS[Number(tierVal)-1]?.name || tierVal) : (tierVal || "?");
    return {
      id: w.id || w.payout_id || w.withdrawal_id || `W${String(i+1).padStart(3,"0")}`,
      user: w.user || w.name || user.full_name || w.user_name || "Unknown",
      amount: num(w.amount || w.amount_kes || w.requested_amount),
      method: w.method || w.channel || "M-Pesa",
      date: fmtDate(w.date || w.scheduled_for || w.created_at),
      status,
      phone: w.phone || user.phone || w.msisdn || "?",
      tier: tierLabel,
    };
  };
  const normalizeTx = (t, i) => ({
    id: t.id || t.tx_id || `T${String(i+1).padStart(3,"0")}`,
    userId: t.user_id || null,
    user: t.user || t.name || t.user_name || "Unknown",
    type: t.type || t.category || "Earning",
    amount: num(t.amount || t.amount_kes),
    method: t.method || t.channel || "-",
    date: fmtDate(t.date || t.created_at),
    status: t.status || "Paid",
  });
  const normalizeTierUpgradeEvent = (event, i) => {
    const linkedUser = Array.isArray(event?.users) ? event.users[0] : event?.users;
    const fromTierVal = Number(event?.from_tier);
    const toTierVal = Number(event?.to_tier);
    const fromTierLabel = Number.isFinite(fromTierVal) ? (TIERS[fromTierVal - 1]?.name || `Tier ${fromTierVal}`) : "-";
    const toTierLabel = Number.isFinite(toTierVal) ? (TIERS[toTierVal - 1]?.name || `Tier ${toTierVal}`) : "-";
    return {
      id: event?.event_id || `TU${String(i + 1).padStart(3, "0")}`,
      user: linkedUser?.full_name || linkedUser?.email || String(event?.user_id || "").slice(0, 8) || "Unknown",
      fromTier: fromTierLabel,
      toTier: toTierLabel,
      source: String(event?.source || "system").replace(/_/g, " "),
      providerRef: event?.provider_reference || "-",
      when: fmtDateTime(event?.created_at)
    };
  };
  const normalizeAuditEvent = (event, i) => ({
    id: event?.event_id || `PA${String(i + 1).padStart(3, "0")}`,
    source: String(event?.source || "unknown"),
    decision: String(event?.decision || "unknown"),
    reference: event?.merchant_reference || event?.tracking_id || "-",
    expectedAmount: num(event?.expected_amount),
    providerAmount: num(event?.provider_amount),
    when: fmtDateTime(event?.created_at)
  });
  const normalizeDeposit = (d, i) => ({
    id: d?.deposit_id || `D${String(i + 1).padStart(3, "0")}`,
    userId: d?.user_id || null,
    status: String(d?.status || "pending").toLowerCase(),
    amount: num(d?.amount),
    tier: Number(d?.tier_at_deposit) || null,
    providerRef: d?.provider_reference || "-",
    when: fmtDateTime(d?.created_at)
  });
  const normalizeReferral = (r, i) => ({
    id: r?.ref_id || `R${String(i + 1).padStart(3, "0")}`,
    referrerId: r?.referrer_id || null,
    referredUserId: r?.referred_user_id || null,
    depositId: r?.deposit_id || null,
    commission: num(r?.commission_amount),
    when: fmtDateTime(r?.created_at)
  });

  useEffect(() => {
    const fn = () => {
      const w = window.innerWidth;
      const m = w < 769;
      setIsMobile(m);
      setIsTiny(w < 380);
      if (m) setSideOpen(false);
    };
    window.addEventListener("resize", fn); fn();
    return () => window.removeEventListener("resize", fn);
  }, []);

  const loadAdminData = useCallback(async () => {
    if (!supabase) return;
    setAdminLoading(true);
    setSyncError("");
    try {
      const [uRes, wRes, tRows, flagRows, upgradesRes, auditRows, depRows, refRows, summaryRes, tierDistRes] = await Promise.all([
        supabase
          .from("users")
          .select("user_id,full_name,email,phone,tier,status,signup_at,referral_code,profile_data,wallets(balance)")
          .order("signup_at", { ascending: false })
          .limit(ADMIN_LIST_LIMIT),
        supabase
          .from("payout_requests")
          .select("payout_id,user_id,requested_amount,status,scheduled_for,processed_at,users(full_name,email,phone,tier)")
          .order("scheduled_for", { ascending: false })
          .limit(ADMIN_LIST_LIMIT),
        fetchTable("transactions", { orderBy: "created_at", limit: ADMIN_LIST_LIMIT }),
        fetchTable("payment_flags", { orderBy: "created_at", limit: ADMIN_LIST_LIMIT }),
        supabase
          .from("tier_upgrade_events")
          .select("event_id,user_id,from_tier,to_tier,source,provider_reference,created_at,users(full_name,email)")
          .order("created_at", { ascending: false })
          .limit(120),
        fetchTable("payment_audit_events", { orderBy: "created_at", limit: ADMIN_LIST_LIMIT }),
        fetchTable("deposits", { orderBy: "created_at", limit: ADMIN_LIST_LIMIT }),
        fetchTable("referrals", { orderBy: "created_at", limit: ADMIN_LIST_LIMIT }),
        supabase.rpc("get_admin_system_overview"),
        supabase.rpc("get_admin_tier_distribution"),
      ]);
      const u = Array.isArray(uRes?.data) ? uRes.data : [];
      const w = Array.isArray(wRes?.data) ? wRes.data : [];
      const txRows = Array.isArray(tRows) ? tRows : [];
      const flags = Array.isArray(flagRows) ? flagRows : [];
      const upgrades = Array.isArray(upgradesRes?.data) ? upgradesRes.data : [];
      const audits = Array.isArray(auditRows) ? auditRows : [];
      const deps = Array.isArray(depRows) ? depRows : [];
      const refs = Array.isArray(refRows) ? refRows : [];
      setUsers(u.length ? u.map(normalizeUser) : []);
      setWithdrawals(w.length ? w.map(normalizeWithdrawal) : []);
      setTxs(txRows.length ? txRows.map(normalizeTx) : []);
      setRiskFlags(flags);
      setTierUpgradeEvents(upgrades.map(normalizeTierUpgradeEvent));
      setAuditEvents(audits.map(normalizeAuditEvent));
      setDeposits(deps.map(normalizeDeposit));
      setReferrals(refs.map(normalizeReferral));
      const summaryRow = Array.isArray(summaryRes?.data) ? summaryRes.data[0] : summaryRes?.data;
      setAdminSummary(summaryRow && typeof summaryRow === "object" ? summaryRow : null);
      const tierRows = Array.isArray(tierDistRes?.data) ? tierDistRes.data : [];
      setTierDistributionRows(tierRows);
      setLastSyncAt(new Date().toISOString());
    } catch (e) {
      setSyncError("Failed to refresh admin data.");
    } finally {
      setAdminLoading(false);
    }
  }, [supabase, ADMIN_LIST_LIMIT]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (ignore) return;
      await loadAdminData();
    })();
    return () => { ignore = true; };
  }, [loadAdminData]);

  const summaryNum = useCallback((key, fallback = 0) => {
    const n = Number(adminSummary?.[key]);
    return Number.isFinite(n) ? n : fallback;
  }, [adminSummary]);

  const totalUsersCount = summaryNum("total_users", users.length);
  const activeUsersCount = summaryNum("active_users", users.filter((u) => String(u?.status || "").toLowerCase() === "active").length);
  const paidOutTotal = summaryNum(
    "completed_withdrawals_amount",
    withdrawals
      .filter((w) => String(w?.status || "").toLowerCase() === "paid")
      .reduce((sum, w) => sum + num(w?.amount), 0)
  );
  const pendingWithdrawalsCount = summaryNum(
    "pending_withdrawals",
    withdrawals.filter((w) => String(w?.status || "").toLowerCase() === "pending").length
  );
  const pendingDepositsCount = summaryNum(
    "pending_deposits",
    deposits.filter((d) => String(d?.status || "").toLowerCase() === "pending").length
  );
  const failedDepositsCount = summaryNum(
    "failed_deposits",
    deposits.filter((d) => String(d?.status || "").toLowerCase() === "failed").length
  );
  const pendingTierActivationCount = summaryNum(
    "pending_tier_activation",
    users.filter((u) => u.tierSelected !== true).length
  );
  const referralPayoutTotal = summaryNum(
    "total_referral_commission",
    referrals.reduce((sum, r) => sum + num(r?.commission), 0)
  );
  const openRiskCount = summaryNum(
    "open_payment_flags",
    riskFlags.filter((f) => String(f?.status || "").toLowerCase() === "open").length
  );
  const tierUpgradeCount = summaryNum("tier_upgrade_events_count", tierUpgradeEvents.length);

  const tierDistribution = useMemo(() => {
    const map = new Map();
    (Array.isArray(tierDistributionRows) ? tierDistributionRows : []).forEach((row) => {
      const tierId = Number(row?.tier);
      const count = Number(row?.user_count);
      if (Number.isFinite(tierId) && Number.isFinite(count)) map.set(tierId, count);
    });
    const total = totalUsersCount > 0 ? totalUsersCount : users.length;
    return TIERS.map((tierItem) => {
      const tierId = Number(tierItem.id);
      const countFromRpc = map.get(tierId);
      const fallbackCount = users.filter((u) => String(u?.tier || "").toLowerCase() === String(tierItem.name || "").toLowerCase()).length;
      const count = Number.isFinite(countFromRpc) ? countFromRpc : fallbackCount;
      const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
      return { n: tierItem.name, c: tierItem.acc, count, pct };
    });
  }, [tierDistributionRows, totalUsersCount, users]);

  const adminNav = [
    {id:"overview",     label:"Overview",     ic:"grid",     badge:null},
    {id:"users",        label:"Users",        ic:"users",    badge:totalUsersCount || null},
    {id:"transactions", label:"Transactions", ic:"wallet",   badge:null},
    {id:"withdrawals",  label:"Withdrawals",  ic:"up",       badge:pendingWithdrawalsCount || null},
    {id:"risk",         label:"Fraud Flags",  ic:"shield",   badge:openRiskCount || null},
    {id:"settings",     label:"Settings",     ic:"settings", badge:null},
  ];

  const updateWithdrawal = async (id, status) => {
    setWithdrawals(ws => ws.map(w => w.id===id ? {...w,status} : w));
    if (!supabase) return;
    try {
      const statusMap = { Pending: "queued", Approved: "processing", Paid: "completed", Rejected: "failed" };
      const nextStatus = statusMap[status] || "queued";
      await supabase
        .from("payout_requests")
        .update({ status: nextStatus, processed_at: status === "Paid" ? new Date().toISOString() : null })
        .eq("payout_id", id);
    } catch (e) {
      /* no-op */
    }
  };
  const approveWd = (id) => updateWithdrawal(id, "Approved");
  const rejectWd  = (id) => updateWithdrawal(id, "Rejected");
  const payWd     = (id) => updateWithdrawal(id, "Paid");
  const updateRiskFlagStatus = async (flagId, nextStatus) => {
    if (!flagId || !nextStatus) return;
    const normalized = String(nextStatus).toLowerCase();
    setRiskFlags((rows) =>
      rows.map((r) =>
        r?.flag_id === flagId
          ? {
              ...r,
              status: normalized,
              resolved_at: (normalized === "resolved" || normalized === "ignored")
                ? new Date().toISOString()
                : null
            }
          : r
      )
    );
    if (!supabase) return;
    try {
      const patch = {
        status: normalized,
        resolved_at: (normalized === "resolved" || normalized === "ignored")
          ? new Date().toISOString()
          : null
      };
      await supabase
        .from("payment_flags")
        .update(patch)
        .eq("flag_id", flagId);
    } catch (e) {
      /* no-op */
    }
  };
  const updateUserStatus = async (userId, nextStatus) => {
    if (!userId || !nextStatus) return;
    const statusDb = String(nextStatus || "").toLowerCase();
    const statusUi = statusDb.charAt(0).toUpperCase() + statusDb.slice(1);
    setUsers((rows) => rows.map((u) => (u.id === userId ? { ...u, status: statusUi } : u)));
    setSelectedUser((prev) => (prev && prev.id === userId ? { ...prev, status: statusUi } : prev));
    if (!supabase) return;
    try {
      await supabase.from("users").update({ status: statusDb }).eq("user_id", userId);
    } catch (e) {
      /* no-op */
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchFilter = userFilter==="all" || u.status.toLowerCase()===userFilter;
    const matchCategory = userCategory==="all" || String(u.category || "").toLowerCase()===userCategory;
    return matchSearch && matchFilter && matchCategory;
  });
  const categoryOptions = ["all", ...Array.from(new Set(users.map(u => String(u.category || "Client").toLowerCase())))];

  const filteredWd = wdFilter==="all" ? withdrawals : withdrawals.filter(w=>w.status.toLowerCase()===wdFilter);
  const filteredTx = txFilter==="all" ? txs : txs.filter(t=>t.type.toLowerCase()===txFilter||t.status.toLowerCase()===txFilter);
  const filteredRiskFlags = riskFilter === "all"
    ? riskFlags
    : riskFlags.filter((f) => String(f?.status || "").toLowerCase() === riskFilter);
  const filteredAuditEvents = auditFilter === "all"
    ? auditEvents
    : auditEvents.filter((e) => String(e?.decision || "").toLowerCase() === auditFilter);
  const selectedUserReferralCount = selectedUser
    ? referrals.filter((r) => String(r?.referrerId || "") === String(selectedUser.id)).length
    : 0;
  const selectedUserReferralEarn = selectedUser
    ? referrals
        .filter((r) => String(r?.referrerId || "") === String(selectedUser.id))
        .reduce((sum, r) => sum + num(r?.commission), 0)
    : 0;

  const S = (label, txt) => ({ fontSize:11, color:ADMIN.muted, fontWeight:600, label, txt });

  const statusBadge = (s) => {
    const map = {
      Active:[ADMIN.green,"#ECFDF5"],
      Paid:[ADMIN.green,"#ECFDF5"],
      Approved:[ADMIN.green,"#ECFDF5"],
      Pending:[ADMIN.blue,"#EFF6FF"],
      Suspended:[ADMIN.red,"#FFF0F0"],
      Banned:[ADMIN.redAlt,"#FFF0F0"],
      Rejected:[ADMIN.red,"#FFF0F0"],
      Earning:[ADMIN.blue,"#EFF6FF"],
      Deposit:[ADMIN.green,"#ECFDF5"],
      Withdrawal:[ADMIN.blue,"#EFF6FF"]
    };
    const [c,bg] = map[s]||["#888","#F5F5F5"];
    return <span style={{ fontSize:9,fontWeight:800,padding:"3px 8px",borderRadius:50,background:bg,color:c,display:"inline-block",whiteSpace:"nowrap",letterSpacing:"0.05em",border:"1px solid #111" }}>{s}</span>;
  };

  const adminTierColor = (name) => {
    const key = String(name || "").toLowerCase();
    if (key.includes("exec") || key.includes("executive pro")) return ADMIN.redAlt;
    if (key.includes("executive")) return ADMIN.red;
    if (key.includes("deluxe")) return ADMIN.green;
    if (key.includes("standard")) return ADMIN.blueAlt;
    if (key.includes("regular")) return ADMIN.blue;
    return ADMIN.text;
  };
  const tierDot = (name) => {
    const tc = adminTierColor(name);
    return <span style={{ fontSize:10,fontWeight:800,color:tc,padding:"2px 7px",background:`${tc}18`,borderRadius:50,border:"1px solid #111",display:"inline-block",whiteSpace:"nowrap" }}>{name}</span>;
  };
  const categoryTag = (cat) => {
    const label = cat || "Client";
    return <span style={{ fontSize:10,fontWeight:800,color:"#111",padding:"2px 7px",background:"#fff",borderRadius:50,border:"1px solid #111",display:"inline-block",whiteSpace:"nowrap",textTransform:"capitalize" }}>{label}</span>;
  };

  const CARD = {
    background:"#fff",
    borderRadius:14,
    padding:"20px 22px",
    border:"1.5px solid #111",
    boxShadow:"0 6px 0 #111, 0 14px 24px rgba(0,0,0,0.12)"
  };

  return (
    <div style={{ display:"flex", height:"calc(100vh - 44px)", background:ADMIN.bg, fontFamily:"IBM Plex Sans, Geist, sans-serif", color:ADMIN.text, position:"relative" }}>

      {/* Mobile overlay */}
      {isMobile && sideOpen && (
        <div onClick={()=>setSideOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:199,backdropFilter:"blur(2px)" }}/>
      )}

      {/* "" SIDEBAR "" */}
      <aside style={{ width:sideOpen?sideW:0, minWidth:sideOpen?sideW:0, background:ADMIN.panel, borderRight:"2px solid #111", transition:"all .28s cubic-bezier(.4,0,.2,1)", overflow:"hidden", display:"flex", flexDirection:"column", position:isMobile?"fixed":"relative", height:"calc(100vh - 44px)", zIndex:200, boxShadow:isMobile&&sideOpen?"8px 0 0 #111, 18px 0 28px rgba(0,0,0,0.14)":"4px 0 0 #111, 10px 0 18px rgba(0,0,0,0.08)" }}>

        {/* Logo */}
        <div style={{ padding:"20px 18px 16px", borderBottom:"2px solid #111", display:"flex", alignItems:"center", gap:10 }}>
          <BrandMark size={34} />
          <div>
            <div style={{ fontWeight:900,fontSize:15,color:"#111",letterSpacing:"-0.03em" }}>EdisonPay</div>
            <div style={{ display:"inline-flex",alignItems:"center",gap:4,marginTop:2 }}>
              <div style={{ width:5,height:5,borderRadius:"50%",background:"#DC2626" }}/>
              <span style={{ fontSize:9,color:"#DC2626",fontWeight:800,letterSpacing:"0.12em" }}>ADMIN</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding:"10px 10px",flex:1,overflowY:"auto" }}>
          {adminNav.map(({id,label,ic,badge})=>(
            <div key={id} onClick={()=>{setTab(id); if(isMobile) setSideOpen(false);}}
              style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,cursor:"pointer",marginBottom:4,background:tab===id?"#111":"transparent",border:"1.5px solid #111",transition:"all .12s" }}>
              <I n={ic} s={15} c={tab===id?"#fff":"#111"}/>
              <span style={{ fontSize:13,fontWeight:tab===id?800:600,color:tab===id?"#fff":"#111",flex:1 }}>{label}</span>
              {badge && <span style={{ fontSize:9,fontWeight:900,padding:"2px 7px",borderRadius:50,background:"#fff",color:ADMIN.red,border:"1px solid #111" }}>{badge}</span>}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding:"12px 14px 18px", borderTop:"2px solid #111" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:10,background:"#fff",border:"1.5px solid #111",marginBottom:6,boxShadow:"0 4px 0 #111" }}>
            <div style={{ width:28,height:28,borderRadius:"50%",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <I n="user" s={13} c="#fff"/>
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:12,fontWeight:800,color:"#111" }}>{adminName}</div>
              <div style={{ fontSize:10,color:ADMIN.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{adminEmail}</div>
            </div>
          </div>
          <div onClick={()=> (onSignOut ? onSignOut() : go("landing"))} style={{ display:"flex",alignItems:"center",gap:9,padding:"9px 12px",fontSize:13,color:"#111",cursor:"pointer",borderRadius:9,transition:"background .12s",border:"1.5px solid #111" }}
            onMouseEnter={e=>e.currentTarget.style.background="#F3F4F6"}
            onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
            <I n="logout" s={14} c={ADMIN.red}/> Exit Admin
          </div>
        </div>
      </aside>

      {/* "" MAIN "" */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>

        {/* Topbar */}
        <header style={{ height:58,background:"#fff",borderBottom:"2px solid #111",display:"flex",alignItems:"center",padding:"0 20px",gap:10,flexShrink:0 }}>
          <button onClick={()=>setSideOpen(o=>!o)} style={{ width:34,height:34,borderRadius:8,border:"1.5px solid #111",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 3px 0 #111" }}>
            <I n="menu" s={15} c="#111"/>
          </button>
          <div style={{ flex:1 }} />
          <div style={{ flex:1 }}/>
          <div style={{ display:"flex",alignItems:"center",gap:7,padding:"6px 12px",background:"#fff",border:"1.5px solid #111",borderRadius:8,flexShrink:0,boxShadow:"0 3px 0 #111" }}>
            <div style={{ width:6,height:6,borderRadius:"50%",background:ADMIN.green,animation:"pulse 2s infinite" }}/>
            <span style={{ fontSize:11,color:"#111",fontWeight:700,whiteSpace:"nowrap" }}>Platform Live</span>
          </div>
          <button onClick={()=>setNotifOpen(o=>!o)} style={{ width:34,height:34,borderRadius:8,border:"1.5px solid #111",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",flexShrink:0,boxShadow:"0 3px 0 #111" }}>
            <I n="bell" s={15} c="#111"/>
            {withdrawals.filter(w=>w.status==="Pending").length>0&&<div style={{ position:"absolute",top:6,right:6,width:8,height:8,borderRadius:"50%",background:"#DC2626",border:"1.5px solid #111" }}/>}
          </button>
          {notifOpen&&(
            <div style={{ position:"absolute",top:62,right:60,width:300,background:"#fff",border:"2px solid #111",borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",zIndex:999,padding:"14px 0",animation:"scaleIn .18s ease" }} onClick={e=>e.stopPropagation()}>
              <div style={{ padding:"0 16px 10px",borderBottom:"2px solid #111",fontSize:13,fontWeight:900,color:"#111" }}>Notifications</div>
              {[{t:"New withdrawal request",s:"Alice M. - KES 2,400",c:ADMIN.red},{t:"New user registered",s:"David O. joined - Regular tier",c:ADMIN.blue},{t:"Bonus credited",s:"1,247 bonus sessions done",c:ADMIN.green}].map((n,i)=>(
                <div key={i} style={{ padding:"10px 16px",display:"flex",gap:10 }}>
                  <div style={{ width:28,height:28,borderRadius:8,background:`${n.c}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"1px solid #111" }}>
                    <I n="bell" s={12} c={n.c}/>
                  </div>
                  <div><div style={{ fontSize:12,fontWeight:700,color:"#111" }}>{n.t}</div><div style={{ fontSize:11,color:ADMIN.muted,marginTop:2 }}>{n.s}</div></div>
                </div>
              ))}
            </div>
          )}
          <div style={{ width:34,height:34,borderRadius:"50%",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <I n="user" s={14} c="#fff"/>
          </div>
        </header>

        {/* "" CONTENT "" */}
        <div style={{ flex:1,overflowY:"auto",padding:"22px" }} onClick={()=>setNotifOpen(false)}>

          {/* Page title */}
          <div style={{ marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
            <div>
              <h2 style={{ fontSize:22,fontWeight:900,letterSpacing:"-0.04em",color:"#111",fontFamily:adminHeadingFont }}>
                {adminNav.find(n=>n.id===tab)?.label}
              </h2>
              <p style={{ fontSize:12,color:ADMIN.muted,marginTop:3 }}>
                {new Date().toDateString()}  -  EdisonPay Admin
                {lastSyncAt ? `  |  Synced: ${fmtDateTime(lastSyncAt)}` : ""}
              </p>
              {syncError && (
                <div style={{ marginTop:6, fontSize:11, color:ADMIN.red, fontWeight:800 }}>
                  {syncError}
                </div>
              )}
              {!syncError && (
                <div style={{ marginTop:6, fontSize:11, color:ADMIN.muted, fontWeight:700 }}>
                  Lists show latest {ADMIN_LIST_LIMIT} records per module. Totals come from server-side summary queries.
                </div>
              )}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <button
                onClick={loadAdminData}
                disabled={adminLoading}
                style={{ padding:"8px 14px",background:adminLoading?"#374151":"#111",color:"#fff",border:"1.5px solid #111",boxShadow:"0 4px 0 #111",borderRadius:9,fontSize:12,fontWeight:800,cursor:adminLoading?"not-allowed":"pointer",fontFamily:"Geist,sans-serif",display:"flex",alignItems:"center",gap:6 }}
              >
                <I n="activity" s={12} c="#fff"/>
                {adminLoading ? "Refreshing..." : "Refresh Data"}
              </button>
              {tab==="users"&&(
                <button style={{ padding:"8px 18px",background:"#111",color:"#fff",border:"1.5px solid #111",boxShadow:"0 4px 0 #111",borderRadius:9,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Geist,sans-serif",display:"flex",alignItems:"center",gap:6 }}>
                  <I n="user" s={12} c="#fff"/> Add User
                </button>
              )}
            </div>
          </div>

          {/* "" OVERVIEW TAB "" */}
          {tab==="overview" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {/* Stat cards */}
              <div className="ep-admin-stats" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12 }}>
                {[
                  [totalUsersCount,"Total Users","users",ADMIN.blue,"Live",true],
                  [activeUsersCount,"Active Users","activity",ADMIN.green,"Live",true],
                  [`KES ${paidOutTotal.toLocaleString()}`,"Total Paid Out","wallet",ADMIN.blueAlt,"Completed",true],
                  [pendingWithdrawalsCount,"Pending Withdrawals","up",ADMIN.red,"Needs attention",false],
                  [pendingDepositsCount,"Pending Deposits","wallet",ADMIN.blue,"Needs confirmation",false],
                  [failedDepositsCount,"Failed Deposits","xmark",ADMIN.redAlt,"Review provider logs",false],
                  [pendingTierActivationCount,"Pending Tier Activation","star",ADMIN.blueAlt,"Awaiting deposit",false],
                  [`KES ${referralPayoutTotal.toLocaleString()}`,"Referral Payouts","gift",ADMIN.green,"First-deposit only",true],
                  [openRiskCount,"Open Fraud Flags","shield",ADMIN.redAlt,"Triage needed",false],
                  [tierUpgradeCount,"Tier Upgrades","star",ADMIN.green,"History tracked",true],
                ].map(([v,l,ic,c,sub,_],i)=>(
                  <div key={i} className="ep-hover-lift" style={{ ...CARD }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                      <div style={{ width:32,height:32,borderRadius:9,background:`${c}18`,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid #111" }}>
                        <I n={ic} s={14} c={c}/>
                      </div>
                      <div style={{ fontSize:10,color:c,fontWeight:800 }}>{sub}</div>
                    </div>
                    <div style={{ fontSize:24,fontWeight:900,letterSpacing:"-0.04em",color:"#111",marginBottom:4 }}>{typeof v==="number"?v.toLocaleString():v}</div>
                    <div style={{ fontSize:11,color:ADMIN.muted,fontWeight:700 }}>{l}</div>
                  </div>
                ))}
              </div>

              <div className="ep-admin-grid2" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
                {/* Recent users */}
                <div style={CARD}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                    <h3 style={{ fontSize:14,fontWeight:900,color:"#111" }}>Recent Users</h3>
                    <span onClick={()=>setTab("users")} style={{ fontSize:11,color:ADMIN.blue,cursor:"pointer",fontWeight:800 }}>View All</span>
                  </div>
                  {users.slice(0,5).map((u,i)=>(
                    <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderTop:i>0?"1px solid #111":"none" }}>
                      <div style={{ width:30,height:30,borderRadius:"50%",background:`${adminTierColor(u.tier)}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:adminTierColor(u.tier),flexShrink:0,border:"1px solid #111" }}>{u.name[0]}</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:12,fontWeight:800,color:"#111",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.name}</div>
                        <div style={{ fontSize:10,color:ADMIN.muted }}>{u.tier}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:11,color:ADMIN.muted }}>KES {(u.deposit/1000).toFixed(0)}K</div>
                        {statusBadge(u.status)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tier distribution */}
                <div style={CARD}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
                    <h3 style={{ fontSize:14,fontWeight:900,color:"#111" }}>Tier Distribution</h3>
                    <span style={{ fontSize:13,fontWeight:900,color:"#111" }}>{totalUsersCount.toLocaleString()} users</span>
                  </div>
                  {tierDistribution.map((tr,i)=>(
                    <div key={i} style={{ marginBottom:12 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                          <div style={{ width:7,height:7,borderRadius:2,background:tr.c }}/>
                          <span style={{ color:ADMIN.muted,fontWeight:700 }}>{tr.n}</span>
                        </div>
                        <div style={{ display:"flex",gap:10 }}>
                          <span style={{ fontWeight:900,color:"#111" }}>{tr.count}</span>
                          <span style={{ color:ADMIN.muted }}>{tr.pct}%</span>
                        </div>
                      </div>
                      <div style={{ height:6,background:"#E5E7EB",borderRadius:99,overflow:"hidden",border:"1px solid #111" }}>
                        <div style={{ height:"100%",width:`${Math.max(0, Math.min(100, tr.pct))}%`,background:tr.c,borderRadius:99,transition:"width 1s ease" }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending withdrawals preview */}
              <div style={CARD}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                  <h3 style={{ fontSize:14,fontWeight:900,color:"#111" }}>Pending Withdrawals</h3>
                  <span onClick={()=>setTab("withdrawals")} style={{ fontSize:11,color:ADMIN.blue,cursor:"pointer",fontWeight:800 }}>Manage All</span>
                </div>
                {withdrawals.filter(w=>w.status==="Pending").length===0?(
                  <div style={{ padding:"20px",textAlign:"center",color:ADMIN.muted,fontSize:13 }}>No pending withdrawals "</div>
                ):withdrawals.filter(w=>w.status==="Pending").slice(0,3).map((w,i)=>(
                  <div key={w.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderTop:i>0?"1px solid #111":"none" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13,fontWeight:700,color:"#111" }}>{w.user}</div>
                      <div style={{ fontSize:11,color:ADMIN.muted }}>{w.method}  -  {w.date}</div>
                    </div>
                    <div style={{ fontSize:14,fontWeight:900,color:"#111" }}>KES {w.amount.toLocaleString()}</div>
                    <div style={{ display:"flex",gap:6 }}>
                      <button onClick={()=>approveWd(w.id)} style={{ padding:"5px 12px",background:"#ECFDF5",color:ADMIN.green,border:"1.5px solid #111",borderRadius:7,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif" }}>Approve</button>
                      <button onClick={()=>rejectWd(w.id)} style={{ padding:"5px 12px",background:"#FFF0F0",color:ADMIN.red,border:"1.5px solid #111",borderRadius:7,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif" }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pending deposits preview */}
              <div style={CARD}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                  <h3 style={{ fontSize:14,fontWeight:900,color:"#111" }}>Pending Deposits</h3>
                  <span style={{ fontSize:11,color:ADMIN.muted,fontWeight:800 }}>
                    {pendingDepositsCount} awaiting confirmation
                  </span>
                </div>
                {deposits.filter((d) => d.status === "pending").length === 0 ? (
                  <div style={{ padding:"20px",textAlign:"center",color:ADMIN.muted,fontSize:13 }}>No pending deposits.</div>
                ) : (
                  deposits
                    .filter((d) => d.status === "pending")
                    .slice(0, 5)
                    .map((d, i) => (
                      <div key={d.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderTop:i>0?"1px solid #111":"none" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13,fontWeight:700,color:"#111",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                            Ref: {d.providerRef}
                          </div>
                          <div style={{ fontSize:11,color:ADMIN.muted,whiteSpace:"nowrap" }}>
                            {d.when}  -  Tier {d.tier || "-"}
                          </div>
                        </div>
                        <div style={{ fontSize:14,fontWeight:900,color:"#111",whiteSpace:"nowrap" }}>KES {d.amount.toLocaleString()}</div>
                      </div>
                    ))
                )}
              </div>

              {/* Tier upgrade history preview */}
              <div style={CARD}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                  <h3 style={{ fontSize:14,fontWeight:900,color:"#111" }}>Recent Tier Upgrades</h3>
                  <span style={{ fontSize:11,color:ADMIN.muted,fontWeight:800 }}>
                    {tierUpgradeCount} events
                  </span>
                </div>
                {tierUpgradeEvents.length === 0 ? (
                  <div style={{ padding:"18px",textAlign:"center",color:ADMIN.muted,fontSize:13 }}>
                    No tier upgrades logged yet.
                  </div>
                ) : (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%",borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ borderBottom:"1px solid #111" }}>
                          {["Time","User","From","To","Source","Reference"].map((h) => (
                            <th
                              key={h}
                              style={{ padding:"10px 14px",fontSize:10,fontWeight:900,color:"#111",letterSpacing:"0.1em",textAlign:"left",whiteSpace:"nowrap" }}
                            >
                              {h.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tierUpgradeEvents.slice(0, 8).map((evt) => (
                          <tr
                            key={evt.id}
                            style={{ borderBottom:"1px solid #111",transition:"background .1s" }}
                            onMouseEnter={(e)=>e.currentTarget.style.background="#F3F4F6"}
                            onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}
                          >
                            <td style={{ padding:"10px 14px",fontSize:11,color:ADMIN.muted,whiteSpace:"nowrap" }}>{evt.when}</td>
                            <td style={{ padding:"10px 14px",fontSize:12,fontWeight:700,color:"#111",whiteSpace:"nowrap" }}>{evt.user}</td>
                            <td style={{ padding:"10px 14px",whiteSpace:"nowrap" }}>{tierDot(evt.fromTier)}</td>
                            <td style={{ padding:"10px 14px",whiteSpace:"nowrap" }}>{tierDot(evt.toTier)}</td>
                            <td style={{ padding:"10px 14px",fontSize:11,color:ADMIN.muted,textTransform:"capitalize",whiteSpace:"nowrap" }}>{evt.source}</td>
                            <td style={{ padding:"10px 14px",fontSize:11,color:ADMIN.muted,whiteSpace:"nowrap" }}>{evt.providerRef}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* "" USERS TAB "" */}
          {tab==="users" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {/* Filters */}
              <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}>
                <div style={{ display:"flex",gap:4,background:"#fff",border:"2px solid #111",borderRadius:9,padding:3 }}>
                  {["all","active","pending","suspended","banned"].map(f=>(
                    <button key={f} onClick={()=>setUserFilter(f)} style={{ padding:"6px 14px",borderRadius:7,border:"1px solid #111",background:userFilter===f?"#111":"transparent",color:userFilter===f?"#fff":"#111",fontSize:12,fontWeight:userFilter===f?800:600,cursor:"pointer",fontFamily:"Geist,sans-serif",textTransform:"capitalize" }}>{f}</button>
                  ))}
                </div>
                <div style={{ display:"flex",gap:4,background:"#fff",border:"2px solid #111",borderRadius:9,padding:3 }}>
                  {categoryOptions.map(c=>(
                    <button key={c} onClick={()=>setUserCategory(c)} style={{ padding:"6px 14px",borderRadius:7,border:"1px solid #111",background:userCategory===c?"#111":"transparent",color:userCategory===c?"#fff":"#111",fontSize:12,fontWeight:userCategory===c?800:600,cursor:"pointer",fontFamily:"Geist,sans-serif",textTransform:"capitalize" }}>{c}</button>
                  ))}
                </div>
                <div style={{ fontSize:12,color:ADMIN.muted }}>{filteredUsers.length} users</div>
              </div>

              {/* Table */}
              <div style={CARD}>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid #111" }}>
                        {["User","Tier","Category","Deposit","Earnings","Status","Joined","Actions"].map(h=>(
                          <th key={h} style={{ padding:"10px 14px",fontSize:10,fontWeight:900,color:"#111",letterSpacing:"0.1em",textAlign:"left",whiteSpace:"nowrap" }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u,i)=>{
                        const tc = adminTierColor(u.tier);
                        return (
                          <tr key={u.id} style={{ borderBottom:"1px solid #111",transition:"background .1s" }}
                            onMouseEnter={e=>e.currentTarget.style.background="#F3F4F6"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <td style={{ padding:"12px 14px" }}>
                              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                <div style={{ width:32,height:32,borderRadius:"50%",background:`${tc}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:tc,flexShrink:0,border:"1px solid #111" }}>{u.name[0]}</div>
                                <div>
                                  <div style={{ fontSize:13,fontWeight:700,color:"#111" }}>{u.name}</div>
                                  <div style={{ fontSize:11,color:ADMIN.muted }}>{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding:"12px 14px" }}>{tierDot(u.tier)}</td>
                            <td style={{ padding:"12px 14px" }}>{categoryTag(u.category)}</td>
                            <td style={{ padding:"12px 14px",fontSize:12,color:ADMIN.muted,fontWeight:700,whiteSpace:"nowrap" }}>KES {u.deposit.toLocaleString()}</td>
                            <td style={{ padding:"12px 14px",fontSize:12,fontWeight:800,color:ADMIN.green,whiteSpace:"nowrap" }}>KES {u.earn.toLocaleString()}</td>
                            <td style={{ padding:"12px 14px" }}>{statusBadge(u.status)}</td>
                            <td style={{ padding:"12px 14px",fontSize:11,color:ADMIN.muted,whiteSpace:"nowrap" }}>{u.joined}</td>
                            <td style={{ padding:"12px 14px" }}>
                              <div style={{ display:"flex",gap:5 }}>
                                <button onClick={()=>setSelectedUser(u)} style={{ padding:"4px 10px",background:"#EFF6FF",color:ADMIN.blue,border:"1px solid #111",borderRadius:6,fontSize:10,fontWeight:900,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap" }}>View</button>
                                <button style={{ padding:"4px 10px",background:"#ECFDF5",color:ADMIN.green,border:"1px solid #111",borderRadius:6,fontSize:10,fontWeight:900,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap" }}>Edit</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* User detail modal */}
              {selectedUser && (
                <div onClick={()=>setSelectedUser(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(4px)" }}>
                  <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",border:"2px solid #111",borderRadius:20,padding:"28px",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",animation:"scaleIn .2s ease" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24 }}>
                      <div style={{ display:"flex",gap:14,alignItems:"center" }}>
                        <div style={{ width:48,height:48,borderRadius:"50%",background:`${adminTierColor(selectedUser.tier)}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:adminTierColor(selectedUser.tier),border:"1px solid #111" }}>{selectedUser.name[0]}</div>
                        <div>
                          <div style={{ fontSize:18,fontWeight:900,color:"#111",letterSpacing:"-0.03em" }}>{selectedUser.name}</div>
                          <div style={{ fontSize:12,color:ADMIN.muted,marginTop:3 }}>{selectedUser.email}</div>
                        </div>
                      </div>
                      <button onClick={()=>setSelectedUser(null)} style={{ width:32,height:32,borderRadius:8,border:"1.5px solid #111",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 3px 0 #111" }}>
                        <I n="xmark" s={14} c="#111"/>
                      </button>
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>
                      {[["User ID",selectedUser.id],["Tier",selectedUser.tier],["Deposit",`KES ${selectedUser.deposit.toLocaleString()}`],["Earnings",`KES ${selectedUser.earn.toLocaleString()}`],["Status",selectedUser.status],["Joined",selectedUser.joined],["Phone",selectedUser.phone],["Referral Code",selectedUser.referralCode || "-"],["Referred By",selectedUser.referredBy || "-"],["Referrals",`${selectedUserReferralCount} active`],["Referral Earnings",`KES ${selectedUserReferralEarn.toLocaleString()}`]].map(([l,v],i)=>(
                        <div key={i} style={{ padding:"12px 14px",background:"#fff",borderRadius:10,border:"1.5px solid #111",boxShadow:"0 3px 0 #111" }}>
                          <div style={{ fontSize:10,color:ADMIN.muted,fontWeight:800,letterSpacing:"0.08em",marginBottom:5 }}>{l.toUpperCase()}</div>
                          <div style={{ fontSize:13,fontWeight:700,color:"#111" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex",gap:8 }}>
                      <button
                        onClick={() => updateUserStatus(selectedUser.id, "active")}
                        style={{ flex:1,padding:"10px",background:"#111",color:"#fff",border:"1.5px solid #111",borderRadius:10,fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"Geist,sans-serif",boxShadow:"0 4px 0 #111" }}
                      >
                        Activate
                      </button>
                      <button
                        onClick={() => updateUserStatus(selectedUser.id, "suspended")}
                        style={{ flex:1,padding:"10px",background:"#EFF6FF",color:ADMIN.blue,border:"1.5px solid #111",borderRadius:10,fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"Geist,sans-serif" }}
                      >
                        Suspend
                      </button>
                      <button
                        onClick={() => updateUserStatus(selectedUser.id, "banned")}
                        style={{ flex:1,padding:"10px",background:"#FFF0F0",color:ADMIN.red,border:"1.5px solid #111",borderRadius:10,fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"Geist,sans-serif" }}
                      >
                        Ban
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* "" TRANSACTIONS TAB "" */}
          {tab==="transactions" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {["all","deposit","withdrawal","earning"].map(f=>(
                  <button key={f} onClick={()=>setTxFilter(f)} style={{ padding:"6px 16px",borderRadius:50,border:"1.5px solid #111",background:txFilter===f?"#111":"transparent",color:txFilter===f?"#fff":"#111",fontSize:12,fontWeight:txFilter===f?800:600,cursor:"pointer",fontFamily:"Geist,sans-serif",textTransform:"capitalize" }}>{f}</button>
                ))}
                <div style={{ marginLeft:"auto",fontSize:12,color:ADMIN.muted,display:"flex",alignItems:"center" }}>{filteredTx.length} transactions</div>
              </div>
              <div style={CARD}>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid #111" }}>
                        {["ID","User","Type","Amount","Method","Date","Status"].map(h=>(
                          <th key={h} style={{ padding:"10px 14px",fontSize:10,fontWeight:900,color:"#111",letterSpacing:"0.1em",textAlign:"left",whiteSpace:"nowrap" }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTx.map((tx,i)=>(
                        <tr key={tx.id} style={{ borderBottom:"1px solid #111",transition:"background .1s" }}
                          onMouseEnter={e=>e.currentTarget.style.background="#F3F4F6"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <td style={{ padding:"11px 14px",fontSize:11,color:ADMIN.muted,fontWeight:700 }}>{tx.id}</td>
                          <td style={{ padding:"11px 14px",fontSize:13,fontWeight:700,color:"#111",whiteSpace:"nowrap" }}>{tx.user}</td>
                          <td style={{ padding:"11px 14px" }}>{statusBadge(tx.type)}</td>
                          <td style={{ padding:"11px 14px",fontSize:13,fontWeight:800,color:tx.type==="Withdrawal"?ADMIN.red:tx.type==="Earning"?ADMIN.green:ADMIN.blue,whiteSpace:"nowrap" }}>
                            {tx.type==="Withdrawal"?"-":"+"} KES {tx.amount.toLocaleString()}
                          </td>
                          <td style={{ padding:"11px 14px",fontSize:12,color:ADMIN.muted,whiteSpace:"nowrap" }}>{tx.method}</td>
                          <td style={{ padding:"11px 14px",fontSize:11,color:ADMIN.muted,whiteSpace:"nowrap" }}>{tx.date}</td>
                          <td style={{ padding:"11px 14px" }}>{statusBadge(tx.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* "" WITHDRAWALS TAB "" */}
          {tab==="withdrawals" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {/* Stat pills */}
              <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                {[["Pending",withdrawals.filter(w=>w.status==="Pending").length,ADMIN.blue],["Approved",withdrawals.filter(w=>w.status==="Approved").length,ADMIN.green],["Paid",withdrawals.filter(w=>w.status==="Paid").length,ADMIN.green],["Rejected",withdrawals.filter(w=>w.status==="Rejected").length,ADMIN.red]].map(([l,n,c])=>(
                  <div key={l} style={{ padding:"8px 18px",background:`${c}14`,border:"1.5px solid #111",borderRadius:50,display:"flex",alignItems:"center",gap:8 }}>
                    <div style={{ width:7,height:7,borderRadius:"50%",background:c }}/>
                    <span style={{ fontSize:12,fontWeight:700,color:c }}>{l}</span>
                    <span style={{ fontSize:14,fontWeight:900,color:"#111" }}>{n}</span>
                  </div>
                ))}
                <div style={{ display:"flex",gap:4,background:"#fff",border:"2px solid #111",borderRadius:9,padding:3,marginLeft:"auto" }}>
                  {["all","pending","approved","paid","rejected"].map(f=>(
                    <button key={f} onClick={()=>setWdFilter(f)} style={{ padding:"5px 12px",borderRadius:7,border:"1px solid #111",background:wdFilter===f?"#111":"transparent",color:wdFilter===f?"#fff":"#111",fontSize:11,fontWeight:wdFilter===f?800:600,cursor:"pointer",fontFamily:"Geist,sans-serif",textTransform:"capitalize" }}>{f}</button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div style={CARD}>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid #111" }}>
                        {["User","Tier","Amount","Method","Date","Status","Actions"].map(h=>(
                          <th key={h} style={{ padding:"10px 14px",fontSize:10,fontWeight:900,color:"#111",letterSpacing:"0.1em",textAlign:"left",whiteSpace:"nowrap" }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWd.map((w,i)=>(
                        <tr key={w.id} style={{ borderBottom:"1px solid #111",transition:"background .1s" }}
                          onMouseEnter={e=>e.currentTarget.style.background="#F3F4F6"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <td style={{ padding:"12px 14px" }}>
                            <div style={{ fontSize:13,fontWeight:700,color:"#111",whiteSpace:"nowrap" }}>{w.user}</div>
                            <div style={{ fontSize:10,color:ADMIN.muted }}>{w.phone}</div>
                          </td>
                          <td style={{ padding:"12px 14px" }}>{tierDot(w.tier)}</td>
                          <td style={{ padding:"12px 14px",fontSize:14,fontWeight:900,color:"#111",whiteSpace:"nowrap" }}>KES {w.amount.toLocaleString()}</td>
                          <td style={{ padding:"12px 14px",fontSize:12,color:ADMIN.muted,whiteSpace:"nowrap" }}>{w.method}</td>
                          <td style={{ padding:"12px 14px",fontSize:11,color:ADMIN.muted,whiteSpace:"nowrap" }}>{w.date}</td>
                          <td style={{ padding:"12px 14px" }}>{statusBadge(w.status)}</td>
                          <td style={{ padding:"12px 14px" }}>
                            {w.status==="Pending" && (
                              <div style={{ display:"flex",gap:5 }}>
                                <button onClick={()=>approveWd(w.id)} style={{ padding:"5px 11px",background:"#ECFDF5",color:ADMIN.green,border:"1.5px solid #111",borderRadius:6,fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap" }}>" Approve</button>
                                <button onClick={()=>rejectWd(w.id)} style={{ padding:"5px 11px",background:"#FFF0F0",color:ADMIN.red,border:"1.5px solid #111",borderRadius:6,fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif" }}>- Reject</button>
                              </div>
                            )}
                            {w.status==="Approved" && (
                              <button onClick={()=>payWd(w.id)} style={{ padding:"5px 14px",background:"#111",color:"#fff",border:"1.5px solid #111",borderRadius:6,fontSize:10,fontWeight:900,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap",boxShadow:"0 3px 0 #111" }}>Mark Paid</button>
                            )}
                            {(w.status==="Paid"||w.status==="Rejected") && (
                              <span style={{ fontSize:11,color:ADMIN.muted }}>Completed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* "" RISK TAB "" */}
          {tab==="risk" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {["all","open","reviewed","resolved","ignored"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setRiskFilter(f)}
                    style={{
                      padding:"6px 16px",
                      borderRadius:50,
                      border:"1.5px solid #111",
                      background:riskFilter===f?"#111":"transparent",
                      color:riskFilter===f?"#fff":"#111",
                      fontSize:12,
                      fontWeight:riskFilter===f?800:600,
                      cursor:"pointer",
                      fontFamily:"Geist,sans-serif",
                      textTransform:"capitalize"
                    }}
                  >
                    {f}
                  </button>
                ))}
                <div style={{ marginLeft:"auto",fontSize:12,color:ADMIN.muted,display:"flex",alignItems:"center" }}>
                  {filteredRiskFlags.length} flags
                </div>
              </div>

              <div style={CARD}>
                {filteredRiskFlags.length === 0 ? (
                  <div style={{ padding:"20px", textAlign:"center", color:ADMIN.muted, fontSize:13 }}>
                    No fraud flags found for this filter.
                  </div>
                ) : (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ borderBottom:"1px solid #111" }}>
                          {["Time","Reason","Reference","Expected","Provider","Status","Actions"].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding:"10px 14px",
                                fontSize:10,
                                fontWeight:900,
                                color:"#111",
                                letterSpacing:"0.1em",
                                textAlign:"left",
                                whiteSpace:"nowrap"
                              }}
                            >
                              {h.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRiskFlags.map((flag, i) => {
                          const flagId = flag.flag_id || `F${String(i + 1).padStart(3, "0")}`;
                          const expectedAmount = Number(flag.expected_amount);
                          const providerAmount = Number(flag.provider_amount);
                          const expectedText = Number.isFinite(expectedAmount) ? `KES ${expectedAmount.toLocaleString()}` : "-";
                          const providerText = Number.isFinite(providerAmount) ? `KES ${providerAmount.toLocaleString()}` : "-";
                          return (
                            <tr
                              key={flagId}
                              style={{ borderBottom:"1px solid #111",transition:"background .1s" }}
                              onMouseEnter={(e)=>e.currentTarget.style.background="#F3F4F6"}
                              onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}
                            >
                              <td style={{ padding:"11px 14px",fontSize:11,color:ADMIN.muted,whiteSpace:"nowrap" }}>
                                {fmtDateTime(flag.created_at)}
                              </td>
                              <td style={{ padding:"11px 14px",fontSize:12,fontWeight:700,color:"#111" }}>
                                {flag.reason || "Unknown"}
                              </td>
                              <td style={{ padding:"11px 14px",fontSize:11,color:ADMIN.muted,whiteSpace:"nowrap" }}>
                                {flag.merchant_reference || flag.tracking_id || "-"}
                              </td>
                              <td style={{ padding:"11px 14px",fontSize:12,color:"#111",whiteSpace:"nowrap" }}>
                                {expectedText}
                              </td>
                              <td style={{ padding:"11px 14px",fontSize:12,color:"#111",whiteSpace:"nowrap" }}>
                                {providerText}
                              </td>
                              <td style={{ padding:"11px 14px" }}>
                                {statusBadge(String(flag.status || "open").replace(/^./, (c) => c.toUpperCase()))}
                              </td>
                              <td style={{ padding:"11px 14px" }}>
                                <div style={{ display:"flex",gap:6 }}>
                                  <button
                                    onClick={() => updateRiskFlagStatus(flagId, "reviewed")}
                                    style={{ padding:"4px 9px",background:"#EFF6FF",color:ADMIN.blue,border:"1px solid #111",borderRadius:6,fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap" }}
                                  >
                                    Review
                                  </button>
                                  <button
                                    onClick={() => updateRiskFlagStatus(flagId, "resolved")}
                                    style={{ padding:"4px 9px",background:"#ECFDF5",color:ADMIN.green,border:"1px solid #111",borderRadius:6,fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap" }}
                                  >
                                    Resolve
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {["all","settled","rejected","invalid","error"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setAuditFilter(f)}
                    style={{
                      padding:"6px 16px",
                      borderRadius:50,
                      border:"1.5px solid #111",
                      background:auditFilter===f?"#111":"transparent",
                      color:auditFilter===f?"#fff":"#111",
                      fontSize:12,
                      fontWeight:auditFilter===f?800:600,
                      cursor:"pointer",
                      fontFamily:"Geist,sans-serif",
                      textTransform:"capitalize"
                    }}
                  >
                    {f}
                  </button>
                ))}
                <div style={{ marginLeft:"auto",fontSize:12,color:ADMIN.muted,display:"flex",alignItems:"center" }}>
                  {filteredAuditEvents.length} audit events
                </div>
              </div>

              <div style={CARD}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
                  <h3 style={{ fontSize:14,fontWeight:900,color:"#111" }}>Payment Audit Trail</h3>
                  <span style={{ fontSize:11,color:ADMIN.muted,fontWeight:800 }}>Verify/Webhook/Reconcile</span>
                </div>
                {filteredAuditEvents.length === 0 ? (
                  <div style={{ padding:"20px", textAlign:"center", color:ADMIN.muted, fontSize:13 }}>
                    No payment audit events for this filter.
                  </div>
                ) : (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ borderBottom:"1px solid #111" }}>
                          {["Time","Source","Decision","Reference","Expected","Provider"].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding:"10px 14px",
                                fontSize:10,
                                fontWeight:900,
                                color:"#111",
                                letterSpacing:"0.1em",
                                textAlign:"left",
                                whiteSpace:"nowrap"
                              }}
                            >
                              {h.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAuditEvents.slice(0, 120).map((evt) => {
                          const expectedText = Number.isFinite(evt.expectedAmount) && evt.expectedAmount > 0 ? `KES ${evt.expectedAmount.toLocaleString()}` : "-";
                          const providerText = Number.isFinite(evt.providerAmount) && evt.providerAmount > 0 ? `KES ${evt.providerAmount.toLocaleString()}` : "-";
                          return (
                            <tr
                              key={evt.id}
                              style={{ borderBottom:"1px solid #111",transition:"background .1s" }}
                              onMouseEnter={(e)=>e.currentTarget.style.background="#F3F4F6"}
                              onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}
                            >
                              <td style={{ padding:"11px 14px",fontSize:11,color:ADMIN.muted,whiteSpace:"nowrap" }}>{evt.when}</td>
                              <td style={{ padding:"11px 14px",fontSize:11,color:ADMIN.muted,textTransform:"capitalize",whiteSpace:"nowrap" }}>{evt.source}</td>
                              <td style={{ padding:"11px 14px" }}>{statusBadge(String(evt.decision || "unknown").replace(/^./, (c) => c.toUpperCase()))}</td>
                              <td style={{ padding:"11px 14px",fontSize:11,color:ADMIN.muted,whiteSpace:"nowrap" }}>{evt.reference}</td>
                              <td style={{ padding:"11px 14px",fontSize:12,color:"#111",whiteSpace:"nowrap" }}>{expectedText}</td>
                              <td style={{ padding:"11px 14px",fontSize:12,color:"#111",whiteSpace:"nowrap" }}>{providerText}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* "" SETTINGS TAB "" */}
          {tab==="settings" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14,maxWidth:680 }}>

              {/* Withdrawal days */}
              <div style={CARD}>
                <h3 style={{ fontSize:14,fontWeight:900,color:"#111",marginBottom:4 }}>Withdrawal Days</h3>
                <p style={{ fontSize:12,color:ADMIN.muted,marginBottom:18 }}>Control which days users can withdraw funds.</p>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10 }}>
                  {[["tue","Tuesday"],["fri","Friday"]].map(([key,label])=>(
                    <div key={key} style={{ padding:"16px",background:"#fff",borderRadius:10,border:"1.5px solid #111",boxShadow:"0 3px 0 #111" }}>
                      <div style={{ fontSize:13,fontWeight:900,color:"#111",marginBottom:4 }}>{label}</div>
                      <div style={{ fontSize:11,color:wdDays[key]?ADMIN.green:ADMIN.red,fontWeight:700,marginBottom:12 }}>{wdDays[key]?"Open":"Closed"}</div>
                      <button onClick={()=>setWdDays(d=>({...d,[key]:!d[key]}))}
                        style={{ padding:"6px 14px",background:wdDays[key]?"#FFF0F0":"#ECFDF5",color:wdDays[key]?ADMIN.red:ADMIN.green,border:"1.5px solid #111",borderRadius:7,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif" }}>
                        {wdDays[key]?"Close Day":"Open Day"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Video earnings */}
              <div style={CARD}>
                <h3 style={{ fontSize:14,fontWeight:900,color:"#111",marginBottom:4 }}>Video Earnings Price</h3>
                <p style={{ fontSize:12,color:ADMIN.muted,marginBottom:18 }}>KES earned per video watched by users.</p>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ flex:1,display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"#fff",border:"1.5px solid #111",borderRadius:10,boxShadow:"0 3px 0 #111" }}>
                    <span style={{ fontSize:14,color:ADMIN.muted,fontWeight:700 }}>KES</span>
                    <input type="number" value={videoPrice} onChange={e=>setVideoPrice(Number(e.target.value))} style={{ background:"transparent",border:"none",outline:"none",fontSize:18,fontWeight:900,color:"#111",width:"80px",fontFamily:"Geist,sans-serif" }}/>
                    <span style={{ fontSize:12,color:ADMIN.muted }}>per video</span>
                  </div>
                  <button style={{ padding:"12px 22px",background:"#111",color:"#fff",border:"1.5px solid #111",boxShadow:"0 4px 0 #111",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap" }}>Update Price</button>
                </div>
              </div>

              {/* Payout mode */}
              <div style={CARD}>
                <h3 style={{ fontSize:14,fontWeight:900,color:"#111",marginBottom:4 }}>Payout Mode</h3>
                <p style={{ fontSize:12,color:ADMIN.muted,marginBottom:18 }}>How withdrawals are processed.</p>
                {MANUAL_WITHDRAWALS ? (
                  <div style={{ padding:"16px",background:"#fff",borderRadius:10,border:"1.5px solid #111",boxShadow:"0 4px 0 #111" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:6 }}>
                      <div style={{ width:16,height:16,borderRadius:"50%",border:"2px solid #111",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <div style={{ width:8,height:8,borderRadius:"50%",background:ADMIN.blue }} />
                      </div>
                      <span style={{ fontSize:13,fontWeight:900,color:"#111" }}>Manual Review (Locked)</span>
                    </div>
                    <div style={{ fontSize:12,color:ADMIN.muted,lineHeight:1.5 }}>
                      Admin approves each withdrawal before payment.
                    </div>
                  </div>
                ) : (
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                    {[["manual","Manual Review","Admin approves each withdrawal before payment."],["auto","Auto-Approve","All withdrawals are automatically approved and paid."]].map(([val,label,desc])=>(
                      <div key={val} onClick={()=>setPayoutMode(val)}
                        style={{ padding:"16px",background:"#fff",borderRadius:10,border:"1.5px solid #111",cursor:"pointer",transition:"border-color .15s",boxShadow:payoutMode===val?"0 4px 0 #111":"none" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:6 }}>
                          <div style={{ width:16,height:16,borderRadius:"50%",border:"2px solid #111",display:"flex",alignItems:"center",justifyContent:"center" }}>
                            {payoutMode===val&&<div style={{ width:8,height:8,borderRadius:"50%",background:ADMIN.blue }}/>}
                          </div>
                          <span style={{ fontSize:13,fontWeight:900,color:"#111" }}>{label}</span>
                        </div>
                        <div style={{ fontSize:12,color:ADMIN.muted,lineHeight:1.5 }}>{desc}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Maintenance mode */}
              <div style={{ ...CARD,border:`1.5px solid ${maintenance?ADMIN.red:"#111"}` }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                  <div>
                    <h3 style={{ fontSize:14,fontWeight:900,color:"#111",marginBottom:4 }}>Maintenance Mode</h3>
                    <p style={{ fontSize:12,color:ADMIN.muted,maxWidth:380 }}>When enabled, users will see a maintenance page. Only admins can access the platform.</p>
                  </div>
                  <button onClick={()=>setMaintenance(m=>!m)}
                    style={{ padding:"8px 20px",background:maintenance?"#FFF0F0":"#ECFDF5",color:maintenance?ADMIN.red:ADMIN.green,border:"1.5px solid #111",borderRadius:9,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap",flexShrink:0,marginLeft:16 }}>
                    {maintenance?"Disable":"Enable"}
                  </button>
                </div>
                {maintenance&&<div style={{ marginTop:14,padding:"10px 14px",background:"#FFF0F0",borderRadius:8,border:"1.5px solid #111",fontSize:12,color:ADMIN.red,fontWeight:800,display:"flex",alignItems:"center",gap:8 }}>
                  <I n="shield" s={13} c="#DC2626"/> Platform is in maintenance mode - users cannot log in
                </div>}
              </div>

              <button onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),2500);}}
                style={{ padding:"13px",background:saved?ADMIN.green:"#111",color:"#fff",border:"1.5px solid #111",borderRadius:11,fontSize:14,fontWeight:900,cursor:"pointer",fontFamily:"Geist,sans-serif",transition:"background .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 5px 0 #111" }}>
                {saved?<><I n="check" s={14} c="#fff"/> Settings Saved!</>:<>Save Settings</>}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
    }

/* 
   ROOT
 */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, msg: "" }; }
  static getDerivedStateFromError(e) { return { hasError: true, msg: e.message }; }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "Geist,sans-serif" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}></div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 8 }}>Something went wrong</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>{this.state.msg}</div>
        <button onClick={() => this.setState({ hasError: false })} style={{ padding: "10px 24px", background: "#111", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, cursor: "pointer", fontFamily: "Geist,sans-serif" }}>Try Again</button>
      </div>
    );
    return this.props.children;
  }
    }

function CurrencyPill({ currency, onChange, compact = false }) {
  const active = normalizeDisplayCurrency(currency);
  const isKes = active === DISPLAY_CURRENCIES.KES;
  const baseBtn = {
    border: "none",
    background: "transparent",
    fontSize: compact ? 10 : 11,
    fontWeight: 900,
    letterSpacing: "0.08em",
    borderRadius: 999,
    padding: compact ? "5px 9px" : "6px 11px",
    cursor: "pointer",
    fontFamily: "IBM Plex Sans, Geist, sans-serif",
    transition: "all .2s ease",
    whiteSpace: "nowrap"
  };
  return (
    <div data-currency-static="1" style={{ display: "grid", gap: 3, justifyItems: "center" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: 3,
          borderRadius: 999,
          border: "1.5px solid rgba(255,255,255,0.55)",
          background: "#0B0B0B",
          boxShadow: "0 8px 16px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.16)"
        }}
      >
        <button
          type="button"
          onClick={() => onChange(DISPLAY_CURRENCIES.KES)}
          style={{
            ...baseBtn,
            background: isKes ? "#FFFFFF" : "#111111",
            color: isKes ? "#111111" : "#F1F5F9",
            boxShadow: isKes ? "0 3px 8px rgba(0,0,0,0.26)" : "none"
          }}
        >
          KSH
        </button>
        <button
          type="button"
          onClick={() => onChange(DISPLAY_CURRENCIES.USD)}
          style={{
            ...baseBtn,
            background: !isKes ? "#FFFFFF" : "#111111",
            color: !isKes ? "#111111" : "#F1F5F9",
            boxShadow: !isKes ? "0 3px 8px rgba(0,0,0,0.26)" : "none"
          }}
        >
          USD
        </button>
      </div>
      {!compact && (
        <div style={{ fontSize: compact ? 9 : 10, color: "#CBD5E1", fontWeight: 800, letterSpacing: "0.06em" }}>
          {`1 USD = ${FX_KES_PER_USD} KSH`}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("landing");
  const [prevPage, setPrevPage] = useState("landing");
  const [dashboardTab, setDashboardTab] = useState("overview");
  const [adminTab, setAdminTab] = useState("overview");
  const [displayCurrency, setDisplayCurrency] = useState(() => {
    if (typeof window === "undefined") return DISPLAY_CURRENCIES.KES;
    try {
      return normalizeDisplayCurrency(localStorage.getItem(CURRENCY_STORAGE_KEY));
    } catch (e) {
      return DISPLAY_CURRENCIES.KES;
    }
  });
  const [tier, setTier] = useState(0);
  const t = TIERS[tier];
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!SUPABASE_ENABLED);
  const [profileRow, setProfileRow] = useState(null);
  const [authMessage, setAuthMessage] = useState("");
  const [installHint, setInstallHint] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [guideTyped, setGuideTyped] = useState("");
  const [guideTypingDone, setGuideTypingDone] = useState(false);
  const [guideSeen, setGuideSeen] = useState(false);
  setActiveDisplayCurrency(displayCurrency);
  const dashboardGuideKey = guideSeenKeyForUser(DASH_GUIDE_SEEN_KEY, session?.user?.id);
  const referralGuideKey = guideSeenKeyForUser(REFERRAL_GUIDE_SEEN_KEY, session?.user?.id);
  const markGuideSeen = useCallback(() => {
    setGuideSeen(true);
    try {
      localStorage.setItem(dashboardGuideKey, "1");
      localStorage.setItem(referralGuideKey, "1");
    } catch (e) {}
  }, [dashboardGuideKey, referralGuideKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const scopedSeen = localStorage.getItem(dashboardGuideKey) === "1";
      const legacySeen = localStorage.getItem(DASH_GUIDE_SEEN_KEY) === "1";
      if (!scopedSeen && legacySeen) localStorage.setItem(dashboardGuideKey, "1");
      setGuideSeen(scopedSeen || legacySeen);
    } catch (e) {
      setGuideSeen(false);
    }
  }, [dashboardGuideKey]);

  useEffect(() => {
    const url = window.location.href;
    const hasRecovery = /type=recovery/i.test(url);
    if (hasRecovery) {
      try { sessionStorage.setItem("ep:recovery", "1"); } catch (e) {}
      setPrevPage("login");
      setPage("login");
    }
  }, []);

  useEffect(() => {
    const ref = getRefFromUrl();
    if (ref) {
      storeRef(ref);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ep:tier");
      const idx = Number(saved);
      if (Number.isFinite(idx) && idx >= 0 && idx < TIERS.length) setTier(idx);
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("ep:tier", String(tier)); } catch (e) {}
  }, [tier]);
  useEffect(() => {
    const normalized = normalizeDisplayCurrency(displayCurrency);
    setActiveDisplayCurrency(normalized);
    try { localStorage.setItem(CURRENCY_STORAGE_KEY, normalized); } catch (e) {}
  }, [displayCurrency]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.getElementById("root");
    if (!root) return;
    let applying = false;
    const currency = normalizeDisplayCurrency(displayCurrency);
    const safeApply = (fn) => {
      if (applying) return;
      applying = true;
      try { fn(); } finally { applying = false; }
    };
    safeApply(() => applyCurrencyToSubtree(root, currency));
    const observer = new MutationObserver((mutations) => {
      if (applying) return;
      safeApply(() => {
        mutations.forEach((m) => {
          if (m.type === "characterData") {
            applyCurrencyToTextNode(m.target, currency);
            return;
          }
          if (m.type === "childList") {
            m.addedNodes.forEach((node) => applyCurrencyToSubtree(node, currency));
          }
        });
      });
    });
    observer.observe(root, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [displayCurrency]);

  const go = (p) => { setPrevPage(page); setPage(p); };
  const authUser = session?.user || null;
  useEffect(() => {
    if (!SUPABASE_ENABLED || !authReady) return;
    const { trackingId, merchantReference } = getPaymentParams();
    if (!trackingId && !merchantReference) return;
    let cancelled = false;
    const poll = async () => {
      const apiBase = getApiBase();
      if (!apiBase) {
        if (!cancelled) {
          setAuthMessage("Payment received. Please sign in to continue.");
          if (authUser?.id) go("dashboard"); else go("login");
          clearPaymentParams();
        }
        return;
      }
      const tryVerify = async () => {
        try {
          if (!trackingId) return false;
          const qs = new URLSearchParams({ tracking_id: trackingId });
          if (merchantReference) qs.set("merchant_reference", merchantReference);
          const token = await getAccessToken();
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await fetch(`${apiBase}/api/v1/deposit/verify?${qs.toString()}`, { headers });
          const data = await res.json().catch(() => ({}));
          return res.ok && data?.status === "success";
        } catch (e) {
          return false;
        }
      };
      const verified = await tryVerify();
      if (!cancelled && verified) {
        setAuthMessage("Payment confirmed. Welcome back.");
        if (authUser?.id) {
          const refreshed = await loadProfileRow(authUser.id);
          if (!cancelled && refreshed) setProfileRow(refreshed);
          go("dashboard");
        } else {
          go("login");
        }
        clearPaymentParams();
        return;
      }
      if (!merchantReference) {
        if (!cancelled) {
          setAuthMessage("Payment pending. Please refresh in a moment.");
          if (authUser?.id) go("dashboard"); else go("login");
          clearPaymentParams();
        }
        return;
      }
      for (let i = 0; i < 10; i++) {
        try {
          const token = await getAccessToken();
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await fetch(`${apiBase}/api/v1/deposit/status?reference=${encodeURIComponent(merchantReference)}`, { headers });
          const data = await res.json().catch(() => ({}));
          if (!cancelled && res.ok && data?.status === "success") {
            setAuthMessage("Payment confirmed. Welcome back.");
            if (authUser?.id) {
              const refreshed = await loadProfileRow(authUser.id);
              if (!cancelled && refreshed) setProfileRow(refreshed);
              go("dashboard");
            } else {
              go("login");
            }
            clearPaymentParams();
            return;
          }
        } catch (e) {}
        await new Promise(r => setTimeout(r, 1200));
      }
      if (!cancelled) {
        setAuthMessage("Payment pending. Please refresh in a moment.");
        if (authUser?.id) go("dashboard"); else go("login");
        clearPaymentParams();
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [SUPABASE_ENABLED, authReady, authUser?.id]);
  const role = String(profileRow?.role || "").trim().toLowerCase();
  const categoryRole = String(profileRow?.category || "").trim().toLowerCase();
  const hasProfileAdminRole = role === "admin" || categoryRole === "admin" || categoryRole === "administrator";
  const isAdmin = hasProfileAdminRole;
  const profileReady = !SUPABASE_ENABLED || !authUser || (profileRow !== null && profileRow?.id === authUser.id);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;
    let ignore = false;
    supabase.auth.getSession().then(({ data }) => {
      if (ignore) return;
      setSession(data?.session ?? null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => { ignore = true; subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!SUPABASE_ENABLED || !authReady) return;
    if (!authUser?.id) return;
    const href = window.location.href;
    const isGoogleReturn = /[?&]auth=google/i.test(href) || /access_token=/i.test(href) || /refresh_token=/i.test(href) || /[?&]code=/i.test(href);
    if (!isGoogleReturn) return;
    setAuthMessage("");
    setPrevPage("login");
    setPage("dashboard");
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("auth");
      if (!/type=recovery/i.test(u.search + u.hash)) {
        const q = u.searchParams.toString();
        u.search = q ? `?${q}` : "";
        u.hash = "";
        window.history.replaceState({}, document.title, `${u.pathname}${u.search}`);
      }
    } catch (e) {}
  }, [SUPABASE_ENABLED, authReady, authUser?.id]);

  useEffect(() => {
    if (!supabase || !authUser?.id) return;
    supabase
      .from("users")
      .update({ last_seen: new Date().toISOString() })
      .eq("user_id", authUser.id);
  }, [authUser?.id]);

  useEffect(() => {
    const idx = resolveTierIndex(profileRow?.tier);
    if (idx !== null && idx !== tier) setTier(idx);
  }, [profileRow?.tier]);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;
    if (!authUser?.id) { setProfileRow(null); return; }
    setProfileRow((prev) => (prev?.id === authUser.id ? prev : null));
    let ignore = false;
    (async () => {
      const existing = await loadProfileRow(authUser.id);
      if (ignore) return;
      const meta = authUser.user_metadata || {};
      const metaAvatar = meta.avatar_url || meta.picture || meta.avatar || "";
      const metaRefBy = normalizeRefCode(meta.referred_by || meta.ref_code || "");
      if (existing) {
        const statusRaw = String(existing.status || "active").toLowerCase();
        if (statusRaw !== "active") {
          setAuthMessage(`Your account is ${statusRaw}. Please contact support.`);
          try { await supabase.auth.signOut(); } catch (e) {}
          if (!ignore) {
            setProfileRow(null);
            setPage("login");
          }
          return;
        }
        setAuthMessage("");
        setProfileRow(existing);
        const updates = {};
        if (!existing.ref_code) updates.ref_code = makeRefCode(authUser.email || authUser.id || existing.email || existing.name);
        if (!existing.referred_by && metaRefBy) updates.referred_by = metaRefBy;
        if (!existing.avatar_url) updates.avatar_url = metaAvatar || pickAvatarForSeed(authUser.id || authUser.email);
        if (Object.keys(updates).length) {
          updates.id = authUser.id;
          updates.updated_at = new Date().toISOString();
          const patched = await upsertProfileRow(updates);
          if (!ignore && patched) setProfileRow(patched);
        }
        return;
      }
      const fallbackName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        (authUser.email ? authUser.email.split("@")[0] : "Account");
      const created = await upsertProfileRow({
        id: authUser.id,
        name: fallbackName,
        email: authUser.email || null,
        phone: null,
        avatar_url: metaAvatar || pickAvatarForSeed(authUser.id || authUser.email),
        balance: null,
        join_number: null,
        ref_code: makeRefCode(authUser.email || authUser.id || fallbackName),
        referred_by: metaRefBy || null,
        role: "client",
        category: "Client",
        status: "Active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (!ignore) setProfileRow(created || null);
    })();
    return () => { ignore = true; };
  }, [authUser?.id]);

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setAuthMessage("");
    setPage("landing");
  };
  const mustSelectTier = !!authUser && !isAdmin && SUPABASE_ENABLED && profileRow?.tier_selected !== true;

  const route = !SUPABASE_ENABLED
    ? page
    : (() => {
      if (isAdmin) {
        return (page === "landing" || page === "admin") ? page : "admin";
      }
      if (!authUser) {
        return (page === "landing" || page === "login" || page === "signup") ? page : "landing";
      }
      if (mustSelectTier) {
        return (page === "landing" || page === "tier-select") ? page : "tier-select";
      }
      return (page === "landing" || page === "dashboard" || page === "tier-select") ? page : "dashboard";
    })();
  useEffect(() => {
    if (route !== "dashboard" || isAdmin || guideSeen) return;
    const id = setTimeout(() => {
      setGuideStep(0);
      setGuideOpen(true);
    }, 1100);
    return () => clearTimeout(id);
  }, [route, isAdmin, guideSeen]);
  useEffect(() => {
    if (!guideOpen) {
      setGuideTyped("");
      setGuideTypingDone(false);
      return;
    }
    const message = DASH_GUIDE_STEPS[guideStep]?.text || "";
    setGuideTyped("");
    setGuideTypingDone(false);
    if (!message) {
      setGuideTypingDone(true);
      return;
    }
    let idx = 0;
    const id = setInterval(() => {
      idx += 1;
      setGuideTyped(message.slice(0, idx));
      if (idx >= message.length) {
        setGuideTypingDone(true);
        clearInterval(id);
      }
    }, 19);
    return () => clearInterval(id);
  }, [guideOpen, guideStep]);
  const openGuideTour = () => {
    setGuideStep(0);
    setGuideTyped("");
    setGuideTypingDone(false);
    setGuideOpen(true);
  };
  const skipGuideTour = () => {
    markGuideSeen();
    setGuideOpen(false);
  };
  const appViewportHeight = "100vh";

  const openHelp = () => {
    try {
      const w = window.Tawk_API;
      if (w?.showWidget) w.showWidget();
      if (w?.maximize) setTimeout(() => w.maximize(), 60);
    } catch (e) {}
  };

  const isIOSInstallClient = typeof navigator !== "undefined" && /iPad|iPhone|iPod/i.test(navigator.userAgent || "");
  const installTargetUrl = isIOSInstallClient
    ? IOS_APP_URL
    : (ANDROID_APK_URL || IOS_APP_URL);
  const installLabel = "APP";
  const handleInstall = () => {
    if (isIOSInstallClient && !IOS_APP_URL) {
      setInstallHint("iOS install link is not published yet. Use Android APK for now.");
      setTimeout(() => setInstallHint(""), 3200);
      return;
    }
    if (!installTargetUrl) {
      setInstallHint("APK download URL is not set yet. Please contact support.");
      setTimeout(() => setInstallHint(""), 2800);
      return;
    }
    try {
      const link = document.createElement("a");
      link.href = installTargetUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      if (/\.apk(\?|#|$)/i.test(installTargetUrl)) {
        link.download = "edisonpay.apk";
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setInstallHint(/\.apk(\?|#|$)/i.test(installTargetUrl) ? "Downloading APK..." : "Opening app download...");
      setTimeout(() => setInstallHint(""), 2200);
    } catch (e) {
      window.open(installTargetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const showInstallButton = route === "landing";
  const installReady = !!installTargetUrl;

  return (
    <ErrorBoundary>
      <GlobalStyles />
      <Fonts />

      <div style={{ height: appViewportHeight, overflow:"hidden" }}>
        {SUPABASE_ENABLED && (!authReady || !profileReady) && (
          <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
            <div style={{ width:"min(520px, 92vw)", display:"grid", gap:12 }}>
              <div className="ep-skeleton" style={{ height:18, width:"60%", borderRadius:8 }} />
              <div className="ep-skeleton" style={{ height:14, width:"40%", borderRadius:8 }} />
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginTop:10 }}>
                {Array.from({ length: 4 }).map((_,i)=>(
                  <div key={i} className="ep-skeleton" style={{ height:64, borderRadius:12 }} />
                ))}
              </div>
              <div className="ep-skeleton" style={{ height:120, borderRadius:14, marginTop:6 }} />
            </div>
          </div>
        )}
        {(!SUPABASE_ENABLED || (authReady && profileReady)) && (
          <>
            {route==="landing"   && <div style={{ height:"100%",overflowY:"auto" }}><Landing  go={go}/></div>}
            {route==="login"     && <div style={{ height:"100%",overflowY:"auto" }}><Auth type="login"  go={go} from={prevPage==="landing"?"dashboard":prevPage} authMessage={authMessage}/></div>}
            {route==="signup"    && <div style={{ height:"100%",overflowY:"auto" }}><Auth type="signup" go={go} from={prevPage==="landing"?"dashboard":prevPage} authMessage={authMessage}/></div>}
            {route==="tier-select" && <div style={{ height:"100%",overflowY:"auto" }}><TierSelect go={go} authUser={authUser} profileRow={profileRow} onPreviewToVideos={() => { setDashboardTab("videos"); go("dashboard"); }} /></div>}
            {route==="dashboard" && (
              <ClientDash
                t={t}
                go={go}
                key={tier}
                authUser={authUser}
                profileRow={profileRow}
                onSignOut={handleSignOut}
                onReplayGuide={openGuideTour}
                externalTab={dashboardTab}
                onTabChange={setDashboardTab}
                displayCurrency={displayCurrency}
                onChangeDisplayCurrency={setDisplayCurrency}
              />
            )}
            {route==="admin"     && <AdminDash go={go} authUser={authUser} profileRow={profileRow} onSignOut={handleSignOut} externalTab={adminTab} onTabChange={setAdminTab}/>}
          </>
        )}
      </div>
      {showInstallButton && (
        <div
          style={{
            position:"fixed",
            left:"50%",
            transform:"translateX(-50%)",
            bottom:"calc(18px + env(safe-area-inset-bottom, 0px))",
            zIndex:9998,
            display:"grid",
            gap:6,
            justifyItems:"center",
            pointerEvents:"auto"
          }}
          aria-live="polite"
        >
          {installHint && (
            <div
              style={{
                background:"#111",
                color:"#fff",
                fontSize:11,
                fontWeight:700,
                padding:"6px 10px",
                borderRadius:999,
                border:"1px solid #000",
                boxShadow:"0 6px 14px rgba(0,0,0,0.2)",
                maxWidth:"min(92vw, 340px)",
                textAlign:"center"
              }}
            >
              {installHint}
            </div>
          )}
          <button
            onClick={handleInstall}
            className="ep-install-cta"
            style={{
              opacity: installReady ? 1 : 0.85
            }}
          >
            {installLabel}
          </button>
        </div>
      )}
      {route === "dashboard" && guideOpen && !isAdmin && (
        <div className="ep-guide-panel" role="dialog" aria-live="polite" aria-label="Onboarding Assistant">
          <div className="ep-guide-step-card" key={`guide-step-${guideStep}`}>
            <div className="ep-guide-chat-row">
              <div className="ep-guide-avatar-wrap">
                <img
                  src={DASH_BOT_GUIDE_IMAGE.primary}
                  alt="Guide bot avatar"
                  referrerPolicy="no-referrer"
                  onError={(e) => setFallbackSrc(e, DASH_BOT_GUIDE_IMAGE)}
                  className="ep-guide-avatar-bw"
                />
              </div>
              <div className="ep-guide-bubble">
                <div className="ep-guide-heading">Onboarding Assistant</div>
                <div className="ep-guide-title">{DASH_GUIDE_STEPS[guideStep]?.title}</div>
                <div className={`ep-guide-text${guideTypingDone ? " is-written" : ""}`}>
                  {guideTyped}
                  {!guideTypingDone && <span className="ep-guide-cursor">|</span>}
                </div>
                <div className="ep-guide-meta">
                  Step {guideStep + 1} of {DASH_GUIDE_STEPS.length}
                </div>
              </div>
            </div>
            <div className="ep-guide-actions">
              <button onClick={skipGuideTour} className="ep-guide-action-btn ep-guide-action-btn-light">
                Skip
              </button>
              <button
                onClick={() => {
                  if (guideStep < DASH_GUIDE_STEPS.length - 1) {
                    setGuideStep((prev) => Math.min(DASH_GUIDE_STEPS.length - 1, prev + 1));
                    return;
                  }
                  markGuideSeen();
                  setGuideOpen(false);
                }}
                className="ep-guide-action-btn ep-guide-action-btn-dark"
              >
                {guideStep < DASH_GUIDE_STEPS.length - 1 ? "Next" : "Get Started"}
              </button>
            </div>
          </div>
        </div>
      )}
      <button onClick={openHelp}
        className={`ep-help-fab${route === "dashboard" && guideOpen && guideStep === 0 ? " ep-help-focus" : ""}`}
        style={{
          right:18,
          bottom:18,
          zIndex:9999,
          width:36,
          height:36,
          borderRadius:"50%",
          border:"1.5px solid #111",
          background:"#fff",
          color:"#111",
          fontWeight:800,
          fontSize:12,
          cursor:"pointer",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          boxShadow:"0 6px 14px rgba(15,23,42,0.18)",
          fontFamily:"IBM Plex Sans, Geist, sans-serif"
        }}>
        <I n="shield" s={18} c="#111" />
      </button>
    </ErrorBoundary>
  );
    }














