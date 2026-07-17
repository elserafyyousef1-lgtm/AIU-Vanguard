-- SECURITY: the avatars bucket let ANY signed-in user write to ANY path, so a malicious
-- user could overwrite another person's avatar/gallery image (defacement). Restrict INSERT
-- and UPDATE to the user's OWN folder ({uid}/...), matching the existing read/delete policies.
-- The app already uploads only to `${user.id}/...`, so no legitimate flow changes.
drop policy if exists avatars_own_upload on storage.objects;
create policy avatars_own_upload on storage.objects
  for insert to public
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_own_update on storage.objects;
create policy avatars_own_update on storage.objects
  for update to public
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
