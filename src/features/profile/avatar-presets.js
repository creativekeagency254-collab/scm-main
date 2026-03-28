const AVATAR_PRESETS = [
  "/avatars/black_king_afro.svg",
  "/avatars/black_dreads_style.svg",
  "/avatars/black_fade_smart.svg",
  "/avatars/black_braids_style.svg",
  "/avatars/black_clean_cut.svg",
  "/avatars/black_stylish_modern.svg",
  "/avatars/black_chill_casual.svg",
  "/avatars/black_confident_leader.svg"
];

const DEFAULT_AVATAR = AVATAR_PRESETS[0];

const pickAvatarForSeed = (seed) => {
  const s = String(seed || "0");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_PRESETS[h % AVATAR_PRESETS.length] || DEFAULT_AVATAR;
};

const isAvatarPreset = (value) => AVATAR_PRESETS.includes(String(value || ""));

export { AVATAR_PRESETS, DEFAULT_AVATAR, pickAvatarForSeed, isAvatarPreset };
