import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useDashboard } from "../context/DashboardContext";
import { startManualDeposit } from "../lib/api";
import { formatDateTime, formatKes, tierLabel } from "../lib/format";
import { supabase } from "../lib/supabase";
import { colors, shadows } from "../theme/colors";

const TIER_AMOUNTS: Record<number, number> = {
  1: 5000,
  2: 10000,
  3: 20000,
  4: 50000,
  5: 100000
};

export function WalletScreen() {
  const { user, session } = useAuth();
  const { profile, wallet, payouts, deposits, refreshing, refresh } = useDashboard();
  const [depositTier, setDepositTier] = useState<number>(1);
  const [depositBusy, setDepositBusy] = useState(false);
  const [depositMsg, setDepositMsg] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState("");

  const activeTier = Number(profile?.tier || 1);
  const selectedAmount = TIER_AMOUNTS[depositTier] || 5000;
  const canSubmit = !!session?.access_token && !!user?.id && !!user?.email;
  const userPhone =
    profile?.phone ||
    String(user?.user_metadata?.phone || user?.user_metadata?.phone_number || "");
  const userName =
    String(user?.user_metadata?.full_name || profile?.full_name || user?.email || "Client");

  const queuedPayout = useMemo(
    () => payouts.find((p) => String(p.status).toLowerCase() === "queued"),
    [payouts]
  );

  const requestDeposit = async () => {
    setDepositMsg("");
    if (!canSubmit) {
      setDepositMsg("Please sign in again.");
      return;
    }
    setDepositBusy(true);
    try {
      const res = await startManualDeposit({
        token: session.access_token,
        userId: user.id,
        email: user.email || "",
        tier: depositTier,
        amount: selectedAmount,
        method: "M-Pesa",
        phone: userPhone,
        name: userName
      });
      if (res.manual) {
        setDepositMsg("Deposit request sent. Admin will confirm in real time.");
      } else {
        setDepositMsg("Deposit request submitted.");
      }
      await refresh();
    } catch (err) {
      setDepositMsg(err instanceof Error ? err.message : "Deposit request failed.");
    } finally {
      setDepositBusy(false);
    }
  };

  const requestWithdrawal = async () => {
    setWithdrawMsg("");
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setWithdrawMsg("Enter a valid withdrawal amount.");
      return;
    }
    if (amount < 1000) {
      setWithdrawMsg("Minimum withdrawal is KES 1,000.");
      return;
    }
    setWithdrawBusy(true);
    try {
      const { data, error } = await supabase.rpc("request_withdrawal", {
        p_amount: amount,
        p_method: "M-Pesa",
        p_phone: userPhone
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      setWithdrawMsg(
        row?.scheduled_for
          ? `Withdrawal queued. Scheduled for ${row.scheduled_for}.`
          : "Withdrawal queued."
      );
      setWithdrawAmount("");
      await refresh();
    } catch (err) {
      setWithdrawMsg(err instanceof Error ? err.message : "Withdrawal request failed.");
    } finally {
      setWithdrawBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Wallet</Text>
        <Text style={styles.sub}>Live balance and secure financial actions.</Text>
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Current Balance</Text>
            <Text style={styles.metricValue}>{formatKes(wallet?.balance || 0)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Available</Text>
            <Text style={styles.metricValue}>{formatKes(wallet?.available_for_withdrawal || 0)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Deposit Request</Text>
        <Text style={styles.sectionSub}>
          Current tier: {tierLabel(activeTier)}. Deposits are validated server-side.
        </Text>

        <View style={styles.tierGrid}>
          {[1, 2, 3, 4, 5].map((tier) => {
            const active = tier === depositTier;
            return (
              <Pressable
                key={tier}
                onPress={() => setDepositTier(tier)}
                style={[styles.tierChip, active && styles.tierChipActive]}
              >
                <Text style={[styles.tierChipText, active && styles.tierChipTextActive]}>
                  {tierLabel(tier)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.value}>{formatKes(selectedAmount)}</Text>
        </View>

        <Pressable
          onPress={requestDeposit}
          style={[styles.primaryBtn, (!canSubmit || depositBusy) && styles.disabledBtn]}
          disabled={!canSubmit || depositBusy}
        >
          {depositBusy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Submit Deposit Request</Text>
          )}
        </Pressable>
        {depositMsg ? <Text style={styles.info}>{depositMsg}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Request Withdrawal</Text>
        <Text style={styles.sectionSub}>Minimum withdrawal: KES 1,000.</Text>

        <TextInput
          value={withdrawAmount}
          onChangeText={setWithdrawAmount}
          keyboardType="numeric"
          placeholder="Enter amount"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />
        <Pressable
          onPress={requestWithdrawal}
          style={[styles.primaryBtn, withdrawBusy && styles.disabledBtn]}
          disabled={withdrawBusy}
        >
          {withdrawBusy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Submit Withdrawal</Text>
          )}
        </Pressable>
        {withdrawMsg ? <Text style={styles.info}>{withdrawMsg}</Text> : null}

        {queuedPayout ? (
          <View style={styles.note}>
            <Text style={styles.noteTitle}>Queued payout</Text>
            <Text style={styles.noteText}>
              {formatKes(queuedPayout.requested_amount)} - {formatDateTime(queuedPayout.scheduled_for)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Deposits</Text>
        {deposits.length === 0 ? (
          <Text style={styles.empty}>No deposit records yet.</Text>
        ) : (
          deposits.slice(0, 8).map((dep) => (
            <View key={dep.deposit_id} style={styles.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txType}>
                  {tierLabel(dep.tier_at_deposit)} - {dep.status}
                </Text>
                <Text style={styles.txDate}>{formatDateTime(dep.created_at)}</Text>
              </View>
              <Text style={styles.txAmount}>{formatKes(dep.amount)}</Text>
            </View>
          ))
        )}
      </View>
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
  metricRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  metric: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 10
  },
  metricLabel: { color: "#64748B", fontSize: 11, fontWeight: "800" },
  metricValue: { marginTop: 6, color: "#0F172A", fontSize: 16, fontWeight: "900" },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  sectionSub: { marginTop: 4, color: "#64748B", fontSize: 12, fontWeight: "700" },
  tierGrid: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tierChip: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  tierChipActive: { backgroundColor: "#0B63F6", borderColor: "#0B63F6" },
  tierChipText: { color: "#334155", fontSize: 11, fontWeight: "800" },
  tierChipTextActive: { color: "#fff" },
  row: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  value: { color: "#0F172A", fontSize: 12, fontWeight: "900" },
  input: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#fff",
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14
  },
  primaryBtn: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#0A3FA5",
    backgroundColor: "#0B63F6",
    paddingVertical: 11,
    alignItems: "center"
  },
  disabledBtn: { opacity: 0.6 },
  primaryText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  info: { marginTop: 8, color: "#0F766E", fontSize: 12, fontWeight: "700" },
  note: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    padding: 10
  },
  noteTitle: { color: "#1E3A8A", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  noteText: { marginTop: 4, color: "#1E293B", fontSize: 12, fontWeight: "700" },
  empty: { marginTop: 8, color: "#64748B", fontSize: 12, fontWeight: "700" },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  txType: { color: "#0F172A", fontSize: 12, fontWeight: "900" },
  txDate: { marginTop: 2, color: "#64748B", fontSize: 11, fontWeight: "600" },
  txAmount: { color: "#0F172A", fontSize: 12, fontWeight: "900" }
});
