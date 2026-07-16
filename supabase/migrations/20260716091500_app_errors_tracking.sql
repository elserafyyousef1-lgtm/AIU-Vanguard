-- ═══════════════════════════════════════════════════════════════════════════
-- H3: production error tracking (self-hosted, zero external dependency).
-- Client-side runtime errors land here via src/lib/errorReporter.ts so the
-- owner can SEE failures instead of waiting for student complaints.
-- Reversible: DROP TABLE public.app_errors.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.app_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,                                  -- reporter (null never allowed by RLS today)
  path text not null default '',
  message varchar(500) not null,
  stack varchar(2000),
  user_agent varchar(300),
  created_at timestamptz not null default now()
);
alter table public.app_errors enable row level security;

-- signed-in users may file their own reports; nobody can read them back except owner/admin
drop policy if exists app_errors_insert on public.app_errors;
create policy app_errors_insert on public.app_errors for insert
  with check ((SELECT auth.uid()) = user_id);
drop policy if exists app_errors_read on public.app_errors;
create policy app_errors_read on public.app_errors for select
  using ((SELECT current_user_role()) in ('owner','admin'));
-- no UPDATE/DELETE policies: reports are immutable for clients

create index if not exists idx_app_errors_created_at on public.app_errors (created_at desc);
