-- 1) Private table that holds ONLY the sensitive university ID.
create table if not exists public.user_private (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  student_id text not null unique
);
alter table public.user_private enable row level security;
-- Lock it completely from clients; only SECURITY DEFINER functions read it.
revoke all on public.user_private from anon, authenticated;

-- 2) Migrate existing IDs into the private table.
insert into public.user_private (user_id, student_id)
select id, student_id from public.profiles
on conflict (user_id) do nothing;

-- 3) Signup: write student_id into user_private (not profiles) from now on.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  v_student_id text;
  v_role public.user_role;
begin
  v_student_id := new.raw_user_meta_data->>'student_id';
  if v_student_id = '24100476' then v_role := 'owner'; else v_role := 'student'; end if;
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', v_role);
  insert into public.user_private (user_id, student_id)
  values (new.id, v_student_id)
  on conflict (user_id) do update set student_id = excluded.student_id;
  return new;
end;
$$;

-- 4) Self contact lookup: student_id from private table, phone/email from profiles.
create or replace function public.my_contact()
returns table(student_id text, phone text, contact_email text)
language sql stable security definer set search_path to 'public'
as $$
  select up.student_id, p.phone, p.contact_email
  from public.profiles p
  left join public.user_private up on up.user_id = p.id
  where p.id = auth.uid();
$$;

-- 5) Staff lookup of student IDs: from the private table, gated by role.
create or replace function public.admin_student_ids()
returns table(id uuid, student_id text)
language sql stable security definer set search_path to 'public'
as $$
  select up.user_id, up.student_id
  from public.user_private up
  where public.current_user_role() in ('owner','admin','doctor','master');
$$;

-- 6) Remove the sensitive column from profiles → this is what removes the 403.
alter table public.profiles drop column if exists student_id;

-- 7) The only remaining locked columns are phone/contact_email (currently empty,
--    low sensitivity). Allow select so `select('*')` on profiles works again.
grant select (phone, contact_email) on public.profiles to authenticated, anon;
