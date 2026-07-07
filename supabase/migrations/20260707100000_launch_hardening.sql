-- ═══ Launch hardening (audit MUST-FIX) ═══
-- H1: server-side upload size limits (client-side 5MB alone is bypassable)
update storage.buckets set file_size_limit = 5242880  where id = 'avatars';       -- 5 MB
update storage.buckets set file_size_limit = 8388608  where id = 'post-images';   -- 8 MB
update storage.buckets set file_size_limit = 20971520 where id = 'post-files';    -- 20 MB

-- M2: SECURITY DEFINER helpers default to EXECUTE for PUBLIC. Revoke PUBLIC+anon and grant
-- back exactly who needs them (authenticated for app/RLS, service_role for edge functions),
-- so the anonymous RPC-probing surface flagged by the advisor is closed. current_user_role()
-- is granted back to anon below (it is evaluated by "manage" policies during anon catalog reads).
do $$
declare f text;
begin
  foreach f in array array[
    'public.can_manage_course_id(uuid)','public.current_user_rep_course()','public.current_user_role()',
    'public.is_enrolled_in_course(uuid)','public.is_staff(uuid)','public.my_contact()',
    'public.my_courses_as(text)','public.my_student_rank()','public.role_of(uuid)',
    'public.update_my_contact(text, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
  execute 'revoke execute on function public.on_notification_email() from public, anon, authenticated';
end $$;

-- current_user_role() must stay anon-callable (manage policies evaluate it during anon SELECTs;
-- returns NULL for anon). The sensitive per-user probes stay anon-revoked.
grant execute on function public.current_user_role() to anon;

-- The course CATALOG (titles/codes only, no student data) is the public landing content.
-- Old policies required a session, so guests saw an empty semester grid. Make it public.
drop policy if exists sem_read on public.semesters;
create policy sem_read on public.semesters for select using (true);
drop policy if exists courses_read on public.courses;
create policy courses_read on public.courses for select using (true);
