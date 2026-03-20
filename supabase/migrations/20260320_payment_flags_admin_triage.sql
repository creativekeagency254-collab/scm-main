-- 2026-03-20 Admin triage controls for payment flags.

alter table if exists public.payment_flags enable row level security;

drop policy if exists payment_flags_admin_update on public.payment_flags;
create policy payment_flags_admin_update
  on public.payment_flags
  for update
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.touch_payment_flag_resolution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status in ('resolved', 'ignored') then
      new.resolved_at := coalesce(new.resolved_at, now());
    elsif new.status in ('open', 'reviewed') then
      new.resolved_at := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_touch_payment_flag_resolution on public.payment_flags;
create trigger trg_touch_payment_flag_resolution
  before update of status, resolved_at
  on public.payment_flags
  for each row
  execute function public.touch_payment_flag_resolution();
