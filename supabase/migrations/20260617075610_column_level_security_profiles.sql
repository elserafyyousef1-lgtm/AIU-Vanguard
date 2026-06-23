-- ═══ Correct approach: row-read open (joins work), sensitive COLUMNS locked ═══

-- 1) Restore open row-level read so foreign-key joins (community, messages) work
drop policy if exists "profiles_read_self_or_staff" on public.profiles;
create policy "profiles_read_all" on public.profiles
for select using (true);

-- 2) Revoke column-level SELECT on sensitive fields from public roles
revoke select (student_id, phone, contact_email) on public.profiles from anon;
revoke select (student_id, phone, contact_email) on public.profiles from authenticated;

-- 3) Secure function: a user always gets THEIR OWN sensitive fields
create or replace function public.my_contact()
returns table (student_id text, phone text, contact_email text)
language sql stable security definer set search_path = public as $$
  select student_id, phone, contact_email from public.profiles where id = auth.uid();
$$;
grant execute on function public.my_contact() to authenticated;

-- 4) Secure function: staff can read any student's id (for Student Management Center)
create or replace function public.admin_student_ids()
returns table (id uuid, student_id text)
language sql stable security definer set search_path = public as $$
  select id, student_id from public.profiles
  where public.current_user_role() in ('owner','admin','doctor','master');
$$;
grant execute on function public.admin_student_ids() to authenticated;
