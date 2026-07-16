-- Student-facing deterministic grade math (the AI never computes grades — the DB does).
-- my_final_grades(): the caller's own category-weighted percent per enrolled course.
create or replace function public.my_final_grades()
returns table(course text, final_percent numeric, graded_count integer)
language sql stable security definer set search_path to 'public' as $$
  with mine as (
    select e.course from public.enrollments e where e.user_id = auth.uid()
  ),
  graded as (
    select c.code, a.category_id, a.max_points, g.score
    from public.grades g
    join public.assignments a on a.id = g.assignment_id
    join public.courses c on c.id = a.course_id
    where g.student_id = auth.uid() and a.published = true and g.score is not null
  )
  select
    m.course,
    case when exists (select 1 from public.grade_categories gc
                      join public.courses c2 on c2.id = gc.course_id
                      where c2.code = m.course) then
      (select round(sum(cat_pct * wt) / nullif(sum(wt), 0), 2)
       from (
         select (sum(gr.score) / nullif(sum(gr.max_points), 0)) * 100 as cat_pct,
                gc.weight_percent as wt
         from graded gr
         join public.grade_categories gc on gc.id = gr.category_id
         where gr.code = m.course
         group by gc.id, gc.weight_percent
         having sum(gr.max_points) > 0
       ) cx)
    else
      (select round(100.0 * sum(gr.score) / nullif(sum(gr.max_points), 0), 2)
       from graded gr where gr.code = m.course)
    end as final_percent,
    (select count(*)::int from graded g2 where g2.code = m.course) as graded_count
  from mine m;
$$;
revoke execute on function public.my_final_grades() from public, anon;
grant execute on function public.my_final_grades() to authenticated;

-- gradebook staff view should be gated by the 'grade' capability (not structure)
create or replace function public.course_final_grades(p_course_id uuid)
returns table(student_id uuid, final_percent numeric, graded_count integer)
language sql stable security definer set search_path to 'public' as $$
  with enrolled as (
    select distinct e.user_id as sid
    from public.enrollments e
    join public.courses c on c.code = e.course
    where c.id = p_course_id
  ),
  graded as (
    select g.student_id as sid, a.category_id, a.max_points, g.score
    from public.grades g
    join public.assignments a on a.id = g.assignment_id
    where a.course_id = p_course_id and a.published = true and g.score is not null
  )
  select
    e.sid,
    case when exists (select 1 from public.grade_categories gc where gc.course_id = p_course_id) then
      (select round(sum(cat_pct * wt) / nullif(sum(wt), 0), 2)
       from (
         select (sum(gr.score) / nullif(sum(gr.max_points), 0)) * 100 as cat_pct, gc.weight_percent as wt
         from graded gr
         join public.grade_categories gc on gc.id = gr.category_id
         where gr.sid = e.sid
         group by gc.id, gc.weight_percent
         having sum(gr.max_points) > 0
       ) cx)
    else
      (select round(100.0 * sum(gr.score) / nullif(sum(gr.max_points), 0), 2) from graded gr where gr.sid = e.sid)
    end as final_percent,
    (select count(*)::int from graded gx where gx.sid = e.sid) as graded_count
  from enrolled e
  where public.has_cap_id(p_course_id, 'grade');
$$;
