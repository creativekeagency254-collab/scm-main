-- 2026-03-19 Fix ambiguous "new_balance" reference in request_withdrawal

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
