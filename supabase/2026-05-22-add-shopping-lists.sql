create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  shopping_date text not null,
  created_at timestamptz not null default now()
);

alter table public.shopping_lists enable row level security;

create policy "family members can read shopping lists"
on public.shopping_lists
for select
using (public.is_family_member(family_id));

create policy "family members can insert shopping lists"
on public.shopping_lists
for insert
with check (public.is_family_member(family_id));

create policy "family members can update shopping lists"
on public.shopping_lists
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

create policy "family members can delete shopping lists"
on public.shopping_lists
for delete
using (public.is_family_member(family_id));

alter table public.shopping_items add column list_id uuid references public.shopping_lists(id) on delete cascade;

with created_lists as (
  insert into public.shopping_lists (family_id, title, shopping_date)
  select distinct family_id, 'Vorhandene Einkaufsliste', current_date::text
  from public.shopping_items
  where list_id is null
  returning id, family_id
)
update public.shopping_items as items
set list_id = created_lists.id
from created_lists
where items.family_id = created_lists.family_id
  and items.list_id is null;

alter table public.shopping_items alter column list_id set not null;

alter table public.shopping_items drop column if exists category;

create policy "family members can delete shopping items"
on public.shopping_items
for delete
using (public.is_family_member(family_id));