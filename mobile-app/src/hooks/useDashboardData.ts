import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type {
  DepositRow,
  PayoutRequestRow,
  ReferralRow,
  TransactionRow,
  UserProfile,
  WalletRow
} from "../types/models";

const PAGE_SIZE = 20;

type DashboardState = {
  profile: UserProfile | null;
  wallet: WalletRow | null;
  deposits: DepositRow[];
  payouts: PayoutRequestRow[];
  referrals: ReferralRow[];
  transactions: TransactionRow[];
  hasMoreTransactions: boolean;
  txPage: number;
  loading: boolean;
  refreshing: boolean;
  error: string;
  lastSyncAt: string | null;
};

const initialState: DashboardState = {
  profile: null,
  wallet: null,
  deposits: [],
  payouts: [],
  referrals: [],
  transactions: [],
  hasMoreTransactions: true,
  txPage: 0,
  loading: true,
  refreshing: false,
  error: "",
  lastSyncAt: null
};

export function useDashboardData(userId?: string) {
  const [state, setState] = useState<DashboardState>(initialState);
  const mountedRef = useRef(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!userId) return;
    const [profileRes, walletRes, depositsRes, payoutsRes, referralsRes] =
      await Promise.all([
        supabase
          .from("users")
          .select("user_id,email,phone,full_name,tier,referral_code,status,profile_data")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("wallets")
          .select("wallet_id,user_id,balance,available_for_withdrawal,hold,updated_at")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("deposits")
          .select(
            "deposit_id,user_id,amount,tier_at_deposit,status,provider,provider_reference,created_at,confirmed_at"
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("payout_requests")
          .select("payout_id,user_id,requested_amount,status,scheduled_for,processed_at")
          .eq("user_id", userId)
          .order("scheduled_for", { ascending: false })
          .limit(8),
        supabase
          .from("referrals")
          .select("ref_id,referrer_id,referred_user_id,commission_amount,created_at")
          .eq("referrer_id", userId)
          .order("created_at", { ascending: false })
          .limit(100)
      ]);

    if (profileRes.error) throw profileRes.error;
    if (walletRes.error) throw walletRes.error;
    if (depositsRes.error) throw depositsRes.error;
    if (payoutsRes.error) throw payoutsRes.error;
    if (referralsRes.error) throw referralsRes.error;

    if (!mountedRef.current) return;
    setState((prev) => ({
      ...prev,
      profile: (profileRes.data as UserProfile | null) ?? null,
      wallet: (walletRes.data as WalletRow | null) ?? null,
      deposits: (depositsRes.data as DepositRow[]) || [],
      payouts: (payoutsRes.data as PayoutRequestRow[]) || [],
      referrals: (referralsRes.data as ReferralRow[]) || []
    }));
  }, [userId]);

  const fetchTransactionsPage = useCallback(
    async (page: number, append: boolean) => {
      if (!userId) return;
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const txRes = await supabase
        .from("transactions")
        .select(
          "tx_id,user_id,type,amount,balance_after,related_id,reference,created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (txRes.error) throw txRes.error;
      const rows = (txRes.data as TransactionRow[]) || [];
      if (!mountedRef.current) return;

      setState((prev) => ({
        ...prev,
        transactions: append ? [...prev.transactions, ...rows] : rows,
        hasMoreTransactions: rows.length === PAGE_SIZE,
        txPage: page
      }));
    },
    [userId]
  );

  const refresh = useCallback(async () => {
    if (!userId) return;
    setState((prev) => ({ ...prev, error: "", refreshing: true }));
    try {
      await Promise.all([fetchSummary(), fetchTransactionsPage(0, false)]);
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        lastSyncAt: new Date().toISOString()
      }));
    } catch (err) {
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: err instanceof Error ? err.message : "Failed to sync live data."
      }));
    }
  }, [fetchSummary, fetchTransactionsPage, userId]);

  const loadMoreTransactions = useCallback(async () => {
    if (!userId) return;
    if (state.refreshing || !state.hasMoreTransactions) return;
    const nextPage = state.txPage + 1;
    setState((prev) => ({ ...prev, refreshing: true, error: "" }));
    try {
      await fetchTransactionsPage(nextPage, true);
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        refreshing: false,
        lastSyncAt: new Date().toISOString()
      }));
    } catch (err) {
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        refreshing: false,
        error: err instanceof Error ? err.message : "Failed loading more transactions."
      }));
    }
  }, [fetchTransactionsPage, state.hasMoreTransactions, state.refreshing, state.txPage, userId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setState(initialState);
      return;
    }
    setState((prev) => ({ ...initialState, loading: true, refreshing: false }));
    refresh();
  }, [refresh, userId]);

  useEffect(() => {
    if (!userId) return;
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refresh();
      }, 220);
    };

    const channel = supabase
      .channel(`ep-mobile-live-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${userId}` },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${userId}`
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deposits", filter: `user_id=eq.${userId}` },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payout_requests",
          filter: `user_id=eq.${userId}`
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "referrals",
          filter: `referrer_id=eq.${userId}`
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users", filter: `user_id=eq.${userId}` },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [refresh, userId]);

  const totals = useMemo(() => {
    const tx = state.transactions || [];
    return tx.reduce(
      (acc, row) => {
        const amount = Number(row.amount || 0);
        const type = String(row.type || "").toLowerCase();
        if (type.includes("deposit")) acc.deposits += amount;
        else if (type.includes("withdraw")) acc.withdrawals += Math.abs(amount);
        else if (type.includes("ref")) acc.referrals += amount;
        else acc.earnings += amount;
        return acc;
      },
      { deposits: 0, withdrawals: 0, referrals: 0, earnings: 0 }
    );
  }, [state.transactions]);

  return {
    ...state,
    totals,
    refresh,
    loadMoreTransactions
  };
}
