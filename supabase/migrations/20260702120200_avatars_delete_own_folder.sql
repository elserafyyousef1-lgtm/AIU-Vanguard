-- Users may delete files inside their OWN avatars folder only (e.g. replacing/removing
-- their picture). Same own-folder scoping as avatars_read_own.
create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);
