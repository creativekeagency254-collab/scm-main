-- 2026-03-20 Security hardening: close common wallet/admin loopholes

-- Canonical tier -> required deposit amount map.
CREATE OR REPLACE FUNCTION public.required_deposit_amount(p_tier smallint)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 1 THEN 5000::numeric
    WHEN 2 THEN 10000::numeric
    WHEN 3 THEN 20000::numeric
    WHEN 4 THEN 50000::numeric
    WHEN 5 THEN 100000::numeric
    ELSE NULL
  END;
$$;

-- Enforce tier/amount integrity for deposits.
CREATE OR REPLACE FUNCTION public.enforce_deposit_tier_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected numeric;
BEGIN
  v_expected := public.required_deposit_amount(NEW.tier_at_deposit);
  IF v_expected IS NULL THEN
    RAISE EXCEPTION 'invalid tier_at_deposit: %', NEW.tier_at_deposit;
  END IF;
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'invalid deposit amount';
  END IF;
  IF NEW.amount <> v_expected THEN
    RAISE EXCEPTION
      'deposit amount % does not match tier % (expected %)',
      NEW.amount, NEW.tier_at_deposit, v_expected;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_deposit_tier_amount ON public.deposits;
CREATE TRIGGER trg_enforce_deposit_tier_amount
  BEFORE INSERT OR UPDATE OF amount, tier_at_deposit
  ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_deposit_tier_amount();

-- Atomic + idempotent deposit confirmation and wallet credit.
CREATE OR REPLACE FUNCTION public.confirm_deposit_success(p_provider_reference text)
RETURNS TABLE(
  updated boolean,
  already boolean,
  deposit_id uuid,
  user_id uuid,
  credited_amount numeric,
  new_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reference text := nullif(trim(p_provider_reference), '');
  v_dep public.deposits%ROWTYPE;
  v_tx_exists boolean := false;
  v_confirmed_at timestamptz := now();
  v_current_tier smallint;
  v_profile jsonb;
  v_referrer uuid;
  v_commission numeric;
  v_ref_exists boolean := false;
  v_ref_tx_exists boolean := false;
BEGIN
  IF v_reference IS NULL THEN
    RAISE EXCEPTION 'missing provider reference';
  END IF;

  SELECT d.* INTO v_dep
  FROM public.deposits d
  WHERE d.provider_reference = v_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'deposit not found';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.type = 'deposit'
      AND (t.related_id = v_dep.deposit_id OR t.reference = v_reference)
  ) INTO v_tx_exists;

  IF v_dep.status = 'success' AND v_tx_exists THEN
    SELECT w.balance INTO new_balance
    FROM public.wallets w
    WHERE w.user_id = v_dep.user_id;

    RETURN QUERY
    SELECT true, true, v_dep.deposit_id, v_dep.user_id, v_dep.amount, COALESCE(new_balance, 0);
    RETURN;
  END IF;

  UPDATE public.deposits
  SET status = 'success',
      confirmed_at = COALESCE(confirmed_at, v_confirmed_at)
  WHERE deposit_id = v_dep.deposit_id;

  IF v_tx_exists THEN
    SELECT w.balance INTO new_balance
    FROM public.wallets w
    WHERE w.user_id = v_dep.user_id;
  ELSE
    SELECT awt.new_balance INTO new_balance
    FROM public.apply_wallet_tx(
      v_dep.user_id,
      'deposit',
      v_dep.amount,
      v_dep.deposit_id,
      v_reference
    ) AS awt;
  END IF;

  SELECT u.tier, u.profile_data
  INTO v_current_tier, v_profile
  FROM public.users u
  WHERE u.user_id = v_dep.user_id
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.users
    SET tier = GREATEST(COALESCE(v_current_tier, 1), v_dep.tier_at_deposit),
        profile_data = COALESCE(v_profile, '{}'::jsonb) || jsonb_build_object(
          'tier_selected', true,
          'tier_selected_at', v_confirmed_at
        ),
        last_seen = v_confirmed_at
    WHERE user_id = v_dep.user_id;
  END IF;

  -- Optional referral settlement, still idempotent on repeated callbacks.
  SELECT u.referrer_id
  INTO v_referrer
  FROM public.users u
  WHERE u.user_id = v_dep.user_id;

  IF v_referrer IS NOT NULL THEN
    v_commission := round(v_dep.amount * 0.10, 2);

    SELECT EXISTS (
      SELECT 1
      FROM public.referrals r
      WHERE r.deposit_id = v_dep.deposit_id
    ) INTO v_ref_exists;

    IF NOT v_ref_exists THEN
      INSERT INTO public.referrals(
        referrer_id,
        referred_user_id,
        deposit_id,
        commission_amount,
        created_at
      )
      VALUES (
        v_referrer,
        v_dep.user_id,
        v_dep.deposit_id,
        v_commission,
        v_confirmed_at
      );
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.reference = 'ref:' || v_reference
    ) INTO v_ref_tx_exists;

    IF NOT v_ref_tx_exists THEN
      PERFORM awt.new_balance
      FROM public.apply_wallet_tx(
        v_referrer,
        'referral',
        v_commission,
        v_dep.deposit_id,
        'ref:' || v_reference
      ) awt;
    END IF;
  END IF;

  RETURN QUERY
  SELECT true, false, v_dep.deposit_id, v_dep.user_id, v_dep.amount, COALESCE(new_balance, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_deposit_success(text) FROM PUBLIC;
DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.confirm_deposit_success(text) FROM anon;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.confirm_deposit_success(text) FROM authenticated;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.confirm_deposit_success(text) TO service_role;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Prevent users from self-escalating role/admin-sensitive fields.
CREATE OR REPLACE FUNCTION public.block_sensitive_user_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.user_id THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'user_id cannot be changed';
    END IF;
    IF NEW.referrer_id IS DISTINCT FROM OLD.referrer_id THEN
      RAISE EXCEPTION 'referrer_id cannot be changed';
    END IF;
    IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
      RAISE EXCEPTION 'referral_code cannot be changed';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'status cannot be changed';
    END IF;
    IF COALESCE(NEW.profile_data->>'role', 'client') IS DISTINCT FROM COALESCE(OLD.profile_data->>'role', 'client') THEN
      RAISE EXCEPTION 'role cannot be changed';
    END IF;
    IF COALESCE(NEW.profile_data->>'category', 'Client') IS DISTINCT FROM COALESCE(OLD.profile_data->>'category', 'Client') THEN
      RAISE EXCEPTION 'category cannot be changed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_sensitive_user_updates ON public.users;
CREATE TRIGGER trg_block_sensitive_user_updates
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.block_sensitive_user_updates();

-- RLS tightening: users can never set themselves as admin via profile_data.
DROP POLICY IF EXISTS users_insert_self ON public.users;
CREATE POLICY users_insert_self ON public.users
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'active'
    AND COALESCE(profile_data->>'role', 'client') = 'client'
  );

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
  FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (
    (user_id = auth.uid() AND COALESCE(profile_data->>'role', 'client') = 'client')
    OR public.is_admin()
  );

-- Wallet rows are system-managed; clients should not create wallets directly.
DROP POLICY IF EXISTS wallets_insert_self ON public.wallets;
