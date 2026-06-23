-- ═══ SECURITY: protect student_id / phone / contact_email ═══
-- Strategy: full-row read on `profiles` is now restricted to (self) OR (staff).
-- A public VIEW exposes only safe columns for everyone else (community, public profiles).

-- 1) Replace the wide-open read policy with a restricted one
drop policy if exists "profiles_read_all" on public.profiles;

create policy "profiles_read_self_or_staff" on public.profiles
for select using (
  auth.uid() = id
  or public.current_user_role() in ('owner','admin','doctor','master','guider')
);

-- 2) Public, safe view (NO student_id / phone / contact_email)
create or replace view public.public_profiles as
select id, full_name, nickname, role, avatar_url, bio,
       linkedin, github, certificates, bio_images, semester
from public.profiles;

grant select on public.public_profiles to anon, authenticated;
