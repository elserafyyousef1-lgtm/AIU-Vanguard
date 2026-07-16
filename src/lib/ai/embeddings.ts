// src/lib/ai/embeddings.ts
// ───────────────────────────────────────────────────────────
// Server-only. Generates 768-dim embeddings via Google Gemini
// (gemini-embedding-001, outputDimensionality=768) to match the
// `vector(768)` columns used for RAG retrieval.
// The GEMINI_API_KEY never leaves the server.
// ───────────────────────────────────────────────────────────

const MODEL = 'models/gemini-embedding-001'
export const EMBED_DIM = 768
const URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:embedContent`

// RETRIEVAL_DOCUMENT for stored chunks, RETRIEVAL_QUERY for the user's question.
export type EmbedTask = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'

// Hard ceiling on the embedding round-trip. RAG is best-effort context: if Gemini
// hangs (observed in production as 20-30s tutor stalls), we must abort fast and let
// the tutor answer ungrounded rather than hold the whole /api/ai-tutor request.
const EMBED_TIMEOUT_MS = 3000

export async function embedText(text: string, taskType: EmbedTask): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not configured')

  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      model: MODEL,
      content: { parts: [{ text: text.slice(0, 8000) }] },
      taskType,
      outputDimensionality: EMBED_DIM,
    }),
    signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Embedding failed (${res.status}): ${detail.slice(0, 200)}`)
  }

  const json = await res.json()
  const values: unknown = json?.embedding?.values
  if (!Array.isArray(values) || values.length !== EMBED_DIM) {
    throw new Error(`Embedding returned an unexpected shape (got ${Array.isArray(values) ? values.length : 'none'})`)
  }
  return values as number[]
}

// Embed a list of texts sequentially (gentle on free-tier rate limits).
export async function embedMany(texts: string[], taskType: EmbedTask): Promise<number[][]> {
  const out: number[][] = []
  for (const t of texts) out.push(await embedText(t, taskType))
  return out
}

// pgvector expects a literal like "[0.1,0.2,...]" — NOT a JS array,
// which supabase-js would serialise as a Postgres array "{...}".
export function toVectorLiteral(embedding: number[]): string {
  return JSON.stringify(embedding)
}
