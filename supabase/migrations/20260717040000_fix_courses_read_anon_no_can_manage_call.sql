-- FIX regression: anon (logged-out visitors) lost visibility of published courses because
-- courses_read reached can_manage_course_id(), which the anon role could not execute →
-- the whole public grid query errored. Guard the manager branch behind auth.uid() so the
-- common (published) path never depends on it. Paired with the grant in the next migration.
drop policy if exists courses_read on public.courses;
create policy courses_read on public.courses
  for select using (
    published
    or (
      (select auth.uid()) is not null
      and (
        (select public.current_user_role()) = any (array['owner'::public.user_role, 'admin'::public.user_role])
        or public.can_manage_course_id(id)
      )
    )
  );
