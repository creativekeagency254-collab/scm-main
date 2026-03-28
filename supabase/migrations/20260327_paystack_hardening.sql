-- 2026-03-27
-- Paystack hardening:
-- - never allow null payment_reference
-- - add paystack_reference field
-- - include paystack in provider constraint

create extension if not exists pgcrypto;

alter table if exists public.payments
  add column if not exists paystack_reference text;

update public.payments
set
  reference = coalesce(
    nullif(trim(reference), ''),
    'PAY-' || (extract(epoch from clock_timestamp())::bigint)::text || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)
  ),
  payment_reference = coalesce(
    nullif(trim(payment_reference), ''),
    nullif(trim(reference), ''),
    'PAY-' || (extract(epoch from clock_timestamp())::bigint)::text || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)
  )
where
  coalesce(nullif(trim(reference), ''), '') = ''
  or coalesce(nullif(trim(payment_reference), ''), '') = '';

update public.payments
set paystack_reference = coalesce(
  nullif(trim(paystack_reference), ''),
  nullif(trim(payment_reference), ''),
  nullif(trim(reference), '')
)
where lower(coalesce(provider, '')) = 'paystack'
  and coalesce(nullif(trim(paystack_reference), ''), '') = '';

alter table if exists public.payments
  alter column payment_reference set not null;

create unique index if not exists payments_payment_reference_idx
  on public.payments(payment_reference);

create index if not exists payments_paystack_reference_idx
  on public.payments(paystack_reference);

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

alter table if exists public.payments
  add constraint payments_provider_check
  check (provider in ('payflee', 'paynecta', 'mpesa_daraja', 'paystack'));

