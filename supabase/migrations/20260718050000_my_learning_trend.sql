-- Weekly accuracy trend for the current student, so the dashboard can show progress over time.
-- SECURITY INVOKER → RLS scopes ai_quiz_attempts to the caller's own rows.
create or replace function public.my_learning_trend(p_weeks int default 8)
returns table(week_start date, total bigint, correct bigint)
language sql stable security invoker
set search_path to 'public'
as $$
  select date_trunc('week', created_at)::date as week_start,
         count(*) as total,
         count(*) filter (where correct) as correct
  from public.ai_quiz_attempts
  where user_id = (select auth.uid())
    and created_at >= (now() - make_interval(weeks => greatest(1, least(coalesce(p_weeks, 8), 26))))
  group by 1
  order by 1;
$$;

grant execute on function public.my_learning_trend(int) to authenticated;
