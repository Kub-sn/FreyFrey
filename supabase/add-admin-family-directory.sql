create or replace function public.get_admin_family_directory()
returns table (
  family_id uuid,
  family_name text,
  allow_open_registration boolean,
  owner_user_id uuid,
  member_user_id uuid,
  member_display_name text,
  member_email text,
  member_role text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    f.name,
    f.allow_open_registration,
    f.owner_user_id,
    fm.user_id,
    p.display_name,
    p.email,
    fm.role
  from public.profiles current_profile
  join public.families f on true
  join public.family_members fm on fm.family_id = f.id
  join public.profiles p on p.id = fm.user_id
  where current_profile.id = auth.uid()
    and current_profile.role = 'admin'
  order by
    lower(f.name),
    case
      when fm.user_id = f.owner_user_id then 0
      when fm.role = 'admin' then 1
      else 2
    end,
    lower(p.display_name),
    lower(p.email);
$$;

grant execute on function public.get_admin_family_directory() to authenticated;