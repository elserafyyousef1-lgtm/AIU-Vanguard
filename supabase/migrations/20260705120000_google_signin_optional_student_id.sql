-- ═══ Google sign-in support: student_id becomes OPTIONAL at signup ═══
-- Google can't supply the university ID, so signup must not require it. The ID is then
-- claimed ONCE via the onboarding RPC below. Uniqueness stays enforced (multiple NULLs ok).

alter table public.user_private alter column student_id drop not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_student_id text;
  v_role public.user_role;
begin
  v_student_id := new.raw_user_meta_data->>'student_id';
  if v_student_id = '24100476' then v_role := 'owner'; else v_role := 'student'; end if;

  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Student'), v_role);

  insert into public.user_private (user_id, student_id)
  values (new.id, v_student_id)
  on conflict (user_id) do update
    set student_id = coalesce(excluded.student_id, user_private.student_id);

  insert into public.notifications (user_id, actor_id, type)
  select new.id, new.id, 'welcome'
  where not exists (
    select 1 from public.notifications where user_id = new.id and type = 'welcome'
  );

  return new;
end;
$$;

create or replace function public.set_my_student_id(p_student_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in.';
  end if;
  if p_student_id !~ '^\d{8}$' then
    raise exception 'Student ID must be exactly 8 digits.';
  end if;
  if exists (select 1 from public.user_private where user_id = v_uid and student_id is not null) then
    raise exception 'Your student ID is already set.';
  end if;
  if exists (select 1 from public.user_private where student_id = p_student_id) then
    raise exception 'This student ID is already registered.';
  end if;

  insert into public.user_private (user_id, student_id)
  values (v_uid, p_student_id)
  on conflict (user_id) do update
    set student_id = excluded.student_id
    where user_private.student_id is null;
end;
$$;

revoke execute on function public.set_my_student_id(text) from public, anon;
grant execute on function public.set_my_student_id(text) to authenticated;
