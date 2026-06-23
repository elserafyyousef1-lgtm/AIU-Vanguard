-- Link RAG documents to the module they came from (cascade cleanup)
alter table public.course_documents
  add column if not exists module_id uuid references public.modules(id) on delete cascade;
create index if not exists course_documents_module_idx on public.course_documents(module_id);
