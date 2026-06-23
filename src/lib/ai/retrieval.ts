// src/lib/ai/retrieval.ts
// ───────────────────────────────────────────────────────────
// RAG retrieval. Given a course + the student's question, returns
// the most relevant chunks from uploaded course materials so the
// tutor can answer FROM the real documents. Best-effort: any error
// returns '' and the tutor answers normally (never blocks).
// ───────────────────────────────────────────────────────────
import { createClient } from '@/lib/supabase/server'
import { embedText } from './embeddings'

const MIN_SIMILARITY = 0.35
const TOP_K = 6

export async function retrieveCourseContext(
  courseSlug: string | undefined,
  query: string,
): Promise<string> {
  if (!courseSlug || !query?.trim()) return ''
  try {
    const embedding = await embedText(query, 'RETRIEVAL_QUERY')
    const supabase = createClient()
    const { data, error } = await supabase.rpc('match_course_chunks', {
      query_embedding: embedding,
      p_course: courseSlug,
      match_count: TOP_K,
    })
    if (error || !Array.isArray(data) || data.length === 0) return ''

    const good = (data as Array<{ content: string; similarity: number }>)
      .filter((d) => (d.similarity ?? 0) >= MIN_SIMILARITY)
    if (good.length === 0) return ''

    return good.map((d, i) => `[Course material ${i + 1}]\n${d.content}`).join('\n\n')
  } catch {
    return '' // RAG is best-effort — never block the tutor.
  }
}
