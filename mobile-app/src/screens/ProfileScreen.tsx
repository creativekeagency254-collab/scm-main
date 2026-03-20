import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useDashboard } from "../context/DashboardContext";
import { formatDateTime, formatKes, tierLabel } from "../lib/format";
import { colors, shadows } from "../theme/colors";

export function ProfileScreen() {
  const {
    user,
    signOut,
    biometricEnabled,
    setBiometricEnabled,
    authenticateBiometric
  } = useAuth();
  const {
    profile,
    transactions,
    hasMoreTransactions,
    refreshing,
    error,
    refresh,
    loadMoreTransactions
  } = useDashboard();

  const [busySignOut, setBusySignOut] = useState(false);
  const [busyMore, setBusyMore] = useState(false);
  const [securityMsg, setSecurityMsg] = useState("");

  const onToggleBiometric = async (enabled: boolean) => {
    setSecurityMsg("");
    try {
      if (enabled) {
        const passed = await authenticateBiometric();
        if (!passed) {
          setSecurityMsg("Biometric verification failed.");
          return;
        }
      }
      await setBiometricEnabled(enabled);
      setSecurityMsg(enabled ? "Biometric login enabled." : "Biometric login disabled.");
    } catch (err) {
      setSecurityMsg(err instanceof Error ? err.message : "Could not update biometric setting.");
    }
  };

  const onLoadMore = async () => {
    if (busyMore || !hasMoreTransactions) return;
    setBusyMore(true);
    try {
      await loadMoreTransactions();
    } finally {
      setBusyMore(false);
    }
  };

  const onSignOut = async () => {
    if (busySignOut) return;
    setBusySignOut(true);
    try {
      await signOut();
    } finally {
      setBusySignOut(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.sub}>Account identity, security, and complete transaction history.</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{profile?.full_name || "--"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{profile?.email || user?.email || "--"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{profile?.phone || "--"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tier</Text>
          <Text style={styles.value}>{tierLabel(profile?.tier || 1)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Referral Code</Text>
          <Text style={styles.value}>{profile?.referral_code || "--"}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Biometric Login</Text>
            <Text style={styles.sectionSub}>Use fingerprint/face unlock for app access.</Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={onToggleBiometric}
            thumbColor={biometricEnabled ? "#FFFFFF" : "#F8FAFC"}
            trackColor={{ false: "#CBD5E1", true: "#2563EB" }}
          />
        </View>
        {securityMsg ? <Text style={styles.info}>{securityMsg}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>All Transactions</Text>
        <Text style={styles.sectionSub}>Deposits, withdrawals, referrals, and all earnings in one feed.</Text>

        {transactions.length === 0 ? (
          <Text style={styles.empty}>No transactions yet.</Text>
        ) : (
          transactions.map((tx) => {
            const outgoing = Number(tx.amount || 0) < 0;
            return (
              <View key={tx.tx_id} style={styles.txRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txType}>{String(tx.type || "").toUpperCase()}</Text>
                  <Text style={styles.txDate}>{formatDateTime(tx.created_at)}</Text>
                </View>
                <Text style={[styles.txAmount, outgoing ? styles.outAmount : styles.inAmount]}>
                  {outgoing ? "-" : "+"}
                  {formatKes(Math.abs(tx.amount || 0))}
                </Text>
              </View>
            );
          })
        )}

        {hasMoreTransactions ? (
          <Pressable onPress={onLoadMore} style={[styles.secondaryBtn, busyMore && styles.disabledBtn]}>
            {busyMore ? (
              <ActivityIndicator size="small" color="#0B63F6" />
            ) : (
              <Text style={styles.secondaryBtnText}>Load More</Text>
            )}
          </Pressable>
        ) : null}
      </View>

      <Pressable onPress={onSignOut} style={[styles.signOutBtn, busySignOut && styles.disabledBtn]}>
        {busySignOut ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.signOutText}>Sign Out</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  content: { padding: 14, paddingBottom: 28, gap: 14 },
  card: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    ...shadows.soft
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "900", letterSpacing: -0.4 },
  sub: { marginTop: 6, color: "#64748B", fontSize: 12, fontWeight: "700" },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  sectionSub: { marginTop: 4, color: "#64748B", fontSize: 12, fontWeight: "700" },
  row: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  label: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  value: {
    flexShrink: 1,
    textAlign: "right",
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "900"
  },
  switchRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
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
  inAmount: { color: "#16A34A" },
  outAmount: { color: "#DC2626" },
  empty: { marginTop: 10, color: "#64748B", fontSize: 12, fontWeight: "700" },
  info: { marginTop: 8, color: "#0F766E", fontSize: 12, fontWeight: "700" },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#0B63F6",
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42
  },
  secondaryBtnText: { color: "#1D4ED8", fontSize: 13, fontWeight: "900" },
  signOutBtn: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#7F1D1D",
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44
  },
  signOutText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  disabledBtn: { opacity: 0.65 },
  error: { color: "#DC2626", fontSize: 12, fontWeight: "800", textAlign: "center" }
});
