-- Defense-in-depth: mastery rows are inserted by the browser client, so their text fields are
-- attacker-controlled. Without a length bound, a student could poison their own topics with a
-- megabyte string that ai_weak_topics then feeds verbatim into the shared Gemini systemInstruction
-- (cost/quota abuse). Cap at the DB layer AND truncate in the function that emits them.
alter table public.ai_quiz_attempts
  add constraint ai_quiz_attempts_course_len check (char_length(course) <= 64),
  add constraint ai_quiz_attempts_topic_len  check (char_length(topic)  <= 120),
  add constraint ai_quiz_attempts_diff_len   check (difficulty is null or char_length(difficulty) <= 16),
  add constraint ai_quiz_attempts_source_len check (char_length(source) <= 16);

create or replace function public.ai_weak_topics(p_course text, p_limit int default 5)
returns table(topic text, attempts bigint, correct bigint, accuracy numeric)
language sql stable security invoker
set search_path to 'public'
as $$
  select left(topic, 120) as topic,       -- never emit an oversized topic, even from legacy rows
         count(*) as attempts,
         count(*) filter (where correct) as correct,
         round(count(*) filter (where correct)::numeric / count(*), 2) as accuracy
  from public.ai_quiz_attempts
  where user_id = (select auth.uid()) and course = p_course
  group by left(topic, 120)
  having count(*) >= 2
     and (count(*) filter (where correct)::numeric / count(*)) < 0.7
  order by accuracy asc, attempts desc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
$$;
