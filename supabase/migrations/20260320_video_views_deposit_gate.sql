-- 2026-03-20 block video watch records until required tier deposit is successful

create or replace function public.enforce_video_view_deposit_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier smallint;
begin
  if new.user_id is null then
    raise exception 'user_id is required';
  end if;

  select u.tier into v_tier
  from public.users u
  where u.user_id = new.user_id;

  if v_tier is null then
    raise exception 'user not found';
  end if;

  new.tier := v_tier;

  if public.is_admin() then
    return new;
  end if;

  if new.user_id <> auth.uid() then
    raise exception 'cannot record video view for another user';
  end if;

  if not public.has_active_deposit(new.user_id, v_tier) then
    raise exception 'deposit required before watching videos';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_video_views_deposit_gate on public.video_views;
create trigger trg_video_views_deposit_gate
before insert on public.video_views
for each row
execute function public.enforce_video_view_deposit_gate();

