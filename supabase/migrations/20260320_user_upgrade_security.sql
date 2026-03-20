-- 2026-03-20 User profile hardening:
-- prevent self tier/referral tampering and require deposit before tier activation.

create or replace function public.block_sensitive_user_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_tier_selected boolean := lower(coalesce(old.profile_data->>'tier_selected', 'false')) in ('1','t','true','yes','on');
  v_new_tier_selected boolean := lower(coalesce(new.profile_data->>'tier_selected', 'false')) in ('1','t','true','yes','on');
  v_target_tier smallint := coalesce(new.tier, old.tier, 1);
begin
  if auth.uid() is null then
    return new;
  end if;

  if auth.uid() = old.user_id then
    if new.user_id is distinct from old.user_id then
      raise exception 'user_id cannot be changed';
    end if;
    if new.referrer_id is distinct from old.referrer_id then
      raise exception 'referrer_id cannot be changed';
    end if;
    if new.referral_code is distinct from old.referral_code then
      raise exception 'referral_code cannot be changed';
    end if;
    if new.status is distinct from old.status then
      raise exception 'status cannot be changed';
    end if;
    if coalesce(new.profile_data->>'role', 'client') is distinct from coalesce(old.profile_data->>'role', 'client') then
      raise exception 'role cannot be changed';
    end if;
    if coalesce(new.profile_data->>'category', 'Client') is distinct from coalesce(old.profile_data->>'category', 'Client') then
      raise exception 'category cannot be changed';
    end if;
    if coalesce(new.profile_data->>'referred_by', '') is distinct from coalesce(old.profile_data->>'referred_by', '') then
      raise exception 'referred_by cannot be changed';
    end if;

    if new.tier is distinct from old.tier then
      raise exception 'tier is system managed and cannot be changed directly';
    end if;
    if v_target_tier < 1 or v_target_tier > 5 then
      raise exception 'invalid tier value';
    end if;

    if v_new_tier_selected and not v_old_tier_selected then
      if not public.has_active_deposit(old.user_id, v_target_tier) then
        raise exception 'tier selection requires confirmed deposit';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_block_sensitive_user_updates on public.users;
create trigger trg_block_sensitive_user_updates
  before update on public.users
  for each row
  execute function public.block_sensitive_user_updates();

