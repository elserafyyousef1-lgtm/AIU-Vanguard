-- 1) Stop public buckets from allowing listing/enumeration of all files.
--    Public buckets serve object URLs without a SELECT policy; the broad policy
--    only enabled clients to LIST every file. Code uses getPublicUrl only (verified),
--    so removing these does not break anything.
drop policy if exists avatars_read_authenticated    on storage.objects;
drop policy if exists post_files_read_authenticated  on storage.objects;
drop policy if exists post_images_read_authenticated on storage.objects;
drop policy if exists course_mat_read                on storage.objects;

-- 2) Revoke EXECUTE on every trigger function. They run inside triggers with system
--    privileges and must NOT be invokable as RPC by anon/authenticated.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'pg_catalog.trigger'::regtype
  loop
    execute format('revoke execute on function %s from anon, authenticated', f.sig);
  end loop;
end $$;
