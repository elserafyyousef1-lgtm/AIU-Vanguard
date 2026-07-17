-- SECURITY: content (weeks/modules) must not leak from unpublished/draft courses.
-- Before: any signed-in user could read ALL weeks/modules. With per-course publishing that
-- lets a student read a draft course's material directly, bypassing course visibility.
-- Now: content is readable only when its parent course is published — OR the viewer manages
-- it (owner/admin/course-manager). The signed-in requirement is preserved and published-course
-- content behaves EXACTLY as before (all live courses are published). Reversible.
drop policy if exists weeks_read on public.weeks;
create policy weeks_read on public.weeks for select using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.courses c
    where c.id = weeks.course_id
      and (c.published
           or public.can_manage_course_id(c.id)
           or (select public.current_user_role()) = any (array['owner'::public.user_role,'admin'::public.user_role]))
  )
);

drop policy if exists modules_read on public.modules;
create policy modules_read on public.modules for select using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.weeks w
    join public.courses c on c.id = w.course_id
    where w.id = modules.week_id
      and (c.published
           or public.can_manage_course_id(c.id)
           or (select public.current_user_role()) = any (array['owner'::public.user_role,'admin'::public.user_role]))
  )
);
