-- Move PII (phone, contact_email) into the locked user_private table (RLS deny-all to clients)
alter table public.user_private add column if not exists phone text;
alter table public.user_private add column if not exists contact_email text;

-- Migrate any existing values (idempotent; currently 0 rows but safe for the future)
update public.user_private up
set phone = p.phone, contact_email = p.contact_email
from public.profiles p
where up.user_id = p.id
  and up.phone is null and up.contact_email is null
  and (p.phone is not null or p.contact_email is not null);

-- my_contact() now reads ALL sensitive fields from user_private (own row only)
create or replace function public.my_contact()
returns table(student_id text, phone text, contact_email text)
language sql stable security definer set search_path = 'public' as $$
  select up.student_id, up.phone, up.contact_email
  from public.user_private up
  where up.user_id = auth.uid();
$$;

-- Let a user update ONLY their own contact info (never student_id)
create or replace function public.update_my_contact(p_phone text, p_contact_email text)
returns void language sql security definer set search_path = 'public' as $$
  update public.user_private
  set phone = nullif(trim(p_phone), ''), contact_email = nullif(trim(p_contact_email), '')
  where user_id = auth.uid();
$$;
