-- ═══════════════════════════════════════════════════════════════════════════
-- Capability-based per-course permissions (Canvas-style separation of duties).
-- Identity → Role → Course Assignment → Capabilities → UI.
--   • Roles give DEFAULT capability sets per course assignment.
--   • course_assignments.capabilities[] holds EXTRA delegated grants (e.g. a
--     doctor delegating 'grade' or 'content' to a TA/guider).
--   • Capabilities: structure · content · exams · grade · publish_results ·
--     enrollments · tas · post
--   • Defaults: doctor = structure,content,exams,grade,publish_results,tas,post
--               master = structure,content,enrollments,tas,post   (media/logistics)
--               guider = post                                      (delegable: content, grade)
--   • owner/admin bypass everywhere. RLS stays the single source of truth.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) delegated grants live on the assignment row
alter table public.course_assignments
  add column if not exists capabilities text[] not null default '{}';

-- 2) role → default capability set (single source of truth for defaults)
create or replace function public.role_default_caps(p_role text)
returns text[] language sql immutable as $$
  select case p_role
    when 'doctor' then array['structure','content','exams','grade','publish_results','tas','post']
    when 'master' then array['structure','content','enrollments','tas','post']
    when 'guider' then array['post']
    else array[]::text[]
  end;
$$;

-- 3) caller's resolved capabilities on a course (union across all their rows)
create or replace function public.course_caps(p_course text)
returns text[] language sql stable security definer set search_path to 'public' as $$
  select coalesce(array_agg(distinct cap), '{}')
  from public.course_assignments ca
  cross join lateral unnest(public.role_default_caps(ca.role_in_course) || ca.capabilities) as cap
  where ca.user_id = auth.uid() and ca.course = p_course;
$$;

create or replace function public.has_cap(p_course text, p_cap text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.current_user_role() in ('owner','admin')
      or p_cap = any(public.course_caps(p_course));
$$;

create or replace function public.has_cap_id(p_course_id uuid, p_cap text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.has_cap((select code from public.courses where id = p_course_id), p_cap);
$$;

revoke execute on function public.role_default_caps(text), public.course_caps(text),
  public.has_cap(text, text), public.has_cap_id(uuid, text) from public, anon;
grant execute on function public.role_default_caps(text), public.course_caps(text),
  public.has_cap(text, text), public.has_cap_id(uuid, text) to authenticated;

-- 4) legacy shim: can_manage_course_id now means "manages course STRUCTURE"
--    (weeks/modules policies reference it; guiders lose this unless delegated)
create or replace function public.can_manage_course_id(p_course_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.has_cap_id(p_course_id, 'structure');
$$;

-- 5) assignments (official exams/work) — create/edit needs 'exams'
drop policy if exists asg_write on public.assignments;
create policy asg_write on public.assignments for all
  using (public.has_cap_id(course_id, 'exams'))
  with check (public.has_cap_id(course_id, 'exams'));
drop policy if exists asg_read on public.assignments;
create policy asg_read on public.assignments for select
  using ((published and public.is_enrolled_in_course(course_id))
      or public.has_cap_id(course_id, 'exams')
      or public.has_cap_id(course_id, 'grade'));

-- publishing results is an academic decision → requires 'publish_results'
create or replace function public.protect_assignment_publish()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then return new; end if;  -- service/system paths
  if (tg_op = 'UPDATE' and new.published is distinct from old.published)
     or (tg_op = 'INSERT' and new.published) then
    if not public.has_cap_id(new.course_id, 'publish_results') then
      raise exception 'Publishing/unpublishing results requires the publish_results permission (course doctor).';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists on_assignment_publish_guard on public.assignments;
create trigger on_assignment_publish_guard
  before insert or update on public.assignments
  for each row execute function public.protect_assignment_publish();

-- 6) grade categories (exam setup) — 'exams'
drop policy if exists gc_write on public.grade_categories;
create policy gc_write on public.grade_categories for all
  using (public.has_cap_id(course_id, 'exams'))
  with check (public.has_cap_id(course_id, 'exams'));
drop policy if exists gc_read on public.grade_categories;
create policy gc_read on public.grade_categories for select
  using (public.is_enrolled_in_course(course_id)
      or public.has_cap_id(course_id, 'exams')
      or public.has_cap_id(course_id, 'grade'));

-- 7) grades — marking needs 'grade'
drop policy if exists grd_write on public.grades;
create policy grd_write on public.grades for all
  using (exists (select 1 from public.assignments a
                 where a.id = grades.assignment_id and public.has_cap_id(a.course_id, 'grade')))
  with check (exists (select 1 from public.assignments a
                 where a.id = grades.assignment_id and public.has_cap_id(a.course_id, 'grade')));
drop policy if exists grd_read on public.grades;
create policy grd_read on public.grades for select
  using (student_id = auth.uid()
      or exists (select 1 from public.assignments a
                 where a.id = grades.assignment_id and public.has_cap_id(a.course_id, 'grade')));

-- 8) submissions — staff handling needs 'grade'
drop policy if exists sub_staff on public.submissions;
create policy sub_staff on public.submissions for all
  using (exists (select 1 from public.assignments a
                 where a.id = submissions.assignment_id and public.has_cap_id(a.course_id, 'grade')))
  with check (exists (select 1 from public.assignments a
                 where a.id = submissions.assignment_id and public.has_cap_id(a.course_id, 'grade')));
drop policy if exists sub_read on public.submissions;
create policy sub_read on public.submissions for select
  using (student_id = auth.uid()
      or exists (select 1 from public.assignments a
                 where a.id = submissions.assignment_id and public.has_cap_id(a.course_id, 'grade')));

-- 9) AI knowledge / course documents — per-course 'content'
--    (was: any doctor globally — an overlap; now doctor/master of THAT course, or delegated TA)
drop policy if exists course_documents_write on public.course_documents;
create policy course_documents_write on public.course_documents for all
  using (public.has_cap(course, 'content'))
  with check (public.has_cap(course, 'content'));

-- 10) enrollments logistics — 'enrollments' (master's domain), WITH CHECK hardening
drop policy if exists enr_update_managers on public.enrollments;
create policy enr_update_managers on public.enrollments for update
  using (public.current_user_role() in ('owner','admin') or public.has_cap(course, 'enrollments'))
  with check (public.current_user_role() in ('owner','admin') or public.has_cap(course, 'enrollments'));
drop policy if exists enr_delete on public.enrollments;
create policy enr_delete on public.enrollments for delete
  using (((auth.uid() = user_id) and (((now() - enrolled_at) < interval '24 hours') or completed))
      or public.current_user_role() in ('owner','admin')
      or public.has_cap(course, 'enrollments'));

-- 11) student-TAs: a student assigned to any course counts as staff-like for messaging,
--     so students can message their TA even if the TA's global role is 'student'
create or replace function public.is_staff_like(uid uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.role_of(uid) <> 'student'
      or exists (select 1 from public.course_assignments where user_id = uid);
$$;
revoke execute on function public.is_staff_like(uuid) from public, anon;
grant execute on function public.is_staff_like(uuid) to authenticated;

drop policy if exists conv_insert_no_student_pair on public.conversations;
create policy conv_insert_no_student_pair on public.conversations for insert
  with check (((auth.uid() = student_id) or (auth.uid() = staff_id))
    and (public.is_staff_like(student_id) or public.is_staff_like(staff_id)));

drop policy if exists msg_insert_no_student_pair on public.messages;
create policy msg_insert_no_student_pair on public.messages for insert
  with check (sender_id = auth.uid() and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and ((auth.uid() = c.student_id) or (auth.uid() = c.staff_id))
      and (public.is_staff_like(c.student_id) or public.is_staff_like(c.staff_id))));
