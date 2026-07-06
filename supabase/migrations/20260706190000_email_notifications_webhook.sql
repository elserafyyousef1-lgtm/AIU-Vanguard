-- ═══ Email notifications: DB webhook → Edge Function (Brevo) ═══
-- pg_net lets a trigger POST to the Edge Function asynchronously (non-blocking).
create extension if not exists pg_net;

-- idempotency: once an email is handled (sent or deliberately skipped) we never re-handle it.
alter table public.notifications add column if not exists email_sent_at timestamptz;

-- shared webhook secret kept OUT of the public API + out of git (private schema; read only via a
-- service_role-locked RPC). The trigger reads it directly; the Edge Function reads it via the RPC.
create schema if not exists private;
revoke all on schema private from anon, authenticated;
create table if not exists private.config (key text primary key, value text not null);
revoke all on private.config from anon, authenticated;
insert into private.config(key, value)
values ('email_webhook_secret', encode(gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

create or replace function public.internal_config(p_key text)
returns text language sql security definer set search_path = public, private as $$
  select value from private.config where key = p_key;
$$;
revoke execute on function public.internal_config(text) from public, anon, authenticated;
grant execute on function public.internal_config(text) to service_role;

-- AFTER INSERT trigger — only IMPORTANT types, EXCEPTION-SAFE (email problems can never block
-- a notification insert, which would break messaging / the whole notify system).
create or replace function public.on_notification_email()
returns trigger language plpgsql security definer set search_path = public, private, extensions, net as $$
declare
  v_secret text;
begin
  if new.type not in ('message','material','assignment','grade_released','promotion',
                       'teach_approved','teach_rejected','course_assigned') then
    return new;
  end if;
  select value into v_secret from private.config where key = 'email_webhook_secret';
  perform net.http_post(
    url := 'https://yipecojgakuwcnlzwkne.supabase.co/functions/v1/notify-email',
    headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', coalesce(v_secret,'')),
    body := jsonb_build_object('id', new.id)
  );
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists on_notification_email on public.notifications;
create trigger on_notification_email
  after insert on public.notifications
  for each row execute function public.on_notification_email();
