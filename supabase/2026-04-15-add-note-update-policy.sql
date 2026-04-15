drop policy if exists "family members can update notes" on public.notes;

create policy "family members can update notes"
on public.notes
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));