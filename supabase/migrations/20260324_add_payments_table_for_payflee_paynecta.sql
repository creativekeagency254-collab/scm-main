-- 2026-03-24
-- Add dedicated payments table for provider split (Payflee + Paynecta).

create extension if not exists pgcrypto;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  plan_id smallint not null check (plan_id > 0),
  provider text not null check (provider in ('payflee', 'paynecta')),
  amount numeric(18,2) not null check (amount > 0),
  currency text not null check (char_length(currency) = 3),
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  reference text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_created_idx
  on public.payments(user_id, created_at desc);

create index if not exists payments_status_provider_created_idx
  on public.payments(status, provider, created_at desc);

create index if not exists payments_reference_idx
  on public.payments(reference);

alter table if exists public.payments enable row level security;

drop policy if exists payments_select_own_or_admin on public.payments;
create policy payments_select_own_or_admin
  on public.payments
  for select
  using (auth.uid() = user_id or public.is_admin());

