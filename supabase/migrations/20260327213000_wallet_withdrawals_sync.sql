-- 2026-03-27 Wallet compatibility columns + withdrawals mirror table
-- Extends existing wallet/payout architecture without replacing core flows.

create extension if not exists pgcrypto;

alter table if exists public.users
  add column if not exists balance numeric(18,2) not null default 0,
  add column if not exists pending_withdrawals numeric(18,2) not null default 0;

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  amount numeric(18,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  source_payout_id uuid unique references public.payout_requests(payout_id) on delete set null
);

create index if not exists withdrawals_user_created_idx
  on public.withdrawals(user_id, created_at desc);

create index if not exists withdrawals_status_created_idx
  on public.withdrawals(status, created_at desc);

alter table if exists public.withdrawals enable row level security;

drop policy if exists withdrawals_select_own_or_admin on public.withdrawals;
create policy withdrawals_select_own_or_admin
  on public.withdrawals
  for select
  using (
    user_id = auth.uid()
    or public.is_admin()
  );

-- Initial backfill for compatibility columns.
update public.users u
set balance = coalesce(w.balance, 0)
from public.wallets w
where w.user_id = u.user_id;

update public.users u
set pending_withdrawals = coalesce(src.pending_amount, 0)
from (
  select
    pr.user_id,
    coalesce(sum(pr.requested_amount), 0) as pending_amount
  from public.payout_requests pr
  where pr.status in ('queued', 'processing')
  group by pr.user_id
) src
where src.user_id = u.user_id;

update public.users
set pending_withdrawals = 0
where user_id not in (
  select distinct pr.user_id
  from public.payout_requests pr
  where pr.status in ('queued', 'processing')
);

-- Backfill withdrawals mirror table from existing payout requests.
insert into public.withdrawals(user_id, amount, status, source_payout_id)
select
  pr.user_id,
  pr.requested_amount,
  case
    when pr.status in ('queued', 'processing') then 'pending'
    when pr.status = 'completed' then 'approved'
    when pr.status = 'failed' then 'rejected'
    else 'pending'
  end,
  pr.payout_id
from public.payout_requests pr
on conflict (source_payout_id)
do update
set
  amount = excluded.amount,
  status = excluded.status;

create or replace function public.sync_user_balance_from_wallets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set balance = coalesce(new.balance, 0)
  where user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_user_balance_from_wallets on public.wallets;
create trigger trg_sync_user_balance_from_wallets
after insert or update of balance
on public.wallets
for each row
execute function public.sync_user_balance_from_wallets();

create or replace function public.refresh_user_pending_withdrawals(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending numeric := 0;
begin
  if p_user_id is null then
    return;
  end if;

  select coalesce(sum(pr.requested_amount), 0)
  into v_pending
  from public.payout_requests pr
  where pr.user_id = p_user_id
    and pr.status in ('queued', 'processing');

  update public.users
  set pending_withdrawals = coalesce(v_pending, 0)
  where user_id = p_user_id;
end;
$$;

create or replace function public.sync_withdrawals_from_payout_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_status text;
begin
  if tg_op = 'DELETE' then
    delete from public.withdrawals
    where source_payout_id = old.payout_id;
    perform public.refresh_user_pending_withdrawals(old.user_id);
    return old;
  end if;

  v_status := case
    when new.status in ('queued', 'processing') then 'pending'
    when new.status = 'completed' then 'approved'
    when new.status = 'failed' then 'rejected'
    else 'pending'
  end;

  insert into public.withdrawals(user_id, amount, status, source_payout_id)
  values (new.user_id, new.requested_amount, v_status, new.payout_id)
  on conflict (source_payout_id)
  do update set
    user_id = excluded.user_id,
    amount = excluded.amount,
    status = excluded.status;

  perform public.refresh_user_pending_withdrawals(v_user);
  return new;
end;
$$;

drop trigger if exists trg_sync_withdrawals_from_payout_requests on public.payout_requests;
create trigger trg_sync_withdrawals_from_payout_requests
after insert or update or delete
on public.payout_requests
for each row
execute function public.sync_withdrawals_from_payout_requests();
