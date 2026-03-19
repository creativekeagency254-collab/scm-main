-- 2026-03-15 Tier selection + deposit gate for earnings/withdrawals

-- Faster lookups for deposit gating
CREATE INDEX IF NOT EXISTS deposits_user_status_tier_idx
  ON public.deposits(user_id, status, tier_at_deposit);

-- Helper: check if user has a successful deposit for a tier
CREATE OR REPLACE FUNCTION public.has_active_deposit(p_user uuid, p_tier smallint)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  select exists (
    select 1
    from public.deposits d
    where d.user_id = p_user
      and d.status = 'success'
      and d.tier_at_deposit = p_tier
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_active_deposit(uuid, smallint) TO authenticated;

-- Update handle_new_user to include tier_selected flag
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_ref_code text;
  v_referrer uuid;
  v_referral_code text;
  v_full_name text;
  v_profile jsonb;
begin
  v_ref_code := upper(nullif(trim(new.raw_user_meta_data->>'referred_by'), ''));
  v_full_name := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
  v_profile := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  if v_ref_code is not null then
    select user_id into v_referrer
    from public.users
    where referral_code = v_ref_code
       or user_id::text = v_ref_code
    limit 1;
  end if;

  v_referral_code := nullif(trim(new.raw_user_meta_data->>'referral_code'), '');
  if v_referral_code is null then
    v_referral_code := 'EDP-' || upper(substr(md5(new.id::text), 1, 6));
  end if;

  insert into public.users (
    user_id,
    email,
    phone,
    full_name,
    signup_at,
    tier,
    referrer_id,
    referral_code,
    profile_data,
    status,
    last_seen
  )
  values (
    new.id,
    new.email,
    new.phone,
    v_full_name,
    new.created_at,
    1,
    v_referrer,
    v_referral_code,
    jsonb_build_object(
      'role', 'client',
      'category', 'Client',
      'referred_by', v_ref_code,
      'tier_selected', false
    ) || v_profile,
    'active',
    now()
  )
  on conflict (user_id) do update
    set email = excluded.email,
        phone = coalesce(excluded.phone, public.users.phone),
        full_name = coalesce(excluded.full_name, public.users.full_name),
        referrer_id = coalesce(public.users.referrer_id, excluded.referrer_id),
        referral_code = coalesce(public.users.referral_code, excluded.referral_code),
        profile_data = public.users.profile_data || excluded.profile_data,
        last_seen = now();

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Gate earnings by successful deposit for the user's tier
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

  IF NOT public.has_active_deposit(v_user_id, v_tier) THEN
    RAISE EXCEPTION 'deposit required for tier';
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

-- Gate withdrawals by successful deposit for current tier
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_method text,
  p_phone text
)
RETURNS table(
  new_balance numeric,
  scheduled_for date,
  payout_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_user uuid := auth.uid();
  v_balance numeric;
  v_payout_id uuid;
  v_now timestamp := (now() at time zone 'Africa/Nairobi');
  v_date date := v_now::date;
  v_dow int := extract(dow from v_date);
  v_to_tue int;
  v_to_fri int;
  v_sched date;
  v_ref text;
  v_tier smallint;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;

  select tier into v_tier from users where user_id = v_user;
  if v_tier is null then
    raise exception 'user not found';
  end if;

  if not public.has_active_deposit(v_user, v_tier) then
    raise exception 'deposit required for tier';
  end if;

  if v_dow = 2 then
    v_sched := v_date;
  elsif v_dow = 5 then
    v_sched := v_date;
  else
    v_to_tue := (2 - v_dow + 7) % 7;
    v_to_fri := (5 - v_dow + 7) % 7;
    if v_to_tue = 0 then v_to_tue := 7; end if;
    if v_to_fri = 0 then v_to_fri := 7; end if;
    v_sched := v_date + least(v_to_tue, v_to_fri);
  end if;

  select balance into v_balance
  from wallets
  where user_id = v_user
  for update;

  if v_balance is null then
    insert into wallets(user_id, balance, available_for_withdrawal, hold)
    values (v_user, 0, 0, 0)
    returning balance into v_balance;
  end if;

  if v_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  insert into payout_requests(user_id, requested_amount, status, scheduled_for, processed_at)
  values (v_user, p_amount, 'queued', v_sched, null)
  returning payout_requests.payout_id into v_payout_id;

  v_ref := 'payout:' || v_payout_id::text;
  select awt.new_balance into v_balance
  from apply_wallet_tx(v_user, 'withdrawal', -p_amount, v_payout_id, v_ref) as awt;

  insert into audit_logs(actor_id, action, target_table, target_id, meta)
  values (v_user, 'payout_request', 'payout_requests', v_payout_id,
          jsonb_build_object('method', p_method, 'phone', p_phone));

  return query select v_balance, v_sched, v_payout_id;
end;
$$;

GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text) TO authenticated;
