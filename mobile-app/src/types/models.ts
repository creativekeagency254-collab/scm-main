export type UserProfile = {
  user_id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  tier: number;
  referral_code: string | null;
  status: string;
  profile_data: Record<string, unknown> | null;
};

export type WalletRow = {
  wallet_id: string;
  user_id: string;
  balance: number;
  available_for_withdrawal: number;
  hold: number;
  updated_at: string;
};

export type TransactionRow = {
  tx_id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number | null;
  related_id: string | null;
  reference: string | null;
  created_at: string;
};

export type ReferralRow = {
  ref_id: string;
  referrer_id: string;
  referred_user_id: string;
  commission_amount: number;
  created_at: string;
};

export type DepositRow = {
  deposit_id: string;
  user_id: string;
  amount: number;
  tier_at_deposit: number;
  status: string;
  provider: string;
  provider_reference: string | null;
  created_at: string;
  confirmed_at: string | null;
};

export type PayoutRequestRow = {
  payout_id: string;
  user_id: string;
  requested_amount: number;
  status: string;
  scheduled_for: string;
  processed_at: string | null;
};
