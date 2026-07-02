-- FIX: the buckets-hardening migration enabled RLS on storage.buckets but added ZERO
-- policies, so every user-context bucket lookup returned nothing and ALL uploads failed
-- with "new row violates row-level security policy" (broke avatar upload, message images,
-- post attachments, course-material uploads).
-- Bucket METADATA (name/public flag/limits) is not sensitive; object access stays fully
-- governed by the existing storage.objects policies. Restore read-only metadata access:
create policy "buckets_metadata_read"
  on storage.buckets for select
  to authenticated, anon
  using (true);
