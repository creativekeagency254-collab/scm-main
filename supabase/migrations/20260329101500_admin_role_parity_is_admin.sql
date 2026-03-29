-- Ensure admin RLS checks match application role tokens.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select coalesce(u.profile_data, '{}'::jsonb) as profile_data
    from public.users u
    where u.user_id = auth.uid()
    limit 1
  ),
  normalized as (
    select
      lower(regexp_replace(coalesce(profile_data->>'role', ''), '\s+', '_', 'g')) as role_token,
      lower(regexp_replace(coalesce(profile_data->>'user_role', ''), '\s+', '_', 'g')) as user_role_token,
      lower(regexp_replace(coalesce(profile_data->>'category', ''), '\s+', '_', 'g')) as category_token,
      lower(regexp_replace(coalesce(profile_data->>'user_category', ''), '\s+', '_', 'g')) as user_category_token,
      case
        when jsonb_typeof(profile_data->'roles') = 'array' then profile_data->'roles'
        else '[]'::jsonb
      end as role_list
    from me
  )
  select exists (
    select 1
    from normalized n
    where n.role_token in ('admin', 'admins', 'administrator', 'administrators', 'superadmin', 'super_admin', 'owner')
      or n.user_role_token in ('admin', 'admins', 'administrator', 'administrators', 'superadmin', 'super_admin', 'owner')
      or n.category_token in ('admin', 'admins', 'administrator', 'administrators', 'superadmin', 'super_admin', 'owner')
      or n.user_category_token in ('admin', 'admins', 'administrator', 'administrators', 'superadmin', 'super_admin', 'owner')
      or exists (
        select 1
        from jsonb_array_elements_text(n.role_list) as r(value)
        where lower(regexp_replace(coalesce(r.value, ''), '\s+', '_', 'g'))
          in ('admin', 'admins', 'administrator', 'administrators', 'superadmin', 'super_admin', 'owner')
      )
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;
