-- Dashboard "Your Learning" panel: the current student's mastery at a glance, across ALL
-- courses. SECURITY INVOKER so RLS scopes ai_quiz_attempts to the caller's own rows.
create or replace function public.my_learning_summary()
returns jsonb
language sql stable security invoker
set search_path to 'public'
as $$
  with a as (
    select course, left(topic, 120) as topic, correct
    from public.ai_quiz_attempts
    where user_id = (select auth.uid())
  )
  select jsonb_build_object(
    'total',            (select count(*) from a),
    'correct',          (select count(*) filter (where correct) from a),
    'topics_practiced', (select count(distinct topic) from a),
    'weak', coalesce((
      select jsonb_agg(jsonb_build_object('course', course, 'topic', topic, 'accuracy', acc))
      from (
        select course, topic,
               round(count(*) filter (where correct)::numeric / count(*), 2) as acc
        from a
        group by course, topic
        having count(*) >= 2
           and (count(*) filter (where correct)::numeric / count(*)) < 0.7
        order by acc asc
        limit 6
      ) w
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.my_learning_summary() to authenticated;
