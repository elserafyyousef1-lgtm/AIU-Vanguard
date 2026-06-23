-- A course-tagged post notifies ONLY students enrolled in that course.
-- A general post (no course_tag) still notifies all students/reps.
create or replace function public.notify_new_post()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  if NEW.course_tag is null then
    insert into public.notifications (user_id, actor_id, type, post_id)
    select p.id, NEW.user_id, 'post', NEW.id
    from public.profiles p
    where p.role in ('student','rep') and p.id <> NEW.user_id;
  else
    insert into public.notifications (user_id, actor_id, type, post_id)
    select distinct e.user_id, NEW.user_id, 'post', NEW.id
    from public.enrollments e
    join public.profiles p on p.id = e.user_id
    where e.course = NEW.course_tag
      and p.role in ('student','rep')
      and e.user_id <> NEW.user_id;
  end if;
  return NEW;
end;
$function$;
