-- Canvas-style course structure: weeks + modules (items)

create table if not exists public.weeks (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  order_index int  not null default 0,
  created_at  timestamptz default now()
);
create index if not exists weeks_course_idx on public.weeks(course_id);

do $$ begin
  create type public.module_type as enum
    ('lecture','section','slide','file','video','lab','quiz','assignment','page','link','discussion');
exception when duplicate_object then null; end $$;

create table if not exists public.modules (
  id          uuid primary key default gen_random_uuid(),
  week_id     uuid not null references public.weeks(id) on delete cascade,
  title       text not null,
  type        public.module_type not null default 'file',
  file_url    text,
  body        text,
  order_index int  not null default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);
create index if not exists modules_week_idx on public.modules(week_id);

-- Helper: may the current user manage content for this course?
-- owner/admin anywhere; otherwise must be assigned to the course (doctor/master/guider).
create or replace function public.can_manage_course_id(p_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.current_user_role() in ('owner','admin')
    or exists (
      select 1
      from public.course_assignments ca
      join public.courses c on c.code = ca.course
      where ca.user_id = auth.uid() and c.id = p_course_id
    );
$$;

alter table public.weeks   enable row level security;
alter table public.modules enable row level security;

create policy weeks_read  on public.weeks for select using (auth.uid() is not null);
create policy weeks_write on public.weeks for all
  using      (public.can_manage_course_id(course_id))
  with check (public.can_manage_course_id(course_id));

create policy modules_read  on public.modules for select using (auth.uid() is not null);
create policy modules_write on public.modules for all
  using      (exists (select 1 from public.weeks w where w.id = week_id and public.can_manage_course_id(w.course_id)))
  with check (exists (select 1 from public.weeks w where w.id = week_id and public.can_manage_course_id(w.course_id)));

-- Notify all students/reps when a new course is opened.
create or replace function public.notify_new_course()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, type, meta)
  select p.id, null, 'course_assigned', NEW.title
  from public.profiles p
  where p.role in ('student','rep');
  return NEW;
end;
$$;
drop trigger if exists on_new_course_notify on public.courses;
create trigger on_new_course_notify after insert on public.courses
  for each row execute function public.notify_new_course();
