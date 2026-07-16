-- Release-candidate hardening: close the 5 advisor findings introduced by the
-- recent capability migrations. Behavior-preserving (search_path pin + revoke on
-- trigger-only functions). No feature change.

-- 1) pin search_path on the 3 functions that were created without it
create or replace function public.role_default_caps(p_role text)
returns text[] language sql immutable
set search_path to 'public'
as $$
  select case p_role
    when 'doctor' then array['structure','content','exams','grade','publish_results','tas','post']
    when 'master' then array['structure','content','enrollments','tas','post']
    when 'guider' then array['post']
    else array[]::text[]
  end;
$$;

create or replace function public.capability_audit_immutable()
returns trigger language plpgsql
set search_path to 'public'
as $$
begin
  raise exception 'The capability audit log is immutable.';
end $$;

create or replace function public.set_course_capabilities(
  p_user uuid, p_course text, p_caps text[], p_expires_at timestamptz, p_reason text)
returns void language plpgsql security invoker
set search_path to 'public'
as $$
begin
  perform set_config('app.cap_reason', coalesce(p_reason, ''), true);
  update public.course_assignments
     set capabilities = coalesce(p_caps, '{}'),
         caps_expire_at = p_expires_at
   where user_id = p_user and course = p_course;
  if not found then
    raise exception 'No assignment for that user on % (or you may not manage it).', p_course;
  end if;
end $$;

-- 2) trigger-only functions must not be callable directly via the REST RPC surface
revoke execute on function public.log_capability_change() from public, anon, authenticated;
revoke execute on function public.protect_assignment_publish() from public, anon, authenticated;
revoke execute on function public.capability_audit_immutable() from public, anon, authenticated;
