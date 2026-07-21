-- Persistent per-student mastery profile: one row per answered quiz/exam question.
-- This is the asset a generic chatbot can never have — a record of exactly which
-- curriculum topics THIS student keeps getting wrong, per course, across sessions.
create table if not exists public.ai_quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course      text not null,
  topic       text not null,
  difficulty  text,
  correct     boolean not null,
  source      text not null default 'quiz',   -- 'quiz' | 'exam'
  created_at  timestamptz not null default now()
);

create index if not exists ai_quiz_attempts_user_course_idx
  on public.ai_quiz_attempts (user_id, course, created_at desc);

alter table public.ai_quiz_attempts enable row level security;

-- Students only ever see and write their OWN attempts.
drop policy if exists ai_quiz_attempts_insert_own on public.ai_quiz_attempts;
create policy ai_quiz_attempts_insert_own on public.ai_quiz_attempts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists ai_quiz_attempts_select_own on public.ai_quiz_attempts;
create policy ai_quiz_attempts_select_own on public.ai_quiz_attempts
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Weak-topic summary for the current student in a course: topics with enough attempts
-- and accuracy below 70%, worst first. SECURITY INVOKER so RLS scopes it to the caller.
create or replace function public.ai_weak_topics(p_course text, p_limit int default 5)
returns table(topic text, attempts bigint, correct bigint, accuracy numeric)
language sql stable security invoker
set search_path to 'public'
as $$
  select topic,
         count(*) as attempts,
         count(*) filter (where correct) as correct,
         round(count(*) filter (where correct)::numeric / count(*), 2) as accuracy
  from public.ai_quiz_attempts
  where user_id = (select auth.uid()) and course = p_course
  group by topic
  having count(*) >= 2
     and (count(*) filter (where correct)::numeric / count(*)) < 0.7
  order by accuracy asc, attempts desc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
$$;

grant execute on function public.ai_weak_topics(text, int) to authenticated;
