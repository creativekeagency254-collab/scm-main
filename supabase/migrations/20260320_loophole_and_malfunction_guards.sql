-- 2026-03-20 Close loopholes + malfunction guards (wallet, statuses, referrals)

-- 1) Harden wallet ledger function: strict validation + idempotent references + no negative balances.
create or replace function public.apply_wallet_tx(
  p_user_id uuid,
  p_type tx_type,
  p_amount numeric,
  p_related_id uuid,
  p_reference text
) returns table(new_balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reference text := nullif(trim(p_reference), '');
  v_balance numeric;
  v_hold numeric;
  v_available numeric;
  v_existing_user uuid;
  v_existing_balance numeric;
begin
  if p_user_id is null then
    raise exception 'user_id required';
  end if;
  if v_reference is null then
    raise exception 'reference required';
  end if;
  if p_amount is null or p_amount = 0 then
    raise exception 'amount must be non-zero';
  end if;

  if p_type in ('deposit', 'referral', 'accrual') and p_amount <= 0 then
    raise exception 'amount must be positive for %', p_type;
  end if;
  if p_type in ('withdrawal', 'fee') and p_amount >= 0 then
    raise exception 'amount must be negative for %', p_type;
  end if;

  -- Idempotency by reference: repeated calls return existing balance instead of failing.
  select t.user_id, t.balance_after
  into v_existing_user, v_existing_balance
  from public.transactions t
  where t.reference = v_reference
  limit 1;

  if found then
    if v_existing_user is distinct from p_user_id then
      raise exception 'reference already used by another user';
    end if;
    return query select coalesce(v_existing_balance, 0);
    return;
  end if;

  select w.balance, w.hold
  into v_balance, v_hold
  from public.wallets w
  where w.user_id = p_user_id
  for update;

  if not found then
    insert into public.wallets(user_id, balance, available_for_withdrawal, hold, updated_at)
    values (p_user_id, 0, 0, 0, now())
    returning balance, hold into v_balance, v_hold;
  end if;

  v_balance := coalesce(v_balance, 0) + p_amount;
  if v_balance < 0 then
    raise exception 'insufficient wallet balance';
  end if;

  v_available := greatest(v_balance - coalesce(v_hold, 0), 0);

  update public.wallets
  set balance = v_balance,
      available_for_withdrawal = v_available,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.transactions(user_id, type, amount, balance_after, related_id, reference, created_at)
  values (p_user_id, p_type, p_amount, v_balance, p_related_id, v_reference, now());

  return query select v_balance;
end;
$$;

revoke all on function public.apply_wallet_tx(uuid, tx_type, numeric, uuid, text) from public;
do $$
begin
  revoke all on function public.apply_wallet_tx(uuid, tx_type, numeric, uuid, text) from anon;
exception
  when undefined_object then null;
end $$;
do $$
begin
  revoke all on function public.apply_wallet_tx(uuid, tx_type, numeric, uuid, text) from authenticated;
exception
  when undefined_object then null;
end $$;
do $$
begin
  grant execute on function public.apply_wallet_tx(uuid, tx_type, numeric, uuid, text) to service_role;
exception
  when undefined_object then null;
end $$;

-- 2) Transaction row guard: type/sign/reference safety even for manual/admin inserts.
create or replace function public.enforce_transaction_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref text := nullif(trim(new.reference), '');
begin
  if new.amount is null or new.amount = 0 then
    raise exception 'transaction amount must be non-zero';
  end if;
  if v_ref is null then
    raise exception 'transaction reference required';
  end if;
  new.reference := v_ref;

  if new.type in ('deposit', 'referral', 'accrual') and new.amount <= 0 then
    raise exception 'amount must be positive for %', new.type;
  end if;
  if new.type in ('withdrawal', 'fee') and new.amount >= 0 then
    raise exception 'amount must be negative for %', new.type;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_transaction_row on public.transactions;
create trigger trg_enforce_transaction_row
  before insert or update of type, amount, reference
  on public.transactions
  for each row
  execute function public.enforce_transaction_row();

-- 3) Deposit status transition guard: prevents illegal downgrades/mutations.
create or replace function public.guard_deposit_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'pending' and new.status in ('success', 'failed', 'refunded') then
    -- allowed
  elsif old.status = 'success' and new.status = 'refunded' then
    -- allowed
  else
    raise exception 'invalid deposit status transition: % -> %', old.status, new.status;
  end if;

  if new.status = 'success' and new.confirmed_at is null then
    new.confirmed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_deposit_status_transition on public.deposits;
create trigger trg_guard_deposit_status_transition
  before update of status on public.deposits
  for each row
  execute function public.guard_deposit_status_transition();

-- 4) Payout status transition guard: blocks reopening finished payouts.
create or replace function public.guard_payout_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'queued' and new.status in ('processing', 'completed', 'failed') then
    -- allowed
  elsif old.status = 'processing' and new.status in ('completed', 'failed') then
    -- allowed
  else
    raise exception 'invalid payout status transition: % -> %', old.status, new.status;
  end if;

  if new.status in ('completed', 'failed') and new.processed_at is null then
    new.processed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_payout_status_transition on public.payout_requests;
create trigger trg_guard_payout_status_transition
  before update of status on public.payout_requests
  for each row
  execute function public.guard_payout_status_transition();

-- 5) Referral anti-abuse constraints.
delete from public.referrals r
where r.referrer_id = r.referred_user_id;

alter table public.referrals
  drop constraint if exists referrals_not_self;
alter table public.referrals
  add constraint referrals_not_self check (referrer_id <> referred_user_id);

with ranked as (
  select
    ref_id,
    row_number() over (
      partition by deposit_id
      order by created_at asc, ref_id asc
    ) as rn
  from public.referrals
  where deposit_id is not null
)
delete from public.referrals r
using ranked d
where r.ref_id = d.ref_id
  and d.rn > 1;

create unique index if not exists referrals_deposit_unique_idx
  on public.referrals(deposit_id)
  where deposit_id is not null;

