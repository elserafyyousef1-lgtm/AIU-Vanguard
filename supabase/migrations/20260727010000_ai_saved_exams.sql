-- Phase 2 — Saved exams & mistake-review.
-- Today a finished mock exam lives only in React state and is lost on reload; the only
-- persistence is one boolean per question in ai_quiz_attempts (kept, for weak-topic analytics).
-- These two tables store the FULL exam so a student can reopen it weeks later and review
-- exactly what they got wrong. Owner-only, mirroring the ai_quiz_attempts security model.

-- One row per finished exam (the session).
create table if not exists public.ai_exams (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course           text not null,
  course_name      text,
  difficulty       text,
  question_count   int  not null,
  score            int  not null,          -- questions correct
  total            int  not null,          -- questions graded
  percent          int  not null,          -- 0..100
  duration_seconds int,
  grounded         boolean,                -- was the exam generated from the course's own materials
  created_at       timestamptz not null default now()
);

create index if not exists ai_exams_user_course_idx
  on public.ai_exams (user_id, course, created_at desc);

-- One row per question in a saved exam — the exact question, the student's choice,
-- the correct answer and the explanation, so review shows "you picked B, the answer was C".
create table if not exists public.ai_exam_questions (
  id            uuid primary key default gen_random_uuid(),
  exam_id       uuid not null references public.ai_exams(id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  position      int  not null,
  question      text not null,
  options       jsonb not null default '[]'::jsonb,
  correct_index int,
  chosen_index  int,                         -- null = left blank
  correct       boolean not null,
  explanation   text,
  topic         text,
  payload       jsonb                        -- reserved for Phase 3 worked-problem answer types
);

create index if not exists ai_exam_questions_exam_idx
  on public.ai_exam_questions (exam_id, position);

alter table public.ai_exams enable row level security;
alter table public.ai_exam_questions enable row level security;

-- Students only ever see / write / delete their OWN saved exams.
-- (initplan-cached (select auth.uid()) to match the project's RLS perf pattern.)
drop policy if exists ai_exams_select_own on public.ai_exams;
create policy ai_exams_select_own on public.ai_exams
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists ai_exams_insert_own on public.ai_exams;
create policy ai_exams_insert_own on public.ai_exams
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists ai_exams_delete_own on public.ai_exams;
create policy ai_exams_delete_own on public.ai_exams
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists ai_exam_questions_select_own on public.ai_exam_questions;
create policy ai_exam_questions_select_own on public.ai_exam_questions
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists ai_exam_questions_insert_own on public.ai_exam_questions;
create policy ai_exam_questions_insert_own on public.ai_exam_questions
  for insert to authenticated with check (user_id = (select auth.uid()));
-- (question rows are removed via ON DELETE CASCADE when their exam is deleted — no delete policy needed)
