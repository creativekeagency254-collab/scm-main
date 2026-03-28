-- 2026-03-27
-- Add explicit avatar_url column for compatibility with UI profile avatar defaults.

alter table if exists public.users
  add column if not exists avatar_url text;

-- Backfill avatar_url from existing profile JSON when available.
update public.users
set avatar_url = nullif(
  trim(
    coalesce(
      avatar_url,
      profile_data->>'avatar_url',
      profile_data->>'avatar',
      ''
    )
  ),
  ''
)
where coalesce(trim(avatar_url), '') = '';

create index if not exists users_avatar_url_present_idx
  on public.users (avatar_url)
  where avatar_url is not null;
