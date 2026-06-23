// src/lib/ai/chunk.ts
// ───────────────────────────────────────────────────────────
// Splits raw document text into overlapping chunks suitable for
// embedding + retrieval. Tries to break on paragraph/sentence
// boundaries so a chunk stays semantically coherent.
// ───────────────────────────────────────────────────────────

export interface Chunk {
  content: string
  index: number
}

export function chunkText(raw: string, opts?: { size?: number; overlap?: number }): Chunk[] {
  const size = opts?.size ?? 1200      // ~chars (~250-350 tokens)
  const overlap = opts?.overlap ?? 200

  const text = raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!text) return []

  const chunks: Chunk[] = []
  let i = 0
  let idx = 0

  while (i < text.length) {
    let end = Math.min(i + size, text.length)

    // Prefer a clean boundary in the second half of the window.
    if (end < text.length) {
      const slice = text.slice(i, end)
      const boundary = Math.max(
        slice.lastIndexOf('\n\n'),
        slice.lastIndexOf('. '),
        slice.lastIndexOf('\n'),
      )
      if (boundary > size * 0.5) end = i + boundary + 1
    }

    const content = text.slice(i, end).trim()
    if (content.length > 20) chunks.push({ content, index: idx++ })

    if (end >= text.length) break
    i = Math.max(0, end - overlap)
  }

  return chunks
}
