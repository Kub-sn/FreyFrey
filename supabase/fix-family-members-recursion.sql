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

drop policy if exists "members can view own family" on public.families;
create policy "members can view own family"
on public.families
for select
using (owner_user_id = auth.uid() or public.is_family_member(id));

drop policy if exists "members can view family memberships" on public.family_members;
create policy "members can view family memberships"
on public.family_members
for select
using (public.is_family_member(family_id));

drop policy if exists "owners and admins can add memberships" on public.family_members;
create policy "owners and admins can add memberships"
on public.family_members
for insert
with check (
  exists (
    select 1
    from public.families f
    where f.id = family_members.family_id
      and f.owner_user_id = auth.uid()
  )
  or public.is_family_admin(family_id)
);

drop policy if exists "admins can update memberships" on public.family_members;
create policy "admins can update memberships"
on public.family_members
for update
using (public.is_family_admin(family_id))
with check (public.is_family_admin(family_id));

drop policy if exists "family members can read shopping items" on public.shopping_items;
create policy "family members can read shopping items"
on public.shopping_items
for select
using (public.is_family_member(family_id));

drop policy if exists "family members can insert shopping items" on public.shopping_items;
create policy "family members can insert shopping items"
on public.shopping_items
for insert
with check (public.is_family_member(family_id));

drop policy if exists "family members can update shopping items" on public.shopping_items;
create policy "family members can update shopping items"
on public.shopping_items
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

drop policy if exists "family members can read tasks" on public.tasks;
create policy "family members can read tasks"
on public.tasks
for select
using (public.is_family_member(family_id));

drop policy if exists "family members can insert tasks" on public.tasks;
create policy "family members can insert tasks"
on public.tasks
for insert
with check (public.is_family_member(family_id));

drop policy if exists "family members can update tasks" on public.tasks;
create policy "family members can update tasks"
on public.tasks
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

drop policy if exists "family members can read notes" on public.notes;
create policy "family members can read notes"
on public.notes
for select
using (public.is_family_member(family_id));

drop policy if exists "family members can insert notes" on public.notes;
create policy "family members can insert notes"
on public.notes
for insert
with check (public.is_family_member(family_id));

drop policy if exists "family members can update notes" on public.notes;
create policy "family members can update notes"
on public.notes
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

drop policy if exists "family members can read calendar events" on public.calendar_events;
create policy "family members can read calendar events"
on public.calendar_events
for select
using (public.is_family_member(family_id));

drop policy if exists "family members can insert calendar events" on public.calendar_events;
create policy "family members can insert calendar events"
on public.calendar_events
for insert
with check (public.is_family_member(family_id));

drop policy if exists "family members can read meals" on public.meals;
create policy "family members can read meals"
on public.meals
for select
using (public.is_family_member(family_id));

drop policy if exists "family members can insert meals" on public.meals;
create policy "family members can insert meals"
on public.meals
for insert
with check (public.is_family_member(family_id));

drop policy if exists "family members can update meals" on public.meals;
create policy "family members can update meals"
on public.meals
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

drop policy if exists "family members can read documents" on public.documents;
create policy "family members can read documents"
on public.documents
for select
using (public.is_family_member(family_id));

drop policy if exists "family members can insert documents" on public.documents;
create policy "family members can insert documents"
on public.documents
for insert
with check (public.is_family_member(family_id));