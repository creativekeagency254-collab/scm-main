-- 2026-03-22 Switch payment provider defaults from kora to fonbnk

alter table if exists public.payment_audit_events
  alter column provider set default 'fonbnk';

alter table if exists public.payment_flags
  alter column provider set default 'fonbnk';

alter table if exists public.payment_webhook_receipts
  alter column provider set default 'fonbnk';

update public.payment_audit_events
set provider = 'fonbnk'
where lower(coalesce(provider, '')) = 'kora';

update public.payment_flags
set provider = 'fonbnk'
where lower(coalesce(provider, '')) = 'kora';

update public.payment_webhook_receipts
set provider = 'fonbnk'
where lower(coalesce(provider, '')) = 'kora';

create or replace function public.register_payment_webhook_receipt(
  p_event_key text,
  p_provider text default 'fonbnk',
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
    lower(coalesce(nullif(trim(p_provider), ''), 'fonbnk')),
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
