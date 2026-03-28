-- 2026-03-28 Allow secure tier top-up deposits (pay only remaining amount).
-- Keeps full-deposit flow unchanged and only permits top-up when source tier is already funded.

create or replace function public.expected_upgrade_topup_amount(
  p_from_tier smallint,
  p_to_tier smallint
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_from numeric;
  v_to numeric;
begin
  if p_from_tier is null or p_to_tier is null or p_to_tier <= p_from_tier then
    return null;
  end if;
  v_from := public.required_deposit_amount(p_from_tier);
  v_to := public.required_deposit_amount(p_to_tier);
  if v_from is null or v_to is null or v_to <= v_from then
    return null;
  end if;
  return v_to - v_from;
end;
$$;

create or replace function public.enforce_deposit_tier_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected_full numeric;
  v_user_tier smallint;
  v_expected_topup numeric;
  v_has_source_success boolean := false;
begin
  v_expected_full := public.required_deposit_amount(new.tier_at_deposit);
  if v_expected_full is null then
    raise exception 'invalid tier_at_deposit: %', new.tier_at_deposit;
  end if;

  if new.amount is null or new.amount <= 0 then
    raise exception 'invalid deposit amount';
  end if;

  -- Standard full deposit remains valid.
  if new.amount = v_expected_full then
    return new;
  end if;

  -- Top-up path: allow only for users that already funded their current tier.
  select u.tier
    into v_user_tier
  from public.users u
  where u.user_id = new.user_id;

  v_expected_topup := public.expected_upgrade_topup_amount(v_user_tier, new.tier_at_deposit);
  if v_expected_topup is not null and new.amount = v_expected_topup then
    select exists (
      select 1
      from public.deposits d
      where d.user_id = new.user_id
        and d.status = 'success'
        and d.tier_at_deposit = v_user_tier
      limit 1
    ) into v_has_source_success;

    if v_has_source_success then
      return new;
    end if;
  end if;

  raise exception
    'deposit amount % does not match tier % (expected full %, expected top-up %)',
    new.amount, new.tier_at_deposit, v_expected_full, coalesce(v_expected_topup, 0);
end;
$$;
