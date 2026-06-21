with families_to_repair as (
  select distinct tasks.family_id
  from public.tasks tasks
  where exists (
    select 1
    from public.todo_lists todo_lists
    where todo_lists.family_id = tasks.family_id
      and todo_lists.title = 'Vorhandene To-dos'
  )
), deleted_generated_lists as (
  delete from public.todo_lists
  where family_id in (select family_id from families_to_repair)
    and title = 'Vorhandene To-dos'
  returning family_id
), normalized_legacy_tasks as (
  select
    tasks.id as task_id,
    tasks.family_id,
    case
      when position(' - ' in btrim(tasks.title)) > 0 then split_part(btrim(tasks.title), ' - ', 1)
      else btrim(tasks.title)
    end as list_title,
    case
      when position(' - ' in btrim(tasks.title)) > 0 then nullif(substr(btrim(tasks.title), position(' - ' in btrim(tasks.title)) + 3), '')
      else null
    end as item_title,
    nullif(btrim(tasks.due), '') as todo_date,
    tasks.status = 'done' as task_checked,
    coalesce(tasks.subtasks, '[]'::jsonb) as subtasks,
    tasks.created_at
  from public.tasks
  join families_to_repair on families_to_repair.family_id = tasks.family_id
  where btrim(tasks.title) <> ''
), legacy_task_metadata as (
  select
    normalized_legacy_tasks.*,
    exists (
      select 1
      from normalized_legacy_tasks child
      where child.family_id = normalized_legacy_tasks.family_id
        and child.list_title = normalized_legacy_tasks.list_title
        and child.item_title is not null
    ) as has_child_tasks,
    exists (
      select 1
      from jsonb_array_elements(normalized_legacy_tasks.subtasks) as subtask(value)
      where btrim(coalesce(subtask.value->>'title', '')) <> ''
    ) as has_valid_subtasks
  from normalized_legacy_tasks
), inserted_lists as (
  insert into public.todo_lists (family_id, title, todo_date, created_at)
  select
    legacy_task_metadata.family_id,
    legacy_task_metadata.list_title,
    min(legacy_task_metadata.todo_date),
    min(legacy_task_metadata.created_at)
  from legacy_task_metadata
  where not exists (
    select 1
    from public.todo_lists todo_lists
    where todo_lists.family_id = legacy_task_metadata.family_id
      and todo_lists.title = legacy_task_metadata.list_title
  )
  group by legacy_task_metadata.family_id, legacy_task_metadata.list_title
  returning id, family_id, title
), target_lists as (
  select inserted_lists.id, inserted_lists.family_id, inserted_lists.title
  from inserted_lists

  union all

  select todo_lists.id, todo_lists.family_id, todo_lists.title
  from public.todo_lists todo_lists
  where todo_lists.family_id in (select family_id from families_to_repair)
    and exists (
      select 1
      from legacy_task_metadata
      where legacy_task_metadata.family_id = todo_lists.family_id
        and legacy_task_metadata.list_title = todo_lists.title
    )
), generated_items as (
  select
    legacy_task_metadata.family_id,
    legacy_task_metadata.list_title,
    coalesce(legacy_task_metadata.item_title, legacy_task_metadata.list_title) as title,
    legacy_task_metadata.task_checked as checked,
    legacy_task_metadata.created_at
  from legacy_task_metadata
  where legacy_task_metadata.item_title is not null
     or (not legacy_task_metadata.has_child_tasks and not legacy_task_metadata.has_valid_subtasks)

  union all

  select
    legacy_task_metadata.family_id,
    legacy_task_metadata.list_title,
    case
      when legacy_task_metadata.item_title is not null then legacy_task_metadata.item_title || ' - ' || btrim(subtask.value->>'title')
      else btrim(subtask.value->>'title')
    end as title,
    coalesce((subtask.value->>'done')::boolean, false) as checked,
    legacy_task_metadata.created_at
  from legacy_task_metadata
  cross join lateral jsonb_array_elements(legacy_task_metadata.subtasks) as subtask(value)
  where btrim(coalesce(subtask.value->>'title', '')) <> ''
)
insert into public.todo_items (family_id, list_id, title, checked, created_at)
select
  generated_items.family_id,
  target_lists.id,
  generated_items.title,
  generated_items.checked,
  generated_items.created_at
from generated_items
join target_lists
  on target_lists.family_id = generated_items.family_id
 and target_lists.title = generated_items.list_title
where not exists (
  select 1
  from public.todo_items todo_items
  where todo_items.list_id = target_lists.id
    and todo_items.title = generated_items.title
    and todo_items.checked = generated_items.checked
);