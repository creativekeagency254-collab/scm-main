-- 2026-03-20 Referral hardening:
-- Award referral commission only on the referred user's first successful deposit.

-- Keep only the earliest deposit-linked referral per referred user.
with ranked as (
  select
    ref_id,
    row_number() over (
      partition by referred_user_id
      order by created_at asc, ref_id asc
    ) as rn
  from public.referrals
  where deposit_id is not null
)
delete from public.referrals r
using ranked d
where r.ref_id = d.ref_id
  and d.rn > 1;

create unique index if not exists referrals_referred_user_first_deposit_unique_idx
  on public.referrals(referred_user_id)
  where deposit_id is not null;

create or replace function public.confirm_deposit_success(p_provider_reference text)
returns table(
  updated boolean,
  already boolean,
  deposit_id uuid,
  user_id uuid,
  credited_amount numeric,
  new_balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reference text := nullif(trim(p_provider_reference), '');
  v_dep public.deposits%rowtype;
  v_tx_exists boolean := false;
  v_confirmed_at timestamptz := now();
  v_current_tier smallint;
  v_profile jsonb;
  v_referrer uuid;
  v_commission numeric;
  v_has_prior_success boolean := false;
  v_ref_insert_count integer := 0;
  v_ref_tx_exists boolean := false;
begin
  if v_reference is null then
    raise exception 'missing provider reference';
  end if;

  select d.* into v_dep
  from public.deposits d
  where d.provider_reference = v_reference
  for update;

  if not found then
    raise exception 'deposit not found';
  end if;

  select exists (
    select 1
    from public.transactions t
    where t.type = 'deposit'
      and (t.related_id = v_dep.deposit_id or t.reference = v_reference)
  ) into v_tx_exists;

  if v_dep.status = 'success' and v_tx_exists then
    select w.balance into new_balance
    from public.wallets w
    where w.user_id = v_dep.user_id;

    return query
    select true, true, v_dep.deposit_id, v_dep.user_id, v_dep.amount, coalesce(new_balance, 0);
    return;
  end if;

  update public.deposits d
  set status = 'success',
      confirmed_at = coalesce(confirmed_at, v_confirmed_at)
  where d.deposit_id = v_dep.deposit_id;

  if v_tx_exists then
    select w.balance into new_balance
    from public.wallets w
    where w.user_id = v_dep.user_id;
  else
    select awt.new_balance into new_balance
    from public.apply_wallet_tx(
      v_dep.user_id,
      'deposit',
      v_dep.amount,
      v_dep.deposit_id,
      v_reference
    ) as awt;
  end if;

  select u.tier, u.profile_data
  into v_current_tier, v_profile
  from public.users u
  where u.user_id = v_dep.user_id
  for update;

  if found then
    update public.users
    set tier = greatest(coalesce(v_current_tier, 1), v_dep.tier_at_deposit),
        profile_data = coalesce(v_profile, '{}'::jsonb) || jsonb_build_object(
          'tier_selected', true,
          'tier_selected_at', v_confirmed_at
        ),
        last_seen = v_confirmed_at
    where public.users.user_id = v_dep.user_id;
  end if;

  -- Referral payout: only first successful deposit for the referred user.
  select u.referrer_id
  into v_referrer
  from public.users u
  where u.user_id = v_dep.user_id;

  select exists (
    select 1
    from public.deposits d
    where d.user_id = v_dep.user_id
      and d.status = 'success'
      and d.deposit_id <> v_dep.deposit_id
  ) into v_has_prior_success;

  if v_referrer is not null and not v_has_prior_success then
    v_commission := round(v_dep.amount * 0.10, 2);

    insert into public.referrals(
      referrer_id,
      referred_user_id,
      deposit_id,
      commission_amount,
      created_at
    )
    values (
      v_referrer,
      v_dep.user_id,
      v_dep.deposit_id,
      v_commission,
      v_confirmed_at
    )
    on conflict do nothing;

    get diagnostics v_ref_insert_count = row_count;

    if v_ref_insert_count > 0 then
      select exists (
        select 1
        from public.transactions t
        where t.reference = 'ref:' || v_reference
      ) into v_ref_tx_exists;

      if not v_ref_tx_exists then
        perform awt.new_balance
        from public.apply_wallet_tx(
          v_referrer,
          'referral',
          v_commission,
          v_dep.deposit_id,
          'ref:' || v_reference
        ) awt;
      end if;
    end if;
  end if;

  return query
  select true, false, v_dep.deposit_id, v_dep.user_id, v_dep.amount, coalesce(new_balance, 0);
end;
$$;

revoke all on function public.confirm_deposit_success(text) from public;
do $$
begin
  revoke all on function public.confirm_deposit_success(text) from anon;
exception
  when undefined_object then null;
end $$;
do $$
begin
  revoke all on function public.confirm_deposit_success(text) from authenticated;
exception
  when undefined_object then null;
end $$;
do $$
begin
  grant execute on function public.confirm_deposit_success(text) to service_role;
exception
  when undefined_object then null;
end $$;
