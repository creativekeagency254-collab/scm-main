import React, { useEffect, useRef, useState } from "react";

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

/* PAYMENT LOGOS (actual brand marks in grey) */
const PAY_LOGO_GREY = "#9CA3AF";
const PAYMENT_ICON_SOURCES = {
  "Google Pay": "https://cdn.simpleicons.org/googlepay/9CA3AF",
  "USDT": "https://cdn.simpleicons.org/tether/9CA3AF",
  "Flutterwave": "https://upload.wikimedia.org/wikipedia/commons/9/9e/Flutterwave_Logo.png",
  "Binance Pay": "https://cdn.simpleicons.org/binance/9CA3AF",
  "M-Pesa": "https://upload.wikimedia.org/wikipedia/commons/0/0b/M-PESA.png",
  "Visa": "https://cdn.simpleicons.org/visa/9CA3AF",
  "Mastercard": "https://cdn.simpleicons.org/mastercard/9CA3AF",
  "Bitcoin": "https://cdn.simpleicons.org/bitcoin/9CA3AF",
  "BNB": "https://cdn.simpleicons.org/bnbchain/9CA3AF",
  "PayPal": "https://cdn.simpleicons.org/paypal/9CA3AF",
  "Apple Pay": "https://cdn.simpleicons.org/applepay/9CA3AF",
  "Samsung Pay": "https://cdn.simpleicons.org/samsungpay/9CA3AF",
  "Stripe": "https://cdn.simpleicons.org/stripe/9CA3AF",
  "Alipay": "https://cdn.simpleicons.org/alipay/9CA3AF",
  "WeChat Pay": "https://cdn.simpleicons.org/wechat/9CA3AF",
  "Skrill": "https://upload.wikimedia.org/wikipedia/commons/1/1b/Skrill_logo.svg",
  "Neteller": "https://upload.wikimedia.org/wikipedia/commons/4/48/Neteller_logo_2025.svg",
  "Ethereum": "https://cdn.simpleicons.org/ethereum/9CA3AF",
  "Litecoin": "https://cdn.simpleicons.org/litecoin/9CA3AF",
  "USDC": "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=026",
  "Cash App": "https://cdn.simpleicons.org/cashapp/9CA3AF",
  "Payoneer": "https://cdn.simpleicons.org/payoneer/9CA3AF",
  "Airtel Money": "https://cdn.simpleicons.org/airtel/9CA3AF"
};
function PaymentLogo({ name, showLabel = true }) {
  const src = PAYMENT_ICON_SOURCES[name] || PAYMENT_ICON_SOURCES["Google Pay"];
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap: showLabel ? 6 : 0, minWidth:108 }}>
      <div style={{ width:86, height:28, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <img
          src={src}
          alt={`${name} logo`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain", filter:"grayscale(1) saturate(0) brightness(0.84) contrast(1.05)", opacity:0.9 }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize:11, fontWeight:700, color:PAY_LOGO_GREY, letterSpacing:"0.03em", lineHeight:1, whiteSpace:"nowrap", textAlign:"center" }}>
          {name}
        </span>
      )}
    </div>
  );
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

export { I, PaymentLogo, BrandMark, PAYMENT_ICON_SOURCES, AnimNum, LazyVideo, Donut };
