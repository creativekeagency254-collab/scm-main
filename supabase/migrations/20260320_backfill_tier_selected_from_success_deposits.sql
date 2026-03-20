-- 2026-03-20 Backfill tier activation for users with successful deposits.
-- This fixes legacy rows where profile_data.tier_selected was not persisted.

with successful_deposit_tier as (
  select
    d.user_id,
    max(d.tier_at_deposit)::smallint as max_tier
  from public.deposits d
  where d.status = 'success'
  group by d.user_id
)
update public.users u
set
  tier = greatest(coalesce(u.tier, 1), s.max_tier),
  profile_data = coalesce(u.profile_data, '{}'::jsonb) || jsonb_build_object(
    'tier_selected', true,
    'tier_selected_at', coalesce(u.profile_data->>'tier_selected_at', now()::text),
    'updated_at', now()
  )
from successful_deposit_tier s
where u.user_id = s.user_id
  and (
    lower(coalesce(u.profile_data->>'tier_selected', 'false')) not in ('1', 't', 'true', 'yes', 'on')
    or coalesce(u.tier, 1) < s.max_tier
  );
