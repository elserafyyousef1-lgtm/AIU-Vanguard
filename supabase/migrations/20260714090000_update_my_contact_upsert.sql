-- Make the Settings → Contact save reliable. update_my_contact was UPDATE-only, so a user
-- with no user_private row (e.g. registered with a student ID and never had contact info)
-- would "save" an email in Settings but nothing persisted — the UPDATE matched 0 rows and
-- returned void with no error. Switch to an upsert so adding an email/phone always writes to
-- the database. Idempotent (CREATE OR REPLACE keeps the existing EXECUTE grants).
create or replace function public.update_my_contact(p_phone text, p_contact_email text)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  insert into public.user_private (user_id, phone, contact_email)
  values (auth.uid(), nullif(trim(p_phone), ''), nullif(trim(p_contact_email), ''))
  on conflict (user_id) do update
    set phone = excluded.phone,
        contact_email = excluded.contact_email;
$function$;
