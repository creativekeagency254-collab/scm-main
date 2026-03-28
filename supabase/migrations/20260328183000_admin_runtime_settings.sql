begin;

create table if not exists public.app_runtime_settings (
  settings_key text primary key default 'global',
  withdrawal_days jsonb not null default '{"tue": true, "fri": true}'::jsonb,
  video_price numeric not null default 50 check (video_price > 0),
  maintenance_mode boolean not null default false,
  payout_mode text not null default 'manual' check (payout_mode in ('manual', 'auto')),
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.users(user_id) on delete set null
);

insert into public.app_runtime_settings (settings_key)
values ('global')
on conflict (settings_key) do nothing;

alter table public.app_runtime_settings enable row level security;

drop policy if exists app_runtime_settings_select_all on public.app_runtime_settings;
create policy app_runtime_settings_select_all
on public.app_runtime_settings
for select
to authenticated
using (true);

drop policy if exists app_runtime_settings_insert_admin on public.app_runtime_settings;
create policy app_runtime_settings_insert_admin
on public.app_runtime_settings
for insert
to authenticated
with check (public.is_admin());

drop policy if exists app_runtime_settings_update_admin on public.app_runtime_settings;
create policy app_runtime_settings_update_admin
on public.app_runtime_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.app_runtime_settings to anon;
grant select on public.app_runtime_settings to authenticated;
grant insert, update on public.app_runtime_settings to authenticated;

commit;
