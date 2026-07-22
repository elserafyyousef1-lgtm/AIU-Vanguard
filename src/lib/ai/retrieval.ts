// src/lib/ai/retrieval.ts
// ───────────────────────────────────────────────────────────
// RAG retrieval. Given a course + the student's question, returns
// the most relevant chunks from uploaded course materials so the
// tutor can answer FROM the real documents — AND the source documents
// they came from, so the UI can SHOW the student where the answer is
// grounded (something a generic chatbot can never do).
// Best-effort: any error returns an empty result and the tutor answers
// normally (never blocks).
// ───────────────────────────────────────────────────────────
import { createClient } from '@/lib/supabase/server'
import { embedText } from './embeddings'

const MIN_SIMILARITY = 0.35
const TOP_K = 6

export interface RagSource {
  title: string
  page: number | null
  url: string | null   // public storage URL of the source doc, for deep-linking the citation
}

export interface RagResult {
  context: string
  sources: RagSource[]
  hasMaterials: boolean   // does this course have ANY uploaded materials (vs. this query just not matching)?
}

const EMPTY: RagResult = { context: '', sources: [], hasMaterials: false }

interface ChunkRow {
  content: string
  document_id: string | null
  page: number | null
  similarity: number
}

export async function retrieveCourseContext(
  courseSlug: string | undefined,
  query: string,
): Promise<RagResult> {
  if (!courseSlug || !query?.trim()) return EMPTY
  try {
    const embedding = await embedText(query, 'RETRIEVAL_QUERY')
    const supabase = createClient()
    const { data, error } = await supabase.rpc('match_course_chunks', {
      query_embedding: embedding,
      p_course: courseSlug,
      match_count: TOP_K,
    })
    if (error || !Array.isArray(data)) return EMPTY

    // The course HAS materials if the RPC returned any chunk at all (it orders every chunk by
    // similarity). Zero rows ⇒ the course has nothing uploaded (vs. this query just not matching).
    const hasMaterials = data.length > 0

    const good = (data as ChunkRow[]).filter((d) => (d.similarity ?? 0) >= MIN_SIMILARITY)
    if (good.length === 0) return { context: '', sources: [], hasMaterials }

    const context = good.map((d, i) => `[Course material ${i + 1}]\n${d.content}`).join('\n\n')

    // Resolve the human-readable document titles for the chunks we actually used,
    // so the UI can cite them. RLS still applies here — if the student can't read a
    // document's row, it simply won't be cited (the answer text is unaffected).
    let sources: RagSource[] = []
    const ids = Array.from(new Set(good.map((d) => d.document_id).filter((x): x is string => Boolean(x))))
    if (ids.length) {
      const { data: docs } = await supabase.from('course_documents').select('id, title, file_url').in('id', ids)
      const byId = new Map<string, { title: string; file_url: string | null }>(
        (docs || []).map((d: any) => [d.id, { title: d.title, file_url: d.file_url ?? null }])
      )
      const seen = new Set<string>()
      for (const d of good) {
        const doc = d.document_id ? byId.get(d.document_id) : undefined
        if (!doc?.title || seen.has(doc.title)) continue
        seen.add(doc.title)
        sources.push({ title: doc.title, page: typeof d.page === 'number' ? d.page : null, url: doc.file_url })
      }
    }

    return { context, sources, hasMaterials }
  } catch {
    return EMPTY // RAG is best-effort — never block the tutor.
  }
}
