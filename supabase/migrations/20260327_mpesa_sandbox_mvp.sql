-- 2026-03-27
-- Daraja (M-Pesa) sandbox MVP schema additions:
-- - courses + course_access
-- - expanded payments fields for environment-aware dashboards
-- - mpesa_stk_requests callback tracking

create extension if not exists pgcrypto;

create table if not exists public.courses (
  course_id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  price numeric(18,2) not null default 0 check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_access (
  access_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  course_id uuid not null references public.courses(course_id) on delete cascade,
  payment_reference text,
  granted_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  plan_id smallint not null check (plan_id > 0),
  provider text not null,
  amount numeric(18,2) not null check (amount > 0),
  currency text not null check (char_length(currency) = 3),
  status text not null default 'pending',
  reference text not null unique,
  created_at timestamptz not null default now()
);

alter table if exists public.payments
  add column if not exists payment_reference text;
alter table if exists public.payments
  add column if not exists payment_type text;
alter table if exists public.payments
  add column if not exists environment text;
alter table if exists public.payments
  add column if not exists payment_timestamp timestamptz;
alter table if exists public.payments
  add column if not exists phone_number text;
alter table if exists public.payments
  add column if not exists course_id uuid references public.courses(course_id) on delete set null;
alter table if exists public.payments
  add column if not exists provider_transaction_id text;
alter table if exists public.payments
  add column if not exists mpesa_receipt text;
alter table if exists public.payments
  add column if not exists callback_received_at timestamptz;
alter table if exists public.payments
  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.payments
  add column if not exists updated_at timestamptz not null default now();

update public.payments
set
  payment_reference = coalesce(nullif(trim(payment_reference), ''), reference),
  payment_type = coalesce(
    nullif(trim(payment_type), ''),
    case
      when provider = 'payflee' then 'card_checkout'
      when provider in ('paynecta', 'mpesa_daraja') then 'CustomerPayBillOnline'
      else 'wallet_deposit'
    end
  ),
  environment = case
    when lower(coalesce(environment, '')) in ('live', 'production', 'prod') then 'live'
    else 'sandbox'
  end,
  payment_timestamp = coalesce(payment_timestamp, created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table if exists public.payments
  alter column payment_reference set not null;
alter table if exists public.payments
  alter column payment_type set default 'wallet_deposit';
alter table if exists public.payments
  alter column payment_type set not null;
alter table if exists public.payments
  alter column environment set default 'sandbox';
alter table if exists public.payments
  alter column environment set not null;
alter table if exists public.payments
  alter column payment_timestamp set default now();
alter table if exists public.payments
  alter column payment_timestamp set not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.payments'::regclass
      and conname = 'payments_provider_check'
  ) then
    alter table public.payments drop constraint payments_provider_check;
  end if;
exception
  when undefined_table then null;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.payments'::regclass
      and conname = 'payments_status_check'
  ) then
    alter table public.payments drop constraint payments_status_check;
  end if;
exception
  when undefined_table then null;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.payments'::regclass
      and conname = 'payments_environment_check'
  ) then
    alter table public.payments drop constraint payments_environment_check;
  end if;
exception
  when undefined_table then null;
end $$;

alter table if exists public.payments
  add constraint payments_provider_check
  check (provider in ('payflee', 'paynecta', 'mpesa_daraja'));

alter table if exists public.payments
  add constraint payments_status_check
  check (status in ('pending', 'success', 'failed'));

alter table if exists public.payments
  add constraint payments_environment_check
  check (environment in ('sandbox', 'live'));

create unique index if not exists payments_payment_reference_idx
  on public.payments(payment_reference);
create index if not exists payments_environment_created_idx
  on public.payments(environment, created_at desc);
create index if not exists payments_type_created_idx
  on public.payments(payment_type, created_at desc);
create index if not exists payments_provider_transaction_idx
  on public.payments(provider_transaction_id);
create index if not exists payments_course_id_idx
  on public.payments(course_id);

create table if not exists public.mpesa_stk_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique references public.payments(reference) on delete cascade,
  user_id uuid not null references public.users(user_id) on delete cascade,
  plan_id smallint not null check (plan_id > 0),
  course_id uuid references public.courses(course_id) on delete set null,
  amount numeric(18,2) not null check (amount > 0),
  phone_number text,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  environment text not null default 'sandbox' check (environment in ('sandbox', 'live')),
  callback_token text not null,
  merchant_request_id text,
  checkout_request_id text,
  result_code integer,
  result_desc text,
  receipt_number text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  query_payload jsonb not null default '{}'::jsonb,
  callback_payload jsonb not null default '{}'::jsonb,
  callback_received_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mpesa_stk_requests_user_created_idx
  on public.mpesa_stk_requests(user_id, created_at desc);
create index if not exists mpesa_stk_requests_status_created_idx
  on public.mpesa_stk_requests(status, created_at desc);
create index if not exists mpesa_stk_requests_checkout_idx
  on public.mpesa_stk_requests(checkout_request_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_payments_touch_updated_at on public.payments;
create trigger trg_payments_touch_updated_at
before update on public.payments
for each row execute function public.touch_updated_at();

drop trigger if exists trg_courses_touch_updated_at on public.courses;
create trigger trg_courses_touch_updated_at
before update on public.courses
for each row execute function public.touch_updated_at();

drop trigger if exists trg_mpesa_stk_requests_touch_updated_at on public.mpesa_stk_requests;
create trigger trg_mpesa_stk_requests_touch_updated_at
before update on public.mpesa_stk_requests
for each row execute function public.touch_updated_at();

alter table if exists public.courses enable row level security;
alter table if exists public.course_access enable row level security;
alter table if exists public.mpesa_stk_requests enable row level security;
alter table if exists public.payments enable row level security;

drop policy if exists courses_select_authenticated on public.courses;
create policy courses_select_authenticated
  on public.courses
  for select
  using (auth.uid() is not null);

drop policy if exists courses_admin_write on public.courses;
create policy courses_admin_write
  on public.courses
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists course_access_select_own_or_admin on public.course_access;
create policy course_access_select_own_or_admin
  on public.course_access
  for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists mpesa_stk_requests_select_own_or_admin on public.mpesa_stk_requests;
create policy mpesa_stk_requests_select_own_or_admin
  on public.mpesa_stk_requests
  for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists payments_select_own_or_admin on public.payments;
create policy payments_select_own_or_admin
  on public.payments
  for select
  using (auth.uid() = user_id or public.is_admin());

