-- PII now lives only in user_private (RLS deny-all). Remove from the world-readable profiles table.
alter table public.profiles drop column if exists phone;
alter table public.profiles drop column if exists contact_email;
