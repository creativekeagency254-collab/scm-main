export const colors = {
  bg: "#060B16",
  card: "#0F172A",
  cardSoft: "#111827",
  surface: "#F8FAFC",
  text: "#0F172A",
  textSoft: "#64748B",
  white: "#FFFFFF",
  black: "#000000",
  blue: "#2563EB",
  blueSoft: "#DBEAFE",
  green: "#16A34A",
  amber: "#F59E0B",
  red: "#DC2626",
  border: "#E2E8F0"
} as const;

export const shadows = {
  soft: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  },
  card: {
    shadowColor: "#020617",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10
  }
} as const;
