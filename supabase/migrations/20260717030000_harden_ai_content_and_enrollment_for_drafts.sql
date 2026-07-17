-- SECURITY (cont.): AI/RAG content + enrollment must also respect course publishing.
-- document_chunks + course_documents were readable by ANY signed-in user → a draft course's
-- ingested material could leak. Gate them behind course visibility, like weeks/modules.
drop policy if exists document_chunks_read on public.document_chunks;
create policy document_chunks_read on public.document_chunks for select using (
  (select auth.uid()) is not null
  and exists (select 1 from public.courses c
              where c.code = document_chunks.course
                and (c.published or public.can_manage_course_id(c.id)
                     or (select public.current_user_role()) = any (array['owner'::public.user_role,'admin'::public.user_role])))
);

drop policy if exists course_documents_read on public.course_documents;
create policy course_documents_read on public.course_documents for select using (
  (select auth.uid()) is not null
  and exists (select 1 from public.courses c
              where c.code = course_documents.course
                and (c.published or public.can_manage_course_id(c.id)
                     or (select public.current_user_role()) = any (array['owner'::public.user_role,'admin'::public.user_role])))
);

-- Students may only self-enroll into a PUBLISHED course (never a hidden/draft one).
drop policy if exists enr_insert_own on public.enrollments;
create policy enr_insert_own on public.enrollments for insert with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.courses c where c.code = enrollments.course and c.published)
);
