import React, { useEffect } from "react";

/* "" FONTS "" */
const Fonts = () => (
  <link href="https://fonts.googleapis.com/css2?family=Bungee&family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700;800;900&family=IBM+Plex+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
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
      @keyframes ep-neon-drift { 0%,100%{transform:translate3d(0,0,0) scale(1);} 50%{transform:translate3d(16px,-18px,0) scale(1.04);} }
      @keyframes ep-neon-pulse { 0%,100%{box-shadow:0 0 0 rgba(34,197,94,0);} 50%{box-shadow:0 0 24px rgba(34,197,94,0.45);} }
      @keyframes ep-border-pop { 0%,100%{border-color:rgba(52,211,153,0.34);} 50%{border-color:rgba(132,204,22,0.86);} }
      @keyframes ep-coin-spin { 0%,100%{transform:translateY(0) rotate(0deg);} 50%{transform:translateY(-10px) rotate(8deg);} }
      @keyframes ep-jackpot-glow { 0%,100%{text-shadow:0 0 0 rgba(250,204,21,0);} 50%{text-shadow:0 0 16px rgba(250,204,21,0.62);} }
      @keyframes ep-help-rotate { 0%,78%,100%{transform:rotate(0deg);} 88%{transform:rotate(360deg);} }
      @keyframes ep-help-glare { 0%,90%,100%{opacity:0;} 94%{opacity:.95;} }
      @keyframes ep-cursor-blink { 0%,100%{opacity:1;} 50%{opacity:0;} }
      @keyframes ep-help-ring { 0%{opacity:.75; transform:scale(1);} 100%{opacity:0; transform:scale(1.45);} }
      @keyframes ep-video-bob { 0%,100%{transform:translateY(0) rotate(0deg);} 50%{transform:translateY(-4px) rotate(-6deg);} }
      @keyframes ep-video-ring { 0%,100%{opacity:.32; transform:scale(1);} 50%{opacity:.72; transform:scale(1.08);} }
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
      .ep-help-fab { animation:ep-help-rotate 3s ease-in-out infinite; overflow:hidden; }
      .ep-help-fab::after {
        content:"";
        position:absolute;
        inset:-30%;
        background:linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.92) 50%, transparent 66%);
        transform:translateX(-120%);
        animation:ep-help-glare 5s ease-in-out infinite;
        pointer-events:none;
      }
      .ep-help-fab.ep-help-focus::before {
        content:"";
        position:absolute;
        inset:-6px;
        border-radius:50%;
        border:1.8px solid rgba(34,197,94,0.85);
        animation:ep-help-ring 1.15s ease-out infinite;
        pointer-events:none;
      }
      .ep-casino-glow { animation:ep-neon-pulse 3s ease-in-out infinite; }
      .ep-casino-border { animation:ep-border-pop 2.4s ease-in-out infinite; }
      .ep-casino-pop { animation:scaleIn .22s ease, ep-neon-pulse 3.4s ease-in-out infinite; }
      .ep-jackpot-text { animation:ep-jackpot-glow 2.4s ease-in-out infinite; }
      .ep-landing-root { position:relative; overflow-x:hidden; }
      .ep-landing-nav { width:min(1300px, calc(100% - 10vw)); margin:10px auto 0; border-radius:16px; }
      .ep-landing-nav-btn { display:flex; align-items:center; justify-content:center; gap:6px; }
      .ep-landing-nav-brand { display:flex; align-items:center; gap:9px; cursor:pointer; flex-shrink:0; min-width:0; }
      .ep-landing-brand-text { font-weight:400; font-size:20px; letter-spacing:0.03em; color:#bef264; font-family:"Bungee, Sora, sans-serif"; text-shadow:0 0 18px rgba(190,242,100,0.45); white-space:nowrap; }
      .ep-landing-pill-header { width:min(460px, calc(100% - 14px)); border-radius:999px; border:2px solid #0f172a; background:#ffffff; box-shadow:0 12px 26px rgba(15,23,42,0.12); padding:7px; display:grid; grid-template-columns:1fr auto 1fr; gap:8px; align-items:center; position:relative; }
      .ep-landing-pill-action { height:40px; border:1.5px solid transparent; border-radius:999px; font-family:"Sora, Geist, sans-serif"; font-size:13px; font-weight:800; cursor:pointer; transition:transform .15s ease, box-shadow .15s ease, background-color .15s ease, color .15s ease, border-color .15s ease; }
      .ep-landing-pill-action:hover { transform:translateY(-1px); background:#111111; border-color:#111111; color:#ffffff; box-shadow:0 10px 20px rgba(0,0,0,0.26); }
      .ep-landing-pill-action-signin { background:#ffffff; border-color:#cbd5e1; color:#0f172a; box-shadow:0 8px 16px rgba(15,23,42,0.12); }
      .ep-landing-pill-action-signup { background:linear-gradient(132deg, #2563eb 0%, #1d4ed8 100%); border-color:#1d4ed8; color:#ffffff; box-shadow:0 8px 16px rgba(37,99,235,0.32); }
      .ep-landing-pill-center { width:50px; height:40px; border:none; border-radius:10px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:#ffffff; border-left:2px solid #0f172a; border-right:2px solid #0f172a; transition:transform .15s ease, background .15s ease; }
      .ep-landing-pill-center:hover { transform:translateY(-1px); background:#f8fafc; }
      .ep-landing-pill-menu-panel { position:absolute; top:calc(100% + 10px); left:50%; transform:translate(-50%, -8px); width:min(270px, calc(100% - 18px)); border-radius:18px; border:1px solid rgba(148,163,184,0.32); background:rgba(255,255,255,0.98); box-shadow:0 18px 34px rgba(15,23,42,0.15); padding:10px; display:flex; flex-direction:column; gap:6px; opacity:0; pointer-events:none; transition:opacity .16s ease, transform .16s ease; z-index:8; }
      .ep-landing-pill-menu-panel.open { opacity:1; pointer-events:auto; transform:translate(-50%, 0); }
      .ep-landing-pill-menu-link { border:none; border-radius:12px; background:#f8fafc; color:#0f172a; padding:10px 12px; display:flex; align-items:center; gap:8px; font-size:12px; font-weight:700; font-family:"Sora, Geist, sans-serif"; cursor:pointer; text-align:left; }
      .ep-landing-pill-menu-link:hover { background:#ecfeff; }
      .ep-landing-hero-clean { display:grid; grid-template-columns:minmax(0, 1.05fr) minmax(0, 0.95fr); align-items:stretch; gap:26px; border-radius:32px; border:1.5px solid rgba(15,23,42,0.18); background:#ffffff; box-shadow:0 18px 38px rgba(15,23,42,0.1); padding:32px; overflow:hidden; }
      .ep-landing-hero-copy { position:relative; z-index:2; }
      .ep-landing-hero-highlights { margin-top:20px; display:grid; gap:9px; }
      .ep-landing-hero-highlights-desktop { display:grid; }
      .ep-landing-hero-highlight { max-width:min(100%, 520px); padding:11px 13px; border-radius:13px; border:1px solid rgba(148,163,184,0.3); font-size:13px; font-weight:600; line-height:1.45; color:#0f172a; background:#ffffff; }
      .ep-landing-hero-highlight.is-left { margin-right:auto; background:#ffffff; border-color:#cbd5e1; }
      .ep-landing-hero-highlight.is-right { margin-left:auto; background:#ffffff; border-color:#d4d4d8; }
      .ep-landing-hero-highlight.is-black { background:#000000; border-color:#000000; color:#ffffff; }
      .ep-landing-hero-image-shell { position:relative; border-radius:26px; border:1px solid rgba(148,163,184,0.36); background:radial-gradient(circle at 50% 18%, rgba(167,243,208,0.34) 0%, rgba(255,255,255,0.96) 55%), #ffffff; min-height:360px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
      .ep-landing-hero-image { position:relative; z-index:2; width:min(82%, 410px); height:auto; object-fit:contain; filter:drop-shadow(0 20px 34px rgba(15,23,42,0.24)); }
      .ep-landing-hero-sentence-orbit { display:none; }
      .ep-landing-hero-sentence-chip { position:absolute; max-width:220px; padding:9px 10px; border-radius:12px; border:1px solid rgba(148,163,184,0.34); background:rgba(255,255,255,0.92); color:#0f172a; font-size:11px; font-weight:700; line-height:1.35; box-shadow:0 10px 18px rgba(15,23,42,0.12); backdrop-filter:blur(2px); }
      .ep-landing-hero-sentence-chip.is-black { background:#000000; border-color:#000000; color:#ffffff; }
      .ep-landing-hero-sentence-chip.chip-1 { top:12%; left:12px; transform:rotate(-2deg); }
      .ep-landing-hero-sentence-chip.chip-2 { top:24%; right:10px; transform:rotate(1.5deg); }
      .ep-landing-hero-sentence-chip.chip-3 { bottom:22%; left:10px; transform:rotate(1deg); }
      .ep-landing-hero-sentence-chip.chip-4 { bottom:10%; right:12px; transform:rotate(-1.5deg); }
      .ep-landing-hero-cta-btn { padding:12px 24px; border-radius:999px; font-weight:800; font-size:14px; cursor:pointer; font-family:"Sora, Geist, sans-serif"; border:1.5px solid transparent; transition:transform .15s ease, box-shadow .15s ease, background-color .15s ease, color .15s ease, border-color .15s ease; }
      .ep-landing-hero-cta-btn:hover { transform:translateY(-1px); background:#111111; border-color:#111111; color:#ffffff; box-shadow:0 12px 24px rgba(0,0,0,0.26); }
      .ep-landing-hero-cta-btn-primary { background:#ffffff; border-color:#cbd5e1; color:#0f172a; box-shadow:0 10px 22px rgba(15,23,42,0.12); }
      .ep-landing-hero-cta-btn-secondary { background:linear-gradient(132deg, #2563eb 0%, #1d4ed8 100%); border-color:#1d4ed8; color:#ffffff; box-shadow:0 10px 20px rgba(37,99,235,0.32); }
      .ep-dash-topbar { position:sticky; top:0; z-index:36; background:linear-gradient(180deg,#ffffff 0%, #f8fafc 100%) !important; }
      .ep-dash-icon-btn { width:36px; height:36px; border-radius:9px; border:1.5px solid #E8E8E8; background:#FAFAFA; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; }
      .ep-dash-profile-trigger { display:flex; align-items:center; gap:8px; cursor:pointer; padding:4px 10px 4px 4px; border:1.5px solid #E8E8E8; border-radius:50px; background:#FAFAFA; min-width:0; }
      .ep-dash-strip { position:sticky; top:0; z-index:20; }
      .ep-dash-strip-actions { display:flex; gap:8px; }
      .ep-dash-strip-mobile { width:100%; display:flex; flex-direction:column; gap:10px; }
      .ep-dash-strip-mobile-meta { display:flex; gap:6px; flex-wrap:wrap; }
      .ep-footer { background:#0D0D0D; color:#fff; }
      .ep-footer-band { border-bottom:1px solid #1F1F1F; padding:28px 5vw; }
      .ep-footer-main { padding:34px 5vw 24px; max-width:1300px; margin:0 auto; display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:24px; }
      .ep-footer-cta-title { font-size:clamp(20px,2.2vw,30px); font-weight:900; letter-spacing:-0.03em; margin-bottom:6px; }
      .ep-footer-cta-copy { font-size:14px; color:#94a3b8; line-height:1.5; }
      .ep-footer-cta-btn { padding:10px 20px; border-radius:50px; font-size:13px; cursor:pointer; font-family:"Geist,sans-serif"; }
      .ep-footer-social { display:flex; gap:10px; flex-wrap:wrap; }
      .ep-footer-link-col { min-width:0; }
      .ep-footer-col-title { font-size:10px; font-weight:800; color:#e2e8f0; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:10px; }
      .ep-footer-link { font-size:12px; color:#94a3b8; margin-bottom:7px; cursor:pointer; transition:color .12s; line-height:1.35; }
      .ep-footer-link:hover { color:#e2e8f0; }
      .ep-footer-legal { font-size:11px; color:#64748b; }
      .ep-footer-system { display:flex; align-items:center; gap:6px; font-size:11px; color:#94a3b8; }
      .ep-landing-balance-video-wrap { background:#05070a; padding:14px 5vw 16px; margin:0; border-top:1px solid rgba(132,204,22,0.18); border-bottom:1px solid rgba(132,204,22,0.18); }
      .ep-landing-balance-video-card { max-width:1300px; margin:0 auto; border-radius:20px; border:2px solid rgba(163,230,53,0.48); background:linear-gradient(180deg, #020617 0%, #020b17 100%); box-shadow:0 16px 36px rgba(2,6,23,0.52); overflow:hidden; }
      .ep-landing-balance-video-head { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:10px 14px 8px; color:#d1fae5; font-size:11px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; }
      .ep-landing-balance-video-frame { width:calc(100% - 20px); margin:0 10px 10px; height:320px; position:relative; overflow:hidden; border-radius:16px; border:1px solid rgba(163,230,53,0.34); box-shadow:inset 0 0 0 1px rgba(15,23,42,0.45), 0 12px 26px rgba(2,6,23,0.5); }
      .ep-landing-balance-video-side-art { position:absolute; right:14px; bottom:10px; width:min(42%, 420px); max-height:92%; height:auto; object-fit:contain; object-position:bottom right; pointer-events:none; z-index:3; transform:none; filter:drop-shadow(0 14px 24px rgba(2,6,23,0.5)); opacity:0.94; }
      .ep-landing-float-header { max-width:1300px; margin:10px auto 0; padding:0 5vw; position:relative; z-index:3; }
      .ep-landing-float-header-card { border-radius:16px; border:1px solid rgba(163,230,53,0.36); background:linear-gradient(135deg, rgba(6,12,22,0.88), rgba(20,35,18,0.84)); padding:12px 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; box-shadow:0 10px 24px rgba(2,6,23,0.35); }
      .ep-process-auto-pill { margin:16px auto 0; width:fit-content; display:flex; align-items:center; gap:8px; border:1px solid #dbeafe; border-radius:999px; background:#f8fafc; padding:7px 12px; font-size:11px; font-weight:700; color:#334155; letter-spacing:0.02em; }
      .ep-process-auto-dot { width:8px; height:8px; border-radius:999px; background:#22c55e; box-shadow:0 0 0 5px rgba(34,197,94,0.16); animation:pulse 1.4s ease-in-out infinite; }
      .ep-process-wrap { border:1px solid #E5E7EB; border-radius:24px; background:#fff; padding:34px 28px; box-shadow:0 14px 32px rgba(15,23,42,0.06); }
      .ep-process-grid { position:relative; display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:18px; --process-progress:0%; }
      .ep-process-line { position:absolute; top:24px; left:8%; right:8%; height:2px; background:linear-gradient(90deg,#cbd5e1 0%, #94a3b8 50%, #cbd5e1 100%); z-index:0; border-radius:999px; overflow:hidden; }
      .ep-process-line::after { content:""; position:absolute; inset:0; width:var(--process-progress); background:linear-gradient(90deg,#111827 0%, #6d28d9 100%); border-radius:999px; transition:width .55s ease; }
      .ep-process-item { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:14px; cursor:pointer; outline:none; }
      .ep-process-node { width:48px; height:48px; border-radius:999px; background:#0f172a; border:2px solid #ffffff; box-shadow:0 8px 16px rgba(15,23,42,0.2); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:transform .18s ease, background .18s ease, box-shadow .18s ease; }
      .ep-process-count { font-size:11px; font-weight:900; letter-spacing:0.08em; color:#e2e8f0; }
      .ep-process-card { width:100%; border:1px solid #E2E8F0; border-radius:14px; background:#ffffff; padding:14px 14px 15px; box-shadow:0 8px 18px rgba(15,23,42,0.05); min-height:148px; transition:border-color .2s ease, box-shadow .2s ease, transform .2s ease, background .2s ease; }
      .ep-process-card-head { display:flex; align-items:center; gap:9px; margin-bottom:10px; }
      .ep-process-icon { width:30px; height:30px; border-radius:8px; background:#f8fafc; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .ep-process-title { font-size:14px; font-weight:800; color:#0f172a; line-height:1.2; }
      .ep-process-meta { margin-top:1px; font-size:10px; font-weight:700; color:#64748b; letter-spacing:0.06em; text-transform:uppercase; }
      .ep-process-time { width:fit-content; margin-bottom:9px; border-radius:999px; border:1px solid #e2e8f0; background:#f8fafc; color:#334155; padding:3px 8px; font-size:10px; font-weight:800; letter-spacing:0.05em; text-transform:uppercase; }
      .ep-process-desc { font-size:12px; color:#64748b; line-height:1.6; }
      .ep-process-item:hover .ep-process-node { transform:scale(1.03); }
      .ep-process-item:hover .ep-process-card { border-color:#CBD5E1; box-shadow:0 12px 22px rgba(15,23,42,0.09); transform:translateY(-1px); }
      .ep-process-item:focus-visible .ep-process-node { transform:scale(1.03); }
      .ep-process-item:focus-visible .ep-process-card { border-color:#93C5FD; box-shadow:0 0 0 2px rgba(147,197,253,0.45), 0 12px 22px rgba(15,23,42,0.09); transform:translateY(-1px); }
      .ep-process-item.is-active .ep-process-node { background:linear-gradient(135deg,#0f172a 0%, #6d28d9 100%); box-shadow:0 10px 18px rgba(109,40,217,0.34); transform:scale(1.05); }
      .ep-process-item.is-active .ep-process-card { border-color:#c4b5fd; box-shadow:0 14px 22px rgba(109,40,217,0.14); transform:translateY(-2px); }
      .ep-process-item.is-active .ep-process-time { border-color:#c4b5fd; background:#f5f3ff; color:#5b21b6; }
      .ep-process-item.is-done .ep-process-node { background:linear-gradient(135deg,#14532d 0%, #16a34a 100%); }
      .ep-process-item.is-done .ep-process-card { border-color:#bbf7d0; background:#f0fdf4; }
      .ep-process-item.is-done .ep-process-time { border-color:#bbf7d0; background:#ecfdf5; color:#166534; }
      .ep-guide-panel { position:fixed; right:14px; bottom:76px; width:min(360px, 92vw); border-radius:18px; border:1.5px solid #111; background:linear-gradient(180deg,#f8fafc 0%, #e5e7eb 100%); box-shadow:0 18px 32px rgba(2,6,23,0.28); z-index:9998; padding:10px; }
      .ep-guide-bubble { position:relative; border:1.5px solid #111; border-radius:18px 18px 18px 6px; background:linear-gradient(180deg,#ffffff 0%, #f3f4f6 100%); box-shadow:0 8px 18px rgba(15,23,42,0.14); }
      .ep-guide-bubble::after { content:""; position:absolute; right:14px; bottom:-9px; width:14px; height:14px; border-right:1.5px solid #111; border-bottom:1.5px solid #111; background:#f3f4f6; transform:rotate(45deg); border-bottom-right-radius:3px; }
      .ep-guide-avatar-bw { filter:grayscale(1) contrast(1.1); }
      .ep-guide-cursor { animation:ep-cursor-blink .8s steps(1) infinite; font-weight:900; }
      .ep-video-hero-icon { position:relative; width:46px; height:46px; border-radius:14px; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#facc15 0%, #bef264 45%, #22c55e 100%); border:1px solid rgba(250,204,21,0.6); box-shadow:0 8px 20px rgba(132,204,22,0.35); animation:ep-video-bob 2.2s ease-in-out infinite; flex-shrink:0; }
      .ep-video-hero-icon::after { content:""; position:absolute; inset:-6px; border-radius:16px; border:1.5px solid rgba(190,242,100,0.65); animation:ep-video-ring 2.2s ease-in-out infinite; pointer-events:none; }
      .ep-tier-mobile-image-host { position:relative; overflow:hidden; }
      .ep-tier-mobile-image-content { position:relative; z-index:2; }
      .ep-tier-mobile-image { display:none; pointer-events:none; user-select:none; -webkit-user-drag:none; }
      .ep-tier-card-shell { position:relative; isolation:isolate; }
      .ep-tier-card-lively { position:relative; z-index:1; }
      .ep-tier-card-aura { position:absolute; left:10%; right:10%; bottom:-16%; height:34%; border-radius:999px; filter:blur(20px); opacity:0.78; pointer-events:none; z-index:0; transition:transform .28s ease, opacity .28s ease; }
      .ep-tier-card-shell:active .ep-tier-card-lively { transform:translateY(-2px) !important; }
      .ep-tier-mobile-image-host-landing { min-height:370px; padding-right:48%; }
      .ep-tier-mobile-image-content-landing { max-width:58%; }
      .ep-tier-mobile-image-host-landing .ep-tier-mobile-image-landing {
        display:block !important;
        position:absolute !important;
        right:0 !important;
        top:0 !important;
        transform:none !important;
        width:48% !important;
        height:100% !important;
        object-fit:contain !important;
        object-position:right center !important;
        filter:drop-shadow(0 12px 24px rgba(2,6,23,0.28));
        opacity:0.98 !important;
        z-index:1 !important;
      }
      .ep-tier-mobile-image-host-select { min-height:312px; padding-right:44%; }
      .ep-tier-mobile-image-host-select .ep-tier-mobile-image-select {
        display:block !important;
        position:absolute !important;
        right:0 !important;
        top:0 !important;
        width:44% !important;
        height:100% !important;
        object-fit:cover !important;
        object-position:right center !important;
        opacity:0.96 !important;
        z-index:1 !important;
      }
      .ep-tier-deposit-btn { transition:transform .16s ease, box-shadow .16s ease, filter .16s ease; }
      .ep-tier-deposit-btn:active { transform:translateY(1px) scale(0.99); box-shadow:inset 0 2px 8px rgba(15,23,42,0.42) !important; filter:saturate(0.95); }

      @media (max-width:980px) {
        .ep-tier-grid { grid-template-columns:1fr !important; gap:14px !important; }
        .ep-tier-grid .ep-tier-card-shell { width:min(100%, 620px) !important; margin:0 auto !important; }
        .ep-tier-card-aura { left:9% !important; right:9% !important; bottom:-15% !important; height:33% !important; filter:blur(18px) !important; }
        .ep-tier-mobile-image-host-landing { min-height:368px !important; padding-right:45% !important; }
        .ep-tier-mobile-image-content-landing { max-width:58% !important; }
        .ep-tier-mobile-image-host-landing .ep-tier-mobile-image-landing { width:45% !important; }
      }

      @media (max-width:1024px) {
        .ep-footer-main { grid-template-columns:1.4fr 1fr 1fr 1fr !important; gap:18px !important; }
        .ep-dash-strip-actions { flex-wrap:wrap !important; justify-content:flex-end !important; }
      }
      @media (max-width:900px) {
        .ep-footer-main { grid-template-columns:1fr 1fr !important; gap:20px !important; }
        .ep-landing-hero-clean { grid-template-columns:1fr !important; padding:24px !important; border-radius:24px !important; gap:20px !important; }
        .ep-landing-hero-copy { order:2 !important; }
        .ep-landing-hero-image-shell { order:1 !important; min-height:310px !important; padding:12px !important; }
        .ep-landing-hero-image { width:min(56%, 280px) !important; }
        .ep-landing-hero-highlights-desktop { display:none !important; }
        .ep-landing-hero-sentence-orbit { display:block !important; position:absolute !important; inset:0 !important; z-index:3 !important; pointer-events:none !important; }
        .ep-landing-hero-sentence-chip { max-width:42% !important; font-size:10.6px !important; padding:8px 9px !important; }
        .ep-landing-hero-sentence-chip.chip-1 { top:10% !important; left:10px !important; }
        .ep-landing-hero-sentence-chip.chip-2 { top:22% !important; right:8px !important; }
        .ep-landing-hero-sentence-chip.chip-3 { bottom:24% !important; left:8px !important; }
        .ep-landing-hero-sentence-chip.chip-4 { bottom:10% !important; right:8px !important; }
      }

      @media (max-width:1100px) {
        .ep-landing-nav { padding:0 16px !important; gap:16px !important; }
        .ep-landing-hero { padding:0 16px !important; gap:20px !important; }
        .ep-landing-hero-left { padding-right:0 !important; }
        .ep-landing-hero-panel { min-height:430px !important; }
      }

      @media (max-width:768px) {
        .ep-landing-pill-header { width:min(430px, calc(100% - 8px)) !important; padding:6px !important; gap:6px !important; }
        .ep-landing-pill-action { height:36px !important; font-size:12px !important; }
        .ep-landing-pill-center { width:40px !important; height:40px !important; }
        .ep-landing-pill-menu-panel { width:min(250px, calc(100% - 12px)) !important; border-radius:14px !important; top:calc(100% + 8px) !important; }
        .ep-landing-hero-clean { padding:18px !important; border-radius:20px !important; gap:18px !important; }
        .ep-landing-hero-highlights { margin-top:14px !important; gap:8px !important; }
        .ep-landing-hero-highlight { font-size:12px !important; padding:9px 11px !important; }
        .ep-landing-hero-image-shell { min-height:260px !important; border-radius:16px !important; }
        .ep-landing-hero-image { width:min(60%, 240px) !important; }
        .ep-landing-hero-sentence-chip { max-width:44% !important; font-size:10px !important; line-height:1.32 !important; padding:7px 8px !important; border-radius:10px !important; }
        .ep-landing-hero-sentence-chip.chip-1 { top:11% !important; left:8px !important; }
        .ep-landing-hero-sentence-chip.chip-2 { top:21% !important; right:7px !important; }
        .ep-landing-hero-sentence-chip.chip-3 { bottom:23% !important; left:7px !important; }
        .ep-landing-hero-sentence-chip.chip-4 { bottom:9% !important; right:7px !important; }
        .ep-landing-nav { width:calc(100% - 24px) !important; margin:8px auto 0 !important; border-radius:14px !important; height:auto !important; min-height:64px !important; padding:10px 14px !important; gap:10px !important; flex-wrap:wrap !important; }
        .ep-landing-nav-brand { width:100% !important; justify-content:space-between !important; }
        .ep-landing-brand-text { font-size:18px !important; }
        .ep-landing-nav-divider { display:none !important; }
        .ep-landing-nav-actions { margin-left:auto !important; gap:6px !important; }
        .ep-landing-live-pill { display:none !important; }
        .ep-landing-nav-btn { padding:8px 12px !important; font-size:12px !important; }
        .ep-landing-hero { padding:14px 14px 24px !important; min-height:auto !important; gap:18px !important; }
        .ep-landing-hero-left { padding-top:10px !important; padding-bottom:0 !important; }
        .ep-landing-title { font-size:clamp(34px, 12vw, 52px) !important; line-height:1.02 !important; margin-bottom:18px !important; }
        .ep-landing-subcopy { font-size:15px !important; max-width:none !important; margin-bottom:24px !important; line-height:1.6 !important; }
        .ep-landing-cta { margin-bottom:28px !important; }
        .ep-landing-cta button { flex:1 1 170px !important; padding:13px 16px !important; }
        .ep-landing-stats-row { gap:16px !important; flex-wrap:wrap !important; padding-top:20px !important; }
        .ep-landing-stats-row > div { min-width:112px !important; }
        .ep-landing-hero-right { padding-top:0 !important; padding-bottom:0 !important; }
        .ep-landing-hero-panel { min-height:360px !important; border-radius:18px !important; }
        .ep-landing-balance-core { width:92% !important; transform:translate(-50%,-54%) !important; }
        .ep-landing-balance-label { font-size:11px !important; margin-bottom:8px !important; }
        .ep-landing-balance-value { font-size:clamp(35px, 10vw, 52px) !important; }
        .ep-landing-balance-delta { font-size:12px !important; margin-top:6px !important; }
        .ep-landing-balance-progress { width:min(92%, 240px) !important; margin-top:14px !important; }
        .ep-landing-bot-card { width:39% !important; min-width:120px !important; top:14px !important; right:14px !important; border-radius:16px !important; }
        .ep-landing-float-earn { min-width:152px !important; padding:10px 11px !important; right:12px !important; bottom:74px !important; top:auto !important; }
        .ep-landing-float-chat { left:12px !important; bottom:58px !important; padding:9px 12px 9px 10px !important; }
        .ep-landing-float-chat span { font-size:11px !important; }
        .ep-landing-float-tier { display:none !important; }
        .ep-landing-flow-ribbon { left:10px !important; right:10px !important; bottom:10px !important; }
        .ep-landing-flow-ribbon span { font-size:9px !important; letter-spacing:0.06em !important; }
        .ep-tier-mobile-image { display:block !important; position:absolute !important; right:6px !important; top:50% !important; transform:translateY(-50%) !important; object-fit:contain !important; filter:drop-shadow(0 10px 18px rgba(2,6,23,0.28)); opacity:0.95 !important; z-index:1 !important; }
        .ep-tier-grid .ep-tier-card-shell { width:min(100%, 560px) !important; margin:0 auto !important; }
        .ep-tier-card-aura { left:8% !important; right:8% !important; bottom:-14% !important; height:32% !important; filter:blur(16px) !important; }
        .ep-tier-mobile-image-host-landing { min-height:352px !important; padding-right:44% !important; }
        .ep-tier-mobile-image-content-landing { max-width:58% !important; }
        .ep-tier-mobile-image-host-landing .ep-tier-mobile-image-landing { width:44% !important; height:96% !important; right:4px !important; top:50% !important; transform:translateY(-50%) !important; object-fit:contain !important; object-position:right center !important; }
        .ep-tier-mobile-image-host-select { padding-right:46% !important; min-height:280px !important; }
        .ep-tier-mobile-image-host-select .ep-tier-mobile-image-select { width:46% !important; height:100% !important; right:0 !important; top:0 !important; object-fit:cover !important; object-position:right center !important; }

        .ep-videos-shell { border-radius:16px !important; padding:14px !important; gap:14px !important; }
        .ep-videos-hero { padding:12px 14px !important; }
        .ep-videos-hero-title { font-size:17px !important; }
        .ep-videos-tab-switch button { flex:1 1 190px !important; }
        .ep-videos-panel { padding:16px !important; border-radius:12px !important; }
        .ep-videos-manual-head, .ep-videos-bonus-head { flex-direction:column !important; align-items:flex-start !important; gap:10px !important; }
        .ep-videos-manual-done { width:100% !important; justify-content:center !important; }
        .ep-videos-status-bar { padding:10px 12px !important; }
        .ep-videos-status-right { text-align:left !important; min-width:0 !important; }
        .ep-videos-chain { flex-wrap:wrap !important; row-gap:10px !important; }
        .ep-videos-chain-link { flex-basis:100% !important; height:0 !important; }
        .ep-videos-manual-grid { grid-template-columns:1fr !important; gap:12px !important; }
        .ep-videos-bonus-grid { grid-template-columns:repeat(2, minmax(0,1fr)) !important; gap:10px !important; }
        .ep-dash-topbar { min-height:auto !important; padding:8px 10px !important; gap:8px !important; row-gap:6px !important; }
        .ep-dash-icon-btn { width:34px !important; height:34px !important; border-radius:8px !important; }
        .ep-dash-profile-trigger { padding:3px 8px 3px 3px !important; gap:6px !important; }
        .ep-dash-strip { padding-left:12px !important; padding-right:12px !important; }
        .ep-dash-strip-actions { width:100% !important; display:grid !important; grid-template-columns:1fr 1fr !important; gap:8px !important; }
        .ep-dash-strip-mobile { gap:8px !important; }
        .ep-footer-band { padding:22px 14px !important; }
        .ep-footer-main { padding:24px 14px 18px !important; }
        .ep-footer-cta-title { line-height:1.15 !important; }
        .ep-footer-cta-copy { font-size:13px !important; }
        .ep-footer-bottom { padding:12px 14px !important; }
        .ep-landing-balance-video-wrap { padding:10px 14px 12px !important; }
        .ep-landing-balance-video-card { border-radius:14px !important; }
        .ep-landing-balance-video-head { padding:8px 12px 6px !important; font-size:10px !important; letter-spacing:0.1em !important; }
        .ep-landing-balance-video-frame { height:250px !important; }
        .ep-landing-balance-video-side-art { width:min(46%, 250px) !important; max-height:88% !important; right:8px !important; bottom:8px !important; transform:none !important; }
        .ep-landing-float-header { padding:0 14px !important; margin-top:8px !important; }
        .ep-landing-float-header-card { padding:10px 12px !important; border-radius:14px !important; }
        .ep-process-auto-pill { margin-top:12px !important; font-size:10px !important; padding:6px 10px !important; }
        .ep-process-wrap { padding:18px 14px !important; border-radius:16px !important; }
        .ep-process-grid { grid-template-columns:1fr !important; gap:14px !important; }
        .ep-process-line { left:23px !important; right:auto !important; top:22px !important; bottom:22px !important; width:2px !important; height:auto !important; background:linear-gradient(180deg,#cbd5e1 0%, #94a3b8 48%, #cbd5e1 100%) !important; }
        .ep-process-line::after { width:100% !important; height:var(--process-progress) !important; transition:height .55s ease !important; }
        .ep-process-item { align-items:stretch !important; padding-left:66px !important; gap:10px !important; }
        .ep-process-node { position:absolute !important; left:0 !important; top:0 !important; width:46px !important; height:46px !important; }
        .ep-process-card { min-height:0 !important; padding:12px 12px 13px !important; }
        .ep-process-title { font-size:13px !important; }
        .ep-process-desc { font-size:12px !important; line-height:1.58 !important; }
      }

      @media (max-width:520px) {
        .ep-landing-pill-header { width:100% !important; }
        .ep-landing-pill-action { font-size:11px !important; }
        .ep-landing-pill-menu-panel { width:calc(100% - 8px) !important; }
        .ep-landing-hero-clean { padding:14px !important; border-radius:16px !important; }
        .ep-landing-hero-image-shell { min-height:230px !important; padding:10px !important; }
        .ep-landing-hero-image { width:min(58%, 210px) !important; }
        .ep-landing-hero-sentence-chip { max-width:45% !important; font-size:9.4px !important; padding:6px 7px !important; }
        .ep-landing-hero-sentence-chip.chip-1 { top:9% !important; left:6px !important; }
        .ep-landing-hero-sentence-chip.chip-2 { top:20% !important; right:6px !important; }
        .ep-landing-hero-sentence-chip.chip-3 { bottom:20% !important; left:6px !important; }
        .ep-landing-hero-sentence-chip.chip-4 { bottom:8% !important; right:6px !important; }
        .ep-landing-nav { width:calc(100% - 16px) !important; padding:8px 10px !important; }
        .ep-landing-nav-brand { justify-content:center !important; }
        .ep-landing-nav-actions { width:100% !important; justify-content:space-between !important; }
        .ep-landing-nav-btn { flex:1 1 0 !important; padding:9px 10px !important; }
        .ep-landing-hero-panel { min-height:325px !important; }
        .ep-landing-bot-card { width:132px !important; min-width:132px !important; top:12px !important; right:10px !important; }
        .ep-landing-float-earn { left:10px !important; right:10px !important; min-width:0 !important; bottom:56px !important; }
        .ep-landing-float-chat { display:none !important; }
        .ep-landing-coin { display:none !important; }
        .ep-landing-flow-ribbon span:nth-child(4) { display:none !important; }
        .ep-landing-stats-row { gap:12px !important; }
        .ep-landing-stats-row > div { min-width:95px !important; }
        .ep-tier-grid .ep-tier-card-shell { width:100% !important; }
        .ep-tier-card-aura { left:8% !important; right:8% !important; bottom:-12% !important; height:30% !important; filter:blur(14px) !important; }
        .ep-tier-mobile-image-host-landing { min-height:332px !important; padding-right:42% !important; }
        .ep-tier-mobile-image-content-landing { max-width:60% !important; }
        .ep-tier-mobile-image-host-landing .ep-tier-mobile-image-landing { width:42% !important; height:92% !important; right:4px !important; top:50% !important; transform:translateY(-50%) !important; object-fit:contain !important; object-position:right center !important; }
        .ep-tier-mobile-image-host-select { padding-right:48% !important; min-height:260px !important; }
        .ep-tier-mobile-image-host-select .ep-tier-mobile-image-select { width:48% !important; height:100% !important; right:0 !important; top:0 !important; object-fit:cover !important; object-position:right center !important; }

        .ep-videos-shell { padding:10px !important; border-radius:14px !important; gap:10px !important; }
        .ep-videos-hero { padding:10px 12px !important; }
        .ep-videos-hero-title { margin-top:4px !important; font-size:14px !important; line-height:1.35 !important; letter-spacing:0.01em !important; }
        .ep-video-hero-icon { width:40px !important; height:40px !important; border-radius:12px !important; }
        .ep-videos-live-pill { width:100% !important; justify-content:center !important; }
        .ep-videos-summary-grid { grid-template-columns:1fr 1fr !important; gap:8px !important; }
        .ep-videos-summary-grid > div { padding:10px 11px !important; }
        .ep-videos-summary-grid > div > div:last-child { font-size:18px !important; }
        .ep-videos-tab-switch { padding:2px !important; }
        .ep-videos-tab-switch button { flex:1 1 100% !important; font-size:12px !important; padding:8px 10px !important; }
        .ep-videos-panel { padding:12px !important; }
        .ep-videos-status-bar { gap:8px !important; }
        .ep-videos-bonus-grid { grid-template-columns:1fr !important; }
        .ep-dash-strip-mobile-meta span { font-size:9px !important; }
        .ep-dash-profile-trigger { padding:2px 8px 2px 2px !important; }
        .ep-footer-cta-actions { display:grid !important; grid-template-columns:1fr !important; gap:10px !important; }
        .ep-footer-bottom-links { gap:12px !important; }
        .ep-footer-system { width:100% !important; justify-content:flex-start !important; }
        .ep-landing-balance-video-frame { height:210px !important; }
        .ep-landing-balance-video-side-art { width:min(48%, 190px) !important; max-height:84% !important; right:6px !important; bottom:6px !important; transform:none !important; opacity:0.9 !important; }
        .ep-guide-panel { right:8px !important; bottom:70px !important; width:min(330px, 96vw) !important; }
      }
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
        .ep-auth-grid { grid-template-columns:1fr 1fr !important; }
        .ep-auth-left { display:flex !important; }
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

export { Fonts, GlobalStyles };
