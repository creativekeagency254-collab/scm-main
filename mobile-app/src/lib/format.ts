export const KES_PER_USD = 130;

export function formatKes(amount: number) {
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `KES ${safe.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function tierLabel(tier: number) {
  switch (Number(tier || 1)) {
    case 1:
      return "Regular";
    case 2:
      return "Standard";
    case 3:
      return "Executive";
    case 4:
      return "Executive Pro";
    case 5:
      return "Diamond";
    default:
      return "Regular";
  }
}
