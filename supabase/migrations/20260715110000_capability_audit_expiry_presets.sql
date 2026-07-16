-- ═══════════════════════════════════════════════════════════════════════════
-- Enterprise layer for capability-based permissions:
--   1) capability_audit — immutable log of every assignment/capability change
--   2) caps_expire_at   — optional expiry; delegated caps auto-deactivate at
--      query time (no cron needed) while role DEFAULTS stay active
--   3) capability_presets — reusable delegation bundles (Standard TA, …)
--   4) set_course_capabilities RPC — the UI path; passes an optional reason
--      into the audit trail. SECURITY INVOKER so RLS keeps enforcing scope.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 2) expiry ────────────────────────────────────────────────────────────────
alter table public.course_assignments
  add column if not exists caps_expire_at timestamptz;

create or replace function public.course_caps(p_course text)
returns text[] language sql stable security definer set search_path to 'public' as $$
  select coalesce(array_agg(distinct cap), '{}')
  from public.course_assignments ca
  cross join lateral unnest(
    public.role_default_caps(ca.role_in_course)
    || case when ca.caps_expire_at is null or ca.caps_expire_at > now()
            then ca.capabilities else array[]::text[] end
  ) as cap
  where ca.user_id = auth.uid() and ca.course = p_course;
$$;

-- ── 1) audit log ─────────────────────────────────────────────────────────────
create table if not exists public.capability_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,                       -- who performed the change (null = system)
  target_user_id uuid not null,        -- who received/lost the capability
  course text not null,
  role_in_course text,
  action text not null check (action in ('assignment_created','capabilities_changed','assignment_removed')),
  old_capabilities text[],
  new_capabilities text[],
  old_expires_at timestamptz,
  new_expires_at timestamptz,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.capability_audit enable row level security;

-- read: owner/admin, the actor, or whoever supervises TAs on that course
drop policy if exists cap_audit_read on public.capability_audit;
create policy cap_audit_read on public.capability_audit for select
  using (public.current_user_role() in ('owner','admin')
      or actor_id = auth.uid()
      or public.has_cap(course, 'tas'));
-- no INSERT/UPDATE/DELETE policies → clients cannot write; rows come from the trigger.

-- immutability: even privileged paths cannot edit history
create or replace function public.capability_audit_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'The capability audit log is immutable.';
end $$;
drop trigger if exists capability_audit_no_edit on public.capability_audit;
create trigger capability_audit_no_edit
  before update or delete on public.capability_audit
  for each row execute function public.capability_audit_immutable();

-- the recorder (SECURITY DEFINER so the insert bypasses the no-write RLS)
create or replace function public.log_capability_change()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_reason text := nullif(current_setting('app.cap_reason', true), '');
begin
  if tg_op = 'INSERT' then
    insert into public.capability_audit
      (actor_id, target_user_id, course, role_in_course, action,
       old_capabilities, new_capabilities, old_expires_at, new_expires_at, reason)
    values (auth.uid(), new.user_id, new.course, new.role_in_course, 'assignment_created',
            null, new.capabilities, null, new.caps_expire_at, v_reason);
    return new;
  elsif tg_op = 'UPDATE' then
    if new.capabilities is distinct from old.capabilities
       or new.caps_expire_at is distinct from old.caps_expire_at
       or new.role_in_course is distinct from old.role_in_course then
      insert into public.capability_audit
        (actor_id, target_user_id, course, role_in_course, action,
         old_capabilities, new_capabilities, old_expires_at, new_expires_at, reason)
      values (auth.uid(), new.user_id, new.course, new.role_in_course, 'capabilities_changed',
              old.capabilities, new.capabilities, old.caps_expire_at, new.caps_expire_at, v_reason);
    end if;
    return new;
  else
    insert into public.capability_audit
      (actor_id, target_user_id, course, role_in_course, action,
       old_capabilities, new_capabilities, old_expires_at, new_expires_at, reason)
    values (auth.uid(), old.user_id, old.course, old.role_in_course, 'assignment_removed',
            old.capabilities, null, old.caps_expire_at, null, v_reason);
    return old;
  end if;
end $$;
drop trigger if exists on_capability_change_audit on public.course_assignments;
create trigger on_capability_change_audit
  after insert or update or delete on public.course_assignments
  for each row execute function public.log_capability_change();

-- ── 3) presets ───────────────────────────────────────────────────────────────
create table if not exists public.capability_presets (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  capabilities text[] not null,
  is_system boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.capability_presets enable row level security;
drop policy if exists cap_presets_read on public.capability_presets;
create policy cap_presets_read on public.capability_presets for select
  using (auth.uid() is not null);
drop policy if exists cap_presets_manage on public.capability_presets;
create policy cap_presets_manage on public.capability_presets for all
  using (public.current_user_role() in ('owner','admin'))
  with check (public.current_user_role() in ('owner','admin'));

insert into public.capability_presets (name, description, capabilities, is_system) values
  ('Standard TA',  'Grades quizzes/assignments and posts course updates',            array['grade','post'], true),
  ('Content TA',   'Uploads course materials & AI knowledge, posts course updates',  array['content','post'], true),
  ('Coordinator',  'Organizes structure, content, media and enrollments',            array['structure','content','enrollments','post'], true)
on conflict (name) do nothing;

-- ── 4) the delegation RPC (UI path; reason flows into the audit row) ─────────
create or replace function public.set_course_capabilities(
  p_user uuid, p_course text, p_caps text[], p_expires_at timestamptz, p_reason text)
returns void language plpgsql security invoker as $$
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
revoke execute on function public.set_course_capabilities(uuid, text, text[], timestamptz, text) from public, anon;
grant execute on function public.set_course_capabilities(uuid, text, text[], timestamptz, text) to authenticated;
