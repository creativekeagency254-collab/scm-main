import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { useDashboard } from "../context/DashboardContext";
import { formatDateTime, formatKes, tierLabel } from "../lib/format";
import { StatCard } from "../components/StatCard";
import { colors, shadows } from "../theme/colors";

export function HomeScreen() {
  const { user } = useAuth();
  const {
    profile,
    wallet,
    deposits,
    payouts,
    transactions,
    totals,
    refreshing,
    error,
    lastSyncAt,
    refresh
  } = useDashboard();

  const lastDeposit = deposits[0];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <LinearGradient
        colors={["#0B1220", "#111827", "#1D4ED8"]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.heroKicker}>LIVE DASHBOARD</Text>
        <Text style={styles.heroTitle}>
          {profile?.full_name || user?.email?.split("@")[0] || "Account"}
        </Text>
        <Text style={styles.heroSub}>
          Tier: {tierLabel(profile?.tier || 1)} - Wallet {wallet ? "connected" : "syncing"}
        </Text>
        <Text style={styles.balanceValue}>{formatKes(wallet?.balance || 0)}</Text>
        <Text style={styles.balanceLabel}>Total wallet balance</Text>
      </LinearGradient>

      <View style={styles.grid}>
        <StatCard label="Available" value={formatKes(wallet?.available_for_withdrawal || 0)} />
        <StatCard
          label="Referral Earnings"
          value={formatKes(totals.referrals)}
          accent="#F59E0B"
          soft="#FEF3C7"
        />
        <StatCard
          label="Video Earnings"
          value={formatKes(totals.earnings)}
          accent="#16A34A"
          soft="#DCFCE7"
        />
        <StatCard
          label="Total Deposits"
          value={formatKes(totals.deposits)}
          accent="#1D4ED8"
          soft="#DBEAFE"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Account Snapshot</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Referral code</Text>
          <Text style={styles.value}>{profile?.referral_code || "--"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Last deposit</Text>
          <Text style={styles.value}>
            {lastDeposit ? `${formatKes(lastDeposit.amount)} (${lastDeposit.status})` : "No deposits yet"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pending withdrawals</Text>
          <Text style={styles.value}>
            {payouts.filter((p) => String(p.status).toLowerCase() === "queued").length}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Last server sync</Text>
          <Text style={styles.value}>{formatDateTime(lastSyncAt)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Activity</Text>
        {transactions.length === 0 ? (
          <Text style={styles.empty}>No transactions yet.</Text>
        ) : (
          transactions.slice(0, 8).map((tx) => (
            <View key={tx.tx_id} style={styles.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txType}>{String(tx.type || "").toUpperCase()}</Text>
                <Text style={styles.txDate}>{formatDateTime(tx.created_at)}</Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  tx.amount < 0 ? { color: colors.red } : { color: colors.green }
                ]}
              >
                {tx.amount < 0 ? "-" : "+"}
                {formatKes(Math.abs(tx.amount))}
              </Text>
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
    borderRadius: 18,
    padding: 16,
    ...shadows.card
  },
  heroKicker: { color: "#BFDBFE", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  heroTitle: { marginTop: 6, color: "#FFFFFF", fontSize: 20, fontWeight: "900", letterSpacing: -0.3 },
  heroSub: { marginTop: 4, color: "#CBD5E1", fontSize: 12, fontWeight: "700" },
  balanceValue: { marginTop: 14, color: "#FFFFFF", fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  balanceLabel: { color: "#CBD5E1", fontSize: 11, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    ...shadows.soft
  },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900", marginBottom: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    gap: 10
  },
  label: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  value: { flexShrink: 1, textAlign: "right", color: "#0F172A", fontSize: 12, fontWeight: "800" },
  empty: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  txType: { color: "#0F172A", fontSize: 12, fontWeight: "900" },
  txDate: { marginTop: 2, color: "#64748B", fontSize: 11, fontWeight: "600" },
  txAmount: { fontSize: 12, fontWeight: "900" },
  error: { color: "#DC2626", fontSize: 12, fontWeight: "800", textAlign: "center" }
});
