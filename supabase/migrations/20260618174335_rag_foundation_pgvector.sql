-- RAG foundation: pgvector + course documents + chunks + similarity search
create extension if not exists vector with schema extensions;

-- One row per uploaded course document (PDF)
create table if not exists public.course_documents (
  id           uuid primary key default gen_random_uuid(),
  course       text not null,
  title        text not null,
  file_url     text,
  storage_path text,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  status       text not null default 'pending' check (status in ('pending','processing','ready','failed')),
  error        text,
  chunk_count  int  not null default 0,
  created_at   timestamptz default now()
);
create index if not exists course_documents_course_idx on public.course_documents(course);

-- One row per text chunk + its embedding
create table if not exists public.document_chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.course_documents(id) on delete cascade,
  course      text not null,
  content     text not null,
  embedding   extensions.vector(768),
  chunk_index int not null,
  page        int,
  created_at  timestamptz default now()
);
create index if not exists document_chunks_course_idx on public.document_chunks(course);
create index if not exists document_chunks_doc_idx    on public.document_chunks(document_id);
create index if not exists document_chunks_embed_idx  on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops);

-- Similarity search. SECURITY DEFINER so the AI route can call it; returns study material only.
create or replace function public.match_course_chunks(
  query_embedding extensions.vector(768),
  p_course text,
  match_count int default 6
) returns table (content text, document_id uuid, page int, similarity float)
language sql stable security definer set search_path = public, extensions as $$
  select c.content, c.document_id, c.page, 1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  where c.course = p_course and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 6), 20));
$$;

-- RLS: everyone signed-in can READ materials; only staff can WRITE.
alter table public.course_documents enable row level security;
alter table public.document_chunks  enable row level security;

create policy course_documents_read on public.course_documents
  for select using (auth.uid() is not null);
create policy course_documents_write on public.course_documents
  for all
  using      (public.current_user_role() in ('owner','admin','doctor'))
  with check (public.current_user_role() in ('owner','admin','doctor'));

create policy document_chunks_read on public.document_chunks
  for select using (auth.uid() is not null);
create policy document_chunks_write on public.document_chunks
  for all
  using      (public.current_user_role() in ('owner','admin','doctor'))
  with check (public.current_user_role() in ('owner','admin','doctor'));
