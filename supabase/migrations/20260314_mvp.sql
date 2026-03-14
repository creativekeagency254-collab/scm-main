-- 2026-03-14 MVP schema for EdisonPay (Supabase/Postgres)
-- Core tables per spec + helper indexes and constraints.

create extension if not exists pgcrypto;

-- Enums
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active','suspended','banned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE deposit_status AS ENUM ('pending','success','failed','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tx_type AS ENUM ('accrual','referral','deposit','withdrawal','adjustment','fee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM ('queued','processing','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users (app profile)
CREATE TABLE IF NOT EXISTS users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  phone text,
  full_name text,
  signup_at timestamptz DEFAULT now(),
  tier smallint NOT NULL DEFAULT 1,
  referrer_id uuid REFERENCES users(user_id),
  referral_code text UNIQUE,
  profile_data jsonb DEFAULT '{}'::jsonb,
  status user_status NOT NULL DEFAULT 'active',
  last_seen timestamptz
);

CREATE INDEX IF NOT EXISTS users_referrer_id_idx ON users(referrer_id);
CREATE INDEX IF NOT EXISTS users_signup_at_idx ON users(signup_at);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Wallets (authoritative balances)
CREATE TABLE IF NOT EXISTS wallets (
  wallet_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  balance numeric(18,2) NOT NULL DEFAULT 0,
  available_for_withdrawal numeric(18,2) NOT NULL DEFAULT 0,
  hold numeric(18,2) NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

-- Deposits (partitioned by created_at)
CREATE TABLE IF NOT EXISTS deposits (
  deposit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount numeric(18,2) NOT NULL CHECK (amount >= 0),
  tier_at_deposit smallint NOT NULL,
  status deposit_status NOT NULL DEFAULT 'pending',
  provider text NOT NULL,
  provider_reference text UNIQUE,
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
) PARTITION BY RANGE (created_at);

-- Default partition to avoid insert failures (add monthly partitions in production)
CREATE TABLE IF NOT EXISTS deposits_default PARTITION OF deposits DEFAULT;

CREATE INDEX IF NOT EXISTS deposits_status_created_idx ON deposits(status, created_at);

-- Transactions (ledger) partitioned by created_at
CREATE TABLE IF NOT EXISTS transactions (
  tx_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type tx_type NOT NULL,
  amount numeric(18,2) NOT NULL,
  balance_after numeric(18,2),
  related_id uuid,
  reference text UNIQUE,
  created_at timestamptz DEFAULT now()
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS transactions_default PARTITION OF transactions DEFAULT;

CREATE INDEX IF NOT EXISTS transactions_user_created_idx ON transactions(user_id, created_at);

-- Video views (required/optional proof)
CREATE TABLE IF NOT EXISTS video_views (
  view_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  video_id text NOT NULL,
  tier smallint NOT NULL,
  duration_watched integer NOT NULL,
  watched_at timestamptz NOT NULL DEFAULT now(),
  verified_by text,
  watched_day date GENERATED ALWAYS AS (watched_at::date) STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS video_views_user_video_day_key
  ON video_views(user_id, video_id, watched_day);
CREATE INDEX IF NOT EXISTS video_views_user_watched_idx ON video_views(user_id, watched_at);

-- Referrals (single-level commission)
CREATE TABLE IF NOT EXISTS referrals (
  ref_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  deposit_id uuid REFERENCES deposits(deposit_id),
  commission_amount numeric(18,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_id, created_at);
CREATE INDEX IF NOT EXISTS referrals_referred_idx ON referrals(referred_user_id, created_at);

-- Payout requests
CREATE TABLE IF NOT EXISTS payout_requests (
  payout_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  requested_amount numeric(18,2) NOT NULL CHECK (requested_amount > 0),
  status payout_status NOT NULL DEFAULT 'queued',
  scheduled_for date NOT NULL,
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS payout_requests_user_idx ON payout_requests(user_id, scheduled_for);
CREATE INDEX IF NOT EXISTS payout_requests_status_idx ON payout_requests(status, scheduled_for);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Helper: atomic wallet + ledger insert
CREATE OR REPLACE FUNCTION apply_wallet_tx(
  p_user_id uuid,
  p_type tx_type,
  p_amount numeric,
  p_related_id uuid,
  p_reference text
) RETURNS TABLE(new_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance numeric;
BEGIN
  SELECT balance INTO v_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    INSERT INTO wallets(user_id, balance, available_for_withdrawal, hold)
    VALUES (p_user_id, 0, 0, 0)
    RETURNING balance INTO v_balance;
  END IF;

  v_balance := v_balance + p_amount;

  UPDATE wallets
  SET balance = v_balance,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO transactions(user_id, type, amount, balance_after, related_id, reference, created_at)
  VALUES (p_user_id, p_type, p_amount, v_balance, p_related_id, p_reference, now());

  RETURN QUERY SELECT v_balance;
END;
$$;
