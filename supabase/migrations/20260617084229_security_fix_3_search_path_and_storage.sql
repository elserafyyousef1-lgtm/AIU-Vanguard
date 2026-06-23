-- ═══ Part A: pin search_path on every public function (full name + exact args) ═══
-- Using search_path = public (not empty) so functions that reference tables keep working.
ALTER FUNCTION public.admin_student_ids() SET search_path = public;
ALTER FUNCTION public.bump_conversation() SET search_path = public;
ALTER FUNCTION public.current_user_rep_course() SET search_path = public;
ALTER FUNCTION public.current_user_role() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_teach_decision() SET search_path = public;
ALTER FUNCTION public.is_staff(uid uuid) SET search_path = public;
ALTER FUNCTION public.my_contact() SET search_path = public;
ALTER FUNCTION public.my_courses_as(p_role text) SET search_path = public;
ALTER FUNCTION public.my_student_rank() SET search_path = public;
ALTER FUNCTION public.notify_assignment() SET search_path = public;
ALTER FUNCTION public.notify_comment() SET search_path = public;
ALTER FUNCTION public.notify_enroll_removed() SET search_path = public;
ALTER FUNCTION public.notify_enroll_updated() SET search_path = public;
ALTER FUNCTION public.notify_message() SET search_path = public;
ALTER FUNCTION public.notify_new_post() SET search_path = public;
ALTER FUNCTION public.notify_post_like() SET search_path = public;
ALTER FUNCTION public.notify_profile_edited() SET search_path = public;
ALTER FUNCTION public.notify_promotion() SET search_path = public;
ALTER FUNCTION public.notify_teach_decision() SET search_path = public;
ALTER FUNCTION public.notify_teach_request() SET search_path = public;
ALTER FUNCTION public.protect_roles() SET search_path = public;
ALTER FUNCTION public.rls_auto_enable() SET search_path = public;
ALTER FUNCTION public.role_of(uid uuid) SET search_path = public;
ALTER FUNCTION public.update_likes_count() SET search_path = public;

-- ═══ Part B: storage — allow opening files by URL, block listing the whole bucket ═══
-- Replace broad "anyone can SELECT (list)" with "service_role only can list".
-- Public object access by direct URL still works (that path doesn't use these policies).
drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "post_files_public_read" on storage.objects;
drop policy if exists "post_images_public_read" on storage.objects;

create policy "avatars_read_authenticated" on storage.objects
  for select to authenticated using (bucket_id = 'avatars');
create policy "post_files_read_authenticated" on storage.objects
  for select to authenticated using (bucket_id = 'post-files');
create policy "post_images_read_authenticated" on storage.objects
  for select to authenticated using (bucket_id = 'post-images');
