-- RLS policies (courses_read, weeks/modules/document reads) call these helper functions.
-- Postgres does NOT guarantee AND/OR short-circuit in planned queries, so the anon role can
-- reach them and errored with "permission denied" — breaking the public course grid.
-- These helpers return FALSE for an anonymous caller (no auth.uid), so granting EXECUTE to
-- anon reveals nothing; it only lets the policy evaluate cleanly. authenticated already had it.
grant execute on function public.can_manage_course_id(uuid) to anon, authenticated;
grant execute on function public.has_cap_id(uuid, text)     to anon, authenticated;
