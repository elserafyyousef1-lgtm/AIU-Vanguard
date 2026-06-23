-- Functions default-grant EXECUTE to PUBLIC; anon/authenticated inherit it.
-- Revoke from PUBLIC (and the roles explicitly) so trigger functions can't be called as RPC.
-- Triggers still fire normally — EXECUTE privilege does not gate trigger invocation.
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
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
