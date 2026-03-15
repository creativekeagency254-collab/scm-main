-- 2026-03-15 Allow earnings without deposit (withdrawals still gated)

CREATE OR REPLACE FUNCTION claim_earning(
  p_kind text DEFAULT 'manual',
  p_qty integer DEFAULT 1,
  p_event_id text DEFAULT NULL
) RETURNS TABLE(
  credited_amount numeric,
  new_balance numeric,
  claim_day date,
  tier smallint,
  required_count integer,
  optional_count integer,
  bonus_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_kind text := lower(coalesce(p_kind, 'manual'));
  v_tier smallint;
  v_day date;
  v_required integer := 0;
  v_optional integer := 0;
  v_required_earn numeric := 100;
  v_bonus numeric := 0;
  v_total numeric := 0;
  v_ref text;
  v_balance numeric := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF v_kind NOT IN ('manual','bonus') THEN
    RAISE EXCEPTION 'invalid claim kind';
  END IF;

  SELECT u.tier INTO v_tier FROM users u WHERE u.user_id = v_user_id;
  IF v_tier IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  v_day := (now() AT TIME ZONE 'Africa/Nairobi')::date;

  SELECT COUNT(*) INTO v_required
  FROM video_views
  WHERE user_id = v_user_id
    AND is_required = true
    AND (watched_at AT TIME ZONE 'Africa/Nairobi')::date = v_day;

  IF v_required < 2 THEN
    RAISE EXCEPTION 'required videos not completed';
  END IF;

  SELECT COUNT(*) INTO v_optional
  FROM video_views
  WHERE user_id = v_user_id
    AND is_required = false
    AND (watched_at AT TIME ZONE 'Africa/Nairobi')::date = v_day;

  SELECT balance INTO v_balance FROM wallets WHERE user_id = v_user_id;

  IF v_kind = 'manual' THEN
    v_ref := 'claim:req:' || v_user_id || ':' || v_day::text;
    IF EXISTS (SELECT 1 FROM transactions WHERE reference = v_ref) THEN
      RETURN QUERY SELECT 0::numeric, COALESCE(v_balance, 0)::numeric, v_day, v_tier, v_required, v_optional, 0::numeric;
      RETURN;
    END IF;

    IF v_tier = 3 THEN
      v_bonus := 275;
    ELSIF v_tier = 4 THEN
      v_bonus := 1025;
    ELSIF v_tier = 5 THEN
      v_bonus := 2275;
    ELSE
      v_bonus := 0;
    END IF;

    v_total := v_required_earn + v_bonus;
  ELSE
    v_ref := 'claim:bonus:' || v_user_id || ':' || v_day::text;
    IF EXISTS (SELECT 1 FROM transactions WHERE reference = v_ref) THEN
      RETURN QUERY SELECT 0::numeric, COALESCE(v_balance, 0)::numeric, v_day, v_tier, v_required, v_optional, 0::numeric;
      RETURN;
    END IF;

    IF v_tier <> 2 THEN
      RETURN QUERY SELECT 0::numeric, COALESCE(v_balance, 0)::numeric, v_day, v_tier, v_required, v_optional, 0::numeric;
      RETURN;
    END IF;

    IF v_optional < 1 THEN
      RAISE EXCEPTION 'optional videos not completed';
    END IF;

    v_bonus := 25;
    v_total := v_bonus;
  END IF;

  SELECT awt.new_balance INTO v_balance
  FROM apply_wallet_tx(v_user_id, 'accrual', v_total, NULL, v_ref) AS awt;

  RETURN QUERY SELECT v_total, v_balance, v_day, v_tier, v_required, v_optional, v_bonus;
END;
$$;
