-- Future-proofing: announce a course to students only when it becomes VISIBLE to them —
-- a brand-new already-published course, or a draft that just got published. Previously the
-- trigger fired on every INSERT, so creating a hidden/draft course (the normal flow for
-- University Requirements and any future course built before launch) spammed every student
-- with a notification + email about a course they can't even see.
create or replace function public.notify_new_course()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.published = true and (TG_OP = 'INSERT' or coalesce(OLD.published, false) = false) then
    insert into public.notifications (user_id, actor_id, type, meta)
    select p.id, null, 'course_assigned', NEW.title
    from public.profiles p
    where p.role in ('student','rep');
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_new_course_notify on public.courses;
create trigger on_new_course_notify
  after insert or update on public.courses
  for each row execute function public.notify_new_course();
