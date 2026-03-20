import React, { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useDashboard } from "../context/DashboardContext";
import { formatDateTime, formatKes } from "../lib/format";
import { colors, shadows } from "../theme/colors";

export function EarningsScreen() {
  const { transactions, referrals, totals, refreshing, refresh, error } = useDashboard();

  const earningRows = useMemo(
    () =>
      transactions.filter((tx) => {
        const type = String(tx.type || "").toLowerCase();
        return type.includes("accrual") || type.includes("referral");
      }),
    [transactions]
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.hero}>
        <Text style={styles.title}>Earnings</Text>
        <Text style={styles.sub}>Live server-synced earnings from videos and referrals.</Text>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Video</Text>
            <Text style={styles.metricValue}>{formatKes(totals.earnings)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Referral</Text>
            <Text style={[styles.metricValue, { color: "#92400E" }]}>{formatKes(totals.referrals)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Referral Summary</Text>
        <Text style={styles.cardSub}>{referrals.length} referred accounts tracked in live sync.</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Total referral bonus</Text>
          <Text style={styles.value}>{formatKes(totals.referrals)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Earning Timeline</Text>
        {earningRows.length === 0 ? (
          <Text style={styles.empty}>No earnings yet.</Text>
        ) : (
          earningRows.slice(0, 24).map((tx) => (
            <View key={tx.tx_id} style={styles.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txType}>{String(tx.type || "").toUpperCase()}</Text>
                <Text style={styles.txDate}>{formatDateTime(tx.created_at)}</Text>
              </View>
              <Text style={styles.txAmount}>+{formatKes(Math.abs(tx.amount))}</Text>
            </View>
          ))
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  content: { padding: 14, paddingBottom: 28, gap: 14 },
  hero: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    ...shadows.soft
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "900", letterSpacing: -0.4 },
  sub: { marginTop: 6, color: "#64748B", fontSize: 12, fontWeight: "700" },
  metrics: { marginTop: 12, flexDirection: "row", gap: 10 },
  metric: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 10
  },
  metricLabel: { color: "#64748B", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  metricValue: { marginTop: 6, color: "#065F46", fontSize: 16, fontWeight: "900" },
  card: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    ...shadows.soft
  },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  cardSub: { marginTop: 4, color: "#64748B", fontSize: 12, fontWeight: "700" },
  row: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  label: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  value: { color: "#0F172A", fontSize: 12, fontWeight: "900" },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  txType: { color: "#0F172A", fontSize: 12, fontWeight: "900" },
  txDate: { marginTop: 2, color: "#64748B", fontSize: 11, fontWeight: "600" },
  txAmount: { color: "#16A34A", fontSize: 12, fontWeight: "900" },
  empty: { marginTop: 10, color: "#64748B", fontSize: 12, fontWeight: "700" },
  error: { color: "#DC2626", fontSize: 12, fontWeight: "800", textAlign: "center" }
});
