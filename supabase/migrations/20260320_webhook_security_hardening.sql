-- 2026-03-20 Webhook security hardening:
-- - durable replay protection via unique webhook event keys
-- - service-role-only registration function

create extension if not exists pgcrypto;

create table if not exists public.payment_webhook_receipts (
  receipt_id uuid primary key default gen_random_uuid(),
  provider text not null default 'kora',
  source text not null default 'webhook' check (source in ('webhook', 'verify', 'manual')),
  event_key text not null,
  tracking_id text,
  merchant_reference text,
  signature text,
  payload_hash text,
  created_at timestamptz not null default now()
);

create unique index if not exists payment_webhook_receipts_event_key_uidx
  on public.payment_webhook_receipts(event_key);

create index if not exists payment_webhook_receipts_created_idx
  on public.payment_webhook_receipts(created_at desc);

create index if not exists payment_webhook_receipts_tracking_idx
  on public.payment_webhook_receipts(tracking_id, created_at desc);

create index if not exists payment_webhook_receipts_reference_idx
  on public.payment_webhook_receipts(merchant_reference, created_at desc);

alter table if exists public.payment_webhook_receipts enable row level security;

drop policy if exists payment_webhook_receipts_admin_select on public.payment_webhook_receipts;
create policy payment_webhook_receipts_admin_select
  on public.payment_webhook_receipts
  for select
  using (public.is_admin());

create or replace function public.register_payment_webhook_receipt(
  p_event_key text,
  p_provider text default 'kora',
  p_source text default 'webhook',
  p_tracking_id text default null,
  p_merchant_reference text default null,
  p_signature text default null,
  p_payload_hash text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_key text := nullif(trim(p_event_key), '');
  v_source text := lower(coalesce(nullif(trim(p_source), ''), 'webhook'));
  v_receipt_id uuid;
begin
  if v_event_key is null then
    raise exception 'event key required';
  end if;
  if v_source not in ('webhook', 'verify', 'manual') then
    raise exception 'invalid source';
  end if;

  insert into public.payment_webhook_receipts(
    provider,
    source,
    event_key,
    tracking_id,
    merchant_reference,
    signature,
    payload_hash
  )
  values (
    lower(coalesce(nullif(trim(p_provider), ''), 'kora')),
    v_source,
    v_event_key,
    nullif(trim(p_tracking_id), ''),
    nullif(trim(p_merchant_reference), ''),
    nullif(trim(p_signature), ''),
    nullif(trim(p_payload_hash), '')
  )
  on conflict (event_key) do nothing
  returning receipt_id into v_receipt_id;

  return v_receipt_id is not null;
end;
$$;

revoke all on function public.register_payment_webhook_receipt(text, text, text, text, text, text, text) from public;
do $$
begin
  revoke all on function public.register_payment_webhook_receipt(text, text, text, text, text, text, text) from anon;
exception
  when undefined_object then null;
end $$;
do $$
begin
  revoke all on function public.register_payment_webhook_receipt(text, text, text, text, text, text, text) from authenticated;
exception
  when undefined_object then null;
end $$;
do $$
begin
  grant execute on function public.register_payment_webhook_receipt(text, text, text, text, text, text, text) to service_role;
exception
  when undefined_object then null;
end $$;
