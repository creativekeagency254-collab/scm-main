import { useState, useEffect, useRef, useCallback } from "react";
import React from "react";

/* ── FONTS ── */
const Fonts = () => (
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
);

/* ── CSS KEYFRAMES injected once ── */
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
      .ep-hover-lift:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.09) !important; }
      .ep-hover-lift { transition: transform .2s ease, box-shadow .2s ease !important; }
      .ep-shimmer { background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }
      .ep-card { background:#fff; border-radius:16px; border:1px solid #EBEBEB; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
      * { box-sizing:border-box; margin:0; padding:0; }
      ::-webkit-scrollbar { width:5px; height:5px; }
      ::-webkit-scrollbar-track { background:transparent; }
      ::-webkit-scrollbar-thumb { background:#e0e0e0; border-radius:3px; }
      ::-webkit-scrollbar-thumb:hover { background:#c8c8c8; }

      /* ── MOBILE RESPONSIVE ── */
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
        .ep-dash-overlay { display:block !important; }
        .ep-topbar-search { display:none !important; }
        .ep-topbar-date { display:none !important; }
        .ep-page-actions { display:none !important; }
        .ep-overview-chart-grid { grid-template-columns:1fr !important; }
        .ep-admin-grid2 { grid-template-columns:1fr !important; }
        .ep-admin-stats { grid-template-columns:1fr 1fr !important; }
        .ep-footer-grid { grid-template-columns:1fr 1fr !important; }
        .ep-footer-brand { grid-column: 1 / -1 !important; }
      }
      @media (max-width:480px) {
        .ep-grid-4 { grid-template-columns:1fr !important; }
        .ep-admin-stats { grid-template-columns:1fr !important; }
        .ep-footer-grid { grid-template-columns:1fr !important; }
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

/* ── ICON LIBRARY ── */
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

/* ── TIERS ── */
const TIERS = [
  { id:1, name:"Regular",      tag:"REG", deposit:5000,   videos:2,  bot:2,  acc:"#0066FF", rgb:"0,102,255",  lgt:"#EBF2FF", mid:"#99C2FF" },
  { id:2, name:"Standard",     tag:"STD", deposit:10000,  videos:4,  bot:6,  acc:"#E8820C", rgb:"232,130,12", lgt:"#FEF3E2", mid:"#FDC06A" },
  { id:3, name:"Deluxe",       tag:"DLX", deposit:20000,  videos:8,  bot:18, acc:"#059669", rgb:"5,150,105",  lgt:"#ECFDF5", mid:"#6EE7B7" },
  { id:4, name:"Executive",    tag:"EXC", deposit:50000,  videos:20, bot:38, acc:"#7C3AED", rgb:"124,58,237", lgt:"#F5F0FF", mid:"#C4B5FD" },
  { id:5, name:"Executive Pro",tag:"PRO", deposit:100000, videos:40, bot:38, acc:"#DC2626", rgb:"220,38,38",  lgt:"#FFF0F0", mid:"#FCA5A5" },
];
const V_PRICE = 50;

/* ── ANIMATED NUMBER ── */
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

/* ── DONUT ── */
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

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════════════════════ */
function Landing({ go }) {
  const [scrollPx, setScrollPx] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 80);
    let raf;
    const tick = () => { setScrollPx(p => p + 0.55); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const payments = ["M-Pesa","Visa","Mastercard","Bitcoin","BNB","Paystack","Airtel Money","PayPal","Stripe","Apple Pay","Google Pay","USDT","Flutterwave","Binance Pay"];

  const anim = (delay = 0) => ({ animation: `fadeUp .55s ease both`, animationDelay: `${delay}ms`, opacity: heroVisible ? 1 : 0 });

  return (
    <div style={{ fontFamily: "Geist,sans-serif", background: "#fff", color: "#111", minHeight: "100vh" }}>

      {/* ── NAV ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 90, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(16px)", borderBottom: "1px solid #E8E8E8", padding: "0 5vw", display: "flex", alignItems: "center", height: 60, gap: 32 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", flexShrink: 0 }} onClick={() => go("landing")}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I n="bolt" s={15} c="#fff" />
          </div>
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

      {/* ── HERO — split layout ── */}
      <section className="ep-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "calc(100vh - 98px)", maxWidth: 1300, margin: "0 auto", padding: "0 5vw" }}>

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: "6vw", paddingTop: 40, paddingBottom: 40 }}>
          {/* Social proof */}
          <div style={{ ...anim(0), display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 32, width: "fit-content" }}>
            <div style={{ display: "flex", gap: -3 }}>
              {["#FFD700","#FFD700","#FFD700","#FFD700","#FFD700"].map((c,i) => <I key={i} n="star" s={14} c={c} />)}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>4.9 — Trusted by 1,000+ earners</span>
          </div>

          {/* Headline */}
          <h1 style={{ ...anim(80), fontSize: "clamp(40px,4.8vw,66px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em", color: "#111", marginBottom: 24 }}>
            Earn KES 50<br />
            <span style={{ fontFamily: "Instrument Serif,serif", fontStyle: "italic", fontWeight: 400 }}>Per Video.</span><br />
            Daily.
          </h1>

          <p style={{ ...anim(160), fontSize: 17, color: "#666", lineHeight: 1.7, maxWidth: 420, marginBottom: 36 }}>
            Watch short videos, refer friends, and watch your deposit grow to <strong style={{ color: "#111" }}>3× its value</strong> — with 5 investment tiers built for every budget.
          </p>

          <div style={{ ...anim(240), display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 44 }}>
            <button onClick={() => go("signup")} style={{ padding: "14px 30px", background: "#111", color: "#fff", border: "none", borderRadius: 50, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Geist,sans-serif" }}>Start Earning Free</button>
            <button onClick={() => go("login")} style={{ padding: "14px 30px", background: "#fff", color: "#111", border: "1.5px solid #E5E5E5", borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "Geist,sans-serif" }}>Sign In</button>
          </div>

          {/* 3 micro stats */}
          <div style={{ ...anim(320), display: "flex", gap: 32, paddingTop: 32, borderTop: "1px solid #EBEBEB" }}>
            {[["KES 50", "per video"], ["3×", "deposit growth"], ["3 days", "weekly payouts"]].map(([v, l], i) => (
              <div key={i}>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", color: "#111" }}>{v}</div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — visual panel */}
        <div style={{ ...anim(120), position: "relative", display: "flex", alignItems: "stretch", paddingTop: 28, paddingBottom: 28 }}>
          {/* Main panel — dark gradient background simulating image */}
          <div style={{ flex: 1, borderRadius: 24, background: "linear-gradient(160deg,#0D1B36 0%,#0D2A3F 40%,#0A3D2E 100%)", position: "relative", overflow: "hidden", minHeight: 480 }}>

            {/* Grid lines texture */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

            {/* Central graphic — big earnings number */}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-55%)", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 500 }}>YOUR BALANCE TODAY</div>
              <div style={{ fontSize: 64, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, animation: "fadeIn .8s ease .4s both" }}>
                KES 47,200
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>+KES 2,000 from today's videos</div>
              {/* Progress bar */}
              <div style={{ marginTop: 20, width: 240, margin: "20px auto 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
                  <span>Progress to 3× goal</span><span>47%</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "47%", background: "#0066FF", borderRadius: 99, animation: "fadeIn 1.4s ease .6s both" }} />
                </div>
              </div>
            </div>

            {/* Floating card 1 — earnings stat (top right) */}
            <div style={{ position: "absolute", top: 28, right: 24, background: "#fff", borderRadius: 14, padding: "14px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", animation: "floatA 4s ease-in-out infinite", minWidth: 190 }}>
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
                <span style={{ fontSize: 10, color: "#888" }}>● Bots</span>
                <span style={{ fontSize: 10, color: "#888" }}>● Referrals</span>
              </div>
            </div>

            {/* Floating card 2 — chat bubble (bottom left) */}
            <div style={{ position: "absolute", bottom: 60, left: 24, background: "#fff", borderRadius: 50, padding: "12px 18px 12px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.16)", display: "flex", alignItems: "center", gap: 10, animation: "floatB 5s ease-in-out infinite" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#0066FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <I n="check" s={14} c="#fff" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111", whiteSpace: "nowrap" }}>Withdrawal approved!</span>
            </div>

            {/* Floating card 3 — tier badge (bottom right) */}
            <div style={{ position: "absolute", bottom: 28, right: 24, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, animation: "floatA 6s ease-in-out infinite .5s" }}>
              <I n="bolt" s={14} c="#0066FF" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>Unlock 5 Earning Tiers</span>
              <I n="chevR" s={14} c="rgba(255,255,255,0.5)" />
            </div>
          </div>
        </div>
      </section>

      {/* ── SCROLLING LOGOS ── */}
      <div style={{ borderTop: "1px solid #EBEBEB", borderBottom: "1px solid #EBEBEB", background: "#FAFAFA", padding: "16px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 56, width: "max-content", animation: "ticker 22s linear infinite" }}>
          {[...payments, ...payments].map((p, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 700, color: "#C0C0C0", letterSpacing: "0.08em", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#D8D8D8", display: "inline-block" }} />{p}
            </span>
          ))}
        </div>
      </div>

      {/* ── TIERS SECTION ── */}
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
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.7 }}>Every deposit grows to <strong style={{ color: "#111" }}>3× its value</strong> through daily video earnings, smart bots, and referral bonuses.</p>
              <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
                {[["KES 50","per video"],["3×","goal target"],["3 days","withdraw/week"]].map(([v,l],i) => (
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
              <TierCard key={i} t={t} go={go} featured={i === 2} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "80px 5vw", background: "#FAFAFA", borderTop: "1px solid #E8E8E8" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 14 }}>Process</div>
            <h2 style={{ fontSize: "clamp(28px,3vw,44px)", fontWeight: 900, letterSpacing: "-0.04em" }}>Up and running in minutes</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 0, position: "relative" }}>
            <div style={{ position: "absolute", top: 20, left: "10%", right: "10%", height: 1, background: "#E0E0E0", zIndex: 0 }} />
            {[["user","Sign Up","Choose your tier and create your account."],["wallet","Deposit","Pay the fixed starting balance for your tier."],["play","Watch Videos","Earn KES 50 per video — bots handle the rest."],["gift","Refer Friends","Get 10% bonus every time someone joins your link."],["up","Withdraw","Tuesday, Wednesday & Friday — straight to your phone."]].map(([icon, title, desc], i) => (
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

      {/* ── FOOTER ── */}
      <footer style={{ background: "#0D0D0D", color: "#fff" }}>
        {/* Top CTA band */}
        <div style={{ borderBottom: "1px solid #1F1F1F", padding: "48px 5vw" }}>
          <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
            <div>
              <h3 style={{ fontSize: "clamp(22px,2.5vw,34px)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 8 }}>
                Ready to start earning?
              </h3>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.6 }}>Join 1,000+ Kenyans building passive income daily.</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => go("signup")} style={{ padding: "13px 28px", background: "#fff", color: "#111", border: "none", borderRadius: 50, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "Geist,sans-serif" }}>Create Free Account</button>
              <button onClick={() => go("login")} style={{ padding: "13px 28px", background: "transparent", color: "#fff", border: "1.5px solid #333", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "Geist,sans-serif" }}>Sign In</button>
            </div>
          </div>
        </div>

        {/* Main footer grid */}
        <div style={{ padding: "56px 5vw 40px", maxWidth: 1300, margin: "0 auto", display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr", gap: 40 }}>
          {/* Brand col */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <I n="bolt" s={15} c="#111" />
              </div>
              <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.04em" }}>EdisonPay</span>
            </div>
            <p style={{ fontSize: 13, color: "#555", lineHeight: 1.8, maxWidth: 260, marginBottom: 24 }}>
              Kenya's leading video earnings platform. Watch, earn, refer, and grow your money to 3× its value.
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
            { h: "Platform", ls: ["Overview","Tiers & Plans","Video Earnings","Bot System","Referrals","Withdrawals"] },
            { h: "Tiers", ls: ["Regular — 5K","Standard — 10K","Deluxe — 20K","Executive — 50K","Exec Pro — 100K"] },
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
        <div style={{ borderTop: "1px solid #1A1A1A", padding: "20px 5vw", maxWidth: 1300, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#3A3A3A" }}>© 2025 EdisonPay Ltd. All rights reserved. Nairobi, Kenya.</span>
          <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#3A3A3A" }}>
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

function TierRow({ t, go }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={() => go("signup")}
      style={{ display: "flex", alignItems: "center", padding: "20px 24px", background: hov ? "#FAFAFA" : "#fff", cursor: "pointer", borderBottom: "1px solid #EBEBEB", transition: "background .15s", gap: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: hov ? t.acc : t.lgt, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s", flexShrink: 0 }}>
        <I n="bolt" s={16} c={hov ? "#fff" : t.acc} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{t.name}</div>
        <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{t.videos} videos/day · {t.bot} bot videos</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 900, fontSize: 16, color: "#111", letterSpacing: "-0.03em" }}>KES {t.deposit.toLocaleString()}</div>
        <div style={{ fontSize: 11, color: "#BBB" }}>starting balance</div>
      </div>
      <I n="chevR" s={16} c={hov ? "#111" : "#DDD"} />
    </div>
  );
}

function TierCard({ t, go, featured }) {
  const [hov, setHov] = useState(false);
  const daily = (t.videos + t.bot) * V_PRICE;
  const days = Math.ceil((t.deposit * 3) / daily);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={() => go("signup")}
      style={{
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
      }}>
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
        <div style={{ fontSize: 11, color: "#AAA", marginTop: 4 }}>starting deposit · grows to KES {(t.deposit*3/1000).toFixed(0)}K</div>
      </div>

      {/* Features */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {[[`${t.videos} manual videos/day`, "play"], [`${t.bot} bot videos/day`, "activity"], [`KES ${daily.toLocaleString()} earned daily`, "trendUp"], [`~${days} days to 3× goal`, "star"]].map(([label, icon], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#444" }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: "#F5F5F5", border: "1px solid #E8E8E8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <I n={icon} s={11} c="#888" />
            </div>
            {label}
          </div>
        ))}
      </div>

      <button onClick={e => { e.stopPropagation(); go("signup"); }}
        style={{ width: "100%", padding: "11px", background: hov ? "#111" : "#fff", color: hov ? "#fff" : "#111", border: "1.5px solid #111", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "Geist,sans-serif", transition: "all .2s", letterSpacing: "-0.01em" }}>
        Get Started →
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AUTH PAGES
═══════════════════════════════════════════════════════════ */
function Auth({ type, go, from }) {
  const isLogin = type === "login";
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", ref: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const set = k => v => { setF(p => ({ ...p, [k]: v })); setErr(""); };

  const submit = () => {
    setErr("");
    if (!f.email) { setErr("Email is required."); return; }
    if (!f.password) { setErr("Password is required."); return; }
    if (!isLogin && f.password !== f.confirm) { setErr("Passwords don't match."); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); go(from || "dashboard"); }, 1100);
  };

  return (
    <div className="ep-auth-grid" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", fontFamily: "Geist,sans-serif" }}>

      {/* LEFT — brand panel */}
      <div className="ep-auth-left" style={{ background: "#0D1117", display: "flex", flexDirection: "column", padding: "48px 56px", position: "relative", overflow: "hidden" }}>
        {/* Subtle grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 64, zIndex: 1 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I n="bolt" s={16} c="#111" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: "-0.03em" }}>EdisonPay</span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 1 }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 20 }}>
            Earn while<br /><span style={{ fontFamily: "Instrument Serif,serif", fontStyle: "italic", fontWeight: 400, color: "#0066FF" }}>you sleep.</span>
          </h2>
          <p style={{ color: "#666", fontSize: 15, lineHeight: 1.7, marginBottom: 40, maxWidth: 340 }}>Join 1,000+ earners across Kenya collecting daily passive income from video watching and referrals.</p>

          {/* Feature pills */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[["play","KES 50 earned per video watched"],["users","10% referral bonus — earn from your network"],["shield","Secure withdrawals · Tue, Wed & Fri"]].map(([ic, t], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(0,102,255,0.15)", border: "1px solid rgba(0,102,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <I n={ic} s={13} c="#0066FF" />
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#444", zIndex: 1 }}>© 2025 EdisonPay Ltd.</div>
      </div>

      {/* RIGHT — form */}
      <div style={{ background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ width: "100%", maxWidth: 400, animation: "scaleIn .35s ease both" }}>
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color: "#111", marginBottom: 8 }}>{isLogin ? "Welcome back" : "Create account"}</h1>
            <p style={{ fontSize: 14, color: "#999" }}>{isLogin ? "Sign in to your EdisonPay account" : "Start earning in under 2 minutes"}</p>
          </div>

          {!isLogin && <Field label="Full Name" ph="Alex Johnson" val={f.name} set={set("name")} ic="user" />}
          <Field label="Email" type="email" ph="alex@example.com" val={f.email} set={set("email")} ic="user" />
          <Field label="Password" type="password" ph="••••••••" val={f.password} set={set("password")} ic="lock" />
          {!isLogin && <>
            <Field label="Confirm Password" type="password" ph="••••••••" val={f.confirm} set={set("confirm")} ic="lock" />
            <Field label="Referral Code (optional)" ph="edisonpay-reg-XXXX" val={f.ref} set={set("ref")} ic="gift" />
          </>}

          {isLogin && <div style={{ textAlign: "right", marginBottom: 20 }}><span style={{ fontSize: 13, color: "#0066FF", fontWeight: 600, cursor: "pointer" }}>Forgot password?</span></div>}

          {err && (
            <div style={{ padding: "10px 14px", background: "#FFF0F0", border: "1px solid #FCA5A5", borderRadius: 9, fontSize: 13, color: "#DC2626", fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <I n="xmark" s={14} c="#DC2626" /> {err}
            </div>
          )}

          <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "14px", background: loading ? "#888" : "#111", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", fontFamily: "Geist,sans-serif", marginBottom: 20, letterSpacing: "-0.01em", transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? (
              <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> {isLogin ? "Signing in…" : "Creating account…"}</>
            ) : (isLogin ? "Sign In" : "Create Account")}
          </button>

          <div style={{ textAlign: "center", fontSize: 13, color: "#999" }}>
            {isLogin ? "No account? " : "Have an account? "}
            <span onClick={() => go(isLogin ? "signup" : "login")} style={{ color: "#111", fontWeight: 700, cursor: "pointer" }}>{isLogin ? "Sign Up" : "Sign In"}</span>
          </div>

          <div onClick={() => go("landing")} style={{ textAlign: "center", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", color: "#CCC", fontSize: 13, fontWeight: 500 }}>
            <I n="chevL" s={13} c="#CCC" /> Back to home
          </div>
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

/* ═══════════════════════════════════════════════════════════
   CLIENT DASHBOARD
═══════════════════════════════════════════════════════════ */
const CLIENT_NAV = [
  { id: "overview",  label: "Overview",  ic: "grid"   },
  { id: "videos",    label: "Videos",    ic: "play"   },
  { id: "analytics", label: "Analytics", ic: "chart"  },
  { id: "referrals", label: "Referrals", ic: "gift"   },
  { id: "withdraw",  label: "Withdraw",  ic: "wallet" },
];

function ClientDash({ t, go }) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState("overview");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 769);
  const earn = Math.round(t.deposit * 0.47);
  const goal = t.deposit * 3;
  const pct = Math.round((earn / goal) * 100);
  const today = new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});
  const canWithdraw = ["Tuesday","Wednesday","Friday"].includes(new Date().toLocaleDateString("en-US",{weekday:"long"}));
  const SIDEBAR_W = 260;
  const ICON_W = 60;

  useEffect(() => {
    const fn = () => { const m = window.innerWidth < 769; setIsMobile(m); if (m) setOpen(false); };
    window.addEventListener("resize", fn); fn();
    return () => window.removeEventListener("resize", fn);
  }, []);

  const navItems = [
    { id:"overview",  label:"Overview",  ic:"grid"   },
    { id:"videos",    label:"Videos",    ic:"play",  badge: "2 left" },
    { id:"analytics", label:"Analytics", ic:"chart"  },
    { id:"referrals", label:"Referrals", ic:"gift",  badge: "8" },
    { id:"withdraw",  label:"Withdraw",  ic:"wallet" },
    { id:"settings",  label:"Settings",  ic:"settings" },
  ];

  const recentTx = [
    {d:"Mar 7", a:1200, s:"Paid",    type:"out"},
    {d:"Mar 5", a:3400, s:"Paid",    type:"out"},
    {d:"Mar 1", a:800,  s:"Paid",    type:"out"},
    {d:"Feb 28",a:2100, s:"Pending", type:"out"},
  ];

  const closeSidebar = () => { if (isMobile) setOpen(false); };

  return (
    <div style={{ display:"flex", height:"calc(100vh - 44px)", background:"#F2F4F8", fontFamily:"Geist,sans-serif", color:"#111", position:"relative" }}>

      {/* ── Mobile overlay ── */}
      <div className="ep-dash-overlay" onClick={closeSidebar}
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:199, display:"none", backdropFilter:"blur(2px)" }}/>

      {/* ══════════ SIDEBAR ══════════ */}
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

        {/* ── Brand row ── */}
        <div style={{ height:62, display:"flex", alignItems:"center", padding: open?"0 18px":"0", justifyContent: open?"flex-start":"center", borderBottom:"1px solid #F0F0F0", flexShrink:0, gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:"#111", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <I n="bolt" s={15} c="#fff"/>
          </div>
          {open && <div style={{ overflow:"hidden", whiteSpace:"nowrap" }}>
            <div style={{ fontWeight:900, fontSize:15, letterSpacing:"-0.04em", color:"#111" }}>EdisonPay</div>
            <div style={{ fontSize:10, color:t.acc, fontWeight:800, letterSpacing:"0.06em", marginTop:1 }}>{t.name.toUpperCase()}</div>
          </div>}
        </div>

        {/* ── Nav ── */}
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
            <div style={{ margin:"8px 0 0", padding:"10px 12px", borderRadius:9, border:`1.5px dashed ${t.mid}`, display:"flex", alignItems:"center", gap:9, cursor:"pointer", color:t.acc, fontWeight:700, fontSize:12, background:`${t.acc}08` }}>
              <I n="star" s={14} c={t.acc}/> Upgrade to {TIERS[t.id]?.name}
            </div>
          )}
        </nav>

        {/* ── Bottom: recent tx + links ── */}
        {open && (
          <div style={{ borderTop:"1px solid #F0F0F0", flexShrink:0 }}>
            <div style={{ padding:"12px 16px 8px" }}>
              <div style={{ fontSize:9, fontWeight:800, color:"#CCC", letterSpacing:"0.12em", marginBottom:10 }}>RECENT TRANSACTIONS</div>
              {recentTx.slice(0,4).map((w,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <div style={{ width:22, height:22, borderRadius:6, background: w.s==="Paid"?"#ECFDF5":"#FEF3C7", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <I n={w.s==="Paid"?"check":"calendar"} s={10} c={w.s==="Paid"?"#059669":"#D97706"}/>
                    </div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:"#111" }}>KES {w.a.toLocaleString()}</div>
                      <div style={{ fontSize:9, color:"#BBB" }}>{w.d}</div>
                    </div>
                  </div>
                  <span style={{ fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:50, background:w.s==="Paid"?"#ECFDF5":"#FEF3C7", color:w.s==="Paid"?"#059669":"#D97706" }}>{w.s}</span>
                </div>
              ))}
            </div>
            <div style={{ padding:"10px 16px 16px", display:"flex", justifyContent:"space-between" }}>
              {["About","Contact","Help"].map(l => <span key={l} style={{ fontSize:11, color:"#CCC", cursor:"pointer" }}>{l}</span>)}
            </div>
          </div>
        )}

        {/* Icon-only: logout at bottom */}
        {!open && (
          <div style={{ padding:"10px 0", display:"flex", justifyContent:"center", borderTop:"1px solid #F0F0F0" }}>
            <button onClick={() => go("landing")} title="Logout" style={{ width:36, height:36, borderRadius:9, border:"none", background:"#FFF0F0", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <I n="logout" s={15} c="#EF4444"/>
            </button>
          </div>
        )}
      </aside>

      {/* ══════════ MAIN ══════════ */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

        {/* ── TOP BAR ── */}
        <header style={{ height:62, background:"#fff", borderBottom:"1px solid #E8E8E8", display:"flex", alignItems:"center", padding:"0 20px", gap:12, flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>

          {/* Toggle */}
          <button onClick={() => setOpen(o => !o)}
            style={{ width:36, height:36, borderRadius:9, border:"1.5px solid #E8E8E8", background:"#FAFAFA", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", flexShrink:0 }}
            onMouseEnter={e=>{e.currentTarget.style.background="#F0F0F0";}} onMouseLeave={e=>{e.currentTarget.style.background="#FAFAFA";}}>
            <I n="menu" s={16} c="#555"/>
          </button>

          {/* Page breadcrumb */}
          <div style={{ display:"flex", alignItems:"center", gap:6, overflow:"hidden" }}>
            <span style={{ fontSize:13, color:"#BBB", fontWeight:500, whiteSpace:"nowrap" }}>Dashboard</span>
            <I n="chevR" s={12} c="#DDD"/>
            <span style={{ fontSize:13, fontWeight:800, color:"#111", whiteSpace:"nowrap", letterSpacing:"-0.02em" }}>{navItems.find(n=>n.id===tab)?.label || "Overview"}</span>
          </div>

          {/* Search */}
          <div className="ep-topbar-search" style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:"#FAFAFA", border:"1.5px solid #EBEBEB", borderRadius:10, flex:1, maxWidth:280 }}>
            <I n="search" s={13} c="#CCC"/>
            <input placeholder="Search transactions, videos…" style={{ border:"none", background:"transparent", outline:"none", fontSize:13, color:"#111", width:"100%", fontFamily:"Geist,sans-serif" }}/>
          </div>

          <div style={{ flex:1 }}/>

          {/* Date */}
          <div className="ep-topbar-date" style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", background:"#FAFAFA", border:"1px solid #EBEBEB", borderRadius:9, flexShrink:0 }}>
            <I n="calendar" s={13} c="#BBB"/>
            <span style={{ fontSize:12, color:"#888", fontWeight:500, whiteSpace:"nowrap" }}>{today}</span>
          </div>

          {/* Withdrawal day indicator */}
          <div className="ep-topbar-date" style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", background: canWithdraw?"#ECFDF5":"#FFF5F5", border:`1px solid ${canWithdraw?"#A7F3D0":"#FCA5A5"}`, borderRadius:9, flexShrink:0 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background: canWithdraw?"#059669":"#EF4444", animation:"pulse 2s infinite" }}/>
            <span style={{ fontSize:11, fontWeight:800, color: canWithdraw?"#059669":"#EF4444", whiteSpace:"nowrap" }}>
              {canWithdraw ? "Withdrawals Open" : "Withdrawals Closed"}
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

          {/* Notifications */}
          <div style={{ position:"relative" }}>
            <button onClick={()=>{setNotifOpen(o=>!o); setProfileOpen(false);}}
              style={{ width:36, height:36, borderRadius:9, border:"1.5px solid #E8E8E8", background:"#FAFAFA", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
              <I n="bell" s={15} c="#666"/>
              <div style={{ position:"absolute", top:6, right:6, width:8, height:8, borderRadius:"50%", background:"#EF4444", border:"1.5px solid #fff" }}/>
            </button>
            {notifOpen && (
              <div style={{ position:"absolute", top:44, right:0, width:300, background:"#fff", border:"1px solid #E8E8E8", borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.12)", zIndex:999, padding:"14px 0", animation:"scaleIn .18s ease both", transformOrigin:"top right" }}>
                <div style={{ padding:"0 16px 10px", borderBottom:"1px solid #F5F5F5", display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:13, fontWeight:800 }}>Notifications</span>
                  <span style={{ fontSize:11, color:t.acc, fontWeight:700, cursor:"pointer" }}>Mark all read</span>
                </div>
                {[
                  {ic:"check", title:"Withdrawal Approved", sub:"KES 1,200 sent to M-Pesa", time:"2h ago", c:"#059669"},
                  {ic:"play",  title:"Bot videos complete", sub:"14 videos · KES 280 earned", time:"5h ago", c:t.acc},
                  {ic:"gift",  title:"New referral joined", sub:"Amina K. signed up via your link", time:"1d ago", c:"#E8820C"},
                ].map((n,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, padding:"11px 16px", background:"#FAFAFA", margin:"0 8px 4px", borderRadius:10 }}>
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
              <div style={{ width:28, height:28, borderRadius:"50%", background:t.acc, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:11, fontWeight:900, color:"#fff" }}>AJ</span>
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:"#111", whiteSpace:"nowrap" }}>Alex J.</span>
              <I n="chevR" s={12} c="#CCC"/>
            </div>
            {profileOpen && (
              <div style={{ position:"absolute", top:46, right:0, width:220, background:"#fff", border:"1px solid #E8E8E8", borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.12)", zIndex:999, padding:"8px", animation:"scaleIn .18s ease both", transformOrigin:"top right" }}>
                <div style={{ padding:"10px 12px 10px", borderBottom:"1px solid #F5F5F5", marginBottom:4 }}>
                  <div style={{ fontSize:13, fontWeight:800 }}>Alex Johnson</div>
                  <div style={{ fontSize:11, color:"#888" }}>alex@example.com</div>
                  <div style={{ marginTop:6, display:"inline-flex", alignItems:"center", gap:5, padding:"3px 8px", background:t.lgt, borderRadius:50 }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:t.acc }}/>
                    <span style={{ fontSize:9, fontWeight:800, color:t.acc }}>{t.name.toUpperCase()}</span>
                  </div>
                </div>
                {[["user","My Profile"],["settings","Settings"],["shield","Security"]].map(([ic,lbl])=>(
                  <div key={lbl} style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 12px", borderRadius:8, cursor:"pointer", fontSize:13, color:"#555", fontWeight:500 }}
                    onMouseEnter={e=>e.currentTarget.style.background="#F7F7F7"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <I n={ic} s={14} c="#BBB"/>{lbl}
                  </div>
                ))}
                <div style={{ borderTop:"1px solid #F5F5F5", marginTop:4, paddingTop:4 }}>
                  <div onClick={()=>go("landing")} style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 12px", borderRadius:8, cursor:"pointer", fontSize:13, color:"#EF4444", fontWeight:700 }}
                    onMouseEnter={e=>e.currentTarget.style.background="#FFF0F0"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <I n="logout" s={14} c="#EF4444"/> Sign Out
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── PAGE HEADER STRIP ── */}
        <div style={{ padding:"16px 24px 0", background:"#F2F4F8", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <h2 style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.04em", color:"#111", lineHeight:1.1 }}>
              {navItems.find(n=>n.id===tab)?.label || "Overview"}
            </h2>
            <p style={{ fontSize:12, color:"#AAA", marginTop:4, fontWeight:500 }}>
              {today} · <span style={{ color:t.acc, fontWeight:700 }}>{t.name} Tier</span> · KES {earn.toLocaleString()} earned
            </p>
          </div>
          {/* Quick action buttons */}
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setTab("videos")} style={{ padding:"8px 16px", background:"#111", color:"#fff", border:"none", borderRadius:9, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"Geist,sans-serif", display:"flex", alignItems:"center", gap:6 }}>
              <I n="play" s={12} c="#fff"/> Watch Now
            </button>
            <button onClick={()=>setTab("withdraw")} style={{ padding:"8px 16px", background:"#fff", color:"#111", border:"1.5px solid #E8E8E8", borderRadius:9, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"Geist,sans-serif", display:"flex", alignItems:"center", gap:6 }}>
              <I n="wallet" s={12} c="#111"/> Withdraw
            </button>
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px 36px" }} onClick={()=>{setNotifOpen(false); setProfileOpen(false);}}>
          {tab==="overview"  && <OverviewContent  t={t} earn={earn} goal={goal} pct={pct} setTab={setTab}/>}
          {tab==="videos"    && <VideosContent    t={t}/>}
          {tab==="analytics" && <OverviewContent  t={t} earn={earn} goal={goal} pct={pct} setTab={setTab}/>}
          {tab==="referrals" && <ReferralsContent t={t} earn={earn}/>}
          {tab==="withdraw"  && <WithdrawContent  t={t} earn={earn}/>}
          {tab==="settings"  && (
            <div style={{ background:"#fff", borderRadius:14, padding:"32px", border:"1px solid #EBEBEB", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", textAlign:"center" }}>
              <I n="settings" s={32} c="#DDD"/><br/><br/>
              <div style={{ fontSize:16, fontWeight:700, color:"#BBB" }}>Settings coming soon</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile bottom nav ── */}
      {isMobile && (
        <nav style={{ position:"fixed", bottom:0, left:0, right:0, height:60, background:"#fff", borderTop:"1px solid #E8E8E8", display:"flex", alignItems:"stretch", zIndex:150, boxShadow:"0 -4px 20px rgba(0,0,0,0.08)" }}>
          {navItems.filter(n=>["overview","videos","referrals","withdraw","settings"].includes(n.id)).map(({id,ic,label}) => {
            const active = tab===id;
            return (
              <button key={id} onClick={()=>{setTab(id); setOpen(false);}}
                style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, background:"transparent", border:"none", cursor:"pointer", color: active?t.acc:"#BBB", transition:"color .15s", fontFamily:"Geist,sans-serif" }}>
                <I n={ic} s={active?18:16} c={active?t.acc:"#BBBBBB"}/>
                <span style={{ fontSize:9, fontWeight:active?800:500, whiteSpace:"nowrap", letterSpacing:"0.02em" }}>{label}</span>
                {active && <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:28, height:2, background:t.acc, borderRadius:99 }}/>}
              </button>
            );
          })}
        </nav>
      )}

      {/* Help FAB */}
      <div style={{ position:"fixed", bottom: isMobile?72:24, right:24, width:44, height:44, borderRadius:"50%", background:"#111", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"0 4px 20px rgba(0,0,0,0.22)", zIndex:100 }}>
        <I n="shield" s={18} c="#fff"/>
      </div>
    </div>
  );
}

/* ── REFERRAL MINI CARD (shown in overview) ── */
function ReferralMiniCard({ t }) {
  const [copied, setCopied] = useState(false);
  const code = `edisonpay.co.ke/ref/edisonpay-${t.tag.toLowerCase()}-AX7K`;
  const short = `edisonpay-${t.tag.toLowerCase()}-AX7K`;
  const copy = () => { try { navigator.clipboard?.writeText(`https://${code}`); } catch(e){} setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const referrals = [
    { name:"John M.", bonus: t.deposit*.1, status:"Active", when:"2d ago" },
    { name:"Amina K.", bonus: t.deposit*.1, status:"Active", when:"5d ago" },
    { name:"Peter O.", bonus: t.deposit*.1, status:"Pending", when:"1w ago" },
  ];
  const earned = referrals.filter(r=>r.status==="Active").length * t.deposit * .1;

  return (
    <div style={{ background:"#fff", borderRadius:14, border:`1px solid ${t.mid}`, boxShadow:`0 2px 12px rgba(${t.rgb},0.08)`, overflow:"hidden" }}>
      {/* Header stripe */}
      <div style={{ background:`linear-gradient(135deg, #0D1B36 0%, ${t.acc}DD 100%)`, padding:"18px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
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
          {[["3","Referrals"],[`KES ${earned.toLocaleString()}`,"Total Earned"],["10%","Your Bonus"]].map(([v,l],i) => (
            <div key={i} style={{ textAlign:"right" }}>
              <div style={{ fontSize:16, fontWeight:900, color:"#fff", letterSpacing:"-0.03em" }}>{v}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", fontWeight:600, letterSpacing:"0.06em" }}>{l.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:0 }}>
        {/* Link + copy */}
        <div style={{ padding:"16px 22px", borderRight:"1px solid #F0F0F0", display:"flex", alignItems:"center", gap:10 }}>
          <I n="link" s={14} c={t.acc}/>
          <span style={{ fontSize:13, fontWeight:700, color:"#111", letterSpacing:"0.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{short}</span>
          <button onClick={copy} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", background: copied?"#ECFDF5":"#111", color: copied?"#059669":"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"Geist,sans-serif", transition:"all .2s", whiteSpace:"nowrap", flexShrink:0 }}>
            <I n={copied?"check":"copy"} s={12} c={copied?"#059669":"#fff"}/> {copied?"Copied!":"Copy"}
          </button>
        </div>

        {/* Recent 3 referrals inline */}
        <div style={{ padding:"14px 20px", display:"flex", gap:12, alignItems:"center" }}>
          {referrals.map((r,i) => (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:r.status==="Active"?t.lgt:"#F5F5F5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:r.status==="Active"?t.acc:"#BBB", border:`1.5px solid ${r.status==="Active"?t.mid:"#E8E8E8"}` }}>{r.name[0]}</div>
              <div style={{ fontSize:9, fontWeight:700, color:r.status==="Active"?"#059669":"#BBB", whiteSpace:"nowrap" }}>{r.status==="Active"?`+KES ${(r.bonus/1000).toFixed(0)}K`:"Pending"}</div>
            </div>
          ))}
          <div style={{ paddingLeft:8, borderLeft:"1px solid #F0F0F0" }}>
            <div style={{ fontSize:11, fontWeight:800, color:t.acc, cursor:"pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:4 }}>
              View all <I n="chevR" s={11} c={t.acc}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── OVERVIEW ── */
function OverviewContent({ t, earn, goal, pct, setTab }) {
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const weekData = days.map((d,i) => ({ d, v: Math.round(earn * (0.08 + i * 0.04 + Math.random() * 0.06)) }));
  const maxV = Math.max(...weekData.map(x=>x.v));
  const dailyEarn = (t.videos + t.bot) * V_PRICE;
  const daysLeft = Math.ceil((goal - earn) / dailyEarn);
  const canW = ["Tuesday","Wednesday","Friday"].includes(new Date().toLocaleDateString("en-US",{weekday:"long"}));
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const curMonth = new Date().getMonth();
  const [activeMonth, setActiveMonth] = useState(curMonth);

  const activity = [
    { ic:"play",  text:"Watched 2 videos", sub:"KES 100 credited", time:"2h ago",  c:"#059669" },
    { ic:"gift",  text:"Referral joined",  sub:"John M. signed up · +KES 500", time:"5h ago",  c:t.acc },
    { ic:"up",    text:"Withdrawal sent",  sub:"KES 1,200 → M-Pesa", time:"1d ago",  c:"#E8820C" },
    { ic:"activity", text:"Bot completed", sub:"14 videos · KES 280 earned", time:"1d ago",  c:"#7C3AED" },
    { ic:"users", text:"New referral",     sub:"Amina K. deposited", time:"3d ago",  c:"#0066FF" },
  ];

  const referrals = [
    { name:"John M.", init:"JM", status:"Active" },
    { name:"Amina K.", init:"AK", status:"Active" },
    { name:"Peter O.", init:"PO", status:"Pending" },
    { name:"Grace W.", init:"GW", status:"Active" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* ══════════════════════════════════════
          MOBILE HERO — Image 2 inspired
          (mint green header + balance + actions)
      ══════════════════════════════════════ */}
      <div className="ep-mobile-only" style={{ borderRadius:20, background:`linear-gradient(160deg, #C8F5DE 0%, #A8EDCA 60%, ${t.acc}22 100%)`, padding:"28px 22px 22px", position:"relative", overflow:"hidden" }}>
        {/* Decorative circle */}
        <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,0.3)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:-20, left:-20, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.2)", pointerEvents:"none" }}/>

        {/* Top row: logo + grid button */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:"#111", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <I n="bolt" s={14} c="#fff"/>
            </div>
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
            <div style={{ fontSize:11, color:"#AAA", fontWeight:600, marginBottom:4 }}>Transactions · {months[activeMonth]}</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
              <span style={{ fontSize:11, color:"#AAA", fontWeight:600 }}>**** {t.deposit.toString().slice(-4)}</span>
            </div>
          </div>
          <div style={{ fontSize:11, color:canW?"#059669":"#EF4444", fontWeight:700, padding:"4px 10px", background:canW?"#ECFDF5":"#FFF5F5", borderRadius:50, border:`1px solid ${canW?"#A7F3D0":"#FCA5A5"}` }}>
            {canW?"Withdraw Open":"Closed"}
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div>
            <div style={{ fontSize:42, fontWeight:900, color:"#111", letterSpacing:"-0.05em", lineHeight:1 }}>{t.videos + t.bot}</div>
            <div style={{ fontSize:12, color:"#888", marginTop:4 }}>Videos this month</div>
          </div>
          <div style={{ display:"flex", alignItems:"center" }}>
            {referrals.slice(0,3).map((r,i)=>(
              <div key={i} style={{ width:32, height:32, borderRadius:"50%", background:r.status==="Active"?t.acc:"#E0E0E0", border:"2px solid #fff", marginLeft:i>0?-10:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#fff" }}>{r.init[0]}</div>
            ))}
            <div style={{ width:32, height:32, borderRadius:"50%", background:t.acc, border:"2px solid #fff", marginLeft:-10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#fff" }}>+{referrals.length}</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          DESKTOP — Image 1 style
          Top 3 stat cards
      ══════════════════════════════════════ */}
      <div className="ep-grid-4 ep-desktop-only" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
        {/* Card 1 — Total Balance (dark) */}
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

        {/* Card 2 — Total Spending (Daily Potential) */}
        <div className="ep-hover-lift ep-card" style={{ borderRadius:18, padding:"22px 24px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-20, right:-20, width:120, height:120, borderRadius:"50%", background:`${t.acc}08`, pointerEvents:"none" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div style={{ width:36, height:36, borderRadius:11, background:`${t.acc}14`, border:`1px solid ${t.acc}22`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <I n="play" s={16} c={t.acc}/>
            </div>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.06em", color:"#BBB" }}>···</div>
          </div>
          <div style={{ fontSize:11, color:"#AAA", fontWeight:700, letterSpacing:"0.06em", marginBottom:8 }}>DAILY POTENTIAL</div>
          <div style={{ fontSize:28, fontWeight:900, color:"#111", letterSpacing:"-0.05em", lineHeight:1, marginBottom:10 }}>KES {dailyEarn.toLocaleString()}</div>
          <div style={{ fontSize:11, color:"#888", fontWeight:600 }}>{t.videos + t.bot} videos/day · {t.videos} manual + {t.bot} bot</div>
          <div style={{ height:3, background:"#F5F5F5", borderRadius:99, marginTop:16 }}>
            <div style={{ height:"100%", width:"100%", background:`${t.acc}55`, borderRadius:99 }}/>
          </div>
        </div>

        {/* Card 3 — Total Saved (Goal Progress) */}
        <div className="ep-hover-lift ep-card" style={{ borderRadius:18, padding:"22px 24px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-20, right:-20, width:120, height:120, borderRadius:"50%", background:"#05966908", pointerEvents:"none" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div style={{ width:36, height:36, borderRadius:11, background:"#ECFDF5", border:"1px solid #A7F3D044", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <I n="activity" s={16} c="#059669"/>
            </div>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.06em", color:"#BBB" }}>···</div>
          </div>
          <div style={{ fontSize:11, color:"#AAA", fontWeight:700, letterSpacing:"0.06em", marginBottom:8 }}>GOAL PROGRESS</div>
          <div style={{ fontSize:28, fontWeight:900, color:"#111", letterSpacing:"-0.05em", lineHeight:1, marginBottom:10 }}>{pct}%</div>
          <div style={{ fontSize:11, color:"#059669", fontWeight:700 }}>~{daysLeft} days to 3× goal · KES {goal.toLocaleString()}</div>
          <div style={{ height:3, background:"#F5F5F5", borderRadius:99, marginTop:16 }}>
            <div style={{ height:"100%", width:`${pct}%`, background:"#059669", borderRadius:99, transition:"width 1.2s ease" }}/>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          MAIN CONTENT GRID
          Left: Chart | Right: My Plan card + Referrals
      ══════════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:14 }} className="ep-overview-chart-grid">

        {/* Left: Income Chart + Transactions */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Income/Weekly Earnings Chart */}
          <div className="ep-card" style={{ borderRadius:18, padding:"24px 26px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
              <div>
                <div style={{ fontSize:11, color:"#AAA", fontWeight:700, letterSpacing:"0.06em", marginBottom:4 }}>INCOME</div>
                <div style={{ fontSize:26, fontWeight:900, color:"#111", letterSpacing:"-0.04em", lineHeight:1 }}>
                  <AnimNum target={earn} prefix="KES "/>
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
                const h = Math.max(8,(b.v/maxV)*100);
                const isToday = i === new Date().getDay()-1;
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, zIndex:1 }}>
                    {b.v===maxV && <div style={{ fontSize:10, fontWeight:800, color:"#111", background:"#111", color:"#fff", padding:"2px 6px", borderRadius:5, whiteSpace:"nowrap", fontSize:9 }}>KES {(b.v/1000).toFixed(1)}K</div>}
                    <div style={{ width:"100%", height:h, background: isToday ? t.acc : `${t.acc}40`, borderRadius:"6px 6px 0 0", position:"relative", overflow:"hidden", transition:"height .8s ease" }}>
                      {isToday && <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"rgba(255,255,255,0.35)", borderRadius:"6px 6px 0 0" }}/>}
                    </div>
                    <div style={{ fontSize:10, color:isToday?"#111":"#CCC", fontWeight:isToday?800:500 }}>{b.d}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, paddingTop:14, borderTop:"1px solid #F5F5F5", marginTop:4 }}>
              {[[`KES ${earn.toLocaleString()}`, "Total earned", t.acc],[`KES ${(goal-earn).toLocaleString()}`, "Remaining", "#888"],[`${daysLeft} days`, "To 3× goal", "#111"]].map(([v,l,c],i)=>(
                <div key={i}>
                  <div style={{ fontSize:14, fontWeight:900, color:c, letterSpacing:"-0.03em" }}>{v}</div>
                  <div style={{ fontSize:11, color:"#BBB", marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions list — Image 1 right panel style */}
          <div className="ep-card" style={{ borderRadius:18, padding:"22px 24px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <h3 style={{ fontWeight:900, fontSize:15, letterSpacing:"-0.03em" }}>Transactions</h3>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:"#F7F7F7", border:"1px solid #EBEBEB", borderRadius:9, fontSize:12, color:"#888", fontWeight:600, cursor:"pointer" }}>
                This Week <I n="chevR" s={11} c="#CCC"/>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
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
                    <div style={{ fontSize:13, fontWeight:800, color:a.c }}>+KES {Math.round(dailyEarn * (0.15 + i * 0.08)).toLocaleString()}</div>
                    <div style={{ fontSize:10, color:"#CCC", marginTop:2 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: My Plan Card + Recent Referrals — Image 1 right panel */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* "My Plan" card — like "My Cards" in Image 1 */}
          <div style={{ background:"#111", borderRadius:18, padding:"18px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:900, color:"#fff" }}>My Plan</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{t.id} of 5 Tiers</div>
              </div>
              <div style={{ width:30, height:30, borderRadius:8, background:t.acc, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <I n="bolt" s={14} c="#fff"/>
              </div>
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
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", textAlign:"right" }}>3× Goal<br/><span style={{ color:"rgba(255,255,255,0.8)", fontWeight:700 }}>KES {goal.toLocaleString()}</span></div>
              </div>
            </div>

            {/* Send / Receive buttons — like Image 1 */}
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

          {/* Recent Referrals — like "Recent Contacts" in Image 1 */}
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
              {referrals.map((r,i)=>(
                <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:r.status==="Active"?t.lgt:"#F5F5F5", border:`2px solid ${r.status==="Active"?t.mid:"#E8E8E8"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:r.status==="Active"?t.acc:"#BBB" }}>{r.init}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#555", textAlign:"center", maxWidth:50, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.name.split(" ")[0]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Withdrawal window pill */}
          <div className="ep-card" style={{ borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:canW?"#ECFDF5":"#FFF5F5", border:`1.5px solid ${canW?"#A7F3D0":"#FCA5A5"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <I n="wallet" s={16} c={canW?"#059669":"#EF4444"}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:800, color:"#111" }}>Withdrawal Window</div>
              <div style={{ fontSize:11, color:canW?"#059669":"#EF4444", fontWeight:700, marginTop:2 }}>
                {canW ? "Open · Closes 17:30" : "Opens Tue/Wed/Fri"}
              </div>
            </div>
            {canW && <div style={{ width:8, height:8, borderRadius:"50%", background:"#059669", animation:"pulse 2s infinite", flexShrink:0 }}/>}
          </div>

          {/* Earning Mix */}
          <div className="ep-card" style={{ borderRadius:14, padding:"16px 18px" }}>
            <h3 style={{ fontWeight:900, fontSize:13, letterSpacing:"-0.02em", marginBottom:12 }}>Earning Mix</h3>
            {[["Videos",68,t.acc],["Bot",22,t.mid],["Referrals",10,"#059669"]].map(([l,p,c],i)=>(
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
        </div>
      </div>

      {/* ── Referral mini card ── */}
      <ReferralMiniCard t={t}/>

      {/* ── Account Summary ── */}
      <div className="ep-card" style={{ padding:"22px 26px", borderRadius:18 }}>
        <h3 style={{ fontWeight:900, fontSize:15, letterSpacing:"-0.03em", marginBottom:18 }}>Account Summary</h3>
        <div className="ep-grid-4" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {[
            ["Tier", `${t.name} (#${t.id}/5)`, t.acc],
            ["Manual Videos", `${t.videos}/day`, "#111"],
            ["Bot Videos", `${t.bot}/day`, "#111"],
            ["Referrals", "3 active", "#059669"],
            ["Daily Earnings", `KES ${dailyEarn.toLocaleString()}`, t.acc],
            ["Goal Amount", `KES ${goal.toLocaleString()}`, "#111"],
            ["Days to Goal", `~${daysLeft} days`, "#E8820C"],
            ["Withdraw Days", "Tue · Wed · Fri", "#059669"],
          ].map(([l,v,c],i)=>(
            <div key={i} style={{ padding:"14px 16px", background:"#FAFAFA", borderRadius:12, border:"1px solid #F0F0F0" }}>
              <div style={{ fontSize:10, color:"#BBB", fontWeight:700, letterSpacing:"0.06em", marginBottom:6 }}>{l.toUpperCase()}</div>
              <div style={{ fontSize:14, fontWeight:800, color:c, letterSpacing:"-0.02em" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── VIDEO DATA — 16 YouTube-style videos ── */
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

/* ── VIDEOS CONTENT ── */
function VideosContent({ t }) {
  const MANUAL_COUNT = 2;
  const BOT_COUNT = 14; // 16 total - 2 manual
  // watched: 0 = none done, 1 = first done, 2 = both done
  const [watched, setWatched] = useState(0);
  // playing: null | 0 | 1 (which manual video index)
  const [playing, setPlaying] = useState(null);
  const [timer, setTimer] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [botPct, setBotPct] = useState(11);
  const [botDone, setBotDone] = useState(2);
  const [activeTab, setActiveTab] = useState("manual");
  const [imgErrors, setImgErrors] = useState({});

  // ── Manual video timer
  useEffect(() => {
    if (!timerRunning) return;
    if (timer <= 0) {
      setTimerRunning(false);
      setPlaying(null);
      setWatched(w => {
        const next = Math.min(w + 1, MANUAL_COUNT);
        return next;
      });
      return;
    }
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timerRunning, timer]);

  // ── Bot ticker
  useEffect(() => {
    const id = setInterval(() => {
      setBotPct(p => {
        if (p >= 100) { clearInterval(id); return 100; }
        const next = Math.min(p + 0.15, 100);
        setBotDone(Math.floor((next / 100) * BOT_COUNT));
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, []);

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
    setTimer(30);
    setTimerRunning(true);
  };

  const todayEarn = watched * V_PRICE + Math.floor(botDone * V_PRICE * 0.4);

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:18 }}>

      {/* ── Error toast ── */}
      {errMsg && (
        <div style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 18px",background:"#FFF0F0",border:"1.5px solid #FCA5A5",borderRadius:12,fontSize:13,color:"#DC2626",fontWeight:600,animation:"slideUp .2s ease" }}>
          <I n="xmark" s={15} c="#DC2626"/>
          {errMsg}
          <button onClick={()=>setErrMsg("")} style={{ marginLeft:"auto",border:"none",background:"transparent",color:"#DC2626",cursor:"pointer",fontWeight:900,fontSize:16,lineHeight:1 }}>×</button>
        </div>
      )}

      {/* ── Summary bar ── */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
        {[
          [`${watched}/${MANUAL_COUNT}`,"Manual Watched","#111"],
          [`${botDone}/${BOT_COUNT}`,"Bot Completed","#059669"],
          [`KES ${(watched*V_PRICE).toLocaleString()}`,"Manual Earned",t.acc],
          [`KES ${todayEarn.toLocaleString()}`,"Total Today","#059669"],
        ].map(([v,l,c],i) => (
          <div key={i} style={{ background:"#fff",borderRadius:12,padding:"14px 16px",border:"1px solid #EBEBEB",boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:10,color:"#BBB",fontWeight:700,letterSpacing:"0.08em",marginBottom:8 }}>{l.toUpperCase()}</div>
            <div style={{ fontSize:22,fontWeight:900,letterSpacing:"-0.04em",color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* ── Tab switcher ── */}
      <div style={{ display:"flex",gap:2,background:"#F5F5F5",borderRadius:10,padding:3,width:"fit-content" }}>
        {[["manual",`Manual (${MANUAL_COUNT})`],["bot",`Bot Auto-Watch (${BOT_COUNT})`]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{ padding:"7px 18px",borderRadius:8,border:"none",background:activeTab===id?"#fff":"transparent",color:activeTab===id?"#111":"#888",fontWeight:activeTab===id?800:500,fontSize:13,cursor:"pointer",fontFamily:"Geist,sans-serif",boxShadow:activeTab===id?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all .15s" }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ══ MANUAL TAB ══ */}
      {activeTab === "manual" && (
        <div style={{ background:"#fff",borderRadius:14,padding:"22px 24px",border:"1px solid #EBEBEB",boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          {/* Header */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
            <div>
              <h3 style={{ fontWeight:800,fontSize:16,letterSpacing:"-0.03em" }}>Your 2 Daily Videos</h3>
              <p style={{ fontSize:13,color:"#BBB",marginTop:4 }}>
                Watch full 30 seconds to earn <strong style={{color:"#111"}}>KES {V_PRICE}</strong> each.
                Video 2 unlocks after Video 1 is complete.
              </p>
            </div>
            {watched === MANUAL_COUNT && (
              <div style={{ padding:"7px 16px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:50,fontSize:12,fontWeight:800,color:"#059669",display:"flex",alignItems:"center",gap:6 }}>
                <I n="check" s={12} c="#059669"/> All done · KES {(MANUAL_COUNT*V_PRICE).toLocaleString()} earned!
              </div>
            )}
          </div>

          {/* Unlock chain indicator */}
          <div style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#F7F7F7",border:"1px solid #EBEBEB",borderRadius:10,marginBottom:20,fontSize:12,color:"#888" }}>
            {[1,2].map((n,i) => (
              <React.Fragment key={n}>
                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                  <div style={{ width:22,height:22,borderRadius:"50%",background:watched>=n?"#059669":watched===n-1&&timerRunning?"#F59E0B":"#E8E8E8",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .3s" }}>
                    {watched>=n ? <I n="check" s={11} c="#fff"/> : <span style={{fontSize:10,fontWeight:800,color:watched===n-1&&timerRunning?"#fff":"#AAA"}}>{n}</span>}
                  </div>
                  <span style={{ fontWeight:600,color:watched>=n?"#059669":watched===n-1?"#111":"#AAA" }}>Video {n}{watched>=n?" ✓":""}</span>
                </div>
                {i===0 && <div style={{ flex:1,height:1,background:watched>=1?"#059669":"#E8E8E8",transition:"background .5s" }}/>}
              </React.Fragment>
            ))}
          </div>

          {/* Video cards */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
            {YT_VIDEOS.slice(0, MANUAL_COUNT).map((vid, i) => {
              const isDone   = watched > i;
              const isActive = playing === i && timerRunning;
              const isLocked = i === 1 && watched < 1 && !timerRunning;
              const isReady  = !isDone && !isActive && !isLocked;
              const pct      = isActive ? ((30 - timer) / 30) * 100 : isDone ? 100 : 0;

              return (
                <div key={i} style={{ borderRadius:16,border:`1.5px solid ${isDone?t.acc:isActive?"#111":isLocked?"#E0E0E0":"#E8E8E8"}`,overflow:"hidden",background:"#fff",transition:"all .25s" }}>

                  {/* Thumbnail */}
                  <div style={{ position:"relative",paddingTop:"56.25%",background:"#0D1117",overflow:"hidden",cursor:isReady?"pointer":"default" }}
                    onClick={()=>isReady&&startWatch(i)}>
                    {!imgErrors[vid.id] ? (
                      <img src={vid.thumb} alt={vid.title} onError={()=>setImgErrors(e=>({...e,[vid.id]:true}))}
                        style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:isDone?.45:isLocked?.25:1 }}/>
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
                          <div style={{ fontSize:11,color:"rgba(255,255,255,0.85)",fontWeight:700,letterSpacing:"0.06em" }}>WATCHING…</div>
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
                      VIDEO {i+1}{i===1&&!isDone&&watched<1?" 🔒":""}
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
                        {isDone && <div style={{ padding:"6px 12px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:8,fontSize:12,fontWeight:900,color:"#059669" }}>+KES {V_PRICE} ✓</div>}
                        {isActive && (
                          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:700,color:t.acc }}>
                              <div style={{ width:6,height:6,borderRadius:"50%",background:t.acc,animation:"pulse 1s infinite" }}/> Earning…
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

      {/* ══ BOT TAB ══ */}
      {activeTab === "bot" && (
        <div style={{ background:"#fff",borderRadius:14,padding:"22px 24px",border:"1px solid #EBEBEB",boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
            <div>
              <h3 style={{ fontWeight:800,fontSize:16,letterSpacing:"-0.03em" }}>Bot Auto-Watch — 14 Videos</h3>
              <p style={{ fontSize:13,color:"#BBB",marginTop:4 }}>Running silently · 30 sec each · KES {Math.round(V_PRICE*0.4)} per bot video</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:14,fontWeight:900,color:"#059669" }}>KES {(botDone*Math.round(V_PRICE*0.4)).toLocaleString()} earned</div>
              <div style={{ fontSize:11,color:"#BBB",marginTop:2 }}>{botDone}/{BOT_COUNT} complete · {Math.round(botPct)}%</div>
            </div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:24 }}>
            <div style={{ flex:1,height:7,background:"#F0F0F0",borderRadius:99,overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${botPct}%`,background:"#059669",borderRadius:99,transition:"width .2s" }}/>
            </div>
            <span style={{ fontSize:12,fontWeight:800,color:"#059669",minWidth:40 }}>{Math.round(botPct)}%</span>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:12 }}>
            {YT_VIDEOS.slice(MANUAL_COUNT).map((vid, i) => {
              const done = i < botDone;
              const isActive = i === botDone;
              return (
                <div key={i} style={{ borderRadius:12,border:`1px solid ${done?"#A7F3D0":isActive?"#FCD34D":"#F0F0F0"}`,overflow:"hidden",background:done?"#F0FDF4":isActive?"#FFFBEB":"#FAFAFA",transition:"all .3s" }}>
                  <div style={{ position:"relative",paddingTop:"52%",background:"#0D1117",overflow:"hidden" }}>
                    {!imgErrors[`bot-${vid.id}`] ? (
                      <img src={vid.thumb} alt={vid.title} onError={()=>setImgErrors(e=>({...e,[`bot-${vid.id}`]:true}))}
                        style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:done?.5:isActive?.88:.35 }}/>
                    ) : (
                      <div style={{ position:"absolute",inset:0,background:"#111",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <I n="play" s={24} c="rgba(255,255,255,0.1)"/>
                      </div>
                    )}
                    <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {done?<div style={{ width:28,height:28,borderRadius:"50%",background:"#059669",display:"flex",alignItems:"center",justifyContent:"center" }}><I n="check" s={13} c="#fff"/></div>
                      :isActive?<div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}><div style={{ width:9,height:9,borderRadius:"50%",background:"#FCD34D",animation:"pulse 0.8s infinite" }}/><div style={{ fontSize:8,color:"#FCD34D",fontWeight:800,letterSpacing:"0.1em" }}>BOT LIVE</div></div>
                      :<I n="lock" s={15} c="rgba(255,255,255,0.25)"/>}
                    </div>
                    <div style={{ position:"absolute",bottom:5,right:5,padding:"1px 5px",background:"rgba(0,0,0,0.8)",borderRadius:3,fontSize:9,color:"#fff",fontWeight:700 }}>{vid.dur}</div>
                    <div style={{ position:"absolute",top:5,left:5,padding:"2px 6px",background:done?"#059669":isActive?"#F59E0B":"rgba(0,0,0,0.55)",borderRadius:4,fontSize:8,fontWeight:800,color:"#fff" }}>
                      {done?"BOT ✓":isActive?"LIVE":"BOT"}
                    </div>
                  </div>
                  <div style={{ padding:"9px 11px" }}>
                    <div style={{ fontSize:11,fontWeight:700,color:"#111",lineHeight:1.3,marginBottom:4,display:"-webkit-box",WebkitLineClamp:1,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{vid.title}</div>
                    <div style={{ display:"flex",justifyContent:"space-between" }}>
                      <span style={{ fontSize:10,color:"#AAA" }}>{vid.channel}</span>
                      {done?<span style={{ fontSize:10,fontWeight:800,color:"#059669" }}>+KES {Math.round(V_PRICE*0.4)}</span>
                      :isActive?<span style={{ fontSize:10,fontWeight:800,color:"#F59E0B" }}>Watching…</span>
                      :<span style={{ fontSize:10,color:"#CCC" }}>Queued</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:18,padding:"12px 16px",background:"#F7FDF9",borderRadius:10,border:"1px solid #A7F3D0",fontSize:12,color:"#065F46",display:"flex",alignItems:"center",gap:8 }}>
            <I n="shield" s={14} c="#059669"/>
            Bot runs automatically every day — no action needed. Earnings credited once each video completes.
          </div>
        </div>
      )}
    </div>
  );
}

/* ── REFERRALS CONTENT ── */
function ReferralsContent({ t, earn }) {
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState("all");
  const code = `edisonpay-${t.tag.toLowerCase()}-AX7K`;
  const copy = () => { try { navigator.clipboard?.writeText(`https://edisonpay.co.ke/ref/${code}`); } catch(e){} setCopied(true); setTimeout(() => setCopied(false), 2e3); };

  const ALL_REFS = [
    { name:"John Mwangi",    email:"j.mwangi@gmail.com",  tier:"Standard",     date:"Mar 8, 2025",  bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 3.2) },
    { name:"Amina Kariuki",  email:"amina.k@yahoo.com",   tier:"Regular",      date:"Mar 5, 2025",  bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 1.8) },
    { name:"Peter Otieno",   email:"p.otieno@gmail.com",  tier:"Deluxe",       date:"Mar 1, 2025",  bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 5.1) },
    { name:"Grace Wanjiku",  email:"grace.w@hotmail.com", tier:"Standard",     date:"Feb 22, 2025", bonus:t.deposit*.1,  status:"Pending", earnings: 0 },
    { name:"Samuel Njoroge", email:"sam.n@gmail.com",     tier:"Executive",    date:"Feb 18, 2025", bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 2.4) },
    { name:"Faith Achieng",  email:"faith.a@gmail.com",   tier:"Regular",      date:"Feb 10, 2025", bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 0.9) },
    { name:"Kevin Odhiambo", email:"kevin.o@gmail.com",   tier:"Standard",     date:"Jan 30, 2025", bonus:t.deposit*.1,  status:"Inactive",earnings: 0 },
    { name:"Beatrice Njoki",  email:"b.njoki@yahoo.com",  tier:"Deluxe",       date:"Jan 25, 2025", bonus:t.deposit*.1,  status:"Active",  earnings: Math.round(t.deposit*.1 * 4.7) },
  ];

  const filtered = filter === "all" ? ALL_REFS : ALL_REFS.filter(r => r.status.toLowerCase() === filter);
  const totalBonus = ALL_REFS.filter(r=>r.status==="Active").length * t.deposit * .1;
  const activeCount = ALL_REFS.filter(r=>r.status==="Active").length;
  const pendingCount = ALL_REFS.filter(r=>r.status==="Pending").length;

  const statusColor = s => s==="Active" ? {bg:"#ECFDF5",col:"#059669"} : s==="Pending" ? {bg:"#FEF3C7",col:"#D97706"} : {bg:"#F5F5F5",col:"#888"};
  const tierColor = tn => TIERS.find(tr=>tr.name===tn)?.acc || "#888";

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:18 }}>

      {/* Stats */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12 }}>
        {[
          [ALL_REFS.length,"Total Referred","#111"],
          [activeCount,"Active","#059669"],
          [pendingCount,"Pending","#D97706"],
          ["10%","Your Bonus",t.acc],
          [`KES ${totalBonus.toLocaleString()}`,"Total Earned","#059669"],
        ].map(([v,l,c],i) => (
          <div key={i} style={{ background:"#fff",borderRadius:12,padding:"14px 16px",border:"1px solid #EBEBEB",boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:10,color:"#BBB",fontWeight:700,letterSpacing:"0.08em",marginBottom:8 }}>{l.toUpperCase()}</div>
            <div style={{ fontSize:20,fontWeight:900,letterSpacing:"-0.04em",color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Referral link card */}
      <div style={{ background:"#fff",borderRadius:14,padding:"22px 24px",border:"1px solid #EBEBEB",boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:24 }}>
          <div>
            <h3 style={{ fontWeight:800,fontSize:15,letterSpacing:"-0.02em",marginBottom:6 }}>Your Referral Link</h3>
            <p style={{ fontSize:12,color:"#888",marginBottom:14,lineHeight:1.6 }}>Share this link — when they deposit their tier balance, you earn <strong style={{ color:t.acc }}>10% of their deposit</strong> and they get a bonus too.</p>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
              <div style={{ flex:1,display:"flex",alignItems:"center",gap:9,padding:"10px 14px",background:"#FAFAFA",border:`1.5px dashed ${t.mid}`,borderRadius:9,minWidth:180 }}>
                <I n="link" s={13} c={t.acc}/>
                <span style={{ flex:1,fontSize:12,fontWeight:700,color:"#111",letterSpacing:"0.01em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>edisonpay.co.ke/ref/{code}</span>
              </div>
              <button onClick={copy} style={{ padding:"10px 18px",background:copied?"#059669":"#111",color:"#fff",border:"none",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"background .2s",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap" }}>
                <I n={copied?"check":"copy"} s={12} c="#fff"/>{copied?"Copied!":"Copy Link"}
              </button>
            </div>
            <div style={{ display:"flex",gap:7,marginTop:10,flexWrap:"wrap" }}>
              {[["WhatsApp","#25D366"],["Telegram","#2AABEE"],["Facebook","#1877F2"],["Twitter","#111"]].map(([b,c])=>(
                <button key={b} style={{ padding:"6px 13px",background:"#FAFAFA",border:"1px solid #EBEBEB",borderRadius:8,fontSize:11,color:"#555",cursor:"pointer",fontWeight:700,fontFamily:"Geist,sans-serif",display:"flex",alignItems:"center",gap:5 }}>
                  <div style={{ width:7,height:7,borderRadius:"50%",background:c }}/>{b}
                </button>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div style={{ background:"#FAFAFA",borderRadius:12,padding:"16px 18px",border:"1px solid #F0F0F0" }}>
            <div style={{ fontSize:11,fontWeight:700,color:"#BBB",letterSpacing:"0.08em",marginBottom:14 }}>HOW REFERRALS WORK</div>
            {[
              ["1","Friend clicks your link and signs up",t.acc],
              ["2","They choose a tier and deposit",t.acc],
              ["3","You instantly earn 10% of their deposit",t.acc],
              ["4","They earn 10% bonus on their first deposit",t.acc],
              ["5","You get 2% from anyone who referred you",t.acc],
            ].map(([n,step,c],i) => (
              <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:10,marginBottom:10 }}>
                <div style={{ width:20,height:20,borderRadius:6,background:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:"#fff",flexShrink:0,marginTop:1 }}>{n}</div>
                <span style={{ fontSize:12,color:"#555",lineHeight:1.5 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referral table */}
      <div style={{ background:"#fff",borderRadius:14,padding:"22px 24px",border:"1px solid #EBEBEB",boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10 }}>
          <div>
            <h3 style={{ fontWeight:800,fontSize:15,letterSpacing:"-0.02em" }}>Referral Records</h3>
            <p style={{ fontSize:12,color:"#BBB",marginTop:3 }}>{ALL_REFS.length} people referred · {activeCount} active</p>
          </div>
          {/* Filter pills */}
          <div style={{ display:"flex",gap:4,background:"#F5F5F5",borderRadius:8,padding:3 }}>
            {[["all","All"],["active","Active"],["pending","Pending"],["inactive","Inactive"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setFilter(id)} style={{ padding:"5px 12px",borderRadius:6,border:"none",background:filter===id?"#fff":"transparent",color:filter===id?"#111":"#888",fontWeight:filter===id?700:500,fontSize:11,cursor:"pointer",fontFamily:"Geist,sans-serif",boxShadow:filter===id?"0 1px 3px rgba(0,0,0,0.08)":"none",transition:"all .12s" }}>{lbl}</button>
            ))}
          </div>
        </div>

        {/* Table header */}
        <div style={{ display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 1fr 1fr 1fr",gap:8,padding:"8px 12px",marginBottom:4 }}>
          {["PERSON","TIER","JOINED","YOUR BONUS","THEIR EARNINGS","STATUS"].map(h => (
            <span key={h} style={{ fontSize:9,color:"#BBB",fontWeight:800,letterSpacing:"0.1em" }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {filtered.map((r, i) => {
          const sc = statusColor(r.status);
          const tc = tierColor(r.tier);
          return (
            <div key={i} style={{ display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 1fr 1fr 1fr",gap:8,padding:"12px",borderRadius:10,background:i%2===0?"#FAFAFA":"#fff",alignItems:"center",marginBottom:2,transition:"background .15s" }}
              onMouseEnter={e=>e.currentTarget.style.background="#F0F4FF"} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#FAFAFA":"#fff"}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ width:34,height:34,borderRadius:"50%",background:t.lgt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:t.acc,flexShrink:0 }}>{r.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                <div>
                  <div style={{ fontSize:13,fontWeight:700,color:"#111" }}>{r.name}</div>
                  <div style={{ fontSize:10,color:"#BBB" }}>{r.email}</div>
                </div>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                <div style={{ width:7,height:7,borderRadius:2,background:tc }}/>
                <span style={{ fontSize:12,fontWeight:600,color:"#555" }}>{r.tier}</span>
              </div>
              <span style={{ fontSize:11,color:"#888" }}>{r.date.split(",")[0]}</span>
              <span style={{ fontSize:13,fontWeight:800,color:"#059669" }}>+KES {r.bonus.toLocaleString()}</span>
              <span style={{ fontSize:12,fontWeight:700,color: r.earnings > 0 ? "#111" : "#CCC" }}>{r.earnings > 0 ? `KES ${r.earnings.toLocaleString()}` : "—"}</span>
              <span style={{ fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:50,background:sc.bg,color:sc.col,display:"inline-block",width:"fit-content" }}>{r.status}</span>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ padding:"32px",textAlign:"center",color:"#BBB",fontSize:14 }}>No {filter} referrals yet.</div>
        )}

        {/* Totals footer */}
        <div style={{ marginTop:12,padding:"12px 14px",background:"#F7F9FC",borderRadius:10,border:"1px solid #EBEBEB",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
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

/* ── WITHDRAW ── */
function WithdrawContent({ t, earn }) {
  const [amt,setAmt]=useState(""), [method,setMethod]=useState("M-Pesa"), [done,setDone]=useState(false);
  const today=new Date().toLocaleDateString("en-US",{weekday:"long"});
  const can=["Tuesday","Wednesday","Friday"].includes(today);
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
      <div style={{ padding:"14px 18px",borderRadius:10,border:`1px solid ${can?"#A7F3D0":"#FCA5A5"}`,background:can?"#ECFDF5":"#FFF0F0",display:"flex",alignItems:"center",gap:12 }}>
        <div style={{ width:30,height:30,borderRadius:"50%",background:can?"#059669":"#DC2626",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <I n={can?"check":"xmark"} s={14} c="#fff"/>
        </div>
        <div>
          <div style={{ fontWeight:800,fontSize:14,color:can?"#065F46":"#991B1B" }}>{can?"Withdrawals open today":"Withdrawals are closed today"}</div>
          <div style={{ fontSize:12,color:"#888",marginTop:2 }}>Available: Tue, Wed & Fri · 08:30 – 17:30</div>
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
        <div style={{ background:"#fff",borderRadius:14,padding:"22px 24px",border:"1px solid #EBEBEB",boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 style={{ fontWeight:800,fontSize:15,letterSpacing:"-0.02em",marginBottom:18 }}>Request Withdrawal</h3>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11,color:"#999",fontWeight:700,letterSpacing:"0.08em",marginBottom:5 }}>AVAILABLE EARNINGS</div>
            <div style={{ fontSize:30,fontWeight:900,letterSpacing:"-0.04em",color:"#059669" }}>KES {earn.toLocaleString()}</div>
          </div>
          <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:6 }}>Amount</label>
          <input type="number" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="Enter amount…" style={{ width:"100%",padding:"11px 14px",background:"#FAFAFA",border:"1.5px solid #EBEBEB",borderRadius:9,fontSize:14,color:"#111",outline:"none",fontFamily:"Geist,sans-serif",boxSizing:"border-box",marginBottom:14 }}/>
          <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:8 }}>Method</label>
          <div style={{ display:"flex",gap:7,marginBottom:18,flexWrap:"wrap" }}>
            {["M-Pesa","Airtel","Bank","Crypto"].map(m=>(
              <button key={m} onClick={()=>setMethod(m)} style={{ padding:"7px 14px",borderRadius:8,border:`1.5px solid ${method===m?"#111":"#EBEBEB"}`,background:method===m?"#111":"#fff",color:method===m?"#fff":"#888",fontWeight:method===m?700:500,cursor:"pointer",fontSize:12,fontFamily:"Geist,sans-serif",transition:"all .15s" }}>{m}</button>
            ))}
          </div>
          <button onClick={()=>{if(can&&amt){setDone(true);setTimeout(()=>setDone(false),3e3);}}} style={{ width:"100%",padding:"13px",background:can?"#111":"#EBEBEB",color:can?"#fff":"#BBB",border:"none",borderRadius:9,fontWeight:800,fontSize:14,cursor:can?"pointer":"not-allowed",fontFamily:"Geist,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background .15s" }}>
            <I n={done?"check":"wallet"} s={14} c={can?"#fff":"#BBB"}/>{done?"Submitted!":"Submit Withdrawal"}
          </button>
        </div>
        <div style={{ background:"#fff",borderRadius:14,padding:"22px 24px",border:"1px solid #EBEBEB",boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 style={{ fontWeight:800,fontSize:15,letterSpacing:"-0.02em",marginBottom:16 }}>History</h3>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8 }}>
            {["Date","Amount","Status"].map(h=><span key={h} style={{ fontSize:10,color:"#BBB",fontWeight:700,letterSpacing:"0.08em" }}>{h.toUpperCase()}</span>)}
          </div>
          {[{d:"Mar 7",a:1200,s:"Paid"},{d:"Feb 28",a:3400,s:"Paid"},{d:"Feb 21",a:800,s:"Paid"},{d:"Feb 14",a:2100,s:"Pending"},{d:"Feb 7",a:950,s:"Paid"}].map((w,i)=>(
            <div key={i} style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,padding:"10px 0",borderTop:"1px solid #F5F5F5",alignItems:"center" }}>
              <span style={{ fontSize:12,color:"#999" }}>{w.d}</span>
              <span style={{ fontSize:13,fontWeight:800,letterSpacing:"-0.02em" }}>KES {w.a.toLocaleString()}</span>
              <span style={{ fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:50,background:w.s==="Paid"?"#ECFDF5":"#FEF3C7",color:w.s==="Paid"?"#059669":"#D97706",display:"inline-block",width:"fit-content" }}>{w.s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADMIN DASHBOARD — FULL
═══════════════════════════════════════════════════════════ */

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
  { id:"T009", user:"Emma Wanjiku",    type:"Earning",     amount:3500,   method:"Bot Videos",  date:"Mar 1, 2025",  status:"Paid" },
  { id:"T010", user:"Grace Achieng",   type:"Deposit",     amount:20000,  method:"Visa",        date:"Feb 28, 2025", status:"Paid" },
  { id:"T011", user:"James Kimani",    type:"Deposit",     amount:10000,  method:"M-Pesa",      date:"Feb 27, 2025", status:"Pending" },
  { id:"T012", user:"Alice Mwangi",    type:"Earning",     amount:2400,   method:"Videos",      date:"Feb 26, 2025", status:"Paid" },
];

function AdminDash({ go }) {
  const [sideOpen, setSideOpen] = useState(true);
  const [tab, setTab] = useState("overview");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 769);
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [wdFilter, setWdFilter] = useState("all");
  const [withdrawals, setWithdrawals] = useState(ADMIN_WITHDRAWALS);
  const [txFilter, setTxFilter] = useState("all");
  const [wdDays, setWdDays] = useState({ tue:true, wed:false, fri:true });
  const [videoPrice, setVideoPrice] = useState(50);
  const [maintenance, setMaintenance] = useState(false);
  const [payoutMode, setPayoutMode] = useState("manual");
  const [notifOpen, setNotifOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fn = () => { const m = window.innerWidth<769; setIsMobile(m); if(m) setSideOpen(false); };
    window.addEventListener("resize", fn); fn();
    return () => window.removeEventListener("resize", fn);
  }, []);

  const adminNav = [
    {id:"overview",     label:"Overview",     ic:"grid",     badge:null},
    {id:"users",        label:"Users",        ic:"users",    badge:"1,247"},
    {id:"transactions", label:"Transactions", ic:"wallet",   badge:null},
    {id:"withdrawals",  label:"Withdrawals",  ic:"up",       badge:withdrawals.filter(w=>w.status==="Pending").length},
    {id:"settings",     label:"Settings",     ic:"settings", badge:null},
  ];

  const tiers = [{n:"Regular",c:"#0066FF",count:423,pct:34},{n:"Standard",c:"#E8820C",count:287,pct:23},{n:"Deluxe",c:"#059669",count:312,pct:25},{n:"Executive",c:"#7C3AED",count:156,pct:12.5},{n:"Exec Pro",c:"#DC2626",count:69,pct:5.5}];

  const approveWd = (id) => setWithdrawals(ws => ws.map(w => w.id===id ? {...w,status:"Approved"} : w));
  const rejectWd  = (id) => setWithdrawals(ws => ws.map(w => w.id===id ? {...w,status:"Rejected"} : w));
  const payWd     = (id) => setWithdrawals(ws => ws.map(w => w.id===id ? {...w,status:"Paid"} : w));

  const filteredUsers = ADMIN_USERS.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchFilter = userFilter==="all" || u.status.toLowerCase()===userFilter;
    return matchSearch && matchFilter;
  });

  const filteredWd = wdFilter==="all" ? withdrawals : withdrawals.filter(w=>w.status.toLowerCase()===wdFilter);
  const filteredTx = txFilter==="all" ? ADMIN_TXS : ADMIN_TXS.filter(t=>t.type.toLowerCase()===txFilter||t.status.toLowerCase()===txFilter);

  const S = (label, txt) => ({ fontSize:11, color:"#475569", fontWeight:600, label, txt });

  const statusBadge = (s) => {
    const map = { Active:["#059669","#ECFDF5"], Paid:["#059669","#ECFDF5"], Approved:["#0066FF","#EFF6FF"], Pending:["#E8820C","#FEF3E2"], Suspended:["#DC2626","#FFF0F0"], Rejected:["#DC2626","#FFF0F0"], Earning:["#7C3AED","#F5F0FF"], Deposit:["#059669","#ECFDF5"], Withdrawal:["#E8820C","#FEF3E2"] };
    const [c,bg] = map[s]||["#888","#F5F5F5"];
    return <span style={{ fontSize:9,fontWeight:800,padding:"3px 8px",borderRadius:50,background:bg,color:c,display:"inline-block",whiteSpace:"nowrap",letterSpacing:"0.05em" }}>{s}</span>;
  };

  const tierDot = (name) => {
    const tc = TIERS.find(t=>name.includes(t.name.split(" ")[0]))?.acc||"#888";
    return <span style={{ fontSize:10,fontWeight:800,color:tc,padding:"2px 7px",background:`${tc}18`,borderRadius:50,border:`1px solid ${tc}33`,display:"inline-block",whiteSpace:"nowrap" }}>{name}</span>;
  };

  const CARD = {background:"#0D1117",borderRadius:14,padding:"20px 22px",border:"1px solid #1A2234"};

  return (
    <div style={{ display:"flex", height:"calc(100vh - 44px)", background:"#080A0F", fontFamily:"Geist,sans-serif", color:"#F1F5F9" }}>

      {/* Mobile overlay */}
      {isMobile && sideOpen && (
        <div onClick={()=>setSideOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:199,backdropFilter:"blur(2px)" }}/>
      )}

      {/* ── SIDEBAR ── */}
      <aside style={{ width:sideOpen?230:0, minWidth:sideOpen?230:0, background:"#060810", borderRight:"1px solid #131A26", transition:"all .28s cubic-bezier(.4,0,.2,1)", overflow:"hidden", display:"flex", flexDirection:"column", position:isMobile?"fixed":"relative", height:"calc(100vh - 44px)", zIndex:200, boxShadow:isMobile&&sideOpen?"6px 0 32px rgba(0,0,0,0.5)":"none" }}>

        {/* Logo */}
        <div style={{ padding:"20px 18px 16px", borderBottom:"1px solid #131A26", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34,height:34,borderRadius:10,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <I n="bolt" s={15} c="#111"/>
          </div>
          <div>
            <div style={{ fontWeight:900,fontSize:15,color:"#F1F5F9",letterSpacing:"-0.03em" }}>EdisonPay</div>
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
              style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:9,cursor:"pointer",marginBottom:2,background:tab===id?"#111B2E":"transparent",borderLeft:tab===id?"2.5px solid #0066FF":"2.5px solid transparent",transition:"all .12s" }}>
              <I n={ic} s={15} c={tab===id?"#4A9EFF":"#334155"}/>
              <span style={{ fontSize:13,fontWeight:tab===id?700:400,color:tab===id?"#F1F5F9":"#475569",flex:1 }}>{label}</span>
              {badge && <span style={{ fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:50,background:tab===id?"#0066FF22":"#1A2234",color:tab===id?"#4A9EFF":"#475569" }}>{badge}</span>}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding:"12px 14px 18px", borderTop:"1px solid #131A26" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:9,background:"#0D1117",border:"1px solid #1A2234",marginBottom:6 }}>
            <div style={{ width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#DC2626,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <I n="user" s={13} c="#fff"/>
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:12,fontWeight:700,color:"#F1F5F9" }}>Admin</div>
              <div style={{ fontSize:10,color:"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>admin@edisonpay.co.ke</div>
            </div>
          </div>
          <div onClick={()=>go("landing")} style={{ display:"flex",alignItems:"center",gap:9,padding:"9px 12px",fontSize:13,color:"#475569",cursor:"pointer",borderRadius:9,transition:"background .12s" }}
            onMouseEnter={e=>e.currentTarget.style.background="#0D1117"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <I n="logout" s={14} c="#475569"/> Exit Admin
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>

        {/* Topbar */}
        <header style={{ height:58,background:"#0A0C10",borderBottom:"1px solid #131A26",display:"flex",alignItems:"center",padding:"0 20px",gap:10,flexShrink:0 }}>
          <button onClick={()=>setSideOpen(o=>!o)} style={{ width:34,height:34,borderRadius:8,border:"1px solid #1E293B",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <I n="menu" s={15} c="#475569"/>
          </button>
          <div style={{ display:"flex",alignItems:"center",gap:7,padding:"6px 13px",background:"#0D1117",border:"1px solid #1E293B",borderRadius:9,flex:1,maxWidth:280 }}>
            <I n="search" s={13} c="#334155"/>
            <input placeholder="Search users, transactions…" style={{ border:"none",background:"transparent",outline:"none",fontSize:12,color:"#F1F5F9",width:"100%",fontFamily:"Geist,sans-serif" }}/>
            <span style={{ fontSize:9,color:"#334155",border:"1px solid #1E293B",borderRadius:4,padding:"1px 5px",flexShrink:0 }}>⌘K</span>
          </div>
          <div style={{ flex:1 }}/>
          <div style={{ display:"flex",alignItems:"center",gap:7,padding:"6px 12px",background:"#0D1117",border:"1px solid #131A26",borderRadius:8,flexShrink:0 }}>
            <div style={{ width:6,height:6,borderRadius:"50%",background:"#059669",animation:"pulse 2s infinite" }}/>
            <span style={{ fontSize:11,color:"#64748B",fontWeight:600,whiteSpace:"nowrap" }}>Platform Live</span>
          </div>
          <button onClick={()=>setNotifOpen(o=>!o)} style={{ width:34,height:34,borderRadius:8,border:"1px solid #1E293B",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",flexShrink:0 }}>
            <I n="bell" s={15} c="#475569"/>
            {withdrawals.filter(w=>w.status==="Pending").length>0&&<div style={{ position:"absolute",top:6,right:6,width:8,height:8,borderRadius:"50%",background:"#DC2626",border:"1.5px solid #0A0C10" }}/>}
          </button>
          {notifOpen&&(
            <div style={{ position:"absolute",top:62,right:60,width:300,background:"#0D1117",border:"1px solid #1E293B",borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",zIndex:999,padding:"14px 0",animation:"scaleIn .18s ease" }} onClick={e=>e.stopPropagation()}>
              <div style={{ padding:"0 16px 10px",borderBottom:"1px solid #131A26",fontSize:13,fontWeight:800,color:"#F1F5F9" }}>Notifications</div>
              {[{t:"New withdrawal request",s:"Alice M. — KES 2,400",c:"#E8820C"},{t:"New user registered",s:"David O. joined — Regular tier",c:"#0066FF"},{t:"Bot completed",s:"1,247 bot sessions done",c:"#059669"}].map((n,i)=>(
                <div key={i} style={{ padding:"10px 16px",display:"flex",gap:10 }}>
                  <div style={{ width:28,height:28,borderRadius:8,background:`${n.c}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <I n="bell" s={12} c={n.c}/>
                  </div>
                  <div><div style={{ fontSize:12,fontWeight:700,color:"#F1F5F9" }}>{n.t}</div><div style={{ fontSize:11,color:"#475569",marginTop:2 }}>{n.s}</div></div>
                </div>
              ))}
            </div>
          )}
          <div style={{ width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#DC2626,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <I n="user" s={14} c="#fff"/>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <div style={{ flex:1,overflowY:"auto",padding:"22px" }} onClick={()=>setNotifOpen(false)}>

          {/* Page title */}
          <div style={{ marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
            <div>
              <h2 style={{ fontSize:22,fontWeight:900,letterSpacing:"-0.04em",color:"#F1F5F9" }}>
                {adminNav.find(n=>n.id===tab)?.label}
              </h2>
              <p style={{ fontSize:12,color:"#475569",marginTop:3 }}>{new Date().toDateString()} · EdisonPay Admin</p>
            </div>
            {tab==="users"&&(
              <button style={{ padding:"8px 18px",background:"#0066FF",color:"#fff",border:"none",borderRadius:9,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Geist,sans-serif",display:"flex",alignItems:"center",gap:6 }}>
                <I n="user" s={12} c="#fff"/> Add User
              </button>
            )}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {tab==="overview" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {/* Stat cards */}
              <div className="ep-admin-stats" style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
                {[
                  [1247,"Total Users","users","#0066FF","+12% this month",true],
                  [342,"Active Today","activity","#059669","+24 today",true],
                  ["KES 8.9M","Total Paid Out","wallet","#E8820C","Since launch",true],
                  [withdrawals.filter(w=>w.status==="Pending").length,"Pending Withdrawals","up","#DC2626","Needs attention",false],
                ].map(([v,l,ic,c,sub,_],i)=>(
                  <div key={i} className="ep-hover-lift" style={{ ...CARD, position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute",top:0,right:0,width:60,height:60,borderRadius:"0 14px 0 100%",background:`${c}10`,pointerEvents:"none" }}/>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
                      <div style={{ width:34,height:34,borderRadius:9,background:`${c}18`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <I n={ic} s={15} c={c}/>
                      </div>
                    </div>
                    <div style={{ fontSize:26,fontWeight:900,letterSpacing:"-0.04em",color:"#F1F5F9",marginBottom:4 }}>{typeof v==="number"?v.toLocaleString():v}</div>
                    <div style={{ fontSize:11,color:"#64748B",fontWeight:600,marginBottom:6 }}>{l}</div>
                    <div style={{ fontSize:11,color:c,fontWeight:700 }}>{sub}</div>
                    <div style={{ height:2,background:"#131A26",borderRadius:99,marginTop:14 }}>
                      <div style={{ height:"100%",width:`${40+i*15}%`,background:c,borderRadius:99 }}/>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ep-admin-grid2" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
                {/* Recent users */}
                <div style={CARD}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                    <h3 style={{ fontSize:14,fontWeight:800,color:"#F1F5F9" }}>Recent Users</h3>
                    <span onClick={()=>setTab("users")} style={{ fontSize:11,color:"#4A9EFF",cursor:"pointer",fontWeight:700 }}>View All</span>
                  </div>
                  {ADMIN_USERS.slice(0,5).map((u,i)=>(
                    <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderTop:i>0?"1px solid #131A26":"none" }}>
                      <div style={{ width:30,height:30,borderRadius:"50%",background:`${TIERS.find(t=>u.tier.includes(t.name.split(" ")[0]))?.acc||"#888"}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:TIERS.find(t=>u.tier.includes(t.name.split(" ")[0]))?.acc||"#888",flexShrink:0 }}>{u.name[0]}</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:12,fontWeight:700,color:"#F1F5F9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.name}</div>
                        <div style={{ fontSize:10,color:"#475569" }}>{u.tier}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:11,color:"#64748B" }}>KES {(u.deposit/1000).toFixed(0)}K</div>
                        {statusBadge(u.status)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tier distribution */}
                <div style={CARD}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
                    <h3 style={{ fontSize:14,fontWeight:800,color:"#F1F5F9" }}>Tier Distribution</h3>
                    <span style={{ fontSize:13,fontWeight:900,color:"#F1F5F9" }}>1,247 users</span>
                  </div>
                  {tiers.map((tr,i)=>(
                    <div key={i} style={{ marginBottom:12 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                          <div style={{ width:7,height:7,borderRadius:2,background:tr.c }}/>
                          <span style={{ color:"#64748B",fontWeight:600 }}>{tr.n}</span>
                        </div>
                        <div style={{ display:"flex",gap:10 }}>
                          <span style={{ fontWeight:800,color:"#F1F5F9" }}>{tr.count}</span>
                          <span style={{ color:"#334155" }}>{tr.pct}%</span>
                        </div>
                      </div>
                      <div style={{ height:6,background:"#0A0C10",borderRadius:99,overflow:"hidden" }}>
                        <div style={{ height:"100%",width:`${tr.pct*2.5}%`,background:tr.c,borderRadius:99,transition:"width 1s ease" }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending withdrawals preview */}
              <div style={CARD}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                  <h3 style={{ fontSize:14,fontWeight:800,color:"#F1F5F9" }}>Pending Withdrawals</h3>
                  <span onClick={()=>setTab("withdrawals")} style={{ fontSize:11,color:"#4A9EFF",cursor:"pointer",fontWeight:700 }}>Manage All</span>
                </div>
                {withdrawals.filter(w=>w.status==="Pending").length===0?(
                  <div style={{ padding:"20px",textAlign:"center",color:"#334155",fontSize:13 }}>No pending withdrawals ✓</div>
                ):withdrawals.filter(w=>w.status==="Pending").slice(0,3).map((w,i)=>(
                  <div key={w.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderTop:i>0?"1px solid #131A26":"none" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13,fontWeight:700,color:"#F1F5F9" }}>{w.user}</div>
                      <div style={{ fontSize:11,color:"#475569" }}>{w.method} · {w.date}</div>
                    </div>
                    <div style={{ fontSize:14,fontWeight:900,color:"#F1F5F9" }}>KES {w.amount.toLocaleString()}</div>
                    <div style={{ display:"flex",gap:6 }}>
                      <button onClick={()=>approveWd(w.id)} style={{ padding:"5px 12px",background:"#05966918",color:"#059669",border:"1px solid #059669",borderRadius:7,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif" }}>Approve</button>
                      <button onClick={()=>rejectWd(w.id)} style={{ padding:"5px 12px",background:"#DC262618",color:"#DC2626",border:"1px solid #DC2626",borderRadius:7,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif" }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── USERS TAB ── */}
          {tab==="users" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {/* Filters */}
              <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}>
                <div style={{ display:"flex",alignItems:"center",gap:7,padding:"8px 14px",background:"#0D1117",border:"1px solid #1E293B",borderRadius:9,flex:1,maxWidth:300 }}>
                  <I n="search" s={13} c="#334155"/>
                  <input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Search name or email…" style={{ border:"none",background:"transparent",outline:"none",fontSize:13,color:"#F1F5F9",width:"100%",fontFamily:"Geist,sans-serif" }}/>
                </div>
                <div style={{ display:"flex",gap:4,background:"#0D1117",border:"1px solid #1E293B",borderRadius:9,padding:3 }}>
                  {["all","active","pending","suspended"].map(f=>(
                    <button key={f} onClick={()=>setUserFilter(f)} style={{ padding:"6px 14px",borderRadius:7,border:"none",background:userFilter===f?"#131A26":"transparent",color:userFilter===f?"#F1F5F9":"#475569",fontSize:12,fontWeight:userFilter===f?700:400,cursor:"pointer",fontFamily:"Geist,sans-serif",textTransform:"capitalize" }}>{f}</button>
                  ))}
                </div>
                <div style={{ fontSize:12,color:"#475569" }}>{filteredUsers.length} users</div>
              </div>

              {/* Table */}
              <div style={CARD}>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid #1A2234" }}>
                        {["User","Tier","Deposit","Earnings","Status","Joined","Actions"].map(h=>(
                          <th key={h} style={{ padding:"10px 14px",fontSize:10,fontWeight:800,color:"#334155",letterSpacing:"0.1em",textAlign:"left",whiteSpace:"nowrap" }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u,i)=>{
                        const tc = TIERS.find(t=>u.tier.includes(t.name.split(" ")[0]))?.acc||"#888";
                        return (
                          <tr key={u.id} style={{ borderBottom:"1px solid #0D1117",transition:"background .1s" }}
                            onMouseEnter={e=>e.currentTarget.style.background="#0D1117"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <td style={{ padding:"12px 14px" }}>
                              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                <div style={{ width:32,height:32,borderRadius:"50%",background:`${tc}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:tc,flexShrink:0 }}>{u.name[0]}</div>
                                <div>
                                  <div style={{ fontSize:13,fontWeight:700,color:"#F1F5F9" }}>{u.name}</div>
                                  <div style={{ fontSize:11,color:"#475569" }}>{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding:"12px 14px" }}>{tierDot(u.tier)}</td>
                            <td style={{ padding:"12px 14px",fontSize:12,color:"#64748B",fontWeight:600,whiteSpace:"nowrap" }}>KES {u.deposit.toLocaleString()}</td>
                            <td style={{ padding:"12px 14px",fontSize:12,fontWeight:700,color:"#059669",whiteSpace:"nowrap" }}>KES {u.earn.toLocaleString()}</td>
                            <td style={{ padding:"12px 14px" }}>{statusBadge(u.status)}</td>
                            <td style={{ padding:"12px 14px",fontSize:11,color:"#475569",whiteSpace:"nowrap" }}>{u.joined}</td>
                            <td style={{ padding:"12px 14px" }}>
                              <div style={{ display:"flex",gap:5 }}>
                                <button onClick={()=>setSelectedUser(u)} style={{ padding:"4px 10px",background:"#0066FF18",color:"#4A9EFF",border:"1px solid #0066FF33",borderRadius:6,fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap" }}>View</button>
                                <button style={{ padding:"4px 10px",background:"#E8820C18",color:"#E8820C",border:"1px solid #E8820C33",borderRadius:6,fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap" }}>Edit</button>
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
                  <div onClick={e=>e.stopPropagation()} style={{ background:"#0D1117",border:"1px solid #1E293B",borderRadius:20,padding:"28px",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",animation:"scaleIn .2s ease" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24 }}>
                      <div style={{ display:"flex",gap:14,alignItems:"center" }}>
                        <div style={{ width:48,height:48,borderRadius:"50%",background:`${TIERS.find(t=>selectedUser.tier.includes(t.name.split(" ")[0]))?.acc||"#888"}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:TIERS.find(t=>selectedUser.tier.includes(t.name.split(" ")[0]))?.acc||"#888" }}>{selectedUser.name[0]}</div>
                        <div>
                          <div style={{ fontSize:18,fontWeight:900,color:"#F1F5F9",letterSpacing:"-0.03em" }}>{selectedUser.name}</div>
                          <div style={{ fontSize:12,color:"#475569",marginTop:3 }}>{selectedUser.email}</div>
                        </div>
                      </div>
                      <button onClick={()=>setSelectedUser(null)} style={{ width:32,height:32,borderRadius:8,border:"1px solid #1E293B",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <I n="xmark" s={14} c="#475569"/>
                      </button>
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>
                      {[["User ID",selectedUser.id],["Tier",selectedUser.tier],["Deposit",`KES ${selectedUser.deposit.toLocaleString()}`],["Earnings",`KES ${selectedUser.earn.toLocaleString()}`],["Status",selectedUser.status],["Joined",selectedUser.joined],["Phone",selectedUser.phone],["Referrals","3 active"]].map(([l,v],i)=>(
                        <div key={i} style={{ padding:"12px 14px",background:"#080A0F",borderRadius:10,border:"1px solid #131A26" }}>
                          <div style={{ fontSize:10,color:"#334155",fontWeight:700,letterSpacing:"0.08em",marginBottom:5 }}>{l.toUpperCase()}</div>
                          <div style={{ fontSize:13,fontWeight:700,color:"#F1F5F9" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex",gap:8 }}>
                      <button style={{ flex:1,padding:"10px",background:"#059669",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif" }}>Activate</button>
                      <button style={{ flex:1,padding:"10px",background:"#E8820C18",color:"#E8820C",border:"1px solid #E8820C44",borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif" }}>Suspend</button>
                      <button style={{ flex:1,padding:"10px",background:"#DC262618",color:"#DC2626",border:"1px solid #DC262644",borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif" }}>Delete</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TRANSACTIONS TAB ── */}
          {tab==="transactions" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {["all","deposit","withdrawal","earning"].map(f=>(
                  <button key={f} onClick={()=>setTxFilter(f)} style={{ padding:"6px 16px",borderRadius:50,border:`1px solid ${txFilter===f?"#0066FF":"#1E293B"}`,background:txFilter===f?"#0066FF18":"transparent",color:txFilter===f?"#4A9EFF":"#475569",fontSize:12,fontWeight:txFilter===f?700:400,cursor:"pointer",fontFamily:"Geist,sans-serif",textTransform:"capitalize" }}>{f}</button>
                ))}
                <div style={{ marginLeft:"auto",fontSize:12,color:"#475569",display:"flex",alignItems:"center" }}>{filteredTx.length} transactions</div>
              </div>
              <div style={CARD}>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid #1A2234" }}>
                        {["ID","User","Type","Amount","Method","Date","Status"].map(h=>(
                          <th key={h} style={{ padding:"10px 14px",fontSize:10,fontWeight:800,color:"#334155",letterSpacing:"0.1em",textAlign:"left",whiteSpace:"nowrap" }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTx.map((tx,i)=>(
                        <tr key={tx.id} style={{ borderBottom:"1px solid #0D1117",transition:"background .1s" }}
                          onMouseEnter={e=>e.currentTarget.style.background="#0D1117"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <td style={{ padding:"11px 14px",fontSize:11,color:"#334155",fontWeight:700 }}>{tx.id}</td>
                          <td style={{ padding:"11px 14px",fontSize:13,fontWeight:700,color:"#F1F5F9",whiteSpace:"nowrap" }}>{tx.user}</td>
                          <td style={{ padding:"11px 14px" }}>{statusBadge(tx.type)}</td>
                          <td style={{ padding:"11px 14px",fontSize:13,fontWeight:800,color:tx.type==="Withdrawal"?"#E8820C":tx.type==="Earning"?"#7C3AED":"#059669",whiteSpace:"nowrap" }}>
                            {tx.type==="Withdrawal"?"-":"+"} KES {tx.amount.toLocaleString()}
                          </td>
                          <td style={{ padding:"11px 14px",fontSize:12,color:"#64748B",whiteSpace:"nowrap" }}>{tx.method}</td>
                          <td style={{ padding:"11px 14px",fontSize:11,color:"#475569",whiteSpace:"nowrap" }}>{tx.date}</td>
                          <td style={{ padding:"11px 14px" }}>{statusBadge(tx.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── WITHDRAWALS TAB ── */}
          {tab==="withdrawals" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {/* Stat pills */}
              <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                {[["Pending",withdrawals.filter(w=>w.status==="Pending").length,"#E8820C"],["Approved",withdrawals.filter(w=>w.status==="Approved").length,"#0066FF"],["Paid",withdrawals.filter(w=>w.status==="Paid").length,"#059669"],["Rejected",withdrawals.filter(w=>w.status==="Rejected").length,"#DC2626"]].map(([l,n,c])=>(
                  <div key={l} style={{ padding:"8px 18px",background:`${c}14`,border:`1px solid ${c}33`,borderRadius:50,display:"flex",alignItems:"center",gap:8 }}>
                    <div style={{ width:7,height:7,borderRadius:"50%",background:c }}/>
                    <span style={{ fontSize:12,fontWeight:700,color:c }}>{l}</span>
                    <span style={{ fontSize:14,fontWeight:900,color:"#F1F5F9" }}>{n}</span>
                  </div>
                ))}
                <div style={{ display:"flex",gap:4,background:"#0D1117",border:"1px solid #1E293B",borderRadius:9,padding:3,marginLeft:"auto" }}>
                  {["all","pending","approved","paid","rejected"].map(f=>(
                    <button key={f} onClick={()=>setWdFilter(f)} style={{ padding:"5px 12px",borderRadius:7,border:"none",background:wdFilter===f?"#131A26":"transparent",color:wdFilter===f?"#F1F5F9":"#475569",fontSize:11,fontWeight:wdFilter===f?700:400,cursor:"pointer",fontFamily:"Geist,sans-serif",textTransform:"capitalize" }}>{f}</button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div style={CARD}>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid #1A2234" }}>
                        {["User","Tier","Amount","Method","Date","Status","Actions"].map(h=>(
                          <th key={h} style={{ padding:"10px 14px",fontSize:10,fontWeight:800,color:"#334155",letterSpacing:"0.1em",textAlign:"left",whiteSpace:"nowrap" }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWd.map((w,i)=>(
                        <tr key={w.id} style={{ borderBottom:"1px solid #0D1117",transition:"background .1s" }}
                          onMouseEnter={e=>e.currentTarget.style.background="#0D1117"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <td style={{ padding:"12px 14px" }}>
                            <div style={{ fontSize:13,fontWeight:700,color:"#F1F5F9",whiteSpace:"nowrap" }}>{w.user}</div>
                            <div style={{ fontSize:10,color:"#475569" }}>{w.phone}</div>
                          </td>
                          <td style={{ padding:"12px 14px" }}>{tierDot(w.tier)}</td>
                          <td style={{ padding:"12px 14px",fontSize:14,fontWeight:900,color:"#F1F5F9",whiteSpace:"nowrap" }}>KES {w.amount.toLocaleString()}</td>
                          <td style={{ padding:"12px 14px",fontSize:12,color:"#64748B",whiteSpace:"nowrap" }}>{w.method}</td>
                          <td style={{ padding:"12px 14px",fontSize:11,color:"#475569",whiteSpace:"nowrap" }}>{w.date}</td>
                          <td style={{ padding:"12px 14px" }}>{statusBadge(w.status)}</td>
                          <td style={{ padding:"12px 14px" }}>
                            {w.status==="Pending" && (
                              <div style={{ display:"flex",gap:5 }}>
                                <button onClick={()=>approveWd(w.id)} style={{ padding:"5px 11px",background:"#05966918",color:"#059669",border:"1px solid #059669",borderRadius:6,fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap" }}>✓ Approve</button>
                                <button onClick={()=>rejectWd(w.id)} style={{ padding:"5px 11px",background:"#DC262618",color:"#DC2626",border:"1px solid #DC2626",borderRadius:6,fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif" }}>✗ Reject</button>
                              </div>
                            )}
                            {w.status==="Approved" && (
                              <button onClick={()=>payWd(w.id)} style={{ padding:"5px 14px",background:"#0066FF",color:"#fff",border:"none",borderRadius:6,fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap" }}>Mark Paid</button>
                            )}
                            {(w.status==="Paid"||w.status==="Rejected") && (
                              <span style={{ fontSize:11,color:"#334155" }}>Completed</span>
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

          {/* ── SETTINGS TAB ── */}
          {tab==="settings" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14,maxWidth:680 }}>

              {/* Withdrawal days */}
              <div style={CARD}>
                <h3 style={{ fontSize:14,fontWeight:800,color:"#F1F5F9",marginBottom:4 }}>Withdrawal Days</h3>
                <p style={{ fontSize:12,color:"#475569",marginBottom:18 }}>Control which days users can withdraw funds.</p>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10 }}>
                  {[["tue","Tuesday"],["wed","Wednesday"],["fri","Friday"]].map(([key,label])=>(
                    <div key={key} style={{ padding:"16px",background:"#080A0F",borderRadius:10,border:`1px solid ${wdDays[key]?"#059669":"#1A2234"}` }}>
                      <div style={{ fontSize:13,fontWeight:800,color:"#F1F5F9",marginBottom:4 }}>{label}</div>
                      <div style={{ fontSize:11,color:wdDays[key]?"#059669":"#475569",fontWeight:700,marginBottom:12 }}>{wdDays[key]?"Open":"Closed"}</div>
                      <button onClick={()=>setWdDays(d=>({...d,[key]:!d[key]}))}
                        style={{ padding:"6px 14px",background:wdDays[key]?"#DC262618":"#05966918",color:wdDays[key]?"#DC2626":"#059669",border:`1px solid ${wdDays[key]?"#DC2626":"#059669"}`,borderRadius:7,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif" }}>
                        {wdDays[key]?"Close Day":"Open Day"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Video earnings */}
              <div style={CARD}>
                <h3 style={{ fontSize:14,fontWeight:800,color:"#F1F5F9",marginBottom:4 }}>Video Earnings Price</h3>
                <p style={{ fontSize:12,color:"#475569",marginBottom:18 }}>KES earned per video watched by users.</p>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ flex:1,display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"#080A0F",border:"1px solid #1A2234",borderRadius:10 }}>
                    <span style={{ fontSize:14,color:"#475569",fontWeight:700 }}>KES</span>
                    <input type="number" value={videoPrice} onChange={e=>setVideoPrice(Number(e.target.value))} style={{ background:"transparent",border:"none",outline:"none",fontSize:18,fontWeight:900,color:"#F1F5F9",width:"80px",fontFamily:"Geist,sans-serif" }}/>
                    <span style={{ fontSize:12,color:"#334155" }}>per video</span>
                  </div>
                  <button style={{ padding:"12px 22px",background:"#0066FF",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap" }}>Update Price</button>
                </div>
              </div>

              {/* Payout mode */}
              <div style={CARD}>
                <h3 style={{ fontSize:14,fontWeight:800,color:"#F1F5F9",marginBottom:4 }}>Payout Mode</h3>
                <p style={{ fontSize:12,color:"#475569",marginBottom:18 }}>How withdrawals are processed.</p>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                  {[["manual","Manual Review","Admin approves each withdrawal before payment."],["auto","Auto-Approve","All withdrawals are automatically approved and paid."]].map(([val,label,desc])=>(
                    <div key={val} onClick={()=>setPayoutMode(val)}
                      style={{ padding:"16px",background:"#080A0F",borderRadius:10,border:`1.5px solid ${payoutMode===val?"#0066FF":"#1A2234"}`,cursor:"pointer",transition:"border-color .15s" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:6 }}>
                        <div style={{ width:16,height:16,borderRadius:"50%",border:`2px solid ${payoutMode===val?"#0066FF":"#334155"}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                          {payoutMode===val&&<div style={{ width:8,height:8,borderRadius:"50%",background:"#0066FF" }}/>}
                        </div>
                        <span style={{ fontSize:13,fontWeight:800,color:"#F1F5F9" }}>{label}</span>
                      </div>
                      <div style={{ fontSize:12,color:"#475569",lineHeight:1.5 }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maintenance mode */}
              <div style={{ ...CARD,border:`1px solid ${maintenance?"#DC2626":"#1A2234"}` }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                  <div>
                    <h3 style={{ fontSize:14,fontWeight:800,color:"#F1F5F9",marginBottom:4 }}>Maintenance Mode</h3>
                    <p style={{ fontSize:12,color:"#475569",maxWidth:380 }}>When enabled, users will see a maintenance page. Only admins can access the platform.</p>
                  </div>
                  <button onClick={()=>setMaintenance(m=>!m)}
                    style={{ padding:"8px 20px",background:maintenance?"#DC262618":"#05966918",color:maintenance?"#DC2626":"#059669",border:`1px solid ${maintenance?"#DC2626":"#059669"}`,borderRadius:9,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif",whiteSpace:"nowrap",flexShrink:0,marginLeft:16 }}>
                    {maintenance?"Disable":"Enable"}
                  </button>
                </div>
                {maintenance&&<div style={{ marginTop:14,padding:"10px 14px",background:"#DC262614",borderRadius:8,border:"1px solid #DC262633",fontSize:12,color:"#DC2626",fontWeight:700,display:"flex",alignItems:"center",gap:8 }}>
                  <I n="shield" s={13} c="#DC2626"/> Platform is in maintenance mode — users cannot log in
                </div>}
              </div>

              <button onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),2500);}}
                style={{ padding:"13px",background:saved?"#059669":"#0066FF",color:"#fff",border:"none",borderRadius:11,fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"Geist,sans-serif",transition:"background .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                {saved?<><I n="check" s={14} c="#fff"/> Settings Saved!</>:<>Save Settings</>}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════ */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, msg: "" }; }
  static getDerivedStateFromError(e) { return { hasError: true, msg: e.message }; }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "Geist,sans-serif" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
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

  const go = (p) => { setPrevPage(page); setPage(p); };

  return (
    <ErrorBoundary>
      <GlobalStyles />
      <Fonts />

      {/* ── PAGE SWITCHER — sticky top bar ── */}
      <div style={{ position:"sticky",top:0,zIndex:9999,background:"#0A0A0A",display:"flex",alignItems:"center",padding:"0 12px",height:44,gap:4,borderBottom:"1px solid #1A1A1A",flexShrink:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:4,flex:1,flexWrap:"nowrap",overflowX:"auto" }}>
          {[["landing","Home","home"],["login","Login","lock"],["signup","Sign Up","user"],["dashboard","Dashboard","chart"],["admin","Admin","settings"]].map(([id,lbl,ic])=>(
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

      <div style={{ height:"calc(100vh - 44px)",overflow:"hidden" }}>
        {page==="landing"   && <div style={{ height:"100%",overflowY:"auto" }}><Landing  go={go}/></div>}
        {page==="login"     && <div style={{ height:"100%",overflowY:"auto" }}><Auth type="login"  go={go} from={prevPage==="landing"?"dashboard":prevPage}/></div>}
        {page==="signup"    && <div style={{ height:"100%",overflowY:"auto" }}><Auth type="signup" go={go} from={prevPage==="landing"?"dashboard":prevPage}/></div>}
        {page==="dashboard" && <ClientDash t={t} go={go} key={tier}/>}
        {page==="admin"     && <AdminDash go={go}/>}
      </div>
    </ErrorBoundary>
  );
}
