drop view if exists public.public_profiles;

revoke execute on function public.current_user_role() from anon;
revoke execute on function public.current_user_rep_course() from anon;
revoke execute on function public.is_staff(uuid) from anon;
revoke execute on function public.role_of(uuid) from anon;
revoke execute on function public.my_courses_as(text) from anon;
revoke execute on function public.my_student_rank() from anon;
revoke execute on function public.my_contact() from anon;
revoke execute on function public.admin_student_ids() from anon;
