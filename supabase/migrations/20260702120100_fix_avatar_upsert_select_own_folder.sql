-- FIX: avatar upload uses upsert, and storage upsert needs SELECT on the object row for
-- its existence check. The hardening migration dropped ALL select policies on avatars
-- (anti-enumeration), which broke avatar upload with "new row violates row-level security
-- policy". Restore SELECT scoped to the user's OWN folder only — no bucket-wide listing,
-- so the hardening's anti-enumeration intent is preserved.
create policy "avatars_read_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);
