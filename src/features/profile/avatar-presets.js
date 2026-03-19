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

export { AVATAR_PRESETS };
