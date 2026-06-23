-- Notify all students/reps when a new semester is opened.
create or replace function public.notify_new_semester()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, type, meta)
  select p.id, null, 'course_assigned', 'New semester: ' || NEW.title
  from public.profiles p
  where p.role in ('student','rep');
  return NEW;
end;
$$;
drop trigger if exists on_new_semester_notify on public.semesters;
create trigger on_new_semester_notify after insert on public.semesters
  for each row execute function public.notify_new_semester();
