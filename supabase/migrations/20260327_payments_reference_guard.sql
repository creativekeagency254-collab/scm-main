-- 2026-03-27
-- Safety net: ensure payments.reference and payments.payment_reference are never null/blank
-- even if an upstream API payload is malformed.

create extension if not exists pgcrypto;

update public.payments
set
  reference = coalesce(
    nullif(trim(reference), ''),
    'pay_' || replace(gen_random_uuid()::text, '-', '')
  ),
  payment_reference = coalesce(
    nullif(trim(payment_reference), ''),
    nullif(trim(reference), ''),
    'pay_' || replace(gen_random_uuid()::text, '-', '')
  )
where
  coalesce(nullif(trim(reference), ''), '') = ''
  or coalesce(nullif(trim(payment_reference), ''), '') = '';

create or replace function public.ensure_payment_references()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null or btrim(new.reference) = '' then
    new.reference := 'pay_' || replace(gen_random_uuid()::text, '-', '');
  end if;

  if new.payment_reference is null or btrim(new.payment_reference) = '' then
    new.payment_reference := new.reference;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payments_ensure_references on public.payments;
create trigger trg_payments_ensure_references
before insert or update on public.payments
for each row
execute function public.ensure_payment_references();
