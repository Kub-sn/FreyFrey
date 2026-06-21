create table if not exists public.todo_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  todo_date text,
  created_at timestamptz not null default now()
);

create table if not exists public.todo_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  list_id uuid not null references public.todo_lists(id) on delete cascade,
  title text not null,
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.todo_lists enable row level security;
alter table public.todo_items enable row level security;

create policy "family members can read todo lists"
on public.todo_lists
for select
using (public.is_family_member(family_id));

create policy "family members can insert todo lists"
on public.todo_lists
for insert
with check (public.is_family_member(family_id));

create policy "family members can update todo lists"
on public.todo_lists
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

create policy "family members can delete todo lists"
on public.todo_lists
for delete
using (public.is_family_member(family_id));

create policy "family members can read todo items"
on public.todo_items
for select
using (public.is_family_member(family_id));

create policy "family members can insert todo items"
on public.todo_items
for insert
with check (public.is_family_member(family_id));

create policy "family members can update todo items"
on public.todo_items
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

create policy "family members can delete todo items"
on public.todo_items
for delete
using (public.is_family_member(family_id));

with legacy_families as (
  select distinct family_id
  from public.tasks
), created_lists as (
  insert into public.todo_lists (family_id, title)
  select family_id, 'Vorhandene To-dos'
  from legacy_families
  returning id, family_id
)
insert into public.todo_items (family_id, list_id, title, checked, created_at)
select tasks.family_id, created_lists.id, tasks.title, tasks.status = 'done', tasks.created_at
from public.tasks
join created_lists on created_lists.family_id = tasks.family_id
where btrim(tasks.title) <> '';

with created_lists as (
  select id, family_id
  from public.todo_lists
  where title = 'Vorhandene To-dos'
)
insert into public.todo_items (family_id, list_id, title, checked, created_at)
select
  tasks.family_id,
  created_lists.id,
  tasks.title || ' - ' || btrim(subtask.value->>'title'),
  coalesce((subtask.value->>'done')::boolean, false),
  tasks.created_at
from public.tasks
join created_lists on created_lists.family_id = tasks.family_id
cross join lateral jsonb_array_elements(tasks.subtasks) as subtask(value)
where btrim(tasks.title) <> ''
  and btrim(coalesce(subtask.value->>'title', '')) <> '';
