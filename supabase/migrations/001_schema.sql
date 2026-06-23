-- ═══════════════════════════════════════════════════════════
-- AIU CS HUB — Database Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  student_id    text unique not null,
  full_name     text not null,
  avatar_url    text,
  semester      smallint default 4,
  settings      jsonb default '{
    "theme": "dark",
    "sound": true,
    "animations": true,
    "language": "both",
    "notifications": true
  }'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, student_id, full_name)
  values (
    new.id,
    new.raw_user_meta_data->>'student_id',
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────
-- COURSE PROGRESS
-- ─────────────────────────────────────────────────────────
create table public.course_progress (
  id                  uuid default uuid_generate_v4() primary key,
  user_id             uuid references public.profiles(id) on delete cascade,
  course_slug         text not null,
  completed_lectures  text[] default '{}',
  flashcards_reviewed int default 0,
  last_active         timestamptz default now(),
  created_at          timestamptz default now(),
  unique(user_id, course_slug)
);

-- ─────────────────────────────────────────────────────────
-- EXAM SCORES
-- ─────────────────────────────────────────────────────────
create table public.exam_scores (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  course_slug text not null,
  score       int not null,
  total       int not null,
  mode        text default 'practice' check (mode in ('practice', 'final')),
  taken_at    timestamptz default now()
);

create index exam_scores_user_course on public.exam_scores(user_id, course_slug);

-- ─────────────────────────────────────────────────────────
-- COMMUNITY POSTS
-- ─────────────────────────────────────────────────────────
create table public.posts (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  content     text not null,
  image_url   text,
  course_tag  text,
  likes_count int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index posts_created_at on public.posts(created_at desc);
create index posts_user_id on public.posts(user_id);

-- ─────────────────────────────────────────────────────────
-- POST LIKES (junction table — prevents double-liking)
-- ─────────────────────────────────────────────────────────
create table public.post_likes (
  post_id   uuid references public.posts(id) on delete cascade,
  user_id   uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

-- Auto-update likes_count on like/unlike
create or replace function public.update_likes_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set likes_count = likes_count - 1 where id = OLD.post_id;
  end if;
  return null;
end;
$$;

create trigger on_like_change
  after insert or delete on public.post_likes
  for each row execute procedure public.update_likes_count();

-- ─────────────────────────────────────────────────────────
-- COMMENTS
-- ─────────────────────────────────────────────────────────
create table public.comments (
  id          uuid default uuid_generate_v4() primary key,
  post_id     uuid references public.posts(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  content     text not null,
  created_at  timestamptz default now()
);

create index comments_post_id on public.comments(post_id);

-- ─────────────────────────────────────────────────────────
-- ONLINE PRESENCE (real-time user counter)
-- ─────────────────────────────────────────────────────────
create table public.online_users (
  user_id     uuid references public.profiles(id) on delete cascade primary key,
  last_seen   timestamptz default now(),
  page        text default 'home'
);

-- Cleanup function: remove users inactive > 3 minutes
create or replace function public.cleanup_stale_presence()
returns void language plpgsql security definer as $$
begin
  delete from public.online_users
  where last_seen < now() - interval '3 minutes';
end;
$$;

-- ─────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.course_progress enable row level security;
alter table public.exam_scores enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.online_users enable row level security;

-- Profiles: users can read all, update only their own
create policy "profiles_read_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Progress: users manage only their own
create policy "progress_own" on public.course_progress
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Exam scores: users manage only their own
create policy "scores_own" on public.exam_scores
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Posts: read all, insert/update/delete own
create policy "posts_read_all" on public.posts for select using (true);
create policy "posts_insert_own" on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_update_own" on public.posts for update using (auth.uid() = user_id);
create policy "posts_delete_own" on public.posts for delete using (auth.uid() = user_id);

-- Likes: read all, manage own
create policy "likes_read_all" on public.post_likes for select using (true);
create policy "likes_manage_own" on public.post_likes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Comments: read all, manage own
create policy "comments_read_all" on public.comments for select using (true);
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = user_id);

-- Online users: read all, manage own
create policy "online_read_all" on public.online_users for select using (true);
create policy "online_manage_own" on public.online_users
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────
-- REALTIME (enable for community + presence)
-- ─────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_likes;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.online_users;
