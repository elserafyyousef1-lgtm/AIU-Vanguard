-- Step 1: Replace the wide-open read policy with logged-in-only.
drop policy if exists "profiles_read_all" on public.profiles;

create policy "profiles_read_all" on public.profiles
for select using (auth.uid() is not null);

-- Step 2: Grant SELECT only on the SAFE, public columns to authenticated users.
grant select (
  id, full_name, role, avatar_url, semester, bio,
  rep_course, linkedin, bio_images, github, certificates,
  nickname, created_at, updated_at, settings
) on public.profiles to authenticated;

-- Step 3: Ensure sensitive columns are NOT selectable (idempotent safety).
revoke select (student_id, phone, contact_email) on public.profiles from authenticated;
revoke select (student_id, phone, contact_email) on public.profiles from anon;

-- Step 4: Lock the safe accessor functions to logged-in users only.
revoke execute on function public.admin_student_ids() from anon;
revoke execute on function public.my_contact() from anon;
grant execute on function public.admin_student_ids() to authenticated;
grant execute on function public.my_contact() to authenticated;
