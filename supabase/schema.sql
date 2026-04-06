create extension if not exists pgcrypto;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  allow_open_registration boolean not null default true,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'familyuser')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'familyuser')),
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'familyuser')),
  invited_by_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz null
);

create unique index family_invites_unique_pending_email
on public.family_invites (family_id, lower(email))
where accepted_at is null;

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  quantity text not null,
  category text not null,
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  owner text not null,
  due text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  text text not null,
  tag text not null,
  created_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  date text not null,
  time text not null,
  place text not null,
  created_at timestamptz not null default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  day text not null,
  meal text not null,
  prepared boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  category text not null,
  status text not null,
  link_url text,
  file_path text,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('family-documents', 'family-documents', false)
on conflict (id) do update set public = excluded.public;

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.shopping_items enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.calendar_events enable row level security;
alter table public.meals enable row level security;
alter table public.documents enable row level security;

create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = auth.uid()
  );
$$;

create or replace function public.is_family_admin(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = auth.uid()
      and fm.role = 'admin'
  );
$$;

create or replace function public.is_family_owner(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.families f
    where f.id = target_family_id
      and f.owner_user_id = auth.uid()
  );
$$;

create or replace function public.can_accept_family_invite(target_family_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = target_user_id
    and exists (
      select 1
      from public.family_invites fi
      where fi.family_id = target_family_id
        and lower(fi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and fi.accepted_at is null
    );
$$;

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
      coalesce(bool_or(f.allow_open_registration), false) as open_registration_available
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

create or replace function public.bootstrap_family_for_current_user(target_family_name text)
returns table (
  family_id uuid,
  family_name text,
  role text,
  allow_open_registration boolean,
  is_owner boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_family_name text := trim(coalesce(target_family_name, ''));
  created_family public.families%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if normalized_family_name = '' then
    raise exception 'Bitte einen Familiennamen eingeben.';
  end if;

  insert into public.families (name, owner_user_id)
  values (normalized_family_name, auth.uid())
  returning * into created_family;

  insert into public.family_members (family_id, user_id, role)
  values (created_family.id, auth.uid(), 'familyuser');

  update public.profiles
  set role = 'familyuser'
  where id = auth.uid();

  return query
  select created_family.id, created_family.name, 'familyuser'::text, created_family.allow_open_registration, true;
end;
$$;

grant execute on function public.bootstrap_family_for_current_user(text) to authenticated;

create or replace function public.can_access_document_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select case
    when array_length(storage.foldername(object_name), 1) >= 1
      and (storage.foldername(object_name))[1] ~* '^[0-9a-f-]{36}$'
    then public.is_family_member(((storage.foldername(object_name))[1])::uuid)
    else false
  end;
$$;

    drop function if exists public.accept_family_invite_for_current_user();

create or replace function public.accept_family_invite_for_current_user()
returns table (accepted_invite_id uuid, accepted_family_id uuid, accepted_role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  pending_invite public.family_invites%rowtype;
begin
  if current_user_id is null or current_email = '' then
    return;
  end if;

  select *
  into pending_invite
  from public.family_invites fi
  where lower(fi.email) = current_email
    and fi.accepted_at is null
  order by fi.created_at desc
  for update
  limit 1;

  if pending_invite.id is null then
    return;
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (pending_invite.family_id, current_user_id, pending_invite.role)
  on conflict (family_id, user_id)
  do update set role = excluded.role;

  update public.profiles
  set role = pending_invite.role
  where id = current_user_id;

  update public.family_invites
  set accepted_at = now()
  where id = pending_invite.id
    and lower(email) = current_email
    and accepted_at is null;

  if not found then
    return;
  end if;

  return query
  select pending_invite.id, pending_invite.family_id, pending_invite.role;
end;
$$;

create policy "users can create own profile"
on public.profiles
for insert
with check (id = auth.uid());

create policy "users can view own profile"
on public.profiles
for select
using (id = auth.uid());

create policy "family members can view related profiles"
on public.profiles
for select
using (
  exists (
    select 1
    from public.family_members current_member
    join public.family_members target_member
      on target_member.family_id = current_member.family_id
    where current_member.user_id = auth.uid()
      and target_member.user_id = profiles.id
  )
);

create policy "users can update own profile"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "members can view own family"
on public.families
for select
using (owner_user_id = auth.uid() or public.is_family_member(id));

create policy "authenticated users can create a family"
on public.families
for insert
with check (owner_user_id = auth.uid());

create policy "admins can update own family"
on public.families
for update
using (public.is_family_admin(id))
with check (public.is_family_admin(id));

create policy "members can view family memberships"
on public.family_members
for select
using (public.is_family_member(family_id));

create policy "family members can view family invites"
on public.family_invites
for select
using (
  public.is_family_member(family_id)
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "admins can create family invites"
on public.family_invites
for insert
with check (
  (public.is_family_owner(family_id) or public.is_family_admin(family_id))
  and invited_by_user_id = auth.uid()
);

create policy "admins can update family invites"
on public.family_invites
for update
using (public.is_family_owner(family_id) or public.is_family_admin(family_id))
with check (public.is_family_owner(family_id) or public.is_family_admin(family_id));

create policy "admins can delete family invites"
on public.family_invites
for delete
using (public.is_family_owner(family_id) or public.is_family_admin(family_id));

create policy "admins can add memberships"
on public.family_members
for insert
with check (
  public.is_family_admin(family_id)
  or public.can_accept_family_invite(family_id, user_id)
);

create policy "admins can update memberships"
on public.family_members
for update
using (public.is_family_admin(family_id))
with check (public.is_family_admin(family_id));

create policy "family members can read shopping items"
on public.shopping_items
for select
using (public.is_family_member(family_id));

create policy "family members can insert shopping items"
on public.shopping_items
for insert
with check (public.is_family_member(family_id));

create policy "family members can update shopping items"
on public.shopping_items
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

create policy "family members can read tasks"
on public.tasks
for select
using (public.is_family_member(family_id));

create policy "family members can insert tasks"
on public.tasks
for insert
with check (public.is_family_member(family_id));

create policy "family members can update tasks"
on public.tasks
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

create policy "family members can read notes"
on public.notes
for select
using (public.is_family_member(family_id));

create policy "family members can insert notes"
on public.notes
for insert
with check (public.is_family_member(family_id));

create policy "family members can read calendar events"
on public.calendar_events
for select
using (public.is_family_member(family_id));

create policy "family members can insert calendar events"
on public.calendar_events
for insert
with check (public.is_family_member(family_id));

create policy "family members can read meals"
on public.meals
for select
using (public.is_family_member(family_id));

create policy "family members can insert meals"
on public.meals
for insert
with check (public.is_family_member(family_id));

create policy "family members can update meals"
on public.meals
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

create policy "family members can read documents"
on public.documents
for select
using (public.is_family_member(family_id));

create policy "family members can insert documents"
on public.documents
for insert
with check (public.is_family_member(family_id));

drop policy if exists "family members can update documents" on public.documents;
create policy "family members can update documents"
on public.documents
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

drop policy if exists "family members can delete documents" on public.documents;
create policy "family members can delete documents"
on public.documents
for delete
using (public.is_family_member(family_id));

drop policy if exists "family members can read document files" on storage.objects;
create policy "family members can read document files"
on storage.objects
for select
using (
  bucket_id = 'family-documents'
  and public.can_access_document_object(name)
);

drop policy if exists "family members can upload document files" on storage.objects;
create policy "family members can upload document files"
on storage.objects
for insert
with check (
  bucket_id = 'family-documents'
  and public.can_access_document_object(name)
);

drop policy if exists "family members can delete document files" on storage.objects;
create policy "family members can delete document files"
on storage.objects
for delete
using (
  bucket_id = 'family-documents'
  and public.can_access_document_object(name)
);