/* "" TIERS "" */
const V_PRICE = 50;
const TIERS = [
  { id:1, name:"Regular",      tag:"REG", deposit:5000,   videos:2, bonus:0, bonusType:"none",    bonusAmount:0,    dailyTotal:200,  acc:"#0066FF", rgb:"0,102,255",  lgt:"#EBF2FF", mid:"#99C2FF" },
  { id:2, name:"Standard",     tag:"STD", deposit:10000,  videos:2, bonus:1, bonusType:"optional",bonusAmount:25,   dailyTotal:225,  acc:"#BFC5CC", rgb:"191,197,204", lgt:"#F4F6F8", mid:"#D1D5DB" },
  { id:3, name:"Executive",    tag:"EXE", deposit:20000,  videos:2, bonus:1, bonusType:"auto",   bonusAmount:275,  dailyTotal:375,  acc:"#8A6A00", rgb:"138,106,0",  lgt:"#FFF5D1", mid:"#E3C56A" },
  { id:4, name:"Executive Pro",tag:"EXP", deposit:50000,  videos:2, bonus:1, bonusType:"auto",   bonusAmount:1025, dailyTotal:1125, acc:"#7C3AED", rgb:"124,58,237", lgt:"#F5F0FF", mid:"#C4B5FD" },
  { id:5, name:"Diamond",      tag:"DIA", deposit:100000, videos:2, bonus:1, bonusType:"auto",   bonusAmount:2275, dailyTotal:2375, acc:"#DC2626", rgb:"220,38,38",  lgt:"#FFF0F0", mid:"#FCA5A5" },
];
const getTierRequiredEarn = (t) => (Number(t?.videos) || 0) * V_PRICE;
const getTierDailyTotal = (t) => Number(t?.dailyTotal) || (getTierRequiredEarn(t) + (Number(t?.bonusAmount) || 0));
const getTierBonusUnit = (t) => {
  const bonus = Number(t?.bonusAmount) || 0;
  const count = Math.max(0, Number(t?.bonus) || 0);
  if (count <= 0) return 0;
  return Math.round(bonus / count);
};

export { V_PRICE, TIERS, getTierRequiredEarn, getTierDailyTotal, getTierBonusUnit };
