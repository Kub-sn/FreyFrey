create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.create_family_invite_for_current_user(
  target_family_id uuid,
  target_email text,
  target_role text default 'familyuser'
)
returns table (
  id uuid,
  family_id uuid,
  email text,
  role text,
  created_at timestamptz,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text := lower(trim(coalesce(target_email, '')));
  normalized_role text := lower(trim(coalesce(target_role, 'familyuser')));
  invite_row public.family_invites%rowtype;
begin
  if current_user_id is null then
    raise exception 'Die Einladung erfordert eine aktive Anmeldung.';
  end if;

  if target_family_id is null then
    raise exception 'Bitte eine Familie auswaehlen.';
  end if;

  if normalized_email = '' then
    raise exception 'Bitte eine E-Mail-Adresse eingeben.';
  end if;

  if normalized_role not in ('admin', 'familyuser') then
    raise exception 'Die Rolle fuer die Einladung ist ungueltig.';
  end if;

  if public.is_app_admin() then
    null;
  elsif public.is_family_owner(target_family_id) then
    normalized_role := 'familyuser';
  elsif public.is_family_admin(target_family_id) then
    null;
  else
    raise exception 'Du kannst fuer diese Familie keine Einladungen verwalten.';
  end if;

  begin
    insert into public.family_invites (family_id, email, role, invited_by_user_id)
    values (target_family_id, normalized_email, normalized_role, current_user_id)
    returning * into invite_row;
  exception
    when unique_violation then
      update public.family_invites fi
      set
        role = normalized_role,
        invited_by_user_id = current_user_id
      where fi.family_id = target_family_id
        and lower(fi.email) = normalized_email
        and fi.accepted_at is null
      returning * into invite_row;
  end;

  if invite_row.id is null then
    raise exception 'Die Einladung konnte nicht gespeichert werden.';
  end if;

  return query
  select invite_row.id, invite_row.family_id, invite_row.email, invite_row.role, invite_row.created_at, invite_row.accepted_at;
end;
$$;

grant execute on function public.create_family_invite_for_current_user(uuid, text, text) to authenticated;