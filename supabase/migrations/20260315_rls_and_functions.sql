-- 2026-03-15 RLS + auth trigger + withdrawal queue for MVP schema

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, row_security = off
as $$
  select exists (
    select 1
    from public.users u
    where u.user_id = auth.uid()
      and coalesce(u.profile_data->>'role', '') = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
      'referred_by', v_ref_code
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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.request_withdrawal(
  p_amount numeric,
  p_method text,
  p_phone text
)
returns table(
  new_balance numeric,
  scheduled_for date,
  payout_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
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
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid amount';
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
  select new_balance into v_balance
  from apply_wallet_tx(v_user, 'withdrawal', -p_amount, v_payout_id, v_ref);

  insert into audit_logs(actor_id, action, target_table, target_id, meta)
  values (v_user, 'payout_request', 'payout_requests', v_payout_id,
          jsonb_build_object('method', p_method, 'phone', p_phone));

  return query select v_balance, v_sched, v_payout_id;
end;
$$;

grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;
do $$
begin
  grant execute on function public.claim_earning(text, integer, text) to authenticated;
exception when undefined_function then
  null;
end $$;

-- RLS policies
alter table if exists public.users enable row level security;
alter table if exists public.wallets enable row level security;
alter table if exists public.deposits enable row level security;
alter table if exists public.transactions enable row level security;
alter table if exists public.video_views enable row level security;
alter table if exists public.referrals enable row level security;
alter table if exists public.payout_requests enable row level security;
alter table if exists public.payout_requests force row level security;
alter table if exists public.audit_logs enable row level security;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select using (
    user_id = auth.uid()
    or referrer_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert with check (user_id = auth.uid());

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists wallets_select_own on public.wallets;
create policy wallets_select_own on public.wallets
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists wallets_insert_self on public.wallets;
create policy wallets_insert_self on public.wallets
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists deposits_select_own on public.deposits;
create policy deposits_select_own on public.deposits
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists video_views_select_own on public.video_views;
create policy video_views_select_own on public.video_views
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists video_views_insert_own on public.video_views;
create policy video_views_insert_own on public.video_views
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own on public.referrals
  for select using (
    referrer_id = auth.uid()
    or referred_user_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists payout_requests_select_own on public.payout_requests;
create policy payout_requests_select_own on public.payout_requests
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists payout_requests_insert_own on public.payout_requests;
create policy payout_requests_insert_own on public.payout_requests
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists payout_requests_update_admin on public.payout_requests;
create policy payout_requests_update_admin on public.payout_requests
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists audit_logs_admin on public.audit_logs;
create policy audit_logs_admin on public.audit_logs
  for select using (public.is_admin());
