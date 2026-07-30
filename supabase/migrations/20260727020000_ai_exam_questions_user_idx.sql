-- Cover the ai_exam_questions.user_id foreign key with an index
-- (Supabase perf advisor 0001_unindexed_foreign_keys). Purely additive.
create index if not exists ai_exam_questions_user_idx on public.ai_exam_questions (user_id);
