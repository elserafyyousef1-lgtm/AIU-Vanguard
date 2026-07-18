-- Messaging UX: denormalize the last message onto the conversation so the list can show a
-- preview + time (like Teams/WhatsApp) and reorder by recency. bump_conversation already
-- fires on every message insert; extend it to store the snippet + who sent it.
alter table public.conversations add column if not exists last_message   text;
alter table public.conversations add column if not exists last_sender_id uuid;

create or replace function public.bump_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set
    updated_at     = now(),
    last_message   = left(coalesce(nullif(NEW.content, ''),
                                   case when NEW.image_url is not null then '📷 Photo' else '' end), 140),
    last_sender_id = NEW.sender_id
  where id = NEW.conversation_id;
  return NEW;
end;
$$;
