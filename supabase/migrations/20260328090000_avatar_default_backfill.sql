-- 2026-03-28
-- Ensure every user has a default avatar_url when no uploaded profile image exists.

alter table if exists public.users
  add column if not exists avatar_url text;

-- Prefer existing avatar values already saved in profile_data.
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

-- Assign deterministic default illustrated avatars for accounts without uploads.
with avatar_defaults as (
  select array[
    '/avatars/black_king_afro.svg',
    '/avatars/black_dreads_style.svg',
    '/avatars/black_fade_smart.svg',
    '/avatars/black_braids_style.svg',
    '/avatars/black_clean_cut.svg',
    '/avatars/black_stylish_modern.svg',
    '/avatars/black_chill_casual.svg',
    '/avatars/black_confident_leader.svg'
  ]::text[] as avatars
)
update public.users u
set avatar_url = d.avatars[
  1 + (
    get_byte(
      decode(md5(coalesce(u.user_id::text, u.email, 'edisonpay')), 'hex'),
      0
    ) % array_length(d.avatars, 1)
  )
]
from avatar_defaults d
where coalesce(trim(u.avatar_url), '') = ''
  and coalesce(trim(u.profile_data->>'profile_image'), '') = '';

-- Keep profile_data.avatar_url in sync for existing reads.
update public.users
set profile_data = coalesce(profile_data, '{}'::jsonb)
  || jsonb_build_object(
    'avatar_url', avatar_url,
    'updated_at', now()
  )
where coalesce(trim(avatar_url), '') <> ''
  and coalesce(trim(profile_data->>'avatar_url'), '') = '';
