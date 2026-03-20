-- 2026-03-20 Admin 1M+ scale pass:
-- - Admin summary RPCs used by the dashboard
-- - Additional partial/BRIN indexes for high-volume read paths

-- High-volume timeline indexes (append-heavy tables).
create index if not exists transactions_created_brin_idx
  on public.transactions using brin(created_at) with (pages_per_range = 64);

create index if not exists deposits_created_brin_idx
  on public.deposits using brin(created_at) with (pages_per_range = 64);

create index if not exists referrals_created_brin_idx
  on public.referrals using brin(created_at) with (pages_per_range = 64);

create index if not exists payout_requests_scheduled_brin_idx
  on public.payout_requests using brin(scheduled_for) with (pages_per_range = 64);

create index if not exists payment_audit_events_created_brin_idx
  on public.payment_audit_events using brin(created_at) with (pages_per_range = 64);

create index if not exists payment_flags_created_brin_idx
  on public.payment_flags using brin(created_at) with (pages_per_range = 64);

create index if not exists tier_upgrade_events_created_brin_idx
  on public.tier_upgrade_events using brin(created_at) with (pages_per_range = 64);

-- Partial indexes for admin counters.
create index if not exists users_active_only_idx
  on public.users(user_id)
  where status = 'active';

create index if not exists users_pending_tier_activation_idx
  on public.users(user_id)
  where not (
    lower(coalesce(profile_data->>'tier_selected', 'false')) in ('1', 't', 'true', 'yes', 'on')
  );

create index if not exists deposits_pending_only_idx
  on public.deposits(created_at desc)
  where status = 'pending';

create index if not exists deposits_failed_only_idx
  on public.deposits(created_at desc)
  where status = 'failed';

create index if not exists payout_requests_pending_only_idx
  on public.payout_requests(scheduled_for desc)
  where status in ('queued', 'processing');

create index if not exists payout_requests_completed_only_idx
  on public.payout_requests(processed_at desc)
  where status = 'completed';

create index if not exists payment_flags_open_only_idx
  on public.payment_flags(created_at desc)
  where status = 'open';

create or replace function public.get_admin_system_overview()
returns table(
  as_of timestamptz,
  total_users bigint,
  active_users bigint,
  suspended_users bigint,
  banned_users bigint,
  pending_deposits bigint,
  successful_deposits bigint,
  failed_deposits bigint,
  refunded_deposits bigint,
  pending_withdrawals bigint,
  processing_withdrawals bigint,
  completed_withdrawals bigint,
  failed_withdrawals bigint,
  completed_withdrawals_amount numeric,
  pending_withdrawals_amount numeric,
  total_referral_commission numeric,
  pending_tier_activation bigint,
  open_payment_flags bigint,
  reviewed_payment_flags bigint,
  resolved_payment_flags bigint,
  tier_upgrade_events_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if not public.is_admin()
     and v_claim_role <> 'service_role'
     and session_user <> 'postgres' then
    raise exception 'admin only';
  end if;

  return query
  with user_counts as (
    select
      count(*)::bigint as total_users,
      count(*) filter (where u.status = 'active')::bigint as active_users,
      count(*) filter (where u.status = 'suspended')::bigint as suspended_users,
      count(*) filter (where u.status = 'banned')::bigint as banned_users,
      count(*) filter (
        where not (
          lower(coalesce(u.profile_data->>'tier_selected', 'false')) in ('1', 't', 'true', 'yes', 'on')
        )
      )::bigint as pending_tier_activation
    from public.users u
  ),
  deposit_counts as (
    select
      count(*) filter (where d.status = 'pending')::bigint as pending_deposits,
      count(*) filter (where d.status = 'success')::bigint as successful_deposits,
      count(*) filter (where d.status = 'failed')::bigint as failed_deposits,
      count(*) filter (where d.status = 'refunded')::bigint as refunded_deposits
    from public.deposits d
  ),
  payout_counts as (
    select
      count(*) filter (where p.status = 'queued')::bigint as pending_withdrawals,
      count(*) filter (where p.status = 'processing')::bigint as processing_withdrawals,
      count(*) filter (where p.status = 'completed')::bigint as completed_withdrawals,
      count(*) filter (where p.status = 'failed')::bigint as failed_withdrawals,
      coalesce(sum(p.requested_amount) filter (where p.status = 'completed'), 0)::numeric as completed_withdrawals_amount,
      coalesce(sum(p.requested_amount) filter (where p.status in ('queued', 'processing')), 0)::numeric as pending_withdrawals_amount
    from public.payout_requests p
  ),
  referral_counts as (
    select coalesce(sum(r.commission_amount), 0)::numeric as total_referral_commission
    from public.referrals r
  ),
  payment_flag_counts as (
    select
      count(*) filter (where f.status = 'open')::bigint as open_payment_flags,
      count(*) filter (where f.status = 'reviewed')::bigint as reviewed_payment_flags,
      count(*) filter (where f.status = 'resolved')::bigint as resolved_payment_flags
    from public.payment_flags f
  ),
  upgrade_counts as (
    select count(*)::bigint as tier_upgrade_events_count
    from public.tier_upgrade_events tue
  )
  select
    now() as as_of,
    uc.total_users,
    uc.active_users,
    uc.suspended_users,
    uc.banned_users,
    dc.pending_deposits,
    dc.successful_deposits,
    dc.failed_deposits,
    dc.refunded_deposits,
    pc.pending_withdrawals,
    pc.processing_withdrawals,
    pc.completed_withdrawals,
    pc.failed_withdrawals,
    pc.completed_withdrawals_amount,
    pc.pending_withdrawals_amount,
    rc.total_referral_commission,
    uc.pending_tier_activation,
    pfc.open_payment_flags,
    pfc.reviewed_payment_flags,
    pfc.resolved_payment_flags,
    ucg.tier_upgrade_events_count
  from user_counts uc
  cross join deposit_counts dc
  cross join payout_counts pc
  cross join referral_counts rc
  cross join payment_flag_counts pfc
  cross join upgrade_counts ucg;
end;
$$;

create or replace function public.get_admin_tier_distribution()
returns table(
  tier smallint,
  user_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if not public.is_admin()
     and v_claim_role <> 'service_role'
     and session_user <> 'postgres' then
    raise exception 'admin only';
  end if;

  return query
  with bucket as (
    select
      case
        when u.tier is null then 1
        when u.tier < 1 then 1
        when u.tier > 5 then 5
        else u.tier
      end::smallint as tier,
      count(*)::bigint as user_count
    from public.users u
    group by 1
  )
  select
    gs.tier::smallint,
    coalesce(b.user_count, 0)::bigint as user_count
  from generate_series(1, 5) as gs(tier)
  left join bucket b
    on b.tier = gs.tier::smallint
  order by gs.tier;
end;
$$;

revoke all on function public.get_admin_system_overview() from public;
revoke all on function public.get_admin_tier_distribution() from public;

do $$
begin
  revoke all on function public.get_admin_system_overview() from anon;
  revoke all on function public.get_admin_tier_distribution() from anon;
exception
  when undefined_object then null;
end $$;

do $$
begin
  grant execute on function public.get_admin_system_overview() to authenticated;
  grant execute on function public.get_admin_tier_distribution() to authenticated;
exception
  when undefined_object then null;
end $$;

do $$
begin
  grant execute on function public.get_admin_system_overview() to service_role;
  grant execute on function public.get_admin_tier_distribution() to service_role;
exception
  when undefined_object then null;
end $$;
