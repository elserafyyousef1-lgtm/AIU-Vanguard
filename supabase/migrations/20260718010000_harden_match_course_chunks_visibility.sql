-- match_course_chunks is SECURITY DEFINER, so it bypasses RLS on document_chunks.
-- Previously it filtered ONLY by course code, meaning any authenticated user could
-- retrieve chunk CONTENT from a HIDDEN (unpublished) course — e.g. a hidden University
-- Requirements course — via the AI tutor / quiz RAG by passing that course's code.
-- Fix: gate results by the SAME visibility rule as courses_read (published, OR the
-- caller is owner/admin, OR the caller can manage the course). No behaviour change for
-- published courses or managers; hidden-course chunks are now unreachable by students.
CREATE OR REPLACE FUNCTION public.match_course_chunks(query_embedding vector, p_course text, match_count integer DEFAULT 6)
 RETURNS TABLE(content text, document_id uuid, page integer, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select c.content, c.document_id, c.page, 1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  where c.course = p_course
    and c.embedding is not null
    and exists (
      select 1 from public.courses co
      where co.code = p_course
        and (
          co.published
          or (
            (select auth.uid()) is not null
            and (
              (select current_user_role()) = any (array['owner'::user_role, 'admin'::user_role])
              or can_manage_course_id(co.id)
            )
          )
        )
    )
  order by c.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 6), 20));
$function$;
