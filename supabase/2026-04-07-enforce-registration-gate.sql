alter table public.families
add column if not exists allow_open_registration boolean not null default true;

create or replace function public.get_registration_gate(target_email text)
returns table (
  registration_allowed boolean,
  pending_invite boolean,
  open_registration_available boolean,
  has_existing_families boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(coalesce(target_email, '')));
begin
  return query
  with family_state as (
    select
      count(*)::int as family_count,
      coalesce(bool_and(f.allow_open_registration), false) as open_registration_available
    from public.families f
  ),
  invite_state as (
    select exists (
      select 1
      from public.family_invites fi
      where lower(fi.email) = normalized_email
        and fi.accepted_at is null
    ) as pending_invite
  )
  select
    case
      when normalized_email = '' then false
      when invite_state.pending_invite then true
      when family_state.family_count = 0 then true
      when family_state.open_registration_available then true
      else false
    end as registration_allowed,
    invite_state.pending_invite,
    family_state.open_registration_available,
    family_state.family_count > 0 as has_existing_families
  from family_state
  cross join invite_state;
end;
$$;

create or replace function public.enforce_registration_gate_on_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  registration_gate record;
begin
  select *
  into registration_gate
  from public.get_registration_gate(new.email)
  limit 1;

  if registration_gate is null then
    raise exception 'Der Registrierungsstatus konnte nicht geladen werden.';
  end if;

  if registration_gate.registration_allowed then
    return new;
  end if;

  raise exception 'Registrierung aktuell deaktiviert. Der Admin hat neue Anmeldungen ausgeschaltet. Bitte lass dir eine Einladung schicken.';
end;
$$;

grant execute on function public.get_registration_gate(text) to anon, authenticated;

drop trigger if exists enforce_registration_gate_on_auth_user on auth.users;
create trigger enforce_registration_gate_on_auth_user
before insert on auth.users
for each row
execute function public.enforce_registration_gate_on_auth_user();