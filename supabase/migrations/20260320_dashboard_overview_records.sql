-- 2026-03-20 Dashboard records: tier-upgrade history + overview metrics RPC

create extension if not exists pgcrypto;

create table if not exists public.tier_upgrade_events (
  event_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  from_tier smallint not null,
  to_tier smallint not null,
  source text not null default 'system' check (source in ('user', 'admin', 'system', 'deposit_confirmed', 'manual')),
  deposit_id uuid references public.deposits(deposit_id),
  provider_reference text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (to_tier > from_tier)
);

create index if not exists tier_upgrade_events_user_created_idx
  on public.tier_upgrade_events(user_id, created_at desc);
create index if not exists tier_upgrade_events_to_tier_created_idx
  on public.tier_upgrade_events(to_tier, created_at desc);

alter table if exists public.tier_upgrade_events enable row level security;

drop policy if exists tier_upgrade_events_select_own on public.tier_upgrade_events;
create policy tier_upgrade_events_select_own
  on public.tier_upgrade_events
  for select
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.log_tier_upgrade_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source text;
  v_dep_id uuid;
  v_provider_ref text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if coalesce(new.tier, 0) <= coalesce(old.tier, 0) then
    return new;
  end if;

  v_source := nullif(current_setting('app.tier_upgrade_source', true), '');
  if v_source is null then
    if auth.uid() = new.user_id then
      v_source := 'user';
    elsif auth.uid() is null then
      v_source := 'system';
    elsif public.is_admin() then
      v_source := 'admin';
    else
      v_source := 'system';
    end if;
  end if;
  if v_source not in ('user', 'admin', 'system', 'deposit_confirmed', 'manual') then
    v_source := 'system';
  end if;

  select d.deposit_id, d.provider_reference
  into v_dep_id, v_provider_ref
  from public.deposits d
  where d.user_id = new.user_id
    and d.status = 'success'
    and d.tier_at_deposit = new.tier
  order by coalesce(d.confirmed_at, d.created_at) desc
  limit 1;

  insert into public.tier_upgrade_events(
    user_id,
    from_tier,
    to_tier,
    source,
    deposit_id,
    provider_reference,
    meta,
    created_at
  )
  values (
    new.user_id,
    old.tier,
    new.tier,
    v_source,
    v_dep_id,
    v_provider_ref,
    jsonb_build_object(
      'user_status', new.status,
      'tier_selected', coalesce((new.profile_data->>'tier_selected')::boolean, false)
    ),
    now()
  );

  return new;
end;
$$;

drop trigger if exists trg_log_tier_upgrade on public.users;
create trigger trg_log_tier_upgrade
  after update of tier on public.users
  for each row
  execute function public.log_tier_upgrade_event();

create or replace function public.get_my_dashboard_overview(p_tier smallint default null)
returns table(
  as_of timestamptz,
  user_id uuid,
  current_tier smallint,
  active_tier smallint,
  tier_deposit_required numeric,
  tier_has_success_deposit boolean,
  next_tier smallint,
  next_tier_deposit_required numeric,
  wallet_balance numeric,
  wallet_available_for_withdrawal numeric,
  wallet_hold numeric,
  first_success_deposit_amount numeric,
  first_success_deposit_at timestamptz,
  latest_success_deposit_amount numeric,
  latest_success_deposit_at timestamptz,
  total_deposits_count bigint,
  total_deposits_amount numeric,
  total_withdrawals_count bigint,
  total_withdrawals_amount numeric,
  pending_withdrawals_count bigint,
  pending_withdrawals_amount numeric,
  completed_withdrawals_count bigint,
  completed_withdrawals_amount numeric,
  total_transactions_count bigint,
  total_transactions_inflow numeric,
  total_transactions_outflow numeric,
  video_earnings_total numeric,
  referral_earnings_total numeric,
  referral_count bigint,
  active_referral_count bigint,
  total_referral_commission numeric,
  required_videos_today integer,
  optional_videos_today integer,
  tier_upgrade_count bigint,
  last_tier_upgrade_at timestamptz,
  progress_target_amount numeric,
  progress_earned_amount numeric,
  progress_percent numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  v_today date := (v_now at time zone 'Africa/Nairobi')::date;
  v_current_tier smallint := 1;
  v_active_tier smallint := 1;
  v_tier_required numeric := 0;
  v_next_tier smallint := null;
  v_next_required numeric := null;
  v_tier_has_success boolean := false;
  v_wallet_balance numeric := 0;
  v_wallet_available numeric := 0;
  v_wallet_hold numeric := 0;
  v_first_dep_amount numeric := 0;
  v_first_dep_at timestamptz := null;
  v_latest_dep_amount numeric := 0;
  v_latest_dep_at timestamptz := null;
  v_total_dep_count bigint := 0;
  v_total_dep_amount numeric := 0;
  v_total_wd_count bigint := 0;
  v_total_wd_amount numeric := 0;
  v_pending_wd_count bigint := 0;
  v_pending_wd_amount numeric := 0;
  v_completed_wd_count bigint := 0;
  v_completed_wd_amount numeric := 0;
  v_total_tx_count bigint := 0;
  v_total_tx_inflow numeric := 0;
  v_total_tx_outflow numeric := 0;
  v_video_earnings numeric := 0;
  v_referral_earnings numeric := 0;
  v_ref_count bigint := 0;
  v_active_ref_count bigint := 0;
  v_total_ref_commission numeric := 0;
  v_required_today integer := 0;
  v_optional_today integer := 0;
  v_upgrade_count bigint := 0;
  v_last_upgrade_at timestamptz := null;
  v_progress_target numeric := 0;
  v_progress_earned numeric := 0;
  v_progress_pct numeric := 0;
begin
  if v_user is null then
    raise exception 'unauthenticated';
  end if;

  select coalesce(u.tier, 1)
  into v_current_tier
  from public.users u
  where u.user_id = v_user;

  if not found then
    raise exception 'user not found';
  end if;

  v_active_tier := coalesce(nullif(p_tier, 0), v_current_tier);
  if v_active_tier < 1 then v_active_tier := 1; end if;
  if v_active_tier > 5 then v_active_tier := 5; end if;

  v_tier_required := coalesce(public.required_deposit_amount(v_active_tier), 0);
  v_next_tier := case when v_active_tier >= 5 then null else v_active_tier + 1 end;
  v_next_required := case when v_next_tier is null then null else public.required_deposit_amount(v_next_tier) end;

  select exists (
    select 1
    from public.deposits d
    where d.user_id = v_user
      and d.status = 'success'
      and d.tier_at_deposit = v_active_tier
  ) into v_tier_has_success;

  select
    coalesce(w.balance, 0),
    coalesce(w.available_for_withdrawal, 0),
    coalesce(w.hold, 0)
  into
    v_wallet_balance,
    v_wallet_available,
    v_wallet_hold
  from public.wallets w
  where w.user_id = v_user;

  select
    count(*)::bigint,
    coalesce(sum(d.amount), 0)
  into
    v_total_dep_count,
    v_total_dep_amount
  from public.deposits d
  where d.user_id = v_user
    and d.status = 'success';

  select
    d.amount,
    coalesce(d.confirmed_at, d.created_at)
  into
    v_first_dep_amount,
    v_first_dep_at
  from public.deposits d
  where d.user_id = v_user
    and d.status = 'success'
  order by coalesce(d.confirmed_at, d.created_at) asc
  limit 1;

  select
    d.amount,
    coalesce(d.confirmed_at, d.created_at)
  into
    v_latest_dep_amount,
    v_latest_dep_at
  from public.deposits d
  where d.user_id = v_user
    and d.status = 'success'
  order by coalesce(d.confirmed_at, d.created_at) desc
  limit 1;

  select
    count(*)::bigint,
    coalesce(sum(pr.requested_amount), 0),
    count(*) filter (where pr.status in ('queued', 'processing'))::bigint,
    coalesce(sum(pr.requested_amount) filter (where pr.status in ('queued', 'processing')), 0),
    count(*) filter (where pr.status = 'completed')::bigint,
    coalesce(sum(pr.requested_amount) filter (where pr.status = 'completed'), 0)
  into
    v_total_wd_count,
    v_total_wd_amount,
    v_pending_wd_count,
    v_pending_wd_amount,
    v_completed_wd_count,
    v_completed_wd_amount
  from public.payout_requests pr
  where pr.user_id = v_user;

  select
    count(*)::bigint,
    coalesce(sum(case when t.amount > 0 then t.amount else 0 end), 0),
    coalesce(sum(case when t.amount < 0 then abs(t.amount) else 0 end), 0),
    coalesce(sum(case when t.type = 'accrual' and t.amount > 0 then t.amount else 0 end), 0),
    coalesce(sum(case when t.type = 'referral' and t.amount > 0 then t.amount else 0 end), 0)
  into
    v_total_tx_count,
    v_total_tx_inflow,
    v_total_tx_outflow,
    v_video_earnings,
    v_referral_earnings
  from public.transactions t
  where t.user_id = v_user;

  select
    count(*)::bigint,
    count(*) filter (where coalesce(u.status, 'active') = 'active')::bigint,
    coalesce(sum(r.commission_amount), 0)
  into
    v_ref_count,
    v_active_ref_count,
    v_total_ref_commission
  from public.referrals r
  left join public.users u on u.user_id = r.referred_user_id
  where r.referrer_id = v_user;

  select
    count(*) filter (where vv.is_required = true)::integer,
    count(*) filter (where vv.is_required = false)::integer
  into
    v_required_today,
    v_optional_today
  from public.video_views vv
  where vv.user_id = v_user
    and coalesce(vv.watched_day, (vv.watched_at at time zone 'Africa/Nairobi')::date) = v_today;

  select
    count(*)::bigint,
    max(tue.created_at)
  into
    v_upgrade_count,
    v_last_upgrade_at
  from public.tier_upgrade_events tue
  where tue.user_id = v_user;

  if coalesce(v_first_dep_amount, 0) > 0 then
    v_progress_target := v_first_dep_amount * 3;
  else
    v_progress_target := coalesce(v_tier_required, 0) * 3;
  end if;

  v_progress_earned := greatest(0, coalesce(v_video_earnings, 0) + coalesce(v_referral_earnings, 0));

  if coalesce(v_progress_target, 0) > 0 then
    v_progress_pct := round((v_progress_earned / v_progress_target) * 100, 2);
  else
    v_progress_pct := 0;
  end if;

  return query
  select
    v_now,
    v_user,
    v_current_tier,
    v_active_tier,
    coalesce(v_tier_required, 0),
    coalesce(v_tier_has_success, false),
    v_next_tier,
    v_next_required,
    coalesce(v_wallet_balance, 0),
    coalesce(v_wallet_available, 0),
    coalesce(v_wallet_hold, 0),
    nullif(v_first_dep_amount, 0),
    v_first_dep_at,
    nullif(v_latest_dep_amount, 0),
    v_latest_dep_at,
    coalesce(v_total_dep_count, 0),
    coalesce(v_total_dep_amount, 0),
    coalesce(v_total_wd_count, 0),
    coalesce(v_total_wd_amount, 0),
    coalesce(v_pending_wd_count, 0),
    coalesce(v_pending_wd_amount, 0),
    coalesce(v_completed_wd_count, 0),
    coalesce(v_completed_wd_amount, 0),
    coalesce(v_total_tx_count, 0),
    coalesce(v_total_tx_inflow, 0),
    coalesce(v_total_tx_outflow, 0),
    coalesce(v_video_earnings, 0),
    coalesce(v_referral_earnings, 0),
    coalesce(v_ref_count, 0),
    coalesce(v_active_ref_count, 0),
    coalesce(v_total_ref_commission, 0),
    coalesce(v_required_today, 0),
    coalesce(v_optional_today, 0),
    coalesce(v_upgrade_count, 0),
    v_last_upgrade_at,
    coalesce(v_progress_target, 0),
    coalesce(v_progress_earned, 0),
    greatest(0, coalesce(v_progress_pct, 0));
end;
$$;

revoke all on function public.get_my_dashboard_overview(smallint) from public;
do $$
begin
  revoke all on function public.get_my_dashboard_overview(smallint) from anon;
exception
  when undefined_object then null;
end $$;
do $$
begin
  grant execute on function public.get_my_dashboard_overview(smallint) to authenticated;
exception
  when undefined_object then null;
end $$;
do $$
begin
  grant execute on function public.get_my_dashboard_overview(smallint) to service_role;
exception
  when undefined_object then null;
end $$;
