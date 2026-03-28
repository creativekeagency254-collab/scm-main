-- 2026-03-27 Multi-level referral commissions (L1 10% + L2 2%)
-- Extends existing production-safe flows without rewriting core payment logic.

create extension if not exists pgcrypto;

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  source_user_id uuid not null references public.users(user_id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  amount numeric(18,2) not null check (amount >= 0),
  percentage smallint not null check (percentage in (10, 2)),
  created_at timestamptz not null default now()
);

create index if not exists commissions_user_created_idx
  on public.commissions(user_id, created_at desc);

create index if not exists commissions_source_user_created_idx
  on public.commissions(source_user_id, created_at desc);

create index if not exists commissions_payment_idx
  on public.commissions(payment_id);

create unique index if not exists commissions_user_payment_percentage_uidx
  on public.commissions(user_id, payment_id, percentage);

alter table if exists public.commissions enable row level security;

drop policy if exists commissions_select_own_or_admin on public.commissions;
create policy commissions_select_own_or_admin
  on public.commissions
  for select
  using (
    user_id = auth.uid()
    or public.is_admin()
  );

-- Remove first-deposit-only guard to allow commissions on every successful deposit.
drop index if exists public.referrals_referred_user_first_deposit_unique_idx;

-- Keep existing users visibility + allow reading source users that generated commission rows.
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select
  using (
    user_id = auth.uid()
    or referrer_id = auth.uid()
    or exists (
      select 1
      from public.commissions c
      where c.user_id = auth.uid()
        and c.source_user_id = users.user_id
    )
    or public.is_admin()
  );

create or replace function public.handle_referral_commission(
  p_payment_user_id uuid,
  p_payment_amount numeric,
  p_payment_id uuid,
  p_provider_reference text default null,
  p_deposit_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reference text := nullif(trim(p_provider_reference), '');
  v_level1_user_id uuid;
  v_level2_user_id uuid;
  v_level1_commission numeric;
  v_level2_commission numeric;
  v_inserted integer := 0;
begin
  if p_payment_user_id is null or p_payment_id is null then
    return;
  end if;
  if p_payment_amount is null or p_payment_amount <= 0 then
    return;
  end if;

  select u.referrer_id
  into v_level1_user_id
  from public.users u
  where u.user_id = p_payment_user_id;

  if v_level1_user_id is not null and v_level1_user_id = p_payment_user_id then
    v_level1_user_id := null;
  end if;

  if v_level1_user_id is not null then
    select u.referrer_id
    into v_level2_user_id
    from public.users u
    where u.user_id = v_level1_user_id;

    if v_level2_user_id is not null and (v_level2_user_id = p_payment_user_id or v_level2_user_id = v_level1_user_id) then
      v_level2_user_id := null;
    end if;
  end if;

  if v_level1_user_id is not null then
    v_level1_commission := round(p_payment_amount * 0.10, 2);

    if v_level1_commission > 0 then
      insert into public.commissions(
        user_id,
        source_user_id,
        payment_id,
        amount,
        percentage,
        created_at
      )
      values (
        v_level1_user_id,
        p_payment_user_id,
        p_payment_id,
        v_level1_commission,
        10,
        now()
      )
      on conflict (user_id, payment_id, percentage) do nothing;

      get diagnostics v_inserted = row_count;

      if v_inserted > 0 then
        if p_deposit_id is not null then
          insert into public.referrals(
            referrer_id,
            referred_user_id,
            deposit_id,
            commission_amount,
            created_at
          )
          values (
            v_level1_user_id,
            p_payment_user_id,
            p_deposit_id,
            v_level1_commission,
            now()
          )
          on conflict do nothing;
        end if;

        perform awt.new_balance
        from public.apply_wallet_tx(
          v_level1_user_id,
          'referral',
          v_level1_commission,
          p_deposit_id,
          'ref:l1:' || coalesce(v_reference, p_payment_id::text)
        ) awt;
      end if;
    end if;
  end if;

  if v_level2_user_id is not null then
    v_level2_commission := round(p_payment_amount * 0.02, 2);

    if v_level2_commission > 0 then
      insert into public.commissions(
        user_id,
        source_user_id,
        payment_id,
        amount,
        percentage,
        created_at
      )
      values (
        v_level2_user_id,
        p_payment_user_id,
        p_payment_id,
        v_level2_commission,
        2,
        now()
      )
      on conflict (user_id, payment_id, percentage) do nothing;

      get diagnostics v_inserted = row_count;

      if v_inserted > 0 then
        perform awt.new_balance
        from public.apply_wallet_tx(
          v_level2_user_id,
          'referral',
          v_level2_commission,
          p_deposit_id,
          'ref:l2:' || coalesce(v_reference, p_payment_id::text)
        ) awt;
      end if;
    end if;
  end if;
end;
$$;

revoke all on function public.handle_referral_commission(uuid, numeric, uuid, text, uuid) from public;
do $$
begin
  revoke all on function public.handle_referral_commission(uuid, numeric, uuid, text, uuid) from anon;
exception
  when undefined_object then null;
end $$;
do $$
begin
  revoke all on function public.handle_referral_commission(uuid, numeric, uuid, text, uuid) from authenticated;
exception
  when undefined_object then null;
end $$;
do $$
begin
  grant execute on function public.handle_referral_commission(uuid, numeric, uuid, text, uuid) to service_role;
exception
  when undefined_object then null;
end $$;

create or replace function public.confirm_deposit_success(p_provider_reference text)
returns table(
  updated boolean,
  already boolean,
  deposit_id uuid,
  user_id uuid,
  credited_amount numeric,
  new_balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reference text := nullif(trim(p_provider_reference), '');
  v_dep public.deposits%rowtype;
  v_tx_exists boolean := false;
  v_confirmed_at timestamptz := now();
  v_current_tier smallint;
  v_profile jsonb;
  v_payment_id uuid;
  v_payment_user uuid;
  v_payment_status text;
begin
  if v_reference is null then
    raise exception 'missing provider reference';
  end if;

  select d.* into v_dep
  from public.deposits d
  where d.provider_reference = v_reference
  for update;

  if not found then
    raise exception 'deposit not found';
  end if;

  select exists (
    select 1
    from public.transactions t
    where t.type = 'deposit'
      and (t.related_id = v_dep.deposit_id or t.reference = v_reference)
  ) into v_tx_exists;

  if v_dep.status = 'success' and v_tx_exists then
    begin
      update public.payments
      set status = 'success'
      where reference = v_reference
        and status <> 'success';
    exception
      when undefined_table then null;
    end;

    select w.balance into new_balance
    from public.wallets w
    where w.user_id = v_dep.user_id;

    return query
    select true, true, v_dep.deposit_id, v_dep.user_id, v_dep.amount, coalesce(new_balance, 0);
    return;
  end if;

  update public.deposits d
  set status = 'success',
      confirmed_at = coalesce(confirmed_at, v_confirmed_at)
  where d.deposit_id = v_dep.deposit_id;

  if v_tx_exists then
    select w.balance into new_balance
    from public.wallets w
    where w.user_id = v_dep.user_id;
  else
    select awt.new_balance into new_balance
    from public.apply_wallet_tx(
      v_dep.user_id,
      'deposit',
      v_dep.amount,
      v_dep.deposit_id,
      v_reference
    ) as awt;
  end if;

  select u.tier, u.profile_data
  into v_current_tier, v_profile
  from public.users u
  where u.user_id = v_dep.user_id
  for update;

  if found then
    update public.users
    set tier = greatest(coalesce(v_current_tier, 1), v_dep.tier_at_deposit),
        profile_data = coalesce(v_profile, '{}'::jsonb) || jsonb_build_object(
          'tier_selected', true,
          'tier_selected_at', v_confirmed_at
        ),
        last_seen = v_confirmed_at
    where public.users.user_id = v_dep.user_id;
  end if;

  v_payment_id := null;
  v_payment_user := null;
  v_payment_status := null;

  begin
    update public.payments p
    set status = 'success'
    where p.reference = v_reference
    returning p.id, p.user_id, p.status
    into v_payment_id, v_payment_user, v_payment_status;

    if not found then
      select p.id, p.user_id, p.status
      into v_payment_id, v_payment_user, v_payment_status
      from public.payments p
      where p.reference = v_reference
      limit 1;
    end if;
  exception
    when undefined_table then
      v_payment_id := null;
      v_payment_user := null;
      v_payment_status := null;
  end;

  if v_payment_id is not null
     and v_payment_user = v_dep.user_id
     and coalesce(v_payment_status, 'success') = 'success'
  then
    perform public.handle_referral_commission(
      p_payment_user_id => v_dep.user_id,
      p_payment_amount => v_dep.amount,
      p_payment_id => v_payment_id,
      p_provider_reference => v_reference,
      p_deposit_id => v_dep.deposit_id
    );
  end if;

  return query
  select true, false, v_dep.deposit_id, v_dep.user_id, v_dep.amount, coalesce(new_balance, 0);
end;
$$;

revoke all on function public.confirm_deposit_success(text) from public;
do $$
begin
  revoke all on function public.confirm_deposit_success(text) from anon;
exception
  when undefined_object then null;
end $$;
do $$
begin
  revoke all on function public.confirm_deposit_success(text) from authenticated;
exception
  when undefined_object then null;
end $$;
do $$
begin
  grant execute on function public.confirm_deposit_success(text) to service_role;
exception
  when undefined_object then null;
end $$;

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
    count(distinct case when c.percentage = 10 then c.source_user_id end)::bigint,
    count(distinct case when c.percentage = 10 and coalesce(u.status::text, 'active') = 'active' then c.source_user_id end)::bigint,
    coalesce(sum(c.amount), 0)
  into
    v_ref_count,
    v_active_ref_count,
    v_total_ref_commission
  from public.commissions c
  left join public.users u on u.user_id = c.source_user_id
  where c.user_id = v_user;

  if coalesce(v_ref_count, 0) = 0 and coalesce(v_total_ref_commission, 0) = 0 then
    select
      count(distinct r.referred_user_id)::bigint,
      count(distinct case when coalesce(u.status::text, 'active') = 'active' then r.referred_user_id end)::bigint,
      coalesce(sum(r.commission_amount), 0)
    into
      v_ref_count,
      v_active_ref_count,
      v_total_ref_commission
    from public.referrals r
    left join public.users u on u.user_id = r.referred_user_id
    where r.referrer_id = v_user;
  end if;

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
