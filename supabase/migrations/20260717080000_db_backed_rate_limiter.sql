-- SECURITY: robust, serverless-safe rate limiting. The API routes used an in-memory Map,
-- which only limits PER Vercel instance (an attacker rotating instances bypasses it). This
-- moves the counter into Postgres so the limit is GLOBAL across all instances.
create table if not exists public.rate_limits (
  bucket       text   not null,   -- e.g. 'ai:<user_id>'
  window_start bigint not null,   -- floor(epoch / window) — the fixed-window index
  count        int    not null default 0,
  primary key (bucket, window_start)
);
alter table public.rate_limits enable row level security;
-- No direct client access; the SECURITY DEFINER function is the only way in.
revoke all on public.rate_limits from anon, authenticated;

-- Returns TRUE if the caller is under the limit for this fixed window, FALSE if exceeded.
-- Self-cleans old windows for the bucket so the table stays tiny.
create or replace function public.rate_limit_hit(p_bucket text, p_max int, p_window int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window bigint := floor(extract(epoch from now()) / greatest(p_window, 1));
  v_count  int;
begin
  insert into public.rate_limits(bucket, window_start, count)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;

  delete from public.rate_limits where bucket = p_bucket and window_start < v_window - 1;

  return v_count <= p_max;
end;
$$;
revoke all on function public.rate_limit_hit(text, int, int) from public;
grant execute on function public.rate_limit_hit(text, int, int) to authenticated, service_role;
