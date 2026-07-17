-- University Requirements feature — per-course visibility.
-- (1) published flag. DEFAULT true so EVERY existing + future course stays visible
--     unless explicitly hidden — zero regression. Requirement courses are seeded false.
alter table public.courses
  add column if not exists published boolean not null default true;

-- (2) Read gate: students & anonymous visitors see only published courses; the owner,
--     admins, and anyone with course-management capability see everything (incl. drafts).
--     `published` is evaluated first (cheapest) so the common path short-circuits.
--     Reversible: drop this policy and recreate `courses_read` as USING (true).
drop policy if exists courses_read on public.courses;
create policy courses_read on public.courses
  for select using (
    published
    or (select public.current_user_role()) = any (array['owner'::public.user_role, 'admin'::public.user_role])
    or public.can_manage_course_id(id)
  );
