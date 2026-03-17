import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import React from "react";
import { createClient } from "@supabase/supabase-js";

/* "" FONTS "" */
const Fonts = () => (
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700;800;900&family=IBM+Plex+Sans:wght@400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
);

/* "" CSS KEYFRAMES injected once "" */
const GlobalStyles = () => {
  useEffect(() => {
    const id = "ep-styles";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      @keyframes fadeUp   { from { opacity:0; transform:translateY(22px);} to { opacity:1; transform:translateY(0);} }
      @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
      @keyframes slideRight { from { transform:translateX(-18px); opacity:0; } to { transform:translateX(0); opacity:1; } }
      @keyframes ticker   { from { transform:translateX(0); } to { transform:translateX(-50%); } }
      @keyframes countUp  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      @keyframes floatA   { 0%,100%{transform:translateY(0px);} 50%{transform:translateY(-7px);} }
      @keyframes floatB   { 0%,100%{transform:translateY(0px);} 50%{transform:translateY(7px);} }
      @keyframes barGrow  { from{width:0;} to{width:var(--w);} }
      @keyframes pulse    { 0%,100%{opacity:1;} 50%{opacity:.45;} }
      @keyframes spin     { to{transform:rotate(360deg);} }
      @keyframes scaleIn  { from{opacity:0;transform:scale(0.96);} to{opacity:1;transform:scale(1);} }
      @keyframes shimmer  { from{background-position:-200% center;} to{background-position:200% center;} }
      @keyframes borderBeam { 0%{opacity:0;transform:translateX(-100%);} 20%{opacity:1;} 80%{opacity:1;} 100%{opacity:0;transform:translateX(100%);} }
      @keyframes slideUp  { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
      @keyframes slideDown { from{opacity:0;transform:translateY(-8px);} to{opacity:1;transform:translateY(0);} }
      @keyframes drawerIn { from{transform:translateX(-100%);} to{transform:translateX(0);} }
      @keyframes upFloat  { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-4px);} }
      @keyframes popPulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.05);} }
      @keyframes ep-symbol-float { 0%,100%{transform:translate3d(0,0,0) rotate(0deg);} 50%{transform:translate3d(12px,-18px,0) rotate(3deg);} }
      @keyframes ep-ambient { 0%,100%{transform:translate3d(0,0,0) scale(1);} 50%{transform:translate3d(-18px,14px,0) scale(1.03);} }
      @keyframes ep-ambient-alt { 0%,100%{transform:translate3d(0,0,0) scale(1);} 50%{transform:translate3d(16px,-10px,0) scale(1.04);} }
      @keyframes ep-upgrade-glare { 0%{transform:translateX(-120%);opacity:0;} 12%{opacity:.9;} 25%{transform:translateX(220%);opacity:0;} 100%{transform:translateX(220%);opacity:0;} }
      @keyframes ep-tier-glare { 0%{transform:translateX(-120%);opacity:0;} 12%{opacity:.85;} 28%{transform:translateX(220%);opacity:0;} 100%{transform:translateX(220%);opacity:0;} }
      .ep-hover-lift:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.09) !important; }
      .ep-hover-lift { transition: transform .2s ease, box-shadow .2s ease !important; }
      .ep-shimmer { background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }
      .ep-skeleton { position:relative; overflow:hidden; background:#F5F5F5; border:1px solid #E5E7EB; box-shadow:inset 0 1px 0 rgba(255,255,255,0.7); }
      .ep-skeleton::after { content:""; position:absolute; inset:-40%; background:linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.75) 45%, transparent 100%); animation:ep-shine 1.4s linear infinite; }
      @keyframes ep-shine { 0%{ transform:translateX(-60%);} 100%{ transform:translateX(60%);} }
      .ep-card { background:#fff; border-radius:16px; border:1px solid #111; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
      .ep-upgrade-btn { position:relative; overflow:hidden; animation: popPulse 1.6s ease-in-out infinite; }
      .ep-upgrade-btn::after { content:""; position:absolute; top:-40%; left:-60%; width:60%; height:180%; background:linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.9) 48%, transparent 100%); transform:translateX(-120%); animation:ep-upgrade-glare 2s ease-in-out infinite; pointer-events:none; mix-blend-mode:screen; }
      .ep-upgrade-btn:disabled::after { animation:none; opacity:0; }
      .ep-tier-glare { position:relative; overflow:hidden; }
      .ep-tier-glare::after { content:""; position:absolute; top:-40%; left:-60%; width:60%; height:180%; background:linear-gradient(120deg, transparent 0%, var(--glare, rgba(255,255,255,0.85)) 48%, transparent 100%); transform:translateX(-120%); animation:ep-tier-glare 2.2s ease-in-out infinite; pointer-events:none; mix-blend-mode:screen; }
      .ep-upgrade-arrow { animation: upFloat .9s ease-in-out infinite; }
      .ep-frame-dark { box-shadow: 0 0 0 1px #111, 0 8px 18px rgba(0,0,0,0.12); }
      .ep-frame-light { box-shadow: 0 0 0 1px #fff, 0 8px 18px rgba(0,0,0,0.08); }
      .ep-help-fab { position: fixed; }
      * { box-sizing:border-box; margin:0; padding:0; }
      ::-webkit-scrollbar { width:5px; height:5px; }
      ::-webkit-scrollbar-track { background:transparent; }
      ::-webkit-scrollbar-thumb { background:#e0e0e0; border-radius:3px; }
      ::-webkit-scrollbar-thumb:hover { background:#c8c8c8; }

      /* "" MOBILE RESPONSIVE "" */
      @media (max-width:768px) {
        .ep-grid-4 { grid-template-columns: 1fr 1fr !important; }
        .ep-grid-2 { grid-template-columns: 1fr !important; }
        .ep-grid-3 { grid-template-columns: 1fr !important; }
        .ep-hide-mobile { display:none !important; }
        .ep-hero-grid { grid-template-columns:1fr !important; }
        .ep-tier-grid { grid-template-columns:1fr !important; }
        .ep-nav-links { display:none !important; }
        .ep-auth-grid { grid-template-columns:1fr !important; }
        .ep-auth-left { display:none !important; }
        .ep-dash-sidebar { position:fixed !important; z-index:200 !important; height:100vh !important; top:0 !important; left:0 !important; transform:translateX(-100%) !important; transition:transform .28s cubic-bezier(.4,0,.2,1) !important; }
        .ep-dash-sidebar.open { transform:translateX(0) !important; animation:drawerIn .28s cubic-bezier(.4,0,.2,1) !important; }
        .ep-dash-overlay { display:none !important; }
        .ep-dash-overlay.open { display:block !important; }
        .ep-topbar-search { display:none !important; }
        .ep-topbar-date { display:none !important; }
        .ep-page-actions { display:none !important; }
        .ep-overview-chart-grid { grid-template-columns:1fr !important; }
        .ep-admin-grid2 { grid-template-columns:1fr !important; }
        .ep-admin-stats { grid-template-columns:1fr 1fr !important; }
        .ep-footer-cta { flex-direction:column !important; align-items:flex-start !important; }
        .ep-footer-cta-actions { width:100% !important; flex-wrap:wrap !important; }
        .ep-footer-grid { grid-template-columns:1fr 1fr !important; gap:24px !important; }
        .ep-footer-brand { grid-column: 1 / -1 !important; }
        .ep-footer-bottom { flex-direction:column !important; align-items:flex-start !important; gap:10px !important; }
        .ep-footer-bottom-links { flex-wrap:wrap !important; gap:10px !important; }
        .ep-help-fab { bottom: calc(96px + env(safe-area-inset-bottom, 0px)) !important; right: 14px !important; }
      }
        @media (max-width:600px) {
          .ep-footer-grid { grid-template-columns:1fr !important; gap:20px !important; }
        }
        @media (max-width:480px) {
          .ep-grid-4 { grid-template-columns:1fr !important; }
          .ep-admin-stats { grid-template-columns:1fr !important; }
          .ep-footer-grid { grid-template-columns:1fr !important; }
          .ep-footer-cta-actions button { width:100% !important; }
        }
      @media (max-width:420px) {
        .ep-card { border-radius:14px !important; }
        .ep-card, .ep-frame-dark, .ep-frame-light { padding:14px 14px !important; }
        .ep-auth-grid > div { padding:32px !important; }
        .ep-auth-grid h1 { font-size:24px !important; }
        .ep-auth-grid h2 { font-size:30px !important; }
        .ep-auth-grid p { font-size:13px !important; }
      }
      @media (max-width:380px) {
        .ep-card, .ep-frame-dark, .ep-frame-light { padding:12px 12px !important; }
        .ep-auth-grid > div { padding:26px !important; }
      }
      @media (min-width:769px) {
        .ep-dash-overlay { display:none !important; }
        .ep-dash-sidebar { transform:none !important; }
        .ep-mobile-only { display:none !important; }
      }
      @media (max-width:768px) {
        .ep-desktop-only { display:none !important; }
      }
    `;
    document.head.appendChild(s);
  }, []);
  return null;
    };

/* "" SUPABASE (optional) "" */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_BASE = import.meta.env.VITE_API_BASE || "";
const PAYMENTS_MODE = String(import.meta.env.VITE_PAYMENTS_MODE || "live").toLowerCase();
const MANUAL_PAYMENTS = PAYMENTS_MODE === "manual";
const WITHDRAWALS_MODE = String(import.meta.env.VITE_WITHDRAWALS_MODE || PAYMENTS_MODE || "manual").toLowerCase();
const MANUAL_WITHDRAWALS = WITHDRAWALS_MODE !== "auto";
const TIER1_MOBILE_MIN = Number(import.meta.env.VITE_TIER1_MOBILE_MIN || 100);
const TIER1_MOBILE_MAX = Number(import.meta.env.VITE_TIER1_MOBILE_MAX || 1000);
const DEPOSIT_INSTRUCTIONS =
  import.meta.env.VITE_DEPOSIT_INSTRUCTIONS ||
  "Submit your self deposit request and our team will share payment instructions and confirm your wallet credit.";
const DEPOSIT_METHODS = [
  { id: "mpesa", label: "M-Pesa", desc: "Mobile money" },
  { id: "card", label: "Card", desc: "Visa / Mastercard" },
  { id: "crypto", label: "Crypto", desc: "USDT / BTC" }
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
  if (!API_BASE) return origin;
  if (origin) {
    try {
      const apiOrigin = new URL(API_BASE, origin).origin;
      if (apiOrigin !== origin) return origin;
    } catch (e) {
      // fall back to API_BASE as-is
    }
  }
  return API_BASE;
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
    return "Payment limit reached for this account. Ask Pesapal to raise your limit or try a lower tier amount.";
  }
  if (lower.includes("ipn")) {
    return "Payment gateway is not fully configured yet. Please contact support.";
  }
  if (lower.includes("not configured")) {
    return "Payment gateway is not configured. Please contact support.";
  }
  return raw;
};

const clampNumber = (value, minVal, maxVal) => {
  const num = Number(value);
  const min = Number.isFinite(minVal) ? minVal : 0;
  const max = Number.isFinite(maxVal) ? maxVal : min;
  if (!Number.isFinite(num)) return min;
  return Math.min(Math.max(num, min), max);
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
      role: meta.role || "client",
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
    try {
      const { data: prev } = await supabase
        .from("users")
        .select("profile_data")
        .eq("user_id", userId)
        .maybeSingle();
      prevMeta = prev?.profile_data || {};
    } catch (e) {
      prevMeta = {};
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
      tier: tierVal,
      referral_code: payload.ref_code ?? payload.referral_code ?? null,
      status,
      profile_data: nextMeta
    };

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

const I = ({ n, s = 16, c = "currentColor", w = 1.75 }) => {
  const d = {
    home:      <><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></>,
    chart:     <><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></>,
    play:      <><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></>,
    users:     <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
    wallet:    <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 14a2 2 0 100-4 2 2 0 000 4z"/><path d="M22 7l-4-4H7a2 2 0 00-2 2"/></>,
    settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    bell:      <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
    logout:    <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    up:        <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></>,
    down:      <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></>,
    menu:      <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    link:      <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>,
    copy:      <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>,
    check:     <><polyline points="20,6 9,17 4,12"/></>,
    lock:      <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
    star:      <><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></>,
    shield:    <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    gift:      <><polyline points="20,12 20,22 4,22 4,12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></>,
    trendUp:   <><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></>,
    trendDn:   <><polyline points="23,18 13.5,8.5 8.5,13.5 1,6"/><polyline points="17,18 23,18 23,12"/></>,
    search:    <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    more:      <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    user:      <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    calendar:  <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    grid:      <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    xmark:     <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    chevR:     <><polyline points="9,18 15,12 9,6"/></>,
    chevL:     <><polyline points="15,18 9,12 15,6"/></>,
    sun:       <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
    moon:      <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></>,
    bolt:      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>,
    activity:  <><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></>,
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      {d[n]}
    </svg>
  );
    };

/* PAYMENT LOGOS (monochrome) */
const PAY_LOGO_GREY = "#B8B8B8";
const Wordmark = ({ text, width = 90 }) => (
  <svg viewBox={`0 0 ${width} 24`} height="20" role="img" aria-label={text} style={{ display:"block" }}>
    <text x="0" y="16" fill={PAY_LOGO_GREY} fontSize="12" fontWeight="700" fontFamily="Sora, Geist, sans-serif" letterSpacing="0.04em">
      {text}
    </text>
  </svg>
);
function PaymentLogo({ name }) {
  switch (name) {
    case "Mastercard":
      return (
        <svg viewBox="0 0 64 24" height="20" role="img" aria-label="Mastercard" style={{ display:"block" }}>
          <circle cx="26" cy="12" r="9" fill={PAY_LOGO_GREY} opacity="0.45" />
          <circle cx="38" cy="12" r="9" fill={PAY_LOGO_GREY} opacity="0.45" />
          <circle cx="26" cy="12" r="9" fill="none" stroke={PAY_LOGO_GREY} strokeWidth="1.4" />
          <circle cx="38" cy="12" r="9" fill="none" stroke={PAY_LOGO_GREY} strokeWidth="1.4" />
        </svg>
      );
    case "Visa":
      return <Wordmark text="VISA" width={64} />;
    case "M-Pesa":
      return <Wordmark text="M-PESA" width={72} />;
    case "Google Pay":
      return <Wordmark text="Google Pay" width={110} />;
    case "Binance Pay":
      return (
        <svg viewBox="0 0 90 24" height="20" role="img" aria-label="Binance Pay" style={{ display:"block" }}>
          <g transform="translate(6 4)">
            <rect x="6" y="6" width="8" height="8" transform="rotate(45 10 10)" fill={PAY_LOGO_GREY} opacity="0.6" />
            <rect x="10" y="2" width="8" height="8" transform="rotate(45 14 6)" fill={PAY_LOGO_GREY} opacity="0.35" />
          </g>
          <text x="32" y="16" fill={PAY_LOGO_GREY} fontSize="11" fontWeight="700" fontFamily="Sora, Geist, sans-serif" letterSpacing="0.04em">Binance Pay</text>
        </svg>
      );
    case "BNB":
      return (
        <svg viewBox="0 0 54 24" height="20" role="img" aria-label="BNB" style={{ display:"block" }}>
          <g transform="translate(10 4)" fill={PAY_LOGO_GREY}>
            <rect x="8" y="0" width="6" height="6" transform="rotate(45 11 3)" />
            <rect x="0" y="8" width="6" height="6" transform="rotate(45 3 11)" opacity="0.6" />
            <rect x="16" y="8" width="6" height="6" transform="rotate(45 19 11)" opacity="0.6" />
            <rect x="8" y="16" width="6" height="6" transform="rotate(45 11 19)" opacity="0.6" />
          </g>
        </svg>
      );
    case "Bitcoin":
      return (
        <svg viewBox="0 0 50 24" height="20" role="img" aria-label="Bitcoin" style={{ display:"block" }}>
          <circle cx="14" cy="12" r="9" fill="none" stroke={PAY_LOGO_GREY} strokeWidth="1.6" />
          <text x="10.5" y="16" fill={PAY_LOGO_GREY} fontSize="12" fontWeight="800" fontFamily="Sora, Geist, sans-serif">B</text>
          <line x1="11" y1="6" x2="11" y2="18" stroke={PAY_LOGO_GREY} strokeWidth="1" />
          <line x1="14.5" y1="6" x2="14.5" y2="18" stroke={PAY_LOGO_GREY} strokeWidth="1" />
        </svg>
      );
    case "USDT":
      return (
        <svg viewBox="0 0 54 24" height="20" role="img" aria-label="USDT" style={{ display:"block" }}>
          <circle cx="12" cy="12" r="9" fill="none" stroke={PAY_LOGO_GREY} strokeWidth="1.6" />
          <text x="9" y="16" fill={PAY_LOGO_GREY} fontSize="12" fontWeight="800" fontFamily="Sora, Geist, sans-serif">T</text>
          <text x="30" y="16" fill={PAY_LOGO_GREY} fontSize="11" fontWeight="700" fontFamily="Sora, Geist, sans-serif">USDT</text>
        </svg>
      );
    case "USDC":
      return (
        <svg viewBox="0 0 58 24" height="20" role="img" aria-label="USDC" style={{ display:"block" }}>
          <circle cx="12" cy="12" r="9" fill="none" stroke={PAY_LOGO_GREY} strokeWidth="1.6" />
          <text x="9" y="16" fill={PAY_LOGO_GREY} fontSize="12" fontWeight="800" fontFamily="Sora, Geist, sans-serif">$</text>
          <text x="30" y="16" fill={PAY_LOGO_GREY} fontSize="11" fontWeight="700" fontFamily="Sora, Geist, sans-serif">USDC</text>
        </svg>
      );
    case "Ethereum":
      return (
        <svg viewBox="0 0 54 24" height="20" role="img" aria-label="Ethereum" style={{ display:"block" }}>
          <polygon points="12,2 18,12 12,22 6,12" fill={PAY_LOGO_GREY} opacity="0.6" />
          <polygon points="12,2 18,12 12,12 6,12" fill={PAY_LOGO_GREY} />
          <text x="28" y="16" fill={PAY_LOGO_GREY} fontSize="11" fontWeight="700" fontFamily="Sora, Geist, sans-serif">ETH</text>
        </svg>
      );
    case "Litecoin":
      return (
        <svg viewBox="0 0 54 24" height="20" role="img" aria-label="Litecoin" style={{ display:"block" }}>
          <circle cx="12" cy="12" r="9" fill="none" stroke={PAY_LOGO_GREY} strokeWidth="1.6" />
          <text x="9.5" y="16" fill={PAY_LOGO_GREY} fontSize="12" fontWeight="800" fontFamily="Sora, Geist, sans-serif">L</text>
          <text x="30" y="16" fill={PAY_LOGO_GREY} fontSize="11" fontWeight="700" fontFamily="Sora, Geist, sans-serif">LTC</text>
        </svg>
      );
    case "Flutterwave":
      return (
        <svg viewBox="0 0 90 24" height="20" role="img" aria-label="Flutterwave" style={{ display:"block" }}>
          <circle cx="12" cy="12" r="8" fill="none" stroke={PAY_LOGO_GREY} strokeWidth="1.6" />
          <path d="M6 12c2.5-3 6.5-3 12 0" fill="none" stroke={PAY_LOGO_GREY} strokeWidth="1.4" />
          <text x="30" y="16" fill={PAY_LOGO_GREY} fontSize="11" fontWeight="700" fontFamily="Sora, Geist, sans-serif">Flutterwave</text>
        </svg>
      );
    case "PayPal":
      return <Wordmark text="PayPal" width={70} />;
    case "Apple Pay":
      return (
        <svg viewBox="0 0 90 24" height="20" role="img" aria-label="Apple Pay" style={{ display:"block" }}>
          <path d="M12 6c1-2 2.6-3 4.4-3-0.1 1.8-1.2 3.1-2.6 3.8-0.8 0.4-1.6 0.5-1.8 0.5 0-0.5 0-1.1 0-1.3z" fill={PAY_LOGO_GREY} />
          <path d="M12 8c-2 0-4 1.6-4 4.7 0 2.7 1.5 5.3 3.4 5.3 0.8 0 1.4-0.3 2.2-0.3 0.9 0 1.4 0.3 2.4 0.3 1.7 0 3.2-2.2 3.2-4.4-0.9-0.4-2-1.4-2-3.1 0-1.7 1.1-2.6 1.8-3-0.4-0.6-1.7-1.5-3.2-1.5-1 0-1.8 0.4-2.4 0.4-0.6 0-1.4-0.4-2.4-0.4z" fill={PAY_LOGO_GREY} opacity="0.6" />
          <text x="34" y="16" fill={PAY_LOGO_GREY} fontSize="11" fontWeight="700" fontFamily="Sora, Geist, sans-serif">Apple Pay</text>
        </svg>
      );
    case "Samsung Pay":
      return <Wordmark text="Samsung Pay" width={120} />;
    case "Stripe":
      return <Wordmark text="Stripe" width={70} />;
    case "Alipay":
      return <Wordmark text="Alipay" width={70} />;
    case "PesaPal":
      return <Wordmark text="PesaPal" width={90} />;
    case "WeChat Pay":
      return (
        <svg viewBox="0 0 100 24" height="20" role="img" aria-label="WeChat Pay" style={{ display:"block" }}>
          <circle cx="12" cy="11" r="8" fill="none" stroke={PAY_LOGO_GREY} strokeWidth="1.6" />
          <circle cx="20" cy="13" r="6" fill="none" stroke={PAY_LOGO_GREY} strokeWidth="1.4" />
          <text x="34" y="16" fill={PAY_LOGO_GREY} fontSize="11" fontWeight="700" fontFamily="Sora, Geist, sans-serif">WeChat Pay</text>
        </svg>
      );
    case "Skrill":
      return <Wordmark text="Skrill" width={60} />;
    case "Neteller":
      return <Wordmark text="Neteller" width={78} />;
    case "Cash App":
      return (
        <svg viewBox="0 0 90 24" height="20" role="img" aria-label="Cash App" style={{ display:"block" }}>
          <rect x="2" y="4" width="16" height="16" rx="4" fill="none" stroke={PAY_LOGO_GREY} strokeWidth="1.6" />
          <text x="7" y="16" fill={PAY_LOGO_GREY} fontSize="12" fontWeight="800" fontFamily="Sora, Geist, sans-serif">$</text>
          <text x="26" y="16" fill={PAY_LOGO_GREY} fontSize="11" fontWeight="700" fontFamily="Sora, Geist, sans-serif">Cash App</text>
        </svg>
      );
    case "Payoneer":
      return <Wordmark text="Payoneer" width={86} />;
    case "Airtel Money":
      return <Wordmark text="Airtel Money" width={110} />;
    default:
      return <Wordmark text={name} width={90} />;
  }
    }

const BRAND_LOGO_SRC = "/brand/logo.png";
const BrandMark = ({ size = 34 }) => (
  <img
    src={BRAND_LOGO_SRC}
    alt="Dollar App"
    style={{
      width: size,
      height: size,
      objectFit: "contain",
      display: "block",
      flexShrink: 0
    }}
  />
);

/* "" TIERS "" */
const V_PRICE = 50;
const TIERS = [
  { id:1, name:"Regular",      tag:"REG", deposit:5000,   videos:2, bonus:0, bonusType:"none",    bonusAmount:0,    dailyTotal:100,  acc:"#0066FF", rgb:"0,102,255",  lgt:"#EBF2FF", mid:"#99C2FF" },
  { id:2, name:"Standard",     tag:"STD", deposit:10000,  videos:2, bonus:1, bonusType:"optional",bonusAmount:25,   dailyTotal:125,  acc:"#BFC5CC", rgb:"191,197,204", lgt:"#F4F6F8", mid:"#D1D5DB" },
  { id:3, name:"Deluxe",       tag:"DLX", deposit:20000,  videos:2, bonus:1, bonusType:"auto",   bonusAmount:275,  dailyTotal:375,  acc:"#8A6A00", rgb:"138,106,0",  lgt:"#FFF5D1", mid:"#E3C56A" },
  { id:4, name:"Executive",    tag:"EXC", deposit:50000,  videos:2, bonus:1, bonusType:"auto",   bonusAmount:1025, dailyTotal:1125, acc:"#7C3AED", rgb:"124,58,237", lgt:"#F5F0FF", mid:"#C4B5FD" },
  { id:5, name:"Executive Pro",tag:"PRO", deposit:100000, videos:2, bonus:1, bonusType:"auto",   bonusAmount:2275, dailyTotal:2375, acc:"#DC2626", rgb:"220,38,38",  lgt:"#FFF0F0", mid:"#FCA5A5" },
];
const getTierRequiredEarn = (t) => (Number(t?.videos) || 0) * V_PRICE;
const getTierDailyTotal = (t) => Number(t?.dailyTotal) || (getTierRequiredEarn(t) + (Number(t?.bonusAmount) || 0));
const getTierBonusUnit = (t) => {
  const bonus = Number(t?.bonusAmount) || 0;
  const count = Math.max(0, Number(t?.bonus) || 0);
  if (count <= 0) return 0;
  return Math.round(bonus / count);
};

const makeAvatarSvg = ({ bg1, bg2, hair, skin, shirt, accent, icon }) => {
  const iconPaths = {
    bolt: "M13 2L3 14h7l-1 8 10-12h-7l1-8z",
    heart: "M20.8 5.6a4.6 4.6 0 00-6.5 0L12 7.9 9.7 5.6a4.6 4.6 0 00-6.5 6.5L12 21l8.8-8.8a4.6 4.6 0 000-6.6z",
    shield: "M12 2l7 3v6c0 5.2-3.2 9-7 11-3.8-2-7-5.8-7-11V5l7-3z",
    star: "M12 2l2.8 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.2 20l1.2-6.5-4.8-4.6 6.6-.9L12 2z",
    crown: "M3 9l4 4 5-7 5 7 4-4v9H3V9z",
    gift: "M4 9h16v4H4zM4 13h7v7H4zM13 13h7v7h-7zM12 9v11M6.8 7c0-2 2.2-3 3.7-1.7L12 6.5l1.5-1.2C15 4 17.2 5 17.2 7",
    spark: "M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z",
    diamond: "M12 2l8 8-8 12-8-12 8-8z",
    leaf: "M4 16c6-10 16-10 16-10-1 8-8 15-16 10z M7 13l6-6",
    wave: "M3 12c3-4 7-4 10 0s7 4 10 0",
    compass: "M12 2l4 10-10 4 4-10 10-4z",
    camera: "M4 8h4l2-2h4l2 2h4v10H4z M12 12a3 3 0 100 6 3 3 0 000-6z",
    rocket: "M12 2c3 2 6 6 6 10v4l-4 4-4-4v-4c0-4 3-8 6-10z M9 14l-4 4 M15 14l4 4",
    flame: "M12 2c3 4 5 6 5 9a5 5 0 11-10 0c0-3 2-5 5-9z",
    code: "M8 6l-4 6 4 6 M16 6l4 6-4 6"
  };
  const iconPath = iconPaths[icon] || iconPaths.star;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bg1}"/>
          <stop offset="100%" stop-color="${bg2}"/>
        </linearGradient>
        <radialGradient id="glow" cx="30%" cy="20%" r="60%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.65)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#bg)"/>
      <circle cx="34" cy="24" r="38" fill="url(#glow)"/>
      <circle cx="60" cy="52" r="28" fill="${skin}"/>
      <path d="M20 120c10-30 30-40 40-40s30 10 40 40" fill="${shirt}"/>
      <path d="M30 42c6-18 18-26 30-26s24 8 30 26" fill="${hair}"/>
      <circle cx="50" cy="52" r="3" fill="#111"/>
      <circle cx="70" cy="52" r="3" fill="#111"/>
      <path d="M48 63c6 8 18 8 24 0" stroke="#111" stroke-width="3" stroke-linecap="round" fill="none"/>
      <g transform="translate(74 10)">
        <circle cx="18" cy="18" r="16" fill="rgba(255,255,255,0.9)" stroke="${accent}" stroke-width="2"/>
        <g transform="translate(6 6)">
          <path d="${iconPath}" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
      </g>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    };

const AVATAR_PRESETS = [
  makeAvatarSvg({ bg1:"#E0F2FE", bg2:"#38BDF8", hair:"#0F172A", skin:"#F5CBA7", shirt:"#0284C7", accent:"#0EA5E9", icon:"compass" }),
  makeAvatarSvg({ bg1:"#FEE2E2", bg2:"#F97316", hair:"#7C2D12", skin:"#F0B49F", shirt:"#EA580C", accent:"#FB7185", icon:"flame" }),
  makeAvatarSvg({ bg1:"#DCFCE7", bg2:"#34D399", hair:"#064E3B", skin:"#EABFA6", shirt:"#10B981", accent:"#22C55E", icon:"leaf" }),
  makeAvatarSvg({ bg1:"#E0E7FF", bg2:"#818CF8", hair:"#312E81", skin:"#F0C4B1", shirt:"#6366F1", accent:"#4F46E5", icon:"diamond" }),
  makeAvatarSvg({ bg1:"#F1F5F9", bg2:"#94A3B8", hair:"#1F2937", skin:"#F5D0C5", shirt:"#64748B", accent:"#0F172A", icon:"camera" }),
  makeAvatarSvg({ bg1:"#ECFEFF", bg2:"#67E8F9", hair:"#164E63", skin:"#F3C4B0", shirt:"#0EA5E9", accent:"#0E7490", icon:"wave" }),
  makeAvatarSvg({ bg1:"#FFF7ED", bg2:"#FDBA74", hair:"#7C2D12", skin:"#F2C0A2", shirt:"#F97316", accent:"#C2410C", icon:"rocket" }),
  makeAvatarSvg({ bg1:"#FDF2F8", bg2:"#F472B6", hair:"#831843", skin:"#F6C1AE", shirt:"#EC4899", accent:"#BE185D", icon:"code" }),
];

const REF_STORAGE_KEY = "ep:ref";
const TIER_INTENT_KEY = "ep:tier-intent";
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

/* "" ANIMATED NUMBER "" */
function AnimNum({ target, prefix = "", suffix = "" }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let cur = 0, steps = 60, inc = target / steps;
    const id = setInterval(() => {
      cur = Math.min(cur + inc, target);
      setVal(Math.round(cur));
      if (cur >= target) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target]);
  return <>{prefix}{val.toLocaleString()}{suffix}</>;
    }

function LazyVideo({ src, fallbackSrc = "", eager = false, ...props }) {
  const ref = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(!!eager);
  const [activeSrc, setActiveSrc] = useState(!!eager ? src : "");
  useEffect(() => {
    if (eager) return;
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { setShouldLoad(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        io.disconnect();
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [eager]);
  useEffect(() => {
    if (shouldLoad) setActiveSrc(src);
  }, [shouldLoad, src]);

  const handleError = () => {
    if (fallbackSrc && activeSrc !== fallbackSrc) {
      setActiveSrc(fallbackSrc);
    }
  };

  return (
    <video
      ref={ref}
      src={shouldLoad ? activeSrc || src : undefined}
      preload={shouldLoad ? "auto" : "metadata"}
      onError={handleError}
      {...props}
    />
  );
    }

/* "" DONUT "" */
function Donut({ pct, acc, size = 80, thickness = 8 }) {
  const r = (size - thickness) / 2, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r, offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EBEBEB" strokeWidth={thickness} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={acc} strokeWidth={thickness}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: size / 5.5, fontWeight: 800, fill: "#111", fontFamily: "Geist,sans-serif", transform: "rotate(90deg)", transformOrigin: "center" }}>
        {pct}%
      </text>
    </svg>
  );
    }

/* 
   LANDING PAGE
 */
function Landing({ go }) {
  const [scrollPx, setScrollPx] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);
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

  const payments = [
    "Google Pay","USDT","Flutterwave","Binance Pay","M-Pesa","Visa","Mastercard","Bitcoin","BNB",
    "PayPal","Apple Pay","Samsung Pay","Stripe","Alipay","WeChat Pay","Skrill","Neteller","Ethereum","Litecoin","USDC","Cash App","Payoneer",
    "Airtel Money"
  ];

  const anim = (delay = 0) => ({ animation: `fadeUp .55s ease both`, animationDelay: `${delay}ms`, opacity: heroVisible ? 1 : 0 });

  return (
    <div style={{ fontFamily: "Geist,sans-serif", background: "#fff", color: "#111", minHeight: "100vh" }}>

      {/* "" NAV "" */}
      <nav style={{ position: "sticky", top: 0, zIndex: 90, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(16px)", borderBottom: "1px solid #E8E8E8", padding: "0 5vw", display: "flex", alignItems: "center", height: 60, gap: 32 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", flexShrink: 0 }} onClick={() => go("landing")}>
          <BrandMark size={32} />
          <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.04em", color: "#111" }}>EdisonPay</span>
        </div>
        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "#E8E8E8" }} />
        {/* Links */}
        <div className="ep-nav-links" style={{ display: "flex", gap: 4, flex: 1 }}>
          {[["Features","play"],["Tiers","star"],["How It Works","activity"],["Pricing","wallet"]].map(([l, ic]) => (
            <button key={l} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "transparent", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#666", cursor: "pointer", fontFamily: "Geist,sans-serif", transition: "all .12s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#F5F5F5"; e.currentTarget.style.color = "#111"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#666"; }}>
              <I n={ic} s={12} c="currentColor" />{l}
            </button>
          ))}
        </div>
        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#F7F7F7", border: "1px solid #E8E8E8", borderRadius: 8, fontSize: 12, color: "#888", fontWeight: 600 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", animation: "pulse 2s infinite" }} />
            Live platform
          </div>
          <button onClick={() => go("login")} style={{ padding: "8px 18px", background: "transparent", border: "1.5px solid #E0E0E0", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#111", fontFamily: "Geist,sans-serif", transition: "border-color .15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#111"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#E0E0E0"}>
            Sign In
          </button>
          <button onClick={() => go("signup")} style={{ padding: "8px 18px", background: "#111", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#fff", fontFamily: "Geist,sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
            Get Started <I n="chevR" s={12} c="#fff" />
          </button>
        </div>
      </nav>

      {/* "" HERO - split layout "" */}
      <section className="ep-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "calc(100vh - 98px)", maxWidth: 1300, margin: "0 auto", padding: "0 5vw" }}>

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: "6vw", paddingTop: 40, paddingBottom: 40 }}>
          {/* Social proof */}
          <div style={{ ...anim(0), display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 32, width: "fit-content" }}>
            <div style={{ display: "flex", gap: -3 }}>
              {["#FFD700","#FFD700","#FFD700","#FFD700","#FFD700"].map((c,i) => <I key={i} n="star" s={14} c={c} />)}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>4.9 - Trusted by 1,000+ earners</span>
          </div>

          {/* Headline */}
          <h1 style={{ ...anim(80), fontSize: "clamp(40px,4.8vw,66px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em", color: "#111", marginBottom: 24 }}>
            Earn KES 50<br />
            <span style={{ fontFamily: "Instrument Serif,serif", fontStyle: "italic", fontWeight: 400 }}>Per Video.</span><br />
            Daily.
          </h1>

          <p style={{ ...anim(160), fontSize: 17, color: "#666", lineHeight: 1.7, maxWidth: 420, marginBottom: 36 }}>
            Watch short videos, refer friends, and earn tiered daily rewards - with 5 tiers built for every budget.
          </p>

          <div style={{ ...anim(240), display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 44 }}>
            <button onClick={() => go("signup")} style={{ padding: "14px 30px", background: "#111", color: "#fff", border: "none", borderRadius: 50, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Geist,sans-serif" }}>Start Earning Free</button>
            <button onClick={() => go("login")} style={{ padding: "14px 30px", background: "#fff", color: "#111", border: "1.5px solid #E5E5E5", borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "Geist,sans-serif" }}>Sign In</button>
          </div>

          {/* 3 micro stats */}
          <div style={{ ...anim(320), display: "flex", gap: 32, paddingTop: 32, borderTop: "1px solid #EBEBEB" }}>
            {[["KES 50", "per required video"], ["Daily", "tiered rewards"], ["Tue & Fri", "payouts"]].map(([v, l], i) => (
              <div key={i}>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", color: "#111" }}>{v}</div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT - visual panel */}
        <div style={{ ...anim(120), position: "relative", display: "flex", alignItems: "stretch", paddingTop: 28, paddingBottom: 28 }}>
          {/* Main panel - dark gradient background simulating image */}
          <div style={{ flex: 1, borderRadius: 24, background: "#0B1320", position: "relative", overflow: "hidden", minHeight: 480 }}>
            {HOME_BALANCE_VIDEO && (
              <LazyVideo
                src={HOME_BALANCE_VIDEO}
                fallbackSrc={HOME_BALANCE_VIDEO_FALLBACK}
                eager
                autoPlay
                muted
                loop
                playsInline
                style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity:0.55, filter:"saturate(1.05) contrast(1.05)", zIndex:0 }}
              />
            )}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(160deg, rgba(13,27,54,0.75) 0%, rgba(13,42,63,0.68) 40%, rgba(10,61,46,0.72) 100%)", zIndex:1 }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none", zIndex:1 }} />

            {/* Central graphic - big earnings number */}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-55%)", textAlign: "center", zIndex: 2 }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 500 }}>YOUR BALANCE TODAY</div>
              <div style={{ fontSize: 64, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, animation: "fadeIn .8s ease .4s both" }}>
                KES 47,200
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>+KES 2,000 from today's videos</div>
              {/* Progress bar */}
              <div style={{ marginTop: 20, width: 240, margin: "20px auto 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
                  <span>Progress to weekly target</span><span>47%</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "47%", background: "#0066FF", borderRadius: 99, animation: "fadeIn 1.4s ease .6s both" }} />
                </div>
              </div>
            </div>

            {/* Floating card 1 - earnings stat (top right) */}
            <div style={{ position: "absolute", top: 28, right: 24, background: "#fff", borderRadius: 14, padding: "14px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", animation: "floatA 4s ease-in-out infinite", minWidth: 190, zIndex:2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#111", letterSpacing: "0.03em" }}>Daily Earnings</span>
                <span style={{ fontSize: 9, color: "#999", fontWeight: 500 }}>Live</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, background: "#0066FF", borderRadius: 8, height: 60, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>82%</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Videos</div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ flex: 1, background: "#00C896", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>23%</div>
                  </div>
                  <div style={{ flex: 1, background: "#00C896AA", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>76%</div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <span style={{ fontSize: 10, color: "#888" }}>- Bonus</span>
                <span style={{ fontSize: 10, color: "#888" }}>- Referrals</span>
              </div>
            </div>

            {/* Floating card 2 - chat bubble (bottom left) */}
            <div style={{ position: "absolute", bottom: 60, left: 24, background: "#fff", borderRadius: 50, padding: "12px 18px 12px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.16)", display: "flex", alignItems: "center", gap: 10, animation: "floatB 5s ease-in-out infinite", zIndex:2 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#0066FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <I n="check" s={14} c="#fff" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111", whiteSpace: "nowrap" }}>Withdrawal approved!</span>
            </div>

            {/* Floating card 3 - tier badge (bottom right) */}
            <div style={{ position: "absolute", bottom: 28, right: 24, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, animation: "floatA 6s ease-in-out infinite .5s", zIndex:2 }}>
              <I n="bolt" s={14} c="#0066FF" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>Unlock 5 Earning Tiers</span>
              <I n="chevR" s={14} c="rgba(255,255,255,0.5)" />
            </div>
          </div>
        </div>
      </section>

      {/* "" SCROLLING LOGOS "" */}
      <div style={{ borderTop: "1px solid #EBEBEB", borderBottom: "1px solid #EBEBEB", background: "#FAFAFA", padding: "16px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 48, width: "max-content", animation: "ticker 22s linear infinite", alignItems:"center" }}>
          {[...payments, ...payments].map((p, i) => (
            <div key={i} style={{ minWidth: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PaymentLogo name={p} />
            </div>
          ))}
        </div>
      </div>

      {/* "" TIERS SECTION "" */}
      <section style={{ padding: "88px 5vw", background: "#fff" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
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
                {[["KES 50","per required video"],["Tiered","daily rewards"],["Tue & Fri","withdrawals"]].map(([v,l],i) => (
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
      <section style={{ padding: "80px 5vw", background: "#FAFAFA", borderTop: "1px solid #E8E8E8" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 14 }}>Process</div>
            <h2 style={{ fontSize: "clamp(28px,3vw,44px)", fontWeight: 900, letterSpacing: "-0.04em" }}>Up and running in minutes</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 0, position: "relative" }}>
            <div style={{ position: "absolute", top: 20, left: "10%", right: "10%", height: 1, background: "#E0E0E0", zIndex: 0 }} />
            {[["user","Sign Up","Choose your tier and create your account."],["wallet","Deposit","Pay the fixed starting balance for your tier."],["play","Watch Videos","Earn KES 50 per video - bonus handles the rest."],["gift","Refer Friends","Get 10% bonus every time someone joins your link."],["up","Withdraw","Tuesday & Friday - straight to your phone."]].map(([icon, title, desc], i) => (
              <div key={i} style={{ textAlign: "center", padding: "0 16px", position: "relative", zIndex: 1 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "#fff", border: "1.5px solid #111", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <I n={icon} s={18} c="#111" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* "" FOOTER "" */}
      <footer style={{ background: "#0D0D0D", color: "#fff" }}>
        {/* Top CTA band */}
        <div style={{ borderBottom: "1px solid #1F1F1F", padding: "48px 5vw" }}>
          <div className="ep-footer-cta" style={{ maxWidth: 1300, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
            <div>
              <h3 style={{ fontSize: "clamp(22px,2.5vw,34px)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 8 }}>
                Ready to start earning?
              </h3>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.6 }}>Join 1,000+ Kenyans building passive income daily.</p>
            </div>
            <div className="ep-footer-cta-actions" style={{ display: "flex", gap: 12 }}>
              <button onClick={() => go("signup")} style={{ padding: "13px 28px", background: "#fff", color: "#111", border: "none", borderRadius: 50, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "Geist,sans-serif" }}>Create Free Account</button>
              <button onClick={() => go("login")} style={{ padding: "13px 28px", background: "transparent", color: "#fff", border: "1.5px solid #333", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "Geist,sans-serif" }}>Sign In</button>
            </div>
          </div>
        </div>

        {/* Main footer grid */}
        <div className="ep-footer-grid" style={{ padding: "56px 5vw 40px", maxWidth: 1300, margin: "0 auto", display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr", gap: 40 }}>
          {/* Brand col */}
          <div className="ep-footer-brand">
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
              <BrandMark size={34} />
              <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.04em" }}>EdisonPay</span>
            </div>
            <p style={{ fontSize: 13, color: "#555", lineHeight: 1.8, maxWidth: 260, marginBottom: 24 }}>
              Kenya's leading video earnings platform. Watch, earn, refer, and grow your daily rewards.
            </p>
            {/* Social links */}
            <div style={{ display: "flex", gap: 10 }}>
              {[["Twitter/X","xmark"],["Instagram","star"],["YouTube","play"],["WhatsApp","users"]].map(([n, ic]) => (
                <div key={n} title={n} style={{ width: 34, height: 34, borderRadius: 9, background: "#1A1A1A", border: "1px solid #2A2A2A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#2A2A2A"}
                  onMouseLeave={e => e.currentTarget.style.background = "#1A1A1A"}>
                  <I n={ic} s={13} c="#666" />
                </div>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {[
            { h: "Platform", ls: ["Overview","Tiers & Plans","Video Earnings","Bonus System","Referrals","Withdrawals"] },
            { h: "Tiers", ls: ["Regular - 5K","Standard - 10K","Deluxe - 20K","Executive - 50K","Exec Pro - 100K"] },
            { h: "Company", ls: ["About Us","Careers","Press","Blog","Contact","Partners"] },
            { h: "Support", ls: ["Help Centre","FAQs","System Status","Privacy Policy","Terms of Service","Cookie Policy"] },
          ].map((col, i) => (
            <div key={i}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 18 }}>{col.h}</div>
              {col.ls.map(l => (
                <div key={l} style={{ fontSize: 13, color: "#555", marginBottom: 10, cursor: "pointer", transition: "color .12s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#bbb"}
                  onMouseLeave={e => e.currentTarget.style.color = "#555"}>
                  {l}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="ep-footer-bottom" style={{ borderTop: "1px solid #1A1A1A", padding: "20px 5vw", maxWidth: 1300, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#3A3A3A" }}>(c) 2025 EdisonPay Ltd. All rights reserved. Nairobi, Kenya.</span>
          <div className="ep-footer-bottom-links" style={{ display: "flex", gap: 20, fontSize: 12, color: "#3A3A3A" }}>
            {["Privacy","Terms","Cookies","Sitemap"].map(l => <span key={l} style={{ cursor: "pointer", transition: "color .12s" }} onMouseEnter={e => e.target.style.color = "#777"} onMouseLeave={e => e.target.style.color = "#3A3A3A"}>{l}</span>)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#3A3A3A" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", animation: "pulse 2s infinite" }} />
            All systems operational
          </div>
        </div>
      </footer>
    </div>
  );
    }

function TierRow({ t, go, onSelectTier }) {
  const [hov, setHov] = useState(false);
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
        <div style={{ fontWeight: 900, fontSize: 16, color: "#111", letterSpacing: "-0.03em" }}>KES {t.deposit.toLocaleString()}</div>
        <div style={{ fontSize: 11, color: "#BBB" }}>starting balance</div>
      </div>
      <I n="chevR" s={16} c={hov ? "#111" : "#DDD"} />
    </div>
  );
    }

function TierCard({ t, go, featured, onSelectTier }) {
  const [hov, setHov] = useState(false);
  const daily = getTierDailyTotal(t);
  const goal = getTierDailyTotal(t) * 7;
  const days = Math.ceil(goal / Math.max(daily, 1));
  const hasGlare = t.name === "Regular" || t.name === "Standard" || t.name === "Deluxe";
  const glareTone = t.name === "Deluxe" ? "rgba(255,228,140,0.85)" : "rgba(255,255,255,0.85)";
  const cardStyle = {
    borderRadius: 16,
    border: featured ? "2px solid #111" : `1.5px solid ${hov ? "#111" : "#E0E0E0"}`,
    background: hov ? "#FAFAFA" : "#fff",
    padding: "26px 22px",
    cursor: "pointer",
    transition: "all .2s ease",
    transform: hov ? "translateY(-3px)" : "none",
    boxShadow: hov ? "0 8px 24px rgba(0,0,0,0.12)" : featured ? "0 4px 16px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.04)",
    position: "relative",
    overflow: "hidden",
  };
  if (hasGlare) cardStyle["--glare"] = glareTone;
  const handlePick = () => {
    if (onSelectTier) { onSelectTier(t?.id); return; }
    go("signup");
  };
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={handlePick}
      className={hasGlare ? "ep-tier-glare" : undefined}
      style={cardStyle}>
      {featured && (
        <div style={{ position: "absolute", top: 16, right: 16, padding: "3px 10px", background: "#111", borderRadius: 50, fontSize: 9, fontWeight: 900, color: "#fff", letterSpacing: "0.1em" }}>POPULAR</div>
      )}

      {/* Tier badge + icon row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: hov ? "#111" : t.lgt, border: hov ? "none" : `1.5px solid ${t.mid}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>
          <I n="bolt" s={17} c={hov ? "#fff" : t.acc} />
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: hov ? "#999" : t.acc, letterSpacing: "0.12em" }}>TIER {t.id}</div>
          <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-0.03em", color: "#111" }}>{t.name}</div>
        </div>
      </div>

      {/* Price */}
      <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid #F0F0F0" }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#111", letterSpacing: "-0.05em", lineHeight: 1 }}>KES {(t.deposit/1000).toFixed(0)}K</div>
        <div style={{ fontSize: 11, color: "#AAA", marginTop: 4 }}>starting deposit - daily rewards by tier</div>
      </div>

      {/* Features */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {[[`${t.videos} required videos/day`, "play"], [`${t.bonus} bonus rewards/day`, "activity"], [`KES ${daily.toLocaleString()} earned daily`, "trendUp"], [`~${days} days to weekly target`, "star"]].map(([label, icon], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#444" }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: "#F5F5F5", border: "1px solid #E8E8E8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <I n={icon} s={11} c="#888" />
            </div>
            {label}
          </div>
        ))}
      </div>

      <button onClick={e => { e.stopPropagation(); handlePick(); }}
        style={{ width: "100%", padding: "11px", background: hov ? "#111" : "#fff", color: hov ? "#fff" : "#111", border: "1.5px solid #111", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "Geist,sans-serif", transition: "all .2s", letterSpacing: "-0.01em" }}>
        Get Started '
      </button>
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
      /access_token=/i.test(url) ||
      /refresh_token=/i.test(url) ||
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
    const apiBase = getApiBase();
    if (!apiBase) {
      setErr("Signup service is not configured.");
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
        setErr(data?.error || "Unable to create account.");
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
      setLoading(false);
      setErr("Unable to create account. Please try again.");
    }
  };
  const handleGoogle = async () => {
    setErr("");
    setInfo("");
    if (!supabase) { setErr("Supabase is not configured."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) { setErr(error.message); setLoading(false); }
  };

  return (
    <div className="ep-auth-grid" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", fontFamily: "Geist,sans-serif" }}>

      {/* LEFT - brand panel */}
      <div className="ep-auth-left" style={{ background: "#0D1117", display: "flex", flexDirection: "column", padding: isMobile ? "32px 28px" : "48px 56px", position: "relative", overflow: "hidden", minHeight: isMobile ? 320 : "auto" }}>
        {/* Subtle grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 64, zIndex: 1 }}>
          <BrandMark size={34} />
          <span style={{ fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: "-0.03em" }}>EdisonPay</span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 1 }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 20 }}>
            Earn while<br /><span style={{ fontFamily: "Instrument Serif,serif", fontStyle: "italic", fontWeight: 400, color: "#0066FF" }}>you sleep.</span>
          </h2>
          <p style={{ color: "#666", fontSize: 15, lineHeight: 1.7, marginBottom: 40, maxWidth: 340 }}>Join 1,000+ earners across Kenya collecting daily passive income from video watching and referrals.</p>

          {/* Feature pills */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[["play","KES 50 earned per video watched"],["users","10% referral bonus - earn from your network"],["shield","Secure withdrawals  -  Tue & Fri"]].map(([ic, t], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(0,102,255,0.15)", border: "1px solid rgba(0,102,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <I n={ic} s={13} c="#0066FF" />
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#444", zIndex: 1 }}>(c) 2025 EdisonPay Ltd.</div>
      </div>

      {/* RIGHT - form */}
      <div style={{ background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "32px 22px 48px" : 48 }}>
        <div style={{ width: "100%", maxWidth: 400, animation: "scaleIn .35s ease both" }}>
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color: "#111", marginBottom: 8 }}>
              {recoveryMode ? "Set new password" : resetMode ? "Forgot password" : (isLogin ? "Welcome back" : "Create account")}
            </h1>
            <p style={{ fontSize: 14, color: "#999" }}>
              {recoveryMode
                ? "Choose a new secure password for your account."
                : resetMode
                  ? "We'll email you a secure reset link."
                  : (isLogin ? "Sign in to your EdisonPay account" : "Start earning in under 2 minutes")}
            </p>
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
            <div style={{ textAlign: "right", marginBottom: 20 }}>
              <span
                style={{ fontSize: 13, color: "#0066FF", fontWeight: 600, cursor: "pointer" }}
                onClick={() => { setResetMode(true); setInfo(""); setErr(""); }}
              >
                Forgot password?
              </span>
            </div>
          )}

          {err && (
            <div style={{ padding: "10px 14px", background: "#FFF0F0", border: "1px solid #FCA5A5", borderRadius: 9, fontSize: 13, color: "#DC2626", fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <I n="xmark" s={14} c="#DC2626" /> {err}
            </div>
          )}
          {info && (
            <div style={{ padding: "10px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 9, fontSize: 13, color: "#1D4ED8", fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <I n="check" s={14} c="#1D4ED8" /> {info}
            </div>
          )}

          {(!resetMode && !recoveryMode) && (
            <>
            <button onClick={handleGoogle} disabled={loading || !SUPABASE_ENABLED}
              style={{ width: "100%", padding: "12px 16px", background: "#fff", color: "#111", border: "1.5px solid #111", borderRadius: 999, fontWeight: 700, fontSize: 14, cursor: (loading || !SUPABASE_ENABLED) ? "not-allowed" : "pointer", fontFamily: "Geist,sans-serif", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: !SUPABASE_ENABLED ? 0.7 : 1, boxShadow: "0 3px 0 #111" }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: "conic-gradient(#4285F4 0 90deg, #34A853 90deg 180deg, #FBBC05 180deg 270deg, #EA4335 270deg 360deg)", display: "grid", placeItems: "center" }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 800, color: "#4285F4", fontFamily: "Geist,sans-serif" }}>G</span>
              </span>
              Continue with Google
            </button>
            {!SUPABASE_ENABLED && (
              <div style={{ fontSize: 11, color: "#AAA", fontWeight: 600, marginBottom: 10 }}>
                Connect Google in Supabase to enable.
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ height: 1, background: "#EEE", flex: 1 }} />
              <span style={{ fontSize: 11, color: "#999", fontWeight: 600 }}>OR</span>
              <div style={{ height: 1, background: "#EEE", flex: 1 }} />
            </div>
            </>
          )}

          <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "14px", background: loading ? "#888" : "#111", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", fontFamily: "Geist,sans-serif", marginBottom: 20, letterSpacing: "-0.01em", transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? (
              <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> {recoveryMode ? "Updating password..." : resetMode ? "Sending link..." : (isLogin ? "Signing in..." : "Creating account...")}</>
            ) : (recoveryMode ? "Update Password" : resetMode ? "Send Reset Link" : (isLogin ? "Sign In" : "Create Account"))}
          </button>

          {(!resetMode && !recoveryMode) && (
            <div style={{ textAlign: "center", fontSize: 13, color: "#999" }}>
              {isLogin ? "No account? " : "Have an account? "}
              <span onClick={() => go(isLogin ? "signup" : "login")} style={{ color: "#111", fontWeight: 700, cursor: "pointer" }}>{isLogin ? "Sign Up" : "Sign In"}</span>
            </div>
          )}

          {(resetMode || recoveryMode) && (
            <div style={{ textAlign: "center", fontSize: 13, color: "#999" }}>
              <span onClick={() => { setResetMode(false); clearRecovery(); setErr(""); setInfo(""); }} style={{ color: "#111", fontWeight: 700, cursor: "pointer" }}>Back to sign in</span>
            </div>
          )}

          <div onClick={() => go("landing")} style={{ textAlign: "center", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", color: "#CCC", fontSize: 13, fontWeight: 500 }}>
            <I n="chevL" s={13} c="#CCC" /> Back to home
          </div>
        </div>
      </div>
    </div>
  );
    }

function TierSelect({ go, authUser, profileRow, onSelectTier }) {
  const [selected, setSelected] = useState(() => {
    const intent = getTierIntent();
    return Number(profileRow?.tier) || intent || 1;
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [panel, setPanel] = useState("");
  const [depPhone, setDepPhone] = useState("");
  const [depName, setDepName] = useState("");
  const [depMethod, setDepMethod] = useState("M-Pesa");
  const [depLoading, setDepLoading] = useState(false);
  const [depError, setDepError] = useState("");
  const [depDone, setDepDone] = useState(false);
  const depErrorMsg = formatDepositError(depError);
  const [autoPrompted, setAutoPrompted] = useState(false);
  const [depAmount, setDepAmount] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 769);
  const tier1Min = Number.isFinite(TIER1_MOBILE_MIN) ? TIER1_MOBILE_MIN : 100;
  const tier1Max = Number.isFinite(TIER1_MOBILE_MAX) ? TIER1_MOBILE_MAX : 1000;
  const tier1Cap = tier1Max >= tier1Min ? tier1Max : tier1Min;
  const tier1Floor = tier1Min;
  const isTier1Flex = isMobile && Number(selected) === 1;
  useEffect(() => {
    const intent = getTierIntent();
    if (!Number.isFinite(Number(profileRow?.tier)) && Number.isFinite(intent)) {
      setSelected(intent);
    } else if (Number.isFinite(Number(profileRow?.tier))) {
      setSelected(Number(profileRow.tier));
    }
    if (!autoPrompted) {
      setPanel("pay");
      setAutoPrompted(true);
    }
  }, [profileRow?.tier, autoPrompted]);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 769);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    if (isTier1Flex) {
      setDepAmount((prev) => (prev ? prev : String(tier1Floor)));
    } else {
      setDepAmount("");
    }
  }, [isTier1Flex, tier1Floor]);

  useEffect(() => {
    if (profileRow?.phone && !depPhone) setDepPhone(String(profileRow.phone));
    if ((profileRow?.name || profileRow?.full_name) && !depName) {
      setDepName(String(profileRow?.name || profileRow?.full_name));
    }
  }, [profileRow?.phone, profileRow?.name, profileRow?.full_name]);

  const handlePick = (tierId) => {
    if (!tierId) return;
    setSelected(tierId);
    setErr("");
    setDepError("");
    setPanel("pay");
    setAutoPrompted(true);
    storeTierIntent(tierId);
  };

  const commitTier = async (tierId, { navigate = false } = {}) => {
    if (!onSelectTier) {
      if (navigate) go("dashboard");
      return true;
    }
    setSaving(true);
    const ok = await onSelectTier(tierId);
    setSaving(false);
    if (!ok) {
      setErr("Unable to save tier. Please try again.");
      return false;
    }
    clearTierIntent();
    if (navigate) go("dashboard");
    return true;
  };

  const togglePanel = (next) => {
    setPanel((prev) => (prev === next ? "" : next));
  };

  const handlePayNow = async (tierId) => {
    setErr("");
    setDepError("");
    const ok = await commitTier(tierId, { navigate: false });
    if (!ok) return;
    setPanel("pay");
    setAutoPrompted(true);
  };

  const handlePayLater = async (tierId) => {
    setErr("");
    setDepError("");
    await commitTier(tierId, { navigate: true });
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
    let amount = Number(tier.deposit);
    if (isTier1Flex && Number(tier.id) === 1) {
      const nextAmt = clampNumber(depAmount, tier1Floor, tier1Cap);
      if (!Number.isFinite(nextAmt) || nextAmt <= 0) {
        setDepError(`Enter an amount between KES ${tier1Floor.toLocaleString()} and KES ${tier1Cap.toLocaleString()}.`);
        return;
      }
      amount = nextAmt;
    }
    setDepError("");
    setDepLoading(true);
    try {
      const token = await getAccessToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${apiBase}/api/v1/deposit/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount,
          user_id: authUser.id,
          email,
          tier: tier.id,
          method: depMethod || "M-Pesa",
          payment_mode: MANUAL_PAYMENTS ? "manual" : "live",
          phone: depPhone || profileRow?.phone || "",
          name: depName || profileRow?.name || authUser?.user_metadata?.full_name || ""
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const rawMsg = data?.error || data?.message || "Failed to start checkout.";
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
        return;
      }
      if (!url) {
        setDepError("Payment gateway did not return a checkout URL.");
        return;
      }
      setDepDone(true);
      setTimeout(() => setDepDone(false), 2500);
      window.location.href = url;
    } catch (e) {
      setDepError("Network error. Please try again.");
    } finally {
      setDepLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFC", display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 16px", fontFamily:"Geist,sans-serif" }}>
      <div style={{ width:"min(980px, 92vw)" }}>
        <div style={{ textAlign:"center", marginBottom:30 }}>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.16em", color:"#0066FF", textTransform:"uppercase", marginBottom:10 }}>Choose Your Tier</div>
          <div style={{ fontSize:"clamp(26px,3vw,38px)", fontWeight:900, letterSpacing:"-0.04em", color:"#111", marginBottom:10 }}>
            Pick a tier to enter your dashboard
          </div>
          <div style={{ fontSize:14, color:"#6B7280", lineHeight:1.6 }}>
            You can explore any tier. Earnings and withdrawals unlock after your self deposit clears.
          </div>
        </div>

        {err && (
          <div style={{ padding:"10px 14px", background:"#FFF0F0", border:"1px solid #FCA5A5", borderRadius:9, fontSize:13, color:"#DC2626", fontWeight:600, marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
            <I n="xmark" s={14} c="#DC2626" /> {err}
          </div>
        )}

        <div className="ep-tier-grid" style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16 }}>
          {TIERS.map((tier) => {
            const isActive = Number(selected) === Number(tier.id);
            const daily = getTierDailyTotal(tier);
            return (
              <div key={tier.id} style={{ background:"#fff", borderRadius:16, border:isActive ? "2px solid #111" : "1.5px solid #E5E7EB", padding:"22px", boxShadow:isActive ? "0 6px 18px rgba(0,0,0,0.08)" : "0 2px 10px rgba(0,0,0,0.04)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:10, letterSpacing:"0.12em", fontWeight:800, color:tier.acc }}>TIER {tier.id}</div>
                    <div style={{ fontSize:18, fontWeight:900, letterSpacing:"-0.03em", color:"#111" }}>{tier.name}</div>
                  </div>
                  {isActive && (
                    <div style={{ padding:"4px 10px", borderRadius:999, background:"#111", color:"#fff", fontSize:10, fontWeight:800 }}>Selected</div>
                  )}
                </div>
                <div style={{ fontSize:13, color:"#6B7280", marginBottom:12 }}>
                  Self deposit: <strong style={{ color:"#111" }}>KES {tier.deposit.toLocaleString()}</strong>
                </div>
                <div style={{ fontSize:13, color:"#6B7280", marginBottom:16 }}>
                  Daily earning: <strong style={{ color:"#111" }}>KES {daily.toLocaleString()}</strong>
                </div>
                {!isActive && (
                  <button
                    disabled={saving}
                    onClick={() => handlePick(tier.id)}
                    style={{
                      width:"100%",
                      padding:"10px 14px",
                      borderRadius:10,
                      border:"1.5px solid #111",
                      background:"#fff",
                      color:"#111",
                      fontWeight:800,
                      fontSize:13,
                      cursor:saving ? "not-allowed" : "pointer",
                      fontFamily:"Geist,sans-serif"
                    }}
                  >
                    Select Tier
                  </button>
                )}
                {isActive && (
                  <>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:10 }}>
                      <button
                        disabled={saving}
                        onClick={() => togglePanel("earn")}
                        style={{
                          padding:"9px 8px",
                          borderRadius:9,
                          border:`1.5px solid ${panel==="earn" ? "#111" : "#E2E8F0"}`,
                          background:panel==="earn" ? "#111" : "#fff",
                          color:panel==="earn" ? "#fff" : "#111",
                          fontWeight:800,
                          fontSize:12,
                          cursor:saving ? "not-allowed" : "pointer",
                          fontFamily:"Geist,sans-serif"
                        }}
                      >
                        Earnings
                      </button>
                      <button
                        disabled={saving}
                        onClick={() => handlePayNow(tier.id)}
                        style={{
                          padding:"9px 8px",
                          borderRadius:9,
                          border:`1.5px solid ${panel==="pay" ? "#111" : "#E2E8F0"}`,
                          background:panel==="pay" ? "#111" : "#fff",
                          color:panel==="pay" ? "#fff" : "#111",
                          fontWeight:800,
                          fontSize:12,
                          cursor:saving ? "not-allowed" : "pointer",
                          fontFamily:"Geist,sans-serif"
                        }}
                      >
                        {saving ? "Saving..." : "Self Deposit"}
                      </button>
                      <button
                        disabled={saving}
                        onClick={() => handlePayLater(tier.id)}
                        style={{
                          padding:"9px 8px",
                          borderRadius:9,
                          border:"1.5px solid #E2E8F0",
                          background:"#F8FAFC",
                          color:"#475569",
                          fontWeight:800,
                          fontSize:12,
                          cursor:saving ? "not-allowed" : "pointer",
                          fontFamily:"Geist,sans-serif"
                        }}
                      >
                        Pay Later
                      </button>
                    </div>

                    {panel === "earn" && (
                      <div style={{ padding:"12px 14px", borderRadius:12, border:"1px solid #E2E8F0", background:"#F8FAFC", marginBottom:10 }}>
                        <div style={{ fontSize:10, letterSpacing:"0.14em", fontWeight:800, color:"#64748B", textTransform:"uppercase", marginBottom:10 }}>Earnings Breakdown</div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
                          <div>
                            <div style={{ fontSize:10, color:"#94A3B8", fontWeight:700 }}>Required videos</div>
                            <div style={{ fontSize:13, fontWeight:800, color:"#111" }}>{tier.videos} per day</div>
                          </div>
                          <div>
                            <div style={{ fontSize:10, color:"#94A3B8", fontWeight:700 }}>Per video</div>
                            <div style={{ fontSize:13, fontWeight:800, color:"#111" }}>KES {V_PRICE}</div>
                          </div>
                          <div>
                            <div style={{ fontSize:10, color:"#94A3B8", fontWeight:700 }}>Bonus</div>
                            <div style={{ fontSize:13, fontWeight:800, color:"#111" }}>
                              {tier.bonusType === "none" ? "No bonus" : `KES ${tier.bonusAmount}`}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize:10, color:"#94A3B8", fontWeight:700 }}>Daily total</div>
                            <div style={{ fontSize:13, fontWeight:900, color:"#0F172A" }}>KES {daily.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {panel === "pay" && (
                      <div style={{ padding:"12px 14px", borderRadius:12, border:"1px solid #E2E8F0", background:"#FFFFFF" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:12 }}>
                          <div>
                            <div style={{ fontSize:10, fontWeight:800, color:"#94A3B8", letterSpacing:"0.18em", textTransform:"uppercase" }}>
                              Self Deposit Checkout
                            </div>
                            <div style={{ fontSize:13, fontWeight:900, color:"#0F172A", marginTop:4 }}>
                              {MANUAL_PAYMENTS ? "Submit a self deposit request" : `Deposit for ${tier.name}`}
                            </div>
                          </div>
                          <div style={{ padding:"4px 8px", borderRadius:999, background:MANUAL_PAYMENTS ? "#F97316" : "#111827", color:"#fff", fontSize:10, fontWeight:800 }}>
                            {MANUAL_PAYMENTS ? "MANUAL" : (isTier1Flex ? "MOBILE FLEX" : "LIVE")}
                          </div>
                        </div>

                        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:"#F8FAFC", border:"1px solid #E2E8F0", marginBottom:10 }}>
                          <div>
                            <div style={{ fontSize:10, color:"#94A3B8", fontWeight:800, letterSpacing:"0.12em" }}>
                              {isTier1Flex ? "MOBILE LIMIT" : "LOCKED AMOUNT"}
                            </div>
                            <div style={{ fontSize:18, fontWeight:900, color:"#0F172A" }}>
                              KES {(isTier1Flex ? clampNumber(depAmount || tier1Floor, tier1Floor, tier1Cap) : tier.deposit).toLocaleString()}
                            </div>
                            <div style={{ fontSize:10, color:"#64748B", marginTop:2 }}>
                              {isTier1Flex ? `Limit KES ${tier1Floor.toLocaleString()} - ${tier1Cap.toLocaleString()}` : `${tier.name} Tier`}
                            </div>
                          </div>
                          <div style={{ padding:"6px 10px", borderRadius:999, background:"#111827", color:"#fff", fontSize:10, fontWeight:800 }}>FIXED</div>
                        </div>

                        {isTier1Flex && (
                          <div style={{ marginBottom:10 }}>
                            <div style={{ fontSize:10, letterSpacing:"0.14em", fontWeight:800, color:"#64748B", textTransform:"uppercase", marginBottom:6 }}>Enter Amount</div>
                            <input
                              type="number"
                              min={tier1Floor}
                              max={tier1Cap}
                              value={depAmount}
                              onChange={e=>setDepAmount(e.target.value)}
                              placeholder={`KES ${tier1Floor.toLocaleString()} - ${tier1Cap.toLocaleString()}`}
                              style={{ width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",fontSize:13,fontFamily:"Geist,sans-serif",background:"#F8FAFC" }}
                            />
                          </div>
                        )}

                        <div style={{ fontSize:11, color:"#64748B", marginTop:2 }}>
                          {MANUAL_PAYMENTS ? DEPOSIT_INSTRUCTIONS : "Secure checkout will open in a new window."}
                        </div>

                        <div style={{ marginTop:12 }}>
                          <div style={{ fontSize:10, letterSpacing:"0.14em", fontWeight:800, color:"#64748B", textTransform:"uppercase", marginBottom:8 }}>Choose Method</div>
                          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:8 }}>
                            {DEPOSIT_METHODS.map((m) => {
                              const active = depMethod === m.label;
                              return (
                                <button key={m.id} onClick={() => setDepMethod(m.label)}
                                  style={{
                                    padding:"10px 10px",
                                    borderRadius:10,
                                    border:active ? "1.5px solid #111" : "1.5px solid #E2E8F0",
                                    background:active ? "#111" : "#F8FAFC",
                                    color:active ? "#fff" : "#111",
                                    fontWeight:800,
                                    fontSize:12,
                                    cursor:"pointer",
                                    fontFamily:"Geist,sans-serif",
                                    textAlign:"left"
                                  }}>
                                  <div style={{ fontSize:12, fontWeight:900 }}>{m.label}</div>
                                  <div style={{ fontSize:10, opacity:active ? 0.8 : 0.6 }}>{m.desc}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:12 }}>
                          <input
                            value={depPhone}
                            onChange={e=>setDepPhone(e.target.value)}
                            placeholder="Phone (M‑Pesa only, optional)"
                            style={{ width:"100%",padding:"9px 10px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:12,fontFamily:"Geist,sans-serif",background:"#F8FAFC" }}
                          />
                          <input
                            value={depName}
                            onChange={e=>setDepName(e.target.value)}
                            placeholder="Full name (optional)"
                            style={{ width:"100%",padding:"9px 10px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:12,fontFamily:"Geist,sans-serif",background:"#F8FAFC" }}
                          />
                        </div>
                        <button
                          onClick={() => submitTierDeposit(tier)}
                          disabled={depLoading}
                          style={{ width:"100%",marginTop:10,padding:"11px 12px",background:depLoading?"#334155":"linear-gradient(135deg,#111827 0%, #0F172A 100%)",color:"#fff",border:"none",borderRadius:10,fontWeight:900,fontSize:12,cursor:depLoading?"not-allowed":"pointer",fontFamily:"Geist,sans-serif" }}
                        >
                          {depLoading
                            ? (MANUAL_PAYMENTS ? "Submitting..." : "Redirecting...")
                            : (depDone
                              ? "Self Deposit Submitted"
                              : (MANUAL_PAYMENTS
                                ? `Submit ${depMethod} Request`
                                : `Continue with ${depMethod}`))}
                        </button>
                        {depErrorMsg && (
                          <div style={{ marginTop:8, fontSize:11, color:"#DC2626", fontWeight:700, background:"#FFF1F2", border:"1px solid #FECACA", padding:"8px 10px", borderRadius:8 }}>
                            {depErrorMsg}
                          </div>
                        )}
                        {!MANUAL_PAYMENTS && (
                          <div style={{ marginTop:8, fontSize:11, color:"#64748B" }}>
                            You’ll complete the payment in a secure checkout and return here automatically.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
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
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, letterSpacing: "0.02em" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: focus ? "#111" : "#C8C8C8", transition: "color .15s", pointerEvents: "none" }}>
          <I n={ic} s={14} c="currentColor" />
        </div>
        <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ width: "100%", padding: "11px 14px 11px 38px", background: "#FAFAFA", border: `1.5px solid ${focus ? "#111" : "#EBEBEB"}`, borderRadius: 9, fontSize: 14, color: "#111", outline: "none", fontFamily: "Geist,sans-serif", transition: "border-color .15s", boxSizing: "border-box" }} />
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
const PLAN_BG_VIDEO_FALLBACK = CDN_BASE ? "/plan-actions.mp4" : "";
const HOME_BALANCE_VIDEO_FALLBACK = CDN_BASE ? "/home-balance.mp4" : "";
const ACCOUNT_GOAL_VIDEO_FALLBACK = CDN_BASE ? "/account-goal.mp4" : "";
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

function ClientDash({ t, go, authUser, profileRow, onSignOut }) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState("overview");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([
    { ic:"check", title:"Withdrawal Approved", sub:"KES 1,200 sent to M-Pesa", time:"2h ago", c:"#059669", read:false },
    { ic:"play",  title:"Bonus credited", sub:"14 videos  -  KES 280 earned", time:"5h ago", c:t.acc, read:false },
    { ic:"gift",  title:"New referral joined", sub:"Amina K. signed up via your link", time:"1d ago", c:"#E8820C", read:false },
  ]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [depositFocus, setDepositFocus] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 769);
  const [isTiny, setIsTiny] = useState(window.innerWidth < 380);
  const [overviewMediaReady, setOverviewMediaReady] = useState(() => window.innerWidth >= 769);
  const [recentOpen, setRecentOpen] = useState(false);
  const [stripHidden, setStripHidden] = useState(false);
  const [stripToggleHidden, setStripToggleHidden] = useState(false);
  const lastScrollRef = useRef(0);
  const authId = authUser?.id || null;
  const tierSelected = profileRow?.tier_selected === true;
  const [hasTierDeposit, setHasTierDeposit] = useState(null);
  const [depositCheckBusy, setDepositCheckBusy] = useState(false);
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
  const avatarUrlRef = useRef(null);
  const [clientTx, setClientTx] = useState([]);
  const [clientRefs, setClientRefs] = useState([]);
  const [clientRefTable, setClientRefTable] = useState([]);
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

  useEffect(() => {
    if (!supabase || !authId || USE_LOCAL_WALLET) { setHasTierDeposit(null); return; }
    let ignore = false;
    (async () => {
      setDepositCheckBusy(true);
      const { data, error } = await supabase
        .from("deposits")
        .select("deposit_id")
        .eq("user_id", authId)
        .eq("status", "success")
        .eq("tier_at_deposit", Number(t?.id || 1))
        .limit(1);
      if (!ignore) {
        setHasTierDeposit(!error && Array.isArray(data) && data.length > 0);
        setDepositCheckBusy(false);
      }
    })();
    return () => { ignore = true; };
  }, [authId, t?.id, USE_LOCAL_WALLET]);
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
  const today = new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});
  const canWithdraw = ["Tuesday","Friday"].includes(new Date().toLocaleDateString("en-US",{weekday:"long"}));
  const SIDEBAR_W = isMobile ? (isTiny ? 220 : 260) : 260;
  const ICON_W = 60;
  const headingFont = "Sora, Geist, sans-serif";
  const pagePad = isMobile ? (isTiny ? "10px 12px 96px" : "14px 16px 96px") : "26px 34px 48px";
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
  useEffect(() => {
    if (tab !== "withdraw" && depositFocus) setDepositFocus(false);
  }, [tab, depositFocus]);
  const addClientTx = useCallback((tx) => {
    setClientTx(prev => [tx, ...(Array.isArray(prev) ? prev : [])]);
  }, []);
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
    { id:"withdraw",  label:"Wallet",  ic:"wallet" },
    { id:"settings",  label:"Settings",  ic:"settings" },
  ];

  const activityFeed = Array.isArray(clientTx) && clientTx.length ? clientTx : undefined;
  const referralFeed = Array.isArray(clientRefs) && clientRefs.length ? clientRefs : undefined;

  const recentTx = [
    {d:"Mar 7", a:1200, s:"Paid",    type:"out"},
    {d:"Mar 5", a:3400, s:"Paid",    type:"out"},
    {d:"Mar 1", a:800,  s:"Paid",    type:"out"},
    {d:"Feb 28",a:2100, s:"Pending", type:"out"},
  ];

  const closeSidebar = () => { if (isMobile) setOpen(false); };
  const setProfileField = (key, value) => setDraftProfile(p => ({ ...p, [key]: value }));
  const draftBalanceRaw = draftProfile.balance;
  const draftBalanceVal = draftBalanceRaw === null || draftBalanceRaw === "" || typeof draftBalanceRaw === "undefined" ? null : Number(draftBalanceRaw);
  const draftBalance = Number.isFinite(draftBalanceVal) ? draftBalanceVal : null;
  const profileBalanceVal = profile.balance === null || typeof profile.balance === "undefined" ? null : Number(profile.balance);
  const profileBalance = Number.isFinite(profileBalanceVal) ? profileBalanceVal : null;
  const profileDirty = ["name","email","phone","avatar"].some(k => (draftProfile[k] || "") !== (profile[k] || "")) || draftBalance !== profileBalance;

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
      balance: Number.isFinite(draftBalance) ? draftBalance : profile.balance,
      joinNumber: joinNumberClean,
    };
    setProfile(prev => ({
      ...prev,
      id: cleaned.id ?? prev.id,
      name: cleaned.name,
      email: cleaned.email,
      phone: cleaned.phone,
      avatar: cleaned.avatar,
      balance: Number.isFinite(cleaned.balance) ? cleaned.balance : prev.balance,
      joinNumber: Number.isFinite(Number(cleaned.joinNumber)) ? cleaned.joinNumber : prev.joinNumber,
    }));
    if (supabase) {
      const payload = {
        id: cleaned.id ?? undefined,
        name: cleaned.name,
        email: cleaned.email,
        phone: cleaned.phone,
        avatar_url: cleaned.avatar || null,
        balance: Number.isFinite(cleaned.balance) ? cleaned.balance : null,
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

          {open && (
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
        </nav>

        {/* "" Bottom: recent tx (desktop only) "" */}
        {open && !isMobile && (
          <div style={{ borderTop:"1px solid #F0F0F0", flexShrink:0 }}>
            <button onClick={()=>setRecentOpen(o=>!o)}
              style={{
                width:"100%",
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                padding:"10px 14px",
                background:"#fff",
                border:"none",
                cursor:"pointer",
                fontSize:10,
                fontWeight:900,
                letterSpacing:"0.12em",
                color:"#111"
              }}>
              RECENT TRANSACTIONS
              <div style={{ transform: recentOpen ? "rotate(90deg)" : "rotate(-90deg)", transition:"transform .18s ease" }}>
                <I n="chevR" s={12} c="#111"/>
              </div>
            </button>
            <div style={{ maxHeight: recentOpen ? 200 : 0, overflow:"hidden", transition:"max-height .25s ease" }}>
              <div style={{ padding:"6px 16px 10px" }}>
                {recentTx.slice(0,2).map((w,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:18, height:18, borderRadius:5, background: w.s==="Paid"?"#F0FDF4":"#FFFBEB", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <I n={w.s==="Paid"?"check":"calendar"} s={9} c={w.s==="Paid"?"#22C55E":"#D97706"}/>
                      </div>
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, color:"#666" }}>KES {w.a.toLocaleString()}</div>
                        <div style={{ fontSize:9, color:"#D1D5DB" }}>{w.d}</div>
                      </div>
                    </div>
                    <span style={{ fontSize:8, fontWeight:800, padding:"2px 6px", borderRadius:50, background:w.s==="Paid"?"#F0FDF4":"#FFFBEB", color:w.s==="Paid"?"#22C55E":"#D97706" }}>{w.s}</span>
                  </div>
                ))}
                <div style={{ marginTop:6, fontSize:9, color:"#D1D5DB", fontWeight:700 }}>View all in Transactions</div>
              </div>
              <div style={{ padding:"6px 16px 14px", display:"flex", justifyContent:"space-between" }}>
                {["About","Contact","Help"].map(l => <span key={l} style={{ fontSize:11, color:"#CCC", cursor:"pointer" }}>{l}</span>)}
              </div>
            </div>
          </div>
        )}

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
        <header style={{
          minHeight: isMobile ? 64 : 62,
          height: isMobile ? "auto" : 62,
          background:"#fff",
          borderBottom:"1px solid #E8E8E8",
          display:"flex",
          alignItems:"center",
          padding: isMobile ? "10px 14px" : "0 20px",
          gap: isMobile ? 8 : 12,
          flexShrink:0,
          boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
          flexWrap: isMobile ? "wrap" : "nowrap",
          rowGap: isMobile ? 8 : 0
        }}>

          {/* Toggle / Upgrade */}
          {!isMobile && (
            <button onClick={() => setOpen(o => !o)}
              style={{ width:36, height:36, borderRadius:9, border:"1.5px solid #E8E8E8", background:"#FAFAFA", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", flexShrink:0 }}
              onMouseEnter={e=>{e.currentTarget.style.background="#F0F0F0";}} onMouseLeave={e=>{e.currentTarget.style.background="#FAFAFA";}}>
              <I n="menu" s={16} c="#555"/>
            </button>
          )}
          {isMobile && (
            <button
              onClick={() => { if (canUpgrade) goDeposit(true); }}
              disabled={!canUpgrade}
              title={nextTier ? `Upgrade to ${nextTier.name}` : "Max tier"}
              className="ep-upgrade-btn"
              style={{
                padding:"7px 12px",
                borderRadius:12,
                cursor: canUpgrade ? "pointer" : "not-allowed",
                display:"flex",
                alignItems:"center",
                gap:6,
                transition:"all .15s",
                flexShrink:0,
                ...(canUpgrade ? upgradeBtnActive : upgradeBtnDisabled)
              }}>
              <span className="ep-upgrade-arrow" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
                <I n="trendUp" s={14} c={canUpgrade ? "#111" : "#6B7280"}/>
              </span>
              <span style={{ fontSize:11, fontWeight:900, color: canUpgrade ? "#111" : "#6B7280", letterSpacing:"0.02em" }}>
                {nextTier ? "Upgrade" : "Max Tier"}
              </span>
            </button>
          )}

          {/* Page breadcrumb */}
          {!isMobile && (
            <div style={{ display:"flex", alignItems:"center", gap:6, overflow:"hidden" }}>
              <span style={{ fontSize:13, color:"#BBB", fontWeight:500, whiteSpace:"nowrap" }}>Dashboard</span>
              <I n="chevR" s={12} c="#DDD"/>
              <span style={{ fontSize:13, fontWeight:800, color:"#111", whiteSpace:"nowrap", letterSpacing:"-0.02em" }}>{navItems.find(n=>n.id===tab)?.label || "Overview"}</span>
            </div>
          )}

          <div style={{ flex:1, minWidth:0 }}/>

          {!isMobile && (
            <>
              {/* Date */}
              <div className="ep-topbar-date" style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", background:"#FAFAFA", border:"1px solid #111", borderRadius:9, flexShrink:0 }}>
                <I n="calendar" s={13} c="#BBB"/>
                <span style={{ fontSize:12, color:"#888", fontWeight:500, whiteSpace:"nowrap" }}>{today}</span>
              </div>

              {/* Withdrawal day indicator */}
              <div className="ep-topbar-date" style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", background: canWithdraw?"#ECFDF5":"#FFF5F5", border:`1px solid ${canWithdraw?"#A7F3D0":"#FCA5A5"}`, borderRadius:9, flexShrink:0 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background: canWithdraw?"#059669":"#EF4444", animation:"pulse 2s infinite" }}/>
                <span style={{ fontSize:11, fontWeight:800, color: canWithdraw?"#059669":"#EF4444", whiteSpace:"nowrap" }}>
                  {canWithdraw ? "Payouts Processing" : "Payouts Queued"}
                </span>
              </div>

              <div className="ep-topbar-date" style={{ width:1, height:24, background:"#E8E8E8", flexShrink:0 }}/>

              {/* Earnings chip */}
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", background:t.lgt, border:`1.5px solid ${t.mid}`, borderRadius:10, flexShrink:0 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:900, color:t.acc, letterSpacing:"-0.03em", lineHeight:1.1 }}>KES {earn.toLocaleString()}</div>
                  <div style={{ fontSize:9, color:t.acc, opacity:0.65, fontWeight:700 }}>{pct}% TO GOAL</div>
                </div>
                <Donut pct={pct} acc={t.acc} size={34} thickness={4}/>
              </div>

              <div style={{ width:1, height:24, background:"#E8E8E8", flexShrink:0 }}/>
            </>
          )}

          {/* Notifications */}
          <div style={{ position:"relative" }}>
            <button onClick={()=>{setNotifOpen(o=>!o); setProfileOpen(false);}}
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
            <div onClick={()=>{setProfileOpen(o=>!o); setNotifOpen(false);}} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"4px 10px 4px 4px", border:"1.5px solid #E8E8E8", borderRadius:50, background:"#FAFAFA" }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:t.acc, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profileName} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
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
        <div style={{
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
            <>
              <div>
                <h2 style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.04em", color:"#111", lineHeight:1.1, fontFamily: headingFont }}>
                  {navItems.find(n=>n.id===tab)?.label || "Overview"}
                </h2>
                <p style={{ fontSize:12, color:"#AAA", marginTop:4, fontWeight:500 }}>
                  {today}  -  <span style={{ color:t.acc, fontWeight:700 }}>{t.name} Tier</span>  -  KES {earn.toLocaleString()} earned
                </p>
              </div>
              {/* Quick action buttons */}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>setTab("videos")} style={{ padding:"8px 16px", background:"#111", color:"#fff", border:"none", borderRadius:9, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"IBM Plex Sans, Geist, sans-serif", display:"flex", alignItems:"center", gap:6 }}>
                  <I n="play" s={12} c="#fff"/> Watch Now
                </button>
                <button onClick={()=>setTab("withdraw")} style={{ padding:"8px 16px", background:"#fff", color:"#111", border:"1.5px solid #E8E8E8", borderRadius:9, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"IBM Plex Sans, Geist, sans-serif", display:"flex", alignItems:"center", gap:6 }}>
                  <I n="wallet" s={12} c="#111"/> Withdraw
                </button>
              </div>
            </>
          )}

          {isMobile && (
            <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                <h2 style={{ fontSize:isTiny?14:16, fontWeight:900, letterSpacing:"-0.04em", color:"#111", lineHeight:1.1, fontFamily: headingFont, flex:"1 1 140px", minWidth:0 }}>
                  {navItems.find(n=>n.id===tab)?.label || "Overview"}
                </h2>
                <span style={{ fontSize:isTiny?9:10, fontWeight:800, color:t.acc, background:t.lgt, border:`1px solid ${t.mid}`, borderRadius:99, padding:"4px 10px", whiteSpace:"nowrap", flexShrink:0 }}>
                  {t.name} Tier
                </span>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
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
          {depositRequired && (
            <div style={{ padding:"14px 16px", background:"#EEF2FF", border:"1px solid #C7D2FE", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:10, background:"#4F46E5", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <I n="wallet" s={14} c="#fff"/>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:900, color:"#111" }}>Self deposit required to unlock your tier</div>
                  <div style={{ fontSize:11, color:"#4C51BF", marginTop:2 }}>Submit the fixed tier deposit to activate earnings and withdrawals.</div>
                </div>
              </div>
              <button onClick={() => goDeposit(true)}
                style={{ padding:"9px 14px", borderRadius:10, border:"1.5px solid #111", background:"#111", color:"#fff", fontSize:12, fontWeight:900, cursor:"pointer", fontFamily:"Geist,sans-serif", whiteSpace:"nowrap" }}>
                Self Deposit Now
              </button>
            </div>
          )}
          {tab==="overview"  && <OverviewContent  t={t} earn={earn} goal={goal} pct={pct} balance={balance} joinCardLabel={joinCardLabel} setTab={setTab} isMobile={isMobile} activityData={activityFeed} referralData={referralFeed} refCode={refCode} goDeposit={goDeposit} stripHidden={stripHidden} mediaEager={overviewMediaReady}/>}
          {tab==="videos"    && <VideosContent    t={t} onEarning={handleEarning} authUser={authUser} />}
          {tab==="analytics" && <AnalyticsContent t={t} earn={earn} isMobile={isMobile} refCode={refCode} />}
          {tab==="referrals" && <ReferralsContent t={t} earn={earn} refData={supabase ? clientRefTable : undefined} refCode={refCode} isMobile={isMobile} />}
          {tab==="withdraw"  && <WithdrawContent  t={t} earn={earn} balance={balance} authUser={authUser} profileRow={profileRow} focusDeposit={depositFocus} onFocusDone={()=>setDepositFocus(false)} onNewTx={addClientTx} onBalanceUpdate={applyBalance} hasDeposit={hasTierDeposit}/>}
          {tab==="settings"  && (
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr", gap:16 }}>
              <div className="ep-card" style={{ borderRadius:14, padding:"20px 22px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:12, flexWrap:"wrap" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:900, color:"#111" }}>Profile Settings</div>
                    <div style={{ fontSize:11, color:"#888", marginTop:2 }}>Update your account details and photo.</div>
                  </div>
                  <button onClick={saveProfile} disabled={!profileDirty || profileSaving}
                    style={{ padding:"8px 14px", borderRadius:9, border:"none", background: profileDirty ? "#111" : "#E5E7EB", color: profileDirty ? "#fff" : "#9CA3AF", fontSize:12, fontWeight:800, cursor: profileDirty ? "pointer" : "not-allowed", fontFamily:"Geist,sans-serif" }}>
                    {profileSaving ? "Saving..." : "Save Changes"}
                  </button>
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

              <div className="ep-card" style={{ borderRadius:14, padding:"20px 22px", display:"flex", flexDirection:"column", gap:16 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:900, color:"#111" }}>Account & Tier</div>
                  <div style={{ fontSize:11, color:"#888", marginTop:2 }}>Manage balance and upgrade status.</div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div style={{ background:"#F8FAFC", border:"1px solid #E5E7EB", borderRadius:12, padding:"12px" }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"#94A3B8", letterSpacing:"0.08em" }}>CURRENT TIER</div>
                    <div style={{ fontSize:14, fontWeight:900, color:"#111", marginTop:6 }}>{t.name}</div>
                    <div style={{ fontSize:11, color:"#94A3B8", marginTop:4 }}>Self deposit KES {t.deposit.toLocaleString()}</div>
                  </div>
                  <div style={{ background:"#FFF7ED", border:"1px solid #F3E2C7", borderRadius:12, padding:"12px" }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"#92400E", letterSpacing:"0.08em" }}>NEXT TIER</div>
                    <div style={{ fontSize:14, fontWeight:900, color:"#111", marginTop:6 }}>{nextTier ? nextTier.name : "Max Tier"}</div>
                    <div style={{ fontSize:11, color:"#92400E", marginTop:4 }}>
                      {nextTier ? "Upgrade anytime" : "You're at the top"}
                    </div>
                  </div>
                </div>
                <div style={{
                  position:"relative",
                  padding:"12px 14px",
                  borderRadius:12,
                  background:"linear-gradient(135deg,#FFFFFF 0%, #F8FAFF 50%, #EEF2FF 100%)",
                  border:"1px solid rgba(15,23,42,0.08)",
                  boxShadow:"0 8px 18px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 1px rgba(15,23,42,0.06)",
                  display:"flex",
                  flexDirection:"column",
                  gap:8,
                  overflow:"hidden"
                }}>
                  <div style={{ position:"absolute", top:-26, right:-24, width:120, height:120, background:"radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0))", opacity:0.75, pointerEvents:"none" }}/>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", position:"relative" }}>
                    <span style={{ fontSize:10, fontWeight:800, color:"#64748B", letterSpacing:"0.18em" }}>ACCOUNT NO.</span>
                    <div style={{ width:34, height:22, borderRadius:6, background:"linear-gradient(135deg,#FDE68A 0%, #F59E0B 100%)", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 6px rgba(245,158,11,0.35)", border:"1px solid rgba(245,158,11,0.35)" }}/>
                  </div>
                  <span style={{ fontSize:15, fontWeight:800, color:"#0F172A", letterSpacing:"0.18em", fontFamily:"IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace", textShadow:"0 1px 0 rgba(255,255,255,0.7)", whiteSpace:"nowrap" }}>
                    {joinCardLabel}
                  </span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:"#666" }}>Wallet Balance (KES)</label>
                  <input type="number" value={draftProfile.balance ?? ""} onChange={e=>setProfileField("balance", e.target.value === "" ? null : e.target.value)} placeholder={balance.toString()}
                    style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #E8E8E8", borderRadius:9, fontSize:12, color:"#111", fontFamily:"Geist,sans-serif", background:"#fff", outline:"none" }}/>
                  <div style={{ fontSize:10, color:"#9CA3AF" }}>Used to calculate upgrade eligibility.</div>
                </div>
                <div style={{ padding:"10px 12px", borderRadius:10, background: nextTier ? "#ECFDF5" : "#F8FAFC", border:`1px solid ${nextTier ? "#A7F3D0" : "#E2E8F0"}`, display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:26, height:26, borderRadius:8, background: nextTier ? "#059669" : "#111", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <I n={nextTier ? "check" : "star"} s={12} c="#fff"/>
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, color: nextTier ? "#065F46" : "#475569" }}>
                    {nextTier ? "Upgrade available - move to the next tier anytime." : "You're at the top tier."}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* "" Mobile bottom nav "" */}
      {isMobile && (
        <nav style={{ position:"fixed", bottom:0, left:0, right:0, height:60, background:"#fff", borderTop:"none", display:"flex", alignItems:"stretch", zIndex:150, boxShadow:"0 -6px 22px rgba(0,0,0,0.1)" }}>
          {navItems.filter(n=>["overview","videos","referrals","withdraw","settings"].includes(n.id)).map(({id,ic,label}) => {
            const active = tab===id;
            const isRef = id === "referrals";
            const pop = active && !isRef;
            return (
              <button key={id} onClick={()=>{setTab(id); setOpen(false);}}
                style={{
                  flex:1,
                  display:"flex",
                  flexDirection:"column",
                  alignItems:"center",
                  justifyContent:"center",
                  gap:3,
                  background:isRef?"linear-gradient(180deg,#FFF7E6 0%,#FFE4B3 100%)":(pop?"#fff":"transparent"),
                  border:"none",
                  cursor:"pointer",
                  color: isRef ? "#111" : (active?t.acc:"#BBB"),
                  transition:"all .15s",
                  fontFamily:"IBM Plex Sans, Geist, sans-serif",
                  position:"relative",
                  margin:isRef?"6px 8px 10px":0,
                  borderRadius:isRef?15:(pop?13:0),
                  transform:isRef?"translateY(-12px) scale(1.06)":(pop?"translateY(-9px) scale(1.04)":"none"),
                  boxShadow:isRef?"0 12px 24px rgba(0,0,0,0.22)":(pop?"0 10px 18px rgba(0,0,0,0.22)":"none")
                }}>
                <I n={ic} s={active?22:19} c={isRef? "#111" : (active?t.acc:"#BBBBBB")}/>
                <span style={{ fontSize:9, fontWeight:800, whiteSpace:"nowrap", letterSpacing:"0.04em", color:isRef? "#111" : (active?t.acc:"#888") }}>{label}</span>
                {isRef && <div style={{ position:"absolute", top:6, right:10, padding:"2px 6px", borderRadius:8, background:"#111", color:"#fff", fontSize:8, fontWeight:800, letterSpacing:"0.06em" }}>PRIZE</div>}
                {active && !isRef && <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:28, height:2, background:t.acc, borderRadius:99 }}/>}
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
    <div className={frame ? "ep-frame-dark" : undefined} style={{ background:"#fff", borderRadius:16, border:"1px solid #111", boxShadow:`0 10px 24px rgba(0,0,0,0.08)`, overflow:"hidden" }}>
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
        <div style={{ display:"flex", gap:20 }}>
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
          <div style={{ display:"flex", gap:8 }}>
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
function OverviewContent({ t, earn, goal, pct, balance, joinCardLabel, setTab, isMobile, activityData, referralData, refCode, goDeposit, stripHidden, mediaEager }) {
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const todayIdx = (new Date().getDay() + 6) % 7;
  const dailyEarn = useMemo(() => getTierDailyTotal(t), [t]);

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
    if (!Array.isArray(activityData)) return false;
    return activityData.some((tx) => {
      if (!isReferralTx(tx)) return false;
      const amt = Number(tx?.amt ?? tx?.amount ?? tx?.amount_kes ?? tx?.value ?? 0);
      return Number.isFinite(amt) && amt > 0;
    });
  }, [activityData, isReferralTx]);

  const activityEarnTotal = useMemo(() => {
    if (!Array.isArray(activityData)) return 0;
    return activityData.reduce((sum, tx) => {
      if (!isEarningTx(tx)) return sum;
      const amt = Number(tx?.amt ?? tx?.amount ?? tx?.amount_kes ?? tx?.value ?? 0);
      return Number.isFinite(amt) && amt > 0 ? sum + amt : sum;
    }, 0);
  }, [activityData, isEarningTx]);

  const actualEarnTotal = useMemo(() => {
    const refAdd = activityHasReferralAmount ? 0 : referralBonusTotal;
    return activityEarnTotal + refAdd;
  }, [activityEarnTotal, referralBonusTotal, activityHasReferralAmount]);

  const remainingEarn = useMemo(() => Math.max(goal - actualEarnTotal, 0), [goal, actualEarnTotal]);

  const weekData = useMemo(() => {
    const start = new Date();
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const buckets = days.map(d => ({ d, v: 0 }));
    if (!Array.isArray(activityData)) return buckets;

    activityData.forEach((tx) => {
      if (!isEarningTx(tx)) return;
      const amt = Number(tx?.amt ?? tx?.amount ?? tx?.amount_kes ?? tx?.value ?? 0);
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
  }, [activityData, isEarningTx]);

  const maxV = useMemo(() => Math.max(...weekData.map(x=>x.v), 0), [weekData]);
  const daysLeft = useMemo(() => {
    if (dailyEarn <= 0) return 0;
    return Math.max(0, Math.ceil((goal - actualEarnTotal) / dailyEarn));
  }, [goal, actualEarnTotal, dailyEarn]);
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

  const defaultActivity = useMemo(() => ([
    { ic:"play",  text:"Watched 2 videos", sub:"KES 100 credited", time:"2h ago",  c:"#059669" },
    { ic:"gift",  text:"Referral joined",  sub:"John M. signed up  +KES 500", time:"5h ago",  c:t.acc },
    { ic:"up",    text:"Withdrawal sent",  sub:"KES 1,200 to M-Pesa", time:"1d ago",  c:"#E8820C" },
    { ic:"activity", text:"Bonus credited", sub:"14 videos  KES 280 earned", time:"1d ago",  c:"#7C3AED" },
    { ic:"users", text:"New referral",     sub:"Amina K. deposited", time:"3d ago",  c:"#0066FF" },
  ]), [t.acc]);

  const defaultReferrals = useMemo(() => ([
    { name:"John M.", init:"JM", status:"Active" },
    { name:"Amina K.", init:"AK", status:"Active" },
    { name:"Peter O.", init:"PO", status:"Pending" },
    { name:"Grace W.", init:"GW", status:"Active" },
  ]), []);
  const activity = useMemo(
    () => (Array.isArray(activityData) ? activityData : defaultActivity),
    [activityData, defaultActivity]
  );
  const referrals = useMemo(
    () => (Array.isArray(referralData) ? referralData : defaultReferrals),
    [referralData, defaultReferrals]
  );

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
  const hasTierGlare = t.name === "Regular" || t.name === "Standard" || t.name === "Deluxe";
  const tierGlareTone = t.name === "Deluxe" ? "rgba(255,228,140,0.85)" : "rgba(255,255,255,0.85)";
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
  const PlanActionsCard = () => (
    <div className="ep-frame-light" style={{ background:"transparent", borderRadius:16, padding:"18px 20px", border:"1px solid #111", borderTopWidth:1, boxShadow:"0 6px 0 #111, 0 18px 30px rgba(0,0,0,0.22)", minHeight:230, position:"relative", overflow:"hidden" }}>
      {PLAN_BG_VIDEO && showOverviewMedia && (
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
      {showOverviewMedia && <LiveMathBackground tone="light" symbols={planSymbols} opacity={0.2} zIndex={1} />}
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
          className={hasTierGlare ? "ep-tier-glare" : undefined}
          style={{ borderRadius:12, background:`linear-gradient(135deg, ${t.acc} 0%, ${t.acc}CC 100%)`, padding:"16px 14px", position:"relative", overflow:"hidden", border:"1.5px solid #111", boxShadow:"0 4px 0 rgba(0,0,0,0.25)", ...(hasTierGlare ? {"--glare": tierGlareTone} : {}) }}>
          <div style={{ fontSize:12, fontWeight:900, color:"rgba(255,255,255,0.9)", letterSpacing:"0.15em", marginBottom:10 }}>{t.name.toUpperCase()}</div>
          <div style={{ fontSize:20, fontWeight:900, color:"#fff", letterSpacing:"-0.04em", marginBottom:6 }}>KES {earn.toLocaleString()}</div>
          <div style={{ marginBottom:10, display:"flex", flexDirection:"column", gap:4 }}>
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.55)", letterSpacing:"0.18em" }}>ACCOUNT NO.</span>
            <span style={{ fontSize:12, fontWeight:800, color:"rgba(255,255,255,0.95)", letterSpacing:"0.16em", fontFamily:"IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              {joinCardLabel}
            </span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Deposit<br/><span style={{ color:"rgba(255,255,255,0.8)", fontWeight:700 }}>KES {t.deposit.toLocaleString()}</span></div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", textAlign:"right" }}>Weekly Target<br/><span style={{ color:"rgba(255,255,255,0.8)", fontWeight:700 }}>KES {goal.toLocaleString()}</span></div>
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
      <PlanActionsCard />

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
                  <AnimNum target={actualEarnTotal} prefix="KES "/>
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
                    <div style={{ fontSize:12, fontWeight:800, color:a.c }}>+KES {(Number.isFinite(a.amt) ? a.amt : Math.round(dailyEarn * (0.15 + i * 0.08))).toLocaleString()}</div>
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
                ["Required Videos", `${t.videos}/day`, "#111"],
                ["Bonus Rewards", `${t.bonus}/day`, "#111"],
                ["Daily Earnings", `KES ${dailyEarn.toLocaleString()}`, t.acc],
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
        <PlanActionsCard />
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
                  <AnimNum target={actualEarnTotal} prefix="KES "/>
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
              {[[`KES ${actualEarnTotal.toLocaleString()}`, "Total earned", t.acc],[`KES ${remainingEarn.toLocaleString()}`, "Remaining", "#888"],[`${daysLeft} days`, "To weekly target", "#111"]].map(([v,l,c],i)=>( 
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
                      <div style={{ fontSize:13, fontWeight:800, color:a.c }}>+KES {(Number.isFinite(a.amt) ? a.amt : Math.round(dailyEarn * (0.15 + i * 0.08))).toLocaleString()}</div>
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
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Deposit locked<br/><span style={{ color:"rgba(255,255,255,0.8)", fontWeight:700 }}>KES {t.deposit.toLocaleString()}</span></div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", textAlign:"right" }}>Weekly Target<br/><span style={{ color:"rgba(255,255,255,0.8)", fontWeight:700 }}>KES {goal.toLocaleString()}</span></div>
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
              ["Required Videos", `${t.videos}/day`, "#111"],
              ["Bonus Rewards", `${t.bonus}/day`, "#111"],
              ["Referrals", "3 active", "#059669"],
              ["Daily Earnings", `KES ${dailyEarn.toLocaleString()}`, t.acc],
              ["Weekly Target", `KES ${goal.toLocaleString()}`, "#111"],
              ["Days to Target", `~${daysLeft} days`, "#E8820C"],
              ["Withdraw Days", "Tue - Fri", "#059669"],
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
  { id:"09R8_2nJtjg", title:"Executive Pro Tier: Is It Worth It?", channel:"EdisonPay Official", views:"184K", dur:"9:05", thumb:"https://img.youtube.com/vi/09R8_2nJtjg/mqdefault.jpg" },
  { id:"y6120QOlsfU", title:"Maximize Your Daily Video Earnings Strategy", channel:"Earn Daily Africa", views:"452K", dur:"7:33", thumb:"https://img.youtube.com/vi/y6120QOlsfU/mqdefault.jpg" },
];

/* "" VIDEOS CONTENT "" */
function VideosContent({ t, onEarning, authUser }) {
  const MANUAL_COUNT = Math.max(1, Number(t?.videos) || 0);
  const MANUAL_SECONDS = 45;
  const BONUS_COUNT = Math.max(0, Number(t?.bonus) || 0);
  const bonusUnit = getTierBonusUnit(t);
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
  const [imgErrors, setImgErrors] = useState({});
  const [imgLoaded, setImgLoaded] = useState({});
  const prevWatchedRef = useRef(watched);
  const prevBotRef = useRef(bonusDone);

  const recordView = async (videoId, isRequired) => {
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
  };

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

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:20 }}>

      {showPlayer !== null && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ width:"100%", maxWidth:820, background:"#fff", borderRadius:16, overflow:"hidden", border:"1.5px solid #111", boxShadow:"0 20px 50px rgba(0,0,0,0.35)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"#0F172A", color:"#fff" }}>
              <div style={{ fontSize:13, fontWeight:800 }}>Watching Video {showPlayer + 1}</div>
              <button onClick={closePlayer} style={{ border:"1px solid rgba(255,255,255,0.2)", background:"transparent", color:"#fff", padding:"6px 10px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:700 }}>Close</button>
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
            <div style={{ padding:"10px 16px", fontSize:11, color:"#64748B", fontWeight:700 }}>
              Keep this open for {MANUAL_SECONDS} seconds to earn your reward today.
            </div>
          </div>
        </div>
      )}

      {/* "" Error toast "" */}
      {errMsg && (
        <div style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 18px",background:"#FFF0F0",border:"1.5px solid #FCA5A5",borderRadius:12,fontSize:13,color:"#DC2626",fontWeight:600,animation:"slideUp .2s ease" }}>
          <I n="xmark" s={15} c="#DC2626"/>
          {errMsg}
          <button onClick={()=>setErrMsg("")} style={{ marginLeft:"auto",border:"none",background:"transparent",color:"#DC2626",cursor:"pointer",fontWeight:900,fontSize:16,lineHeight:1 }}>-</button>
        </div>
      )}

      {/* "" Summary bar "" */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14 }}>
        {[
          [`${watched}/${MANUAL_COUNT}`,"Required Watched","#111"],
          [`${bonusDone}/${BONUS_COUNT}`,"Bonus Completed","#059669"],
          [`KES ${(watched*V_PRICE).toLocaleString()}`,"Required Earned",t.acc],
          [`KES ${todayEarn.toLocaleString()}`,"Total Today","#059669"],
        ].map(([v,l,c],i) => (
          <div key={i} style={{ background:"#fff",borderRadius:12,padding:"14px 16px",border:"1px solid #111",boxShadow:"0 4px 12px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize:10,color:"#BBB",fontWeight:700,letterSpacing:"0.08em",marginBottom:8 }}>{l.toUpperCase()}</div>
            <div style={{ fontSize:22,fontWeight:900,letterSpacing:"-0.04em",color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* "" Tab switcher "" */}
      <div style={{ display:"flex",gap:2,background:"#F5F5F5",borderRadius:10,padding:3,width:"100%",justifyContent:"center",flexWrap:"wrap" }}>
        {[["manual",`Required (${MANUAL_COUNT})`],["bonus",`Bonus Reward (${BONUS_COUNT})`]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{ padding:"7px 18px",borderRadius:8,border:"none",background:activeTab===id?"#fff":"transparent",color:activeTab===id?"#111":"#888",fontWeight:activeTab===id?800:500,fontSize:13,cursor:"pointer",fontFamily:"Geist,sans-serif",boxShadow:activeTab===id?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all .15s" }}>
            {lbl}
          </button>
        ))}
      </div>

      {/*  MANUAL TAB  */}
      {activeTab === "manual" && (
        <div style={{ background:"#fff",borderRadius:14,padding:"22px 24px",border:"1px solid #111",boxShadow:"0 8px 20px rgba(0,0,0,0.08)" }}>
          {/* Header */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
            <div>
              <h3 style={{ fontWeight:800,fontSize:16,letterSpacing:"-0.03em" }}>Your Required Daily Videos</h3>
              <p style={{ fontSize:13,color:"#BBB",marginTop:4 }}>
                Watch full {MANUAL_SECONDS} seconds to earn <strong style={{color:"#111"}}>KES {V_PRICE}</strong> each.
                Video 2 unlocks after Video 1 is complete.
              </p>
            </div>
            {watched === MANUAL_COUNT && (
              <div style={{ padding:"7px 16px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:50,fontSize:12,fontWeight:800,color:"#059669",display:"flex",alignItems:"center",gap:6 }}>
                <I n="check" s={12} c="#059669"/> All done  -  KES {(MANUAL_COUNT*V_PRICE).toLocaleString()} earned!
              </div>
            )}
          </div>

          {/* Now Playing / Status */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"12px 14px",background:"#F8FAFC",border:"1px solid #E8EEF5",borderRadius:12,marginBottom:16,flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:10,color:"#94A3B8",fontWeight:800,letterSpacing:"0.12em",marginBottom:4 }}>REQUIRED STATUS</div>
              <div style={{ fontSize:14,fontWeight:900,color:"#111" }}>{manualStatus}</div>
              {nextManual !== null && (
                <div style={{ fontSize:11,color:"#64748B",marginTop:3,display:"-webkit-box",WebkitLineClamp:1,WebkitBoxOrient:"vertical",overflow:"hidden" }}>
                  {YT_VIDEOS[nextManual]?.title}
                </div>
              )}
            </div>
            <div style={{ textAlign:"right",minWidth:90 }}>
              {playing !== null ? (
                <div style={{ fontSize:20,fontWeight:900,color:"#111",fontVariantNumeric:"tabular-nums" }}>{timer}s</div>
              ) : (
                <div style={{ fontSize:18,fontWeight:900,color:"#111" }}>{manualPct}%</div>
              )}
              <div style={{ fontSize:10,color:"#94A3B8" }}>{playing !== null ? "Time left" : "Progress"}</div>
            </div>
            <div style={{ flexBasis:"100%",height:6,background:"#E8EEF5",borderRadius:99,overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${manualPct}%`,background:playing!==null?t.acc:"#059669",borderRadius:99,transition:"width .4s ease" }}/>
            </div>
          </div>

          {/* Unlock chain indicator */}
          <div style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#F7F7F7",border:"1px solid #EBEBEB",borderRadius:10,marginBottom:20,fontSize:12,color:"#888" }}>
            {[1,2].map((n,i) => (
              <React.Fragment key={n}>
                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                  <div style={{ width:22,height:22,borderRadius:"50%",background:watched>=n?"#059669":watched===n-1&&timerRunning?"#F59E0B":"#E8E8E8",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .3s" }}>
                    {watched>=n ? <I n="check" s={11} c="#fff"/> : <span style={{fontSize:10,fontWeight:800,color:watched===n-1&&timerRunning?"#fff":"#AAA"}}>{n}</span>}
                  </div>
                  <span style={{ fontWeight:600,color:watched>=n?"#059669":watched===n-1?"#111":"#AAA" }}>Video {n}{watched>=n?" OK":""}</span>
                </div>
                {i===0 && <div style={{ flex:1,height:1,background:watched>=1?"#059669":"#E8E8E8",transition:"background .5s" }}/>}
              </React.Fragment>
            ))}
          </div>

          {/* Video cards */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16 }}>
            {YT_VIDEOS.slice(0, MANUAL_COUNT).map((vid, i) => {
              const isDone   = watched > i;
              const isActive = playing === i && timerRunning;
              const isLocked = i === 1 && watched < 1 && !timerRunning;
              const isReady  = !isDone && !isActive && !isLocked;
              const pct      = isActive ? ((MANUAL_SECONDS - timer) / MANUAL_SECONDS) * 100 : isDone ? 100 : 0;

              return (
                <div key={i} style={{ borderRadius:16,border:"1px solid #111",boxShadow:"0 6px 16px rgba(0,0,0,0.08)",overflow:"hidden",background:"#fff",transition:"all .25s",outline:isActive?`2px solid ${t.acc}`:"none" }}>

                  {/* Thumbnail */}
                  <div style={{ position:"relative",paddingTop:"56.25%",background:"#0D1117",overflow:"hidden",cursor:isReady?"pointer":"default" }}
                    onClick={()=>isReady&&startWatch(i)}>
                    {!imgErrors[vid.id] ? (
                      <>
                        {!imgLoaded[vid.id] && <div className="ep-shimmer" style={{ position:"absolute",inset:0 }} />}
                        <img src={vid.thumb} alt={vid.title}
                          onLoad={()=>setImgLoaded(s=>({...s,[vid.id]:true}))}
                          onError={()=>setImgErrors(e=>({...e,[vid.id]:true}))}
                          style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:isDone?.45:isLocked?.25:1,transition:"opacity .2s" }}/>
                      </>
                    ) : (
                      <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,#1a1a2e,#16213e)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <I n="play" s={32} c="rgba(255,255,255,0.15)"/>
                      </div>
                    )}

                    {/* State overlay */}
                    <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.22)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {isDone && (
                        <div style={{ width:52,height:52,borderRadius:"50%",background:"#059669",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(5,150,105,0.4)" }}>
                          <I n="check" s={24} c="#fff"/>
                        </div>
                      )}
                      {isActive && (
                        <div style={{ textAlign:"center" }}>
                          <div style={{ width:64,height:64,borderRadius:"50%",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",border:"3px solid rgba(255,255,255,0.8)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px" }}>
                            <span style={{ fontSize:26,fontWeight:900,color:"#fff",fontFamily:"Geist,sans-serif",fontVariantNumeric:"tabular-nums" }}>{timer}</span>
                          </div>
                          <div style={{ fontSize:11,color:"rgba(255,255,255,0.85)",fontWeight:700,letterSpacing:"0.06em" }}>WATCHING...</div>
                        </div>
                      )}
                      {isLocked && (
                        <div style={{ textAlign:"center" }}>
                          <div style={{ width:48,height:48,borderRadius:"50%",background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px" }}>
                            <I n="lock" s={22} c="rgba(255,255,255,0.7)"/>
                          </div>
                          <div style={{ fontSize:11,color:"rgba(255,255,255,0.7)",fontWeight:700 }}>Locked</div>
                        </div>
                      )}
                      {isReady && (
                        <div style={{ width:52,height:52,borderRadius:"50%",background:"rgba(255,255,255,0.92)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                          <I n="play" s={22} c="#111"/>
                        </div>
                      )}
                    </div>

                    {/* Progress bar at bottom */}
                    <div style={{ position:"absolute",bottom:0,left:0,right:0,height:3,background:"rgba(255,255,255,0.15)" }}>
                      <div style={{ height:"100%",width:`${pct}%`,background:isDone?"#059669":t.acc,borderRadius:99,transition:isActive?"width 1s linear":"width .4s ease" }}/>
                    </div>

                    {/* Duration badge */}
                    <div style={{ position:"absolute",bottom:8,right:8,padding:"2px 7px",background:"rgba(0,0,0,0.82)",borderRadius:4,fontSize:10,color:"#fff",fontWeight:700 }}>{vid.dur}</div>

                    {/* Video # badge */}
                    <div style={{ position:"absolute",top:8,left:8,padding:"3px 9px",background:isDone?"#059669":i===0?"#111":"rgba(0,0,0,0.65)",borderRadius:50,fontSize:10,fontWeight:800,color:"#fff",letterSpacing:"0.06em" }}>
                      VIDEO {i+1}{i===1&&!isDone&&watched<1?" (locked)":""}
                    </div>
                  </div>

                  {/* Info row */}
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ fontSize:13,fontWeight:700,color:"#111",lineHeight:1.35,marginBottom:10,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{vid.title}</div>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:8 }}>
                      <div>
                        <div style={{ fontSize:11,color:"#888",fontWeight:600 }}>{vid.channel}</div>
                        <div style={{ fontSize:10,color:"#CCC",marginTop:2 }}>{vid.views} views</div>
                      </div>
                      <div style={{ flexShrink:0 }}>
                        {isDone && <div style={{ padding:"6px 12px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:8,fontSize:12,fontWeight:900,color:"#059669" }}>+KES {V_PRICE} OK</div>}
                        {isActive && (
                          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:700,color:t.acc }}>
                              <div style={{ width:6,height:6,borderRadius:"50%",background:t.acc,animation:"pulse 1s infinite" }}/> Earning...
                            </div>
                            <div style={{ fontSize:10,color:"#AAA" }}>{timer}s left</div>
                          </div>
                        )}
                        {isReady && (
                          <button onClick={()=>startWatch(i)}
                            style={{ padding:"8px 16px",background:"#111",color:"#fff",border:"none",borderRadius:9,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif",display:"flex",alignItems:"center",gap:5 }}>
                            <I n="play" s={11} c="#fff"/> Watch
                          </button>
                        )}
                        {isLocked && (
                          <div style={{ padding:"7px 12px",background:"#F5F5F5",border:"1px solid #E0E0E0",borderRadius:9,fontSize:11,fontWeight:700,color:"#BBB",display:"flex",alignItems:"center",gap:5 }}>
                            <I n="lock" s={11} c="#CCC"/> Locked
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Unlock hint for video 2 */}
                    {i===1&&isLocked&&(
                      <div style={{ marginTop:10,padding:"8px 12px",background:"#F7F9FF",border:"1px solid #DBEAFE",borderRadius:8,fontSize:11,color:"#3B82F6",fontWeight:600,display:"flex",alignItems:"center",gap:6 }}>
                        <I n="lock" s={12} c="#3B82F6"/> Complete Video 1 to unlock this
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/*  BONUS TAB  */}
      {activeTab === "bonus" && (
        <div style={{ background:"#fff",borderRadius:14,padding:"22px 24px",border:"1px solid #111",boxShadow:"0 8px 20px rgba(0,0,0,0.08)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
            <div>
              <h3 style={{ fontWeight:800,fontSize:16,letterSpacing:"-0.03em" }}>Bonus Reward - {BONUS_COUNT} {BONUS_COUNT === 1 ? "reward" : "rewards"}</h3>
              <p style={{ fontSize:13,color:"#BBB",marginTop:4 }}>Running silently  -  30 sec each  -  KES {bonusUnit} per bonus reward</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:14,fontWeight:900,color:"#059669" }}>KES {(bonusDone*bonusUnit).toLocaleString()} earned</div>
              <div style={{ fontSize:11,color:"#BBB",marginTop:2 }}>{bonusDone}/{BONUS_COUNT} complete  -  {Math.round(bonusPct)}%</div>
            </div>
          </div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"10px 12px",background:watched>=MANUAL_COUNT?"#ECFDF5":"#FFF7ED",border:`1px solid ${watched>=MANUAL_COUNT?"#A7F3D0":"#FDBA74"}`,borderRadius:12,marginBottom:14,flexWrap:"wrap" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:800,color:watched>=MANUAL_COUNT?"#059669":"#B45309" }}>
              <I n={watched>=MANUAL_COUNT?"check":"lock"} s={13} c={watched>=MANUAL_COUNT?"#059669":"#B45309"}/>
              {watched>=MANUAL_COUNT ? "Bonus unlocked - required videos complete" : "Complete all required videos to unlock the bonus"}
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ fontSize:11,fontWeight:800,color:watched>=MANUAL_COUNT?"#059669":"#B45309" }}>{watched}/{MANUAL_COUNT}</div>
              <div style={{ width:84,height:6,background:"rgba(0,0,0,0.1)",borderRadius:99,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${manualUnlockPct}%`,background:watched>=MANUAL_COUNT?"#059669":"#F59E0B",borderRadius:99,transition:"width .3s ease" }}/>
              </div>
            </div>
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap" }}>
            <div style={{ fontSize:12, fontWeight:700, color: bonusActive ? "#059669" : watched>=MANUAL_COUNT ? "#111" : "#B45309" }}>
              {bonusActive ? "Bonus claimed today" : watched>=MANUAL_COUNT ? "Ready to activate once today." : `Finish ${MANUAL_COUNT - watched} required video${MANUAL_COUNT - watched === 1 ? "" : "s"} to enable.`}
            </div>
            <button onClick={activateBot} disabled={!canActivateBot}
              style={{ padding:"8px 14px", background:canActivateBot?"#111":"#F5F5F5", color:canActivateBot?"#fff":"#AAA", border:canActivateBot?"none":"1px solid #E0E0E0", borderRadius:9, fontSize:12, fontWeight:800, cursor:canActivateBot?"pointer":"not-allowed", fontFamily:"Geist,sans-serif" }}>
              {bonusActive ? "Activated Today" : canActivateBot ? "Claim Bonus" : "Complete Required Videos"}
            </button>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:24 }}>
            <div style={{ flex:1,height:7,background:"#F0F0F0",borderRadius:99,overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${bonusPct}%`,background:"#059669",borderRadius:99,transition:"width .2s" }}/>
            </div>
            <span style={{ fontSize:12,fontWeight:800,color:"#059669",minWidth:40 }}>{Math.round(bonusPct)}%</span>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14 }}>
            {YT_VIDEOS.slice(MANUAL_COUNT, MANUAL_COUNT + BONUS_COUNT).map((vid, i) => {
              const done = bonusActive && i < bonusDone;
              const isActive = bonusActive && i === bonusDone;
              return (
                <div key={i} style={{ borderRadius:12,border:"1px solid #111",boxShadow:"0 4px 12px rgba(0,0,0,0.08)",overflow:"hidden",background:done?"#F0FDF4":isActive?"#FFFBEB":"#FAFAFA",transition:"all .3s" }}>
                  <div style={{ position:"relative",paddingTop:"52%",background:"#0D1117",overflow:"hidden" }}>
                    {!imgErrors[`bonus-${vid.id}`] ? (
                      <>
                        {!imgLoaded[`bonus-${vid.id}`] && <div className="ep-shimmer" style={{ position:"absolute",inset:0 }} />}
                        <img src={vid.thumb} alt={vid.title}
                          onLoad={()=>setImgLoaded(s=>({...s,[`bonus-${vid.id}`]:true}))}
                          onError={()=>setImgErrors(e=>({...e,[`bonus-${vid.id}`]:true}))}
                          style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:done?.5:isActive?.88:.35,transition:"opacity .2s" }}/>
                      </>
                    ) : (
                      <div style={{ position:"absolute",inset:0,background:"#111",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <I n="play" s={24} c="rgba(255,255,255,0.1)"/>
                      </div>
                    )}
                    <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {done?<div style={{ width:28,height:28,borderRadius:"50%",background:"#059669",display:"flex",alignItems:"center",justifyContent:"center" }}><I n="check" s={13} c="#fff"/></div>
                      :isActive?<div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}><div style={{ width:9,height:9,borderRadius:"50%",background:"#FCD34D",animation:"pulse 0.8s infinite" }}/><div style={{ fontSize:8,color:"#FCD34D",fontWeight:800,letterSpacing:"0.1em" }}>BONUS LIVE</div></div>
                      :<I n="lock" s={15} c="rgba(255,255,255,0.35)"/>}
                    </div>
                    <div style={{ position:"absolute",bottom:5,right:5,padding:"1px 5px",background:"rgba(0,0,0,0.8)",borderRadius:3,fontSize:9,color:"#fff",fontWeight:700 }}>{vid.dur}</div>
                    <div style={{ position:"absolute",top:5,left:5,padding:"2px 6px",background:done?"#059669":isActive?"#F59E0B":bonusActive?"rgba(0,0,0,0.55)":"#334155",borderRadius:4,fontSize:8,fontWeight:800,color:"#fff" }}>
                      {!bonusActive ? "INACTIVE" : done?"BONUS OK":isActive?"LIVE":"BONUS"}
                    </div>
                  </div>
                  <div style={{ padding:"9px 11px" }}>
                    <div style={{ fontSize:11,fontWeight:700,color:"#111",lineHeight:1.3,marginBottom:4,display:"-webkit-box",WebkitLineClamp:1,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{vid.title}</div>
                    <div style={{ display:"flex",justifyContent:"space-between" }}>
                      <span style={{ fontSize:10,color:"#AAA" }}>{vid.channel}</span>
                      {done?<span style={{ fontSize:10,fontWeight:800,color:"#059669" }}>+KES {bonusUnit}</span>
                      :isActive?<span style={{ fontSize:10,fontWeight:800,color:"#F59E0B" }}>Watching...</span>
                      :<span style={{ fontSize:10,color:"#CCC" }}>Queued</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:18,padding:"12px 16px",background:"#F7FDF9",borderRadius:10,border:"1px solid #A7F3D0",fontSize:12,color:"#065F46",display:"flex",alignItems:"center",gap:8 }}>
            <I n="shield" s={14} c="#059669"/>
            Activate once per day to run the bonus. Earnings credit as each video completes.
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
        <div style={{ background:"#FAFAFA",borderRadius:12,padding:"16px 18px",border:cardBorder }}>
          <div style={{ fontSize:11,fontWeight:700,color:"#BBB",letterSpacing:"0.08em",marginBottom:14 }}>HOW REFERRALS WORK</div>
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
function ReferralsContent({ t, earn, refData, refCode, isMobile }) {
  const [filter, setFilter] = useState("all");
  const cardBorder = isMobile ? "1px solid #111" : "1.5px solid #111";

  const fallbackRefs = [
    { name:"John Mwangi",    email:"j.mwangi@gmail.com",  tier:"Standard",     date:"Mar 8, 2025",  bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 3.2) },
    { name:"Amina Kariuki",  email:"amina.k@yahoo.com",   tier:"Regular",      date:"Mar 5, 2025",  bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 1.8) },
    { name:"Peter Otieno",   email:"p.otieno@gmail.com",  tier:"Deluxe",       date:"Mar 1, 2025",  bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 5.1) },
    { name:"Grace Wanjiku",  email:"grace.w@hotmail.com", tier:"Standard",     date:"Feb 22, 2025", bonus:t.deposit*.1,  status:"Pending", earnings: 0 },
    { name:"Samuel Njoroge", email:"sam.n@gmail.com",     tier:"Executive",    date:"Feb 18, 2025", bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 2.4) },
    { name:"Faith Achieng",  email:"faith.a@gmail.com",   tier:"Regular",      date:"Feb 10, 2025", bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 0.9) },
    { name:"Kevin Odhiambo", email:"kevin.o@gmail.com",   tier:"Standard",     date:"Jan 30, 2025", bonus:t.deposit*.1,  status:"Inactive",earnings: 0 },
    { name:"Beatrice Njoki",  email:"b.njoki@yahoo.com",  tier:"Deluxe",       date:"Jan 25, 2025", bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 4.7) },
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

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:18 }}>

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

      {/* Referral table */}
      <div style={{ background:"#fff",borderRadius:14,padding:"22px 24px",border:cardBorder,boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10 }}>
          <div>
            <h3 style={{ fontWeight:800,fontSize:15,letterSpacing:"-0.02em" }}>Referral Records</h3>
            <p style={{ fontSize:12,color:"#BBB",marginTop:3 }}>{ALL_REFS.length} people referred  -  {activeCount} active</p>
          </div>
          {/* Filter pills */}
          <div style={{ display:"flex",gap:4,background:"#F5F5F5",borderRadius:8,padding:3 }}>
            {[["all","All"],["active","Active"],["pending","Pending"],["inactive","Inactive"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setFilter(id)} style={{ padding:"5px 12px",borderRadius:6,border:"none",background:filter===id?"#fff":"transparent",color:filter===id?"#111":"#888",fontWeight:filter===id?700:500,fontSize:11,cursor:"pointer",fontFamily:"Geist,sans-serif",boxShadow:filter===id?"0 1px 3px rgba(0,0,0,0.08)":"none",transition:"all .12s" }}>{lbl}</button>
            ))}
          </div>
        </div>

        {/* Table header */}
        <div style={{ display:"grid",gridTemplateColumns:"2fr 0.7fr 1.1fr 1fr 1fr 1fr 1fr",gap:8,padding:"8px 12px",marginBottom:4 }}>
          {["PERSON","LEVEL","TIER","JOINED","YOUR BONUS","THEIR EARNINGS","STATUS"].map(h => (
            <span key={h} style={{ fontSize:9,color:"#BBB",fontWeight:800,letterSpacing:"0.1em" }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {filtered.map((r, i) => {
          const sc = statusColor(r.status);
          const tc = tierColor(r.tier);
          return (
            <div key={i} style={{ display:"grid",gridTemplateColumns:"2fr 0.7fr 1.1fr 1fr 1fr 1fr 1fr",gap:8,padding:"12px",borderRadius:10,background:i%2===0?"#FAFAFA":"#fff",alignItems:"center",marginBottom:2,transition:"background .15s" }}
              onMouseEnter={e=>e.currentTarget.style.background="#F0F4FF"} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#FAFAFA":"#fff"}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ width:34,height:34,borderRadius:"50%",background:t.lgt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:t.acc,flexShrink:0 }}>{r.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                <div>
                  <div style={{ fontSize:13,fontWeight:700,color:"#111" }}>{r.name}</div>
                  <div style={{ fontSize:10,color:"#BBB" }}>{r.email}</div>
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

        {filtered.length === 0 && (
          <div style={{ padding:"32px",textAlign:"center",color:"#BBB",fontSize:14 }}>No {filter} referrals yet.</div>
        )}

        {/* Totals footer */}
        <div style={{ marginTop:12,padding:"12px 14px",background:"#F7F9FC",borderRadius:10,border:cardBorder,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
          <div style={{ display:"flex",gap:24 }}>
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
function WithdrawContent({ t, earn, balance, authUser, profileRow, focusDeposit, onFocusDone, onNewTx, onBalanceUpdate, hasDeposit }) {
  const [wdAmt,setWdAmt]=useState(""), [method,setMethod]=useState("M-Pesa"), [done,setDone]=useState(false);
  const [wdError, setWdError] = useState("");
  const [depAmt, setDepAmt] = useState("");
  const [depPhone, setDepPhone] = useState("");
  const [depName, setDepName] = useState("");
  const [depMethod, setDepMethod] = useState("M-Pesa");
  const [depLoading, setDepLoading] = useState(false);
  const [depError, setDepError] = useState("");
  const [depDone, setDepDone] = useState(false);
  const depErrorMsg = formatDepositError(depError);
  const depositRef = useRef(null);
  const isMobile = window.innerWidth < 769;
  const tier1Min = Number.isFinite(TIER1_MOBILE_MIN) ? TIER1_MOBILE_MIN : 100;
  const tier1Max = Number.isFinite(TIER1_MOBILE_MAX) ? TIER1_MOBILE_MAX : 1000;
  const tier1Cap = tier1Max >= tier1Min ? tier1Max : tier1Min;
  const tier1Floor = tier1Min;
  const today=new Date().toLocaleDateString("en-US",{weekday:"long"});
  const can=["Tuesday","Friday"].includes(today);
  const nextTier = TIERS[t.id];
  const safeBalance = Number.isFinite(balance) ? balance : t.deposit;
  const upgradeNeed = nextTier ? Math.max(nextTier.deposit - safeBalance, 0) : 0;
  const needsUnlock = hasDeposit === false;
  const unlockNeed = needsUnlock ? t.deposit : 0;
  const primaryNeed = needsUnlock ? unlockNeed : upgradeNeed;
  const canDeposit = primaryNeed > 0;
  const isTier1Flex = isMobile && Number(t?.id) === 1 && needsUnlock;
  useEffect(() => {
    if (!focusDeposit) return;
    if (depositRef.current) depositRef.current.scrollIntoView({ behavior:"smooth", block:"start" });
    if (isTier1Flex) {
      if (!depAmt) setDepAmt(String(tier1Floor));
    } else if (primaryNeed > 0 && String(primaryNeed) !== depAmt) {
      setDepAmt(String(primaryNeed));
    }
    if (onFocusDone) onFocusDone();
  }, [focusDeposit, primaryNeed, isTier1Flex, tier1Floor, depAmt]);
  const submitDeposit = async () => {
    const requiredAmt = isTier1Flex ? clampNumber(depAmt, tier1Floor, tier1Cap) : Number(primaryNeed);
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
    setDepError("");
    setDepLoading(true);
    try {
      const token = await getAccessToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${apiBase}/api/v1/deposit/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: amt,
          user_id: authUser.id,
          email,
          tier: t.id,
          method: depMethod || "M-Pesa",
          payment_mode: MANUAL_PAYMENTS ? "manual" : "live",
          phone: depPhone || profileRow?.phone || "",
          name: depName || profileRow?.name || authUser?.user_metadata?.full_name || ""
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const rawMsg = data?.error || data?.message || "Failed to start checkout.";
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
        sub:`KES ${amt.toLocaleString()} via ${depMethod || "Payment Gateway"}`,
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
    if (!Number.isFinite(amt) || amt <= 0) return false;
    
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
        const newBalance = Number(row?.new_balance);
        if (Number.isFinite(newBalance)) onBalanceUpdate?.(newBalance);
        onNewTx?.({
          ic:"up",
          text:"Withdrawal requested",
          sub:`KES ${amt.toLocaleString()} via ${methodLabel || "M-Pesa"}`,
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
      setWdError(`Self deposit KES ${t.deposit.toLocaleString()} to unlock withdrawals for Tier ${t.id}.`);
      return;
    }
    if (!wdAmt) return;
    const ok = await requestWithdrawal(wdAmt, method, profileRow?.phone || "");
    if (!ok) return;
    setDone(true);
    setTimeout(()=>setDone(false), 3000);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
      <div style={{ padding:"14px 18px",borderRadius:10,border:`1px solid ${can?"#A7F3D0":"#FCA5A5"}`,background:can?"#ECFDF5":"#FFF0F0",display:"flex",alignItems:"center",gap:12 }}>
        <div style={{ width:30,height:30,borderRadius:"50%",background:can?"#059669":"#DC2626",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <I n={can?"check":"xmark"} s={14} c="#fff"/>
        </div>
          <div>
            <div style={{ fontWeight:800,fontSize:14,color:can?"#065F46":"#991B1B" }}>{can?"Withdrawals processing today":"Withdrawals queued today"}</div>
            <div style={{ fontSize:12,color:"#888",marginTop:2 }}>Processing: Tue & Fri - 08:30 - 17:30</div>
            {MANUAL_WITHDRAWALS && (
              <div style={{ fontSize:11,color:"#64748B",marginTop:4 }}>All withdrawals are manually approved by admin.</div>
            )}
          </div>
        </div>
      {hasDeposit === false && (
        <div style={{ padding:"12px 16px",borderRadius:10,border:"1px solid #FDBA74",background:"#FFF7ED",display:"flex",alignItems:"center",gap:10,fontSize:12,color:"#9A3412",fontWeight:700 }}>
          <I n="lock" s={13} c="#EA580C"/> Self deposit KES {t.deposit.toLocaleString()} to unlock withdrawals for Tier {t.id}.
        </div>
      )}
      {wdError && (
        <div style={{ padding:"10px 14px", background:"#FFF0F0", border:"1px solid #FCA5A5", borderRadius:9, fontSize:13, color:"#DC2626", fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
          <I n="xmark" s={14} c="#DC2626" /> {wdError}
        </div>
      )}

      {nextTier && (
        <div style={{ padding:"12px 16px",borderRadius:12,border:"1px solid #E2E8F0",background:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:12,fontWeight:900,color:"#0F172A" }}>
              {needsUnlock ? `Self deposit to unlock ${t.name}` : `Upgrade to ${nextTier.name}`}
            </div>
            <div style={{ fontSize:11,color:"#64748B",marginTop:4 }}>
              {needsUnlock
                ? `Self deposit KES ${unlockNeed.toLocaleString()} to activate earnings.`
                : `Top up KES ${upgradeNeed.toLocaleString()} to move to ${nextTier.name}.`}
            </div>
          </div>
          <button onClick={() => depositRef.current?.scrollIntoView({ behavior:"smooth", block:"start" })}
            style={{ padding:"9px 14px",borderRadius:10,border:"1.5px solid #111",background:"#111",color:"#fff",fontSize:12,fontWeight:900,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap" }}>
            {needsUnlock ? "Self Deposit Now" : "Upgrade Now"}
          </button>
        </div>
      )}

      <div ref={depositRef} style={{ background:"linear-gradient(180deg,#FFFFFF 0%, #F8FAFC 100%)",borderRadius:16,padding:"18px 20px",border:"1px solid #E5E7EB",boxShadow:"0 10px 26px rgba(15,23,42,0.08)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10 }}>
          <div>
            <div style={{ fontSize:13,fontWeight:900,color:"#0F172A",letterSpacing:"0.02em" }}>{needsUnlock ? "Self Deposit to Unlock" : "Self Deposit & Upgrade"}</div>
            <div style={{ fontSize:11,color:"#64748B",marginTop:4 }}>
              {needsUnlock ? `Self deposit required to unlock ${t.name} earnings.` : (nextTier ? `Next tier: ${nextTier.name}` : "You're already at the top tier.")}
            </div>
          </div>
          {needsUnlock ? (
            <div style={{ padding:"6px 10px",background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:999,fontSize:11,color:"#9A3412",fontWeight:800 }}>
              Self deposit KES {unlockNeed.toLocaleString()} to unlock
            </div>
          ) : nextTier && (
            <div style={{ padding:"6px 10px",background:"#EEF2FF",border:"1px solid #C7D2FE",borderRadius:999,fontSize:11,color:"#3730A3",fontWeight:800 }}>
              Need KES {upgradeNeed.toLocaleString()} to upgrade
            </div>
          )}
        </div>

        {nextTier && (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:14 }}>
            <div style={{ padding:"10px 12px",borderRadius:12,border:"1px solid #E5E7EB",background:"#FFFFFF" }}>
              <div style={{ fontSize:9,color:"#94A3B8",fontWeight:800,letterSpacing:"0.12em",marginBottom:4 }}>BALANCE</div>
              <div style={{ fontSize:13,fontWeight:900,color:"#0F172A" }}>KES {safeBalance.toLocaleString()}</div>
              <div style={{ fontSize:10,color:"#94A3B8",marginTop:2 }}>{t.name} Tier</div>
            </div>
            <div style={{ padding:"10px 12px",borderRadius:12,border:"1px solid #111827",background:"#111827" }}>
              <div style={{ fontSize:9,color:"rgba(255,255,255,0.6)",fontWeight:800,letterSpacing:"0.12em",marginBottom:4 }}>NEXT</div>
              <div style={{ fontSize:13,fontWeight:900,color:"#FFFFFF" }}>{nextTier.name}</div>
              <div style={{ fontSize:10,color:"rgba(255,255,255,0.65)",marginTop:2 }}>KES {nextTier.deposit.toLocaleString()}</div>
            </div>
            <div style={{ padding:"10px 12px",borderRadius:12,border:"1px solid #DCFCE7",background:"#ECFDF5" }}>
              <div style={{ fontSize:9,color:"#10B981",fontWeight:800,letterSpacing:"0.12em",marginBottom:4 }}>TOP UP</div>
              <div style={{ fontSize:13,fontWeight:900,color:"#047857" }}>KES {upgradeNeed.toLocaleString()}</div>
              <div style={{ fontSize:10,color:"#059669",marginTop:2 }}>to upgrade</div>
            </div>
          </div>
        )}

        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14 }}>
          {MANUAL_PAYMENTS ? (
            <div style={{ border:"1px solid #E5E7EB",borderRadius:14,padding:"14px 14px 12px",background:"#F8FAFC" }}>
              <div style={{ padding:"12px 12px",borderRadius:12,background:"linear-gradient(135deg,#0F172A 0%, #1F2937 55%, #111827 100%)",color:"#fff",position:"relative",overflow:"hidden" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:12 }}>
                  <div>
                    <div style={{ fontSize:10,letterSpacing:"0.22em",textTransform:"uppercase",opacity:0.7,fontWeight:700 }}>Manual Confirmation</div>
                    <div style={{ fontSize:16,fontWeight:900,letterSpacing:"-0.01em",marginTop:4 }}>Submit request, pay offline, get verified.</div>
                  </div>
                  <div style={{ padding:"6px 10px",borderRadius:999,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",fontSize:10,fontWeight:800,letterSpacing:"0.08em" }}>
                    REVIEW
                  </div>
                </div>
                <div style={{ position:"absolute",right:-30,top:-20,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.08)" }}/>
                <div style={{ position:"absolute",right:30,bottom:-40,width:140,height:140,borderRadius:"50%",background:"rgba(255,255,255,0.06)" }}/>
              </div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginTop:12 }}>
                {[
                  { label:"Manual Review", icon:"shield" },
                  { label:"Wallet Credit", icon:"bolt" },
                  { label:"Support Assisted", icon:"users" }
                ].map((b) => (
                  <div key={b.label} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:999,background:"#FFFFFF",border:"1px solid #E2E8F0",fontSize:10,fontWeight:700,color:"#0F172A" }}>
                    <I n={b.icon} s={12} c="#0F172A" /> {b.label}
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12,fontSize:11,color:"#64748B" }}>
                {DEPOSIT_INSTRUCTIONS}
              </div>
            </div>
          ) : (
            <div style={{ border:"1px solid #E5E7EB",borderRadius:14,padding:"14px 14px 12px",background:"#F8FAFC" }}>
              <div style={{ padding:"12px 12px",borderRadius:12,background:"linear-gradient(135deg,#0F172A 0%, #1F2937 55%, #111827 100%)",color:"#fff",position:"relative",overflow:"hidden" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:12 }}>
                  <div>
                    <div style={{ fontSize:10,letterSpacing:"0.22em",textTransform:"uppercase",opacity:0.7,fontWeight:700 }}>Secure Payment Gateway</div>
                    <div style={{ fontSize:16,fontWeight:900,letterSpacing:"-0.01em",marginTop:4 }}>Secure checkout, instant wallet credit.</div>
                  </div>
                  <div style={{ padding:"6px 10px",borderRadius:999,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",fontSize:10,fontWeight:800,letterSpacing:"0.08em" }}>
                    VERIFIED
                  </div>
                </div>
                <div style={{ position:"absolute",right:-30,top:-20,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.08)" }}/>
                <div style={{ position:"absolute",right:30,bottom:-40,width:140,height:140,borderRadius:"50%",background:"rgba(255,255,255,0.06)" }}/>
              </div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginTop:12 }}>
                {[
                  { label:"SSL Secured", icon:"lock" },
                  { label:"Instant Confirmation", icon:"bolt" },
                  { label:"Buyer Protection", icon:"shield" }
                ].map((b) => (
                  <div key={b.label} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:999,background:"#FFFFFF",border:"1px solid #E2E8F0",fontSize:10,fontWeight:700,color:"#0F172A" }}>
                    <I n={b.icon} s={12} c="#0F172A" /> {b.label}
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12,display:"flex",flexWrap:"wrap",gap:10 }}>
                {[
                  { name:"M-Pesa", logo:"M-Pesa" },
                  { name:"Airtel Money", word:"Airtel Money" },
                  { name:"Visa", logo:"Visa" },
                  { name:"Mastercard", logo:"Mastercard" },
                  { name:"Bank Transfer", word:"Bank Transfer" },
                  { name:"Crypto", word:"USDT / BTC" }
                ].map((m) => (
                  <div key={m.name} style={{ padding:"8px 10px",borderRadius:12,border:"1px solid #E5E7EB",background:"#FFFFFF",minWidth:110 }}>
                    {m.logo ? <PaymentLogo name={m.logo} /> : <Wordmark text={m.word || m.name} width={96} />}
                    <div style={{ marginTop:6,fontSize:10,color:"#64748B",fontWeight:700 }}>{m.name}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:10,fontSize:11,color:"#64748B" }}>
                Pay by mobile money, card, or crypto. You’ll return here automatically after checkout.
              </div>
            </div>
          )}

          <div style={{ border:"1px solid #E5E7EB",borderRadius:14,padding:"14px 14px 12px",background:"#FFFFFF" }}>
            <div style={{ fontSize:11,fontWeight:800,color:"#0F172A",letterSpacing:"0.18em",textTransform:"uppercase" }}>Self Deposit Details</div>
            <div style={{ marginTop:10,padding:"10px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",background:"#F8FAFC",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10 }}>
              <div>
                <div style={{ fontSize:9,fontWeight:800,color:"#94A3B8",letterSpacing:"0.12em" }}>
                  {isTier1Flex ? "MOBILE LIMIT" : "LOCKED AMOUNT"}
                </div>
                <div style={{ fontSize:15,fontWeight:900,color:"#0F172A" }}>
                  KES {Math.max(isTier1Flex ? clampNumber(depAmt || tier1Floor, tier1Floor, tier1Cap) : primaryNeed, 0).toLocaleString()}
                </div>
              </div>
              <div style={{ padding:"4px 8px",borderRadius:999,background:"#111827",color:"#fff",fontSize:10,fontWeight:800 }}>FIXED</div>
            </div>

            {isTier1Flex && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:10,letterSpacing:"0.14em",fontWeight:800,color:"#64748B",textTransform:"uppercase",marginBottom:6 }}>Enter Amount</div>
                <input
                  type="number"
                  min={tier1Floor}
                  max={tier1Cap}
                  value={depAmt}
                  onChange={e=>setDepAmt(e.target.value)}
                  placeholder={`KES ${tier1Floor.toLocaleString()} - ${tier1Cap.toLocaleString()}`}
                  style={{ width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",fontSize:12,fontFamily:"Geist,sans-serif",background:"#F8FAFC" }}
                />
              </div>
            )}

            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:10,letterSpacing:"0.14em",fontWeight:800,color:"#64748B",textTransform:"uppercase",marginBottom:8 }}>Payment Method</div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8 }}>
                {DEPOSIT_METHODS.map((m) => {
                  const active = depMethod === m.label;
                  return (
                    <button key={m.id} onClick={() => setDepMethod(m.label)}
                      style={{
                        padding:"10px 10px",
                        borderRadius:10,
                        border:active ? "1.5px solid #111" : "1.5px solid #E2E8F0",
                        background:active ? "#111" : "#F8FAFC",
                        color:active ? "#fff" : "#111",
                        fontWeight:800,
                        fontSize:12,
                        cursor:"pointer",
                        fontFamily:"Geist,sans-serif",
                        textAlign:"left"
                      }}>
                      <div style={{ fontSize:12,fontWeight:900 }}>{m.label}</div>
                      <div style={{ fontSize:10,opacity:active ? 0.8 : 0.6 }}>{m.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <input
                value={depPhone}
                onChange={e=>setDepPhone(e.target.value)}
                placeholder="Phone (M‑Pesa only, optional)"
                style={{ width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",fontSize:12,fontFamily:"Geist,sans-serif",background:"#F8FAFC" }}
              />
              <input
                value={depName}
                onChange={e=>setDepName(e.target.value)}
                placeholder="Full name (optional)"
                style={{ width:"100%",padding:"9px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",fontSize:12,fontFamily:"Geist,sans-serif",background:"#F8FAFC" }}
              />
            </div>
            <button onClick={submitDeposit} disabled={depLoading || !canDeposit} style={{ width:"100%",marginTop:12,padding:"12px 12px",background:(depLoading || !canDeposit)?"#E2E8F0":"linear-gradient(135deg,#111827 0%, #0F172A 100%)",color:(depLoading || !canDeposit)?"#94A3B8":"#fff",border:"none",borderRadius:11,fontWeight:900,fontSize:13,cursor:(depLoading || !canDeposit)?"not-allowed":"pointer",fontFamily:"Geist,sans-serif",boxShadow:(depLoading || !canDeposit)?"none":"0 10px 20px rgba(15,23,42,0.18)" }}>
              {depLoading
                ? (MANUAL_PAYMENTS ? "Submitting..." : "Redirecting...")
                : (!canDeposit ? "No Self Deposit Required" : (depDone ? "Self Deposit Submitted" : (MANUAL_PAYMENTS ? `Submit ${depMethod} Request` : `Continue with ${depMethod}`)))}
            </button>
            {depErrorMsg && (
              <div style={{ marginTop:8, fontSize:11, color:"#DC2626", fontWeight:700, background:"#FFF1F2", border:"1px solid #FECACA", padding:"8px 10px", borderRadius:8 }}>
                {depErrorMsg}
              </div>
            )}
            <div style={{ marginTop:8, fontSize:11, color:"#64748B" }}>
              {MANUAL_PAYMENTS ? DEPOSIT_INSTRUCTIONS : "Processing time: typically under 60 seconds."}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
        <div style={{ background:"linear-gradient(180deg,#FFFFFF 0%, #F8FAFC 100%)",borderRadius:16,padding:"20px 22px",border:"1px solid #E5E7EB",boxShadow:"0 10px 26px rgba(15,23,42,0.06)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10 }}>
            <div style={{ fontWeight:900,fontSize:15,letterSpacing:"-0.02em",color:"#0F172A" }}>Request Withdrawal</div>
            <div style={{ padding:"5px 10px",background:can?"#ECFDF5":"#FEF2F2",border:`1px solid ${can?"#BBF7D0":"#FECACA"}`,borderRadius:999,fontSize:10,color:can?"#166534":"#991B1B",fontWeight:800 }}>
              {can ? "Payout window open" : "Payouts next Tue/Fri"}
            </div>
          </div>
          <div style={{ marginBottom:14,padding:"12px 14px",borderRadius:12,background:"#0F172A",color:"#fff" }}>
            <div style={{ fontSize:10,opacity:0.6,letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:700 }}>Available Earnings</div>
            <div style={{ fontSize:28,fontWeight:900,letterSpacing:"-0.03em",marginTop:4 }}>KES {earn.toLocaleString()}</div>
          </div>
          <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#64748B",marginBottom:6,letterSpacing:"0.08em" }}>Amount</label>
          <input type="number" value={wdAmt} onChange={e=>setWdAmt(e.target.value)} placeholder="Enter amount..." style={{ width:"100%",padding:"11px 12px",background:"#F8FAFC",border:"1.5px solid #E2E8F0",borderRadius:10,fontSize:14,color:"#0F172A",outline:"none",fontFamily:"Geist,sans-serif",boxSizing:"border-box",marginBottom:12 }}/>
          <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#64748B",marginBottom:8,letterSpacing:"0.08em" }}>Method</label>
          <div style={{ display:"flex",gap:7,marginBottom:16,flexWrap:"wrap" }}>
            {["M-Pesa","Airtel","Bank"].map(m=>(
              <button key={m} onClick={()=>setMethod(m)} style={{ padding:"7px 14px",borderRadius:10,border:`1.5px solid ${method===m?"#111827":"#E2E8F0"}`,background:method===m?"#111827":"#fff",color:method===m?"#fff":"#64748B",fontWeight:method===m?800:600,cursor:"pointer",fontSize:12,fontFamily:"Geist,sans-serif",transition:"all .15s" }}>{m}</button>
            ))}
          </div>
          <button onClick={submitWithdrawal} style={{ width:"100%",padding:"13px",background:can?"linear-gradient(135deg,#111827 0%, #0F172A 100%)":"#E2E8F0",color:can?"#fff":"#94A3B8",border:"none",borderRadius:11,fontWeight:800,fontSize:14,cursor:can?"pointer":"not-allowed",fontFamily:"Geist,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background .15s",boxShadow:can?"0 10px 20px rgba(15,23,42,0.18)":"none" }}>
            <I n={done?"check":"wallet"} s={14} c={can?"#fff":"#94A3B8"}/>{done?"Submitted!":"Submit Withdrawal"}
          </button>
        </div>
        <div style={{ background:"#FFFFFF",borderRadius:16,padding:"20px 22px",border:"1px solid #E5E7EB",boxShadow:"0 10px 26px rgba(15,23,42,0.06)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
            <div style={{ fontWeight:900,fontSize:15,letterSpacing:"-0.02em",color:"#0F172A" }}>History</div>
            <div style={{ fontSize:11,color:"#94A3B8",fontWeight:700 }}>Last 5 payouts</div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8 }}>
            {["Date","Amount","Status"].map(h=>(
              <span key={h} style={{ fontSize:9,color:"#94A3B8",fontWeight:800,letterSpacing:"0.14em" }}>{h.toUpperCase()}</span>
            ))}
          </div>
          {[{d:"Mar 7",a:1200,s:"Paid"},{d:"Feb 28",a:3400,s:"Paid"},{d:"Feb 21",a:800,s:"Paid"},{d:"Feb 14",a:2100,s:"Pending"},{d:"Feb 7",a:950,s:"Paid"}].map((w,i)=>(
            <div key={i} style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,padding:"10px 0",borderTop:"1px solid #F1F5F9",alignItems:"center" }}>
              <span style={{ fontSize:12,color:"#64748B" }}>{w.d}</span>
              <span style={{ fontSize:13,fontWeight:800,letterSpacing:"-0.02em",color:"#0F172A" }}>KES {w.a.toLocaleString()}</span>
              <span style={{ fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:999,background:w.s==="Paid"?"#ECFDF5":"#FEF3C7",color:w.s==="Paid"?"#059669":"#D97706",display:"inline-block",width:"fit-content" }}>{w.s}</span>
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
  { id:"U001", name:"Alice Mwangi",    email:"alice.m@gmail.com",    tier:"Deluxe",       deposit:20000,  status:"Active",   joined:"Mar 1, 2025",  earn:9400,   phone:"0712 345 678" },
  { id:"U002", name:"Brian Kamau",     email:"brian.k@gmail.com",    tier:"Standard",     deposit:10000,  status:"Active",   joined:"Feb 25, 2025", earn:3200,   phone:"0723 456 789" },
  { id:"U003", name:"Carol Njoki",     email:"carol.n@yahoo.com",    tier:"Executive",    deposit:50000,  status:"Active",   joined:"Feb 18, 2025", earn:28000,  phone:"0734 567 890" },
  { id:"U004", name:"David Otieno",    email:"david.o@gmail.com",    tier:"Regular",      deposit:5000,   status:"Pending",  joined:"Mar 8, 2025",  earn:0,      phone:"0745 678 901" },
  { id:"U005", name:"Emma Wanjiku",    email:"emma.w@hotmail.com",   tier:"Executive Pro",deposit:100000, status:"Active",   joined:"Jan 30, 2025", earn:71000,  phone:"0756 789 012" },
  { id:"U006", name:"Francis Odhiambo",email:"francis.o@gmail.com",  tier:"Standard",     deposit:10000,  status:"Active",   joined:"Feb 10, 2025", earn:5600,   phone:"0767 890 123" },
  { id:"U007", name:"Grace Achieng",   email:"grace.a@gmail.com",    tier:"Deluxe",       deposit:20000,  status:"Suspended",joined:"Jan 15, 2025", earn:12000,  phone:"0778 901 234" },
  { id:"U008", name:"Henry Muriuki",   email:"henry.m@gmail.com",    tier:"Regular",      deposit:5000,   status:"Active",   joined:"Mar 5, 2025",  earn:1200,   phone:"0789 012 345" },
  { id:"U009", name:"Irene Chebet",    email:"irene.c@gmail.com",    tier:"Executive",    deposit:50000,  status:"Active",   joined:"Feb 1, 2025",  earn:34000,  phone:"0790 123 456" },
  { id:"U010", name:"James Kimani",    email:"james.k@yahoo.com",    tier:"Standard",     deposit:10000,  status:"Pending",  joined:"Mar 9, 2025",  earn:0,      phone:"0701 234 567" },
];

const ADMIN_WITHDRAWALS = [
  { id:"W001", user:"Alice Mwangi",   amount:2400,  method:"M-Pesa",      date:"Mar 8, 2025",  status:"Pending",  phone:"0712 345 678", tier:"Deluxe" },
  { id:"W002", user:"Brian Kamau",    amount:1200,  method:"M-Pesa",      date:"Mar 7, 2025",  status:"Pending",  phone:"0723 456 789", tier:"Standard" },
  { id:"W003", user:"Emma Wanjiku",   amount:8000,  method:"Visa",        date:"Mar 7, 2025",  status:"Approved", phone:"0756 789 012", tier:"Exec Pro" },
  { id:"W004", user:"Carol Njoki",    amount:5500,  method:"M-Pesa",      date:"Mar 6, 2025",  status:"Approved", phone:"0734 567 890", tier:"Executive" },
  { id:"W005", user:"Francis Odhiambo",amount:800, method:"Airtel Money", date:"Mar 5, 2025",  status:"Paid",     phone:"0767 890 123", tier:"Standard" },
  { id:"W006", user:"Irene Chebet",   amount:4200,  method:"M-Pesa",      date:"Mar 4, 2025",  status:"Paid",     phone:"0790 123 456", tier:"Executive" },
  { id:"W007", user:"Henry Muriuki",  amount:600,   method:"M-Pesa",      date:"Mar 3, 2025",  status:"Rejected", phone:"0789 012 345", tier:"Regular" },
  { id:"W008", user:"Alice Mwangi",   amount:1800,  method:"M-Pesa",      date:"Mar 1, 2025",  status:"Paid",     phone:"0712 345 678", tier:"Deluxe" },
  { id:"W009", user:"David Otieno",   amount:500,   method:"M-Pesa",      date:"Feb 28, 2025", status:"Rejected", phone:"0745 678 901", tier:"Regular" },
  { id:"W010", user:"Emma Wanjiku",   amount:12000, method:"Crypto",      date:"Feb 25, 2025", status:"Paid",     phone:"0756 789 012", tier:"Exec Pro" },
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

function AdminDash({ go, authUser, profileRow, onSignOut }) {
  const [sideOpen, setSideOpen] = useState(true);
  const [tab, setTab] = useState("overview");
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
  const [wdDays, setWdDays] = useState({ tue:true, wed:false, fri:true });
  const [videoPrice, setVideoPrice] = useState(50);
  const [maintenance, setMaintenance] = useState(false);
  const [payoutMode, setPayoutMode] = useState(MANUAL_WITHDRAWALS ? "manual" : "auto");
  const [notifOpen, setNotifOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const adminHeadingFont = "Sora, Geist, sans-serif";
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
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const normalizeUser = (u, i) => {
    const wallet = Array.isArray(u.wallets) ? u.wallets[0] : u.wallets;
    const tierVal = u.tier ?? u.plan;
    const tierLabel = Number.isFinite(Number(tierVal)) ? (TIERS[Number(tierVal)-1]?.name || tierVal) : (tierVal || "Regular");
    const statusRaw = String(u.status || "active");
    const status = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1).toLowerCase();
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
    user: t.user || t.name || t.user_name || "Unknown",
    type: t.type || t.category || "Earning",
    amount: num(t.amount || t.amount_kes),
    method: t.method || t.channel || "-",
    date: fmtDate(t.date || t.created_at),
    status: t.status || "Paid",
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

  useEffect(() => {
    if (!supabase) return;
    let ignore = false;
    (async () => {
      const [uRes, wRes, tRows] = await Promise.all([
        supabase
          .from("users")
          .select("user_id,full_name,email,phone,tier,status,signup_at,wallets(balance)")
          .order("signup_at", { ascending: false }),
        supabase
          .from("payout_requests")
          .select("payout_id,user_id,requested_amount,status,scheduled_for,processed_at,users(full_name,email,phone,tier)")
          .order("scheduled_for", { ascending: false }),
        fetchTable("transactions", { orderBy: "created_at" }),
      ]);
      if (ignore) return;
      const u = uRes?.data || [];
      const w = wRes?.data || [];
      if (Array.isArray(u) && u.length) setUsers(u.map(normalizeUser));
      if (Array.isArray(w) && w.length) setWithdrawals(w.map(normalizeWithdrawal));
      if (Array.isArray(tRows) && tRows.length) setTxs(tRows.map(normalizeTx));
    })();
    return () => { ignore = true; };
  }, []);

  const adminNav = [
    {id:"overview",     label:"Overview",     ic:"grid",     badge:null},
    {id:"users",        label:"Users",        ic:"users",    badge:"1,247"},
    {id:"transactions", label:"Transactions", ic:"wallet",   badge:null},
    {id:"withdrawals",  label:"Withdrawals",  ic:"up",       badge:withdrawals.filter(w=>w.status==="Pending").length},
    {id:"settings",     label:"Settings",     ic:"settings", badge:null},
  ];

  const tiers = [
    {n:"Regular",c:ADMIN.blue,count:423,pct:34},
    {n:"Standard",c:ADMIN.blueAlt,count:287,pct:23},
    {n:"Deluxe",c:ADMIN.green,count:312,pct:25},
    {n:"Executive",c:ADMIN.red,count:156,pct:12.5},
    {n:"Exec Pro",c:ADMIN.redAlt,count:69,pct:5.5}
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

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchFilter = userFilter==="all" || u.status.toLowerCase()===userFilter;
    const matchCategory = userCategory==="all" || String(u.category || "").toLowerCase()===userCategory;
    return matchSearch && matchFilter && matchCategory;
  });
  const categoryOptions = ["all", ...Array.from(new Set(users.map(u => String(u.category || "Client").toLowerCase())))];

  const filteredWd = wdFilter==="all" ? withdrawals : withdrawals.filter(w=>w.status.toLowerCase()===wdFilter);
  const filteredTx = txFilter==="all" ? txs : txs.filter(t=>t.type.toLowerCase()===txFilter||t.status.toLowerCase()===txFilter);

  const S = (label, txt) => ({ fontSize:11, color:ADMIN.muted, fontWeight:600, label, txt });

  const statusBadge = (s) => {
    const map = {
      Active:[ADMIN.green,"#ECFDF5"],
      Paid:[ADMIN.green,"#ECFDF5"],
      Approved:[ADMIN.green,"#ECFDF5"],
      Pending:[ADMIN.blue,"#EFF6FF"],
      Suspended:[ADMIN.red,"#FFF0F0"],
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
              <p style={{ fontSize:12,color:ADMIN.muted,marginTop:3 }}>{new Date().toDateString()}  -  EdisonPay Admin</p>
            </div>
            {tab==="users"&&(
              <button style={{ padding:"8px 18px",background:"#111",color:"#fff",border:"1.5px solid #111",boxShadow:"0 4px 0 #111",borderRadius:9,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Geist,sans-serif",display:"flex",alignItems:"center",gap:6 }}>
                <I n="user" s={12} c="#fff"/> Add User
              </button>
            )}
          </div>

          {/* "" OVERVIEW TAB "" */}
          {tab==="overview" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {/* Stat cards */}
              <div className="ep-admin-stats" style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
                {[
                  [1247,"Total Users","users",ADMIN.blue,"+12% this month",true],
                  [342,"Active Today","activity",ADMIN.green,"+24 today",true],
                  ["KES 8.9M","Total Paid Out","wallet",ADMIN.blueAlt,"Since launch",true],
                  [withdrawals.filter(w=>w.status==="Pending").length,"Pending Withdrawals","up",ADMIN.red,"Needs attention",false],
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
                    <span style={{ fontSize:13,fontWeight:900,color:"#111" }}>1,247 users</span>
                  </div>
                  {tiers.map((tr,i)=>(
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
                        <div style={{ height:"100%",width:`${tr.pct*2.5}%`,background:tr.c,borderRadius:99,transition:"width 1s ease" }}/>
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
            </div>
          )}

          {/* "" USERS TAB "" */}
          {tab==="users" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {/* Filters */}
              <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}>
                <div style={{ display:"flex",gap:4,background:"#fff",border:"2px solid #111",borderRadius:9,padding:3 }}>
                  {["all","active","pending","suspended"].map(f=>(
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
                      {[["User ID",selectedUser.id],["Tier",selectedUser.tier],["Deposit",`KES ${selectedUser.deposit.toLocaleString()}`],["Earnings",`KES ${selectedUser.earn.toLocaleString()}`],["Status",selectedUser.status],["Joined",selectedUser.joined],["Phone",selectedUser.phone],["Referred By",selectedUser.referredBy || "-"],["Referrals","3 active"]].map(([l,v],i)=>(
                        <div key={i} style={{ padding:"12px 14px",background:"#fff",borderRadius:10,border:"1.5px solid #111",boxShadow:"0 3px 0 #111" }}>
                          <div style={{ fontSize:10,color:ADMIN.muted,fontWeight:800,letterSpacing:"0.08em",marginBottom:5 }}>{l.toUpperCase()}</div>
                          <div style={{ fontSize:13,fontWeight:700,color:"#111" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex",gap:8 }}>
                      <button style={{ flex:1,padding:"10px",background:"#111",color:"#fff",border:"1.5px solid #111",borderRadius:10,fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"Geist,sans-serif",boxShadow:"0 4px 0 #111" }}>Activate</button>
                      <button style={{ flex:1,padding:"10px",background:"#EFF6FF",color:ADMIN.blue,border:"1.5px solid #111",borderRadius:10,fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"Geist,sans-serif" }}>Suspend</button>
                      <button style={{ flex:1,padding:"10px",background:"#FFF0F0",color:ADMIN.red,border:"1.5px solid #111",borderRadius:10,fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"Geist,sans-serif" }}>Delete</button>
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

export default function App() {
  const [page, setPage] = useState("landing");
  const [prevPage, setPrevPage] = useState("landing");
  const [tier, setTier] = useState(0);
  const t = TIERS[tier];
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!SUPABASE_ENABLED);
  const [profileRow, setProfileRow] = useState(null);
  const [authMessage, setAuthMessage] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isMobileInstall, setIsMobileInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installHint, setInstallHint] = useState("");
  const [showInstallPanel, setShowInstallPanel] = useState(false);
  const [installPanelSeen, setInstallPanelSeen] = useState(false);

  useEffect(() => {
    const url = window.location.href;
    const hasRecovery = /type=recovery/i.test(url) || /access_token=/i.test(url) || /refresh_token=/i.test(url);
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
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => {
      const ua = navigator.userAgent || "";
      const mobileUA = /Android|iPhone|iPad|iPod/i.test(ua);
      setIsMobileInstall(mq.matches || mobileUA);
    };
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();
    const mq = window.matchMedia("(display-mode: standalone)");
    if (mq.addEventListener) mq.addEventListener("change", checkStandalone);
    else mq.addListener(checkStandalone);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", checkStandalone);
      else mq.removeListener(checkStandalone);
    };
  }, []);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setShowInstall(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem("ep:tier", String(tier)); } catch (e) {}
  }, [tier]);

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
          const res = await fetch(`${apiBase}/api/v1/deposit/verify?${qs.toString()}`);
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
          const res = await fetch(`${apiBase}/api/v1/deposit/status?reference=${encodeURIComponent(merchantReference)}`);
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
  const role = profileRow?.role || "client";
  const isAdmin = role === "admin";
  // showDevNav defined above (dev override / localhost / dev mode)
  const profileReady = !SUPABASE_ENABLED || !authUser || profileRow !== null;
  const tierSelected = profileRow?.tier_selected === true;

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

  const devNavOverride = (() => {
    if (typeof window === "undefined") return false;
    try {
      const url = new URL(window.location.href);
      const qp = url.searchParams.get("devnav");
      if (qp === "1") localStorage.setItem("ep:devnav", "1");
      if (qp === "0") localStorage.removeItem("ep:devnav");
      return localStorage.getItem("ep:devnav") === "1";
    } catch (e) {
      return false;
    }
  })();
  const isLocalHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const showDevNav = devNavOverride || isLocalHost || !SUPABASE_ENABLED || import.meta.env.DEV;

  const route = showDevNav
    ? page
    : (!SUPABASE_ENABLED
        ? page
        : (authUser
            ? (isAdmin ? "admin" : (page==="tier-select" ? "tier-select" : "dashboard"))
            : (page==="login" || page==="signup" ? page : "landing")));

  const handleTierSelect = async (tierId) => {
    if (!supabase || !authUser?.id) return false;
    const tierNum = Number(tierId);
    if (!Number.isFinite(tierNum) || tierNum < 1 || tierNum > TIERS.length) return false;
    const updated = await upsertProfileRow({
      id: authUser.id,
      tier: tierNum,
      tier_selected: true,
      tier_selected_at: new Date().toISOString()
    });
    if (updated) {
      setProfileRow(updated);
      return true;
    }
    return false;
  };
  const openHelp = () => {
    try {
      const w = window.Tawk_API;
      if (w?.showWidget) w.showWidget();
      if (w?.maximize) setTimeout(() => w.maximize(), 60);
    } catch (e) {}
  };

  const handleInstall = async () => {
    if (!installPrompt) {
      const ua = navigator.userAgent || "";
      const isIOS = /iPad|iPhone|iPod/i.test(ua);
      const msg = isIOS
        ? "On iPhone/iPad: tap Share, then 'Add to Home Screen'."
        : "Install prompt is getting ready. Please try again in a moment.";
      setInstallHint(msg);
      setTimeout(() => setInstallHint(""), 3500);
      return;
    }
    try {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice?.outcome !== "accepted") {
        setInstallHint("Install dismissed. You can try again anytime.");
        setTimeout(() => setInstallHint(""), 2500);
      }
    } catch (e) {
      setInstallHint("Install prompt failed. Please try again.");
      setTimeout(() => setInstallHint(""), 2500);
    } finally {
      setInstallPrompt(null);
      setShowInstall(false);
    }
  };

  const showInstallButton = isMobileInstall && !isStandalone && route === "landing";
  const installReady = !!installPrompt && showInstall;
  const showInstallPanelReady = showInstallButton && !installPanelSeen;

  useEffect(() => {
    if (!showInstallPanelReady) return;
    let timer;
    let armed = false;
    const arm = () => {
      if (armed) return;
      armed = true;
      timer = setTimeout(() => {
        setShowInstallPanel(true);
        setInstallPanelSeen(true);
      }, 5000);
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, arm, { passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, arm));
      if (timer) clearTimeout(timer);
    };
  }, [showInstallPanelReady]);

  return (
    <ErrorBoundary>
      <GlobalStyles />
      <Fonts />

      {/* "" PAGE SWITCHER - sticky top bar "" */}
      {showDevNav && (
        <div style={{ position:"sticky",top:0,zIndex:9999,background:"#0A0A0A",display:"flex",alignItems:"center",padding:"0 12px",height:44,gap:4,borderBottom:"1px solid #1A1A1A",flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:4,flex:1,flexWrap:"nowrap",overflowX:"auto" }}>
            {[["landing","Home","home"],["login","Login","lock"],["signup","Sign Up","user"],["tier-select","Tier Select","star"],["dashboard","Dashboard","chart"],["admin","Admin","settings"]].map(([id,lbl,ic])=>(
              <button key={id} onClick={()=>go(id)} style={{ padding:"5px 13px",borderRadius:50,border:"none",background:page===id?"#fff":"#1A1A1A",color:page===id?"#111":"#888",fontSize:11,fontWeight:page===id?800:500,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"Geist,sans-serif",transition:"all .15s",whiteSpace:"nowrap",flexShrink:0 }}>
                <I n={ic} s={11} c={page===id?"#111":"#888"}/>{lbl}
              </button>
            ))}
            {page==="dashboard"&&(
              <>
                <div style={{ width:1,height:16,background:"#2A2A2A",margin:"0 4px",flexShrink:0 }}/>
                <span style={{ fontSize:10,color:"#444",fontWeight:700,fontFamily:"Geist,sans-serif",flexShrink:0 }}>TIER:</span>
                {TIERS.map((tr,i)=>(
                  <button key={i} onClick={()=>setTier(i)} style={{ padding:"4px 10px",borderRadius:50,border:`1px solid ${tier===i?tr.acc:"#2A2A2A"}`,background:tier===i?tr.acc+"22":"transparent",color:tier===i?tr.acc:"#555",fontSize:10,fontWeight:tier===i?800:500,cursor:"pointer",fontFamily:"Geist,sans-serif",transition:"all .15s",whiteSpace:"nowrap",flexShrink:0 }}>{tr.name}</button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ height: showDevNav ? "calc(100vh - 44px)" : "100vh", overflow:"hidden" }}>
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
            {route==="tier-select" && <div style={{ height:"100%",overflowY:"auto" }}><TierSelect go={go} authUser={authUser} profileRow={profileRow} onSelectTier={handleTierSelect} /></div>}
            {route==="dashboard" && <ClientDash t={t} go={go} key={tier} authUser={authUser} profileRow={profileRow} onSignOut={handleSignOut}/>}
            {route==="admin"     && <AdminDash go={go} authUser={authUser} profileRow={profileRow} onSignOut={handleSignOut}/>}
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
            style={{
              padding:"10px 22px",
              borderRadius:999,
              border:"1.5px solid #000",
              background: installReady ? "#000" : "#222",
              color:"#fff",
              fontWeight:900,
              letterSpacing:"0.02em",
              fontSize:12,
              textTransform:"uppercase",
              cursor:"pointer",
              boxShadow:"0 8px 0 #000",
              fontFamily:"IBM Plex Sans, Geist, sans-serif",
              opacity: installReady ? 1 : 0.85
            }}
          >
            Download App
          </button>
        </div>
      )}
      {showInstallPanel && showInstallButton && (
        <div
          style={{
            position:"fixed",
            right:14,
            top:"50%",
            transform:"translateY(-50%)",
            zIndex:9998,
            width:"min(260px, 78vw)",
            background:"#fff",
            border:"1.5px solid #111",
            borderRadius:16,
            boxShadow:"0 10px 30px rgba(0,0,0,0.18)",
            padding:"14px 14px 12px",
            display:"grid",
            gap:10
          }}
        >
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <div style={{ fontSize:12, fontWeight:900, color:"#111", letterSpacing:"0.06em" }}>DOWNLOAD APP</div>
            <button
              onClick={() => setShowInstallPanel(false)}
              style={{ width:22, height:22, borderRadius:"50%", border:"1px solid #111", background:"#fff", display:"grid", placeItems:"center", cursor:"pointer" }}
            >
              <I n="xmark" s={12} c="#111" />
            </button>
          </div>
          <div style={{ fontSize:12, color:"#444", lineHeight:1.5 }}>
            Install the app for a faster, full'screen experience.
          </div>
          <button
            onClick={handleInstall}
            style={{
              padding:"9px 12px",
              borderRadius:10,
              border:"1.5px solid #111",
              background: installReady ? "#111" : "#222",
              color:"#fff",
              fontWeight:900,
              fontSize:12,
              cursor:"pointer",
              boxShadow:"0 4px 0 #111"
            }}
          >
            Install App
          </button>
          {installHint && (
            <div style={{ fontSize:10, color:"#6B7280" }}>{installHint}</div>
          )}
        </div>
      )}
      <button onClick={openHelp}
        className="ep-help-fab"
        style={{
          right:18,
          bottom:18,
          zIndex:9999,
          width:42,
          height:42,
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










