-- 2026-03-20 Payments anti-fraud telemetry + scale-oriented indexes

create extension if not exists pgcrypto;

create table if not exists public.payment_audit_events (
  event_id uuid primary key default gen_random_uuid(),
  provider text not null default 'kora',
  source text not null check (source in ('verify', 'webhook', 'reconcile', 'manual')),
  tracking_id text,
  merchant_reference text,
  decision text not null check (decision in ('pending', 'success', 'failed', 'rejected', 'error')),
  expected_amount numeric(18,2),
  provider_amount numeric(18,2),
  currency text,
  ip text,
  user_agent text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_audit_events_created_idx
  on public.payment_audit_events(created_at desc);
create index if not exists payment_audit_events_reference_idx
  on public.payment_audit_events(merchant_reference, created_at desc);
create index if not exists payment_audit_events_tracking_idx
  on public.payment_audit_events(tracking_id, created_at desc);

create table if not exists public.payment_flags (
  flag_id uuid primary key default gen_random_uuid(),
  provider text not null default 'kora',
  source text not null check (source in ('verify', 'webhook', 'reconcile', 'manual')),
  reason text not null,
  merchant_reference text,
  tracking_id text,
  expected_amount numeric(18,2),
  provider_amount numeric(18,2),
  currency text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved', 'ignored')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists payment_flags_status_created_idx
  on public.payment_flags(status, created_at desc);
create index if not exists payment_flags_reference_idx
  on public.payment_flags(merchant_reference, created_at desc);
create index if not exists payment_flags_tracking_idx
  on public.payment_flags(tracking_id, created_at desc);

-- 1M+ user readiness: non-breaking indexes for common access paths.
create index if not exists users_tier_status_signup_idx
  on public.users(tier, status, signup_at desc);

create index if not exists deposits_user_created_idx
  on public.deposits(user_id, created_at desc);
create index if not exists deposits_status_tier_created_idx
  on public.deposits(status, tier_at_deposit, created_at desc);

create index if not exists transactions_type_created_idx
  on public.transactions(type, created_at desc);
create index if not exists transactions_related_created_idx
  on public.transactions(related_id, created_at desc);

create index if not exists video_views_user_day_required_idx
  on public.video_views(user_id, watched_day, is_required);

create index if not exists payout_requests_status_sched_processed_idx
  on public.payout_requests(status, scheduled_for, processed_at);

alter table if exists public.payment_audit_events enable row level security;
alter table if exists public.payment_flags enable row level security;

drop policy if exists payment_audit_events_admin_select on public.payment_audit_events;
create policy payment_audit_events_admin_select
  on public.payment_audit_events
  for select
  using (public.is_admin());

drop policy if exists payment_flags_admin_select on public.payment_flags;
create policy payment_flags_admin_select
  on public.payment_flags
  for select
  using (public.is_admin());
