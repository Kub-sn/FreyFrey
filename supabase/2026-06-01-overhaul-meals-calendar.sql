alter table public.meals
  add column meal_date date,
  add column name text,
  add column recipe text not null default '';

update public.meals
set
  meal_date = case
    when day ~ '^\d{4}-\d{2}-\d{2}$' then day::date
    when lower(trim(day)) in ('monday', 'montag') then date_trunc('week', current_date::timestamp)::date
    when lower(trim(day)) in ('tuesday', 'dienstag') then (date_trunc('week', current_date::timestamp)::date + 1)
    when lower(trim(day)) in ('wednesday', 'mittwoch') then (date_trunc('week', current_date::timestamp)::date + 2)
    when lower(trim(day)) in ('thursday', 'donnerstag') then (date_trunc('week', current_date::timestamp)::date + 3)
    when lower(trim(day)) in ('friday', 'freitag') then (date_trunc('week', current_date::timestamp)::date + 4)
    when lower(trim(day)) in ('saturday', 'samstag') then (date_trunc('week', current_date::timestamp)::date + 5)
    when lower(trim(day)) in ('sunday', 'sonntag') then (date_trunc('week', current_date::timestamp)::date + 6)
    else current_date
  end,
  name = trim(meal),
  recipe = '';

alter table public.meals
  alter column meal_date set not null,
  alter column name set not null;

alter table public.meals
  drop column day,
  drop column meal,
  drop column prepared;