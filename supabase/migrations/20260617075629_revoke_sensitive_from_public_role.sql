-- The grant comes from the PUBLIC pseudo-role; revoke there too,
-- then re-grant SELECT on all the SAFE columns explicitly.

revoke select on public.profiles from anon, authenticated, public;

-- Re-grant SELECT only on safe columns (everything EXCEPT student_id, phone, contact_email)
grant select (id, full_name, role, avatar_url, semester, settings, created_at,
              updated_at, bio, rep_course, linkedin, bio_images, github,
              certificates, nickname)
on public.profiles to anon, authenticated;
