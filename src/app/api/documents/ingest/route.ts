// src/app/api/documents/ingest/route.ts
// ───────────────────────────────────────────────────────────
// Staff-only RAG ingestion. Given an uploaded PDF (course, title,
// fileUrl), it: downloads → extracts text → chunks → embeds →
// stores chunks in `document_chunks` for retrieval by the tutor.
// Auth: the staff member's session (RLS also enforces staff-write).
// ───────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractText, getDocumentProxy } from 'unpdf'
import { chunkText } from '@/lib/ai/chunk'
import { embedText, toVectorLiteral } from '@/lib/ai/embeddings'

export const runtime = 'nodejs'
export const maxDuration = 60

// Cap chunks per request so a huge PDF can't blow the function time budget.
const MAX_CHUNKS = 80
const STAFF = ['owner', 'admin', 'doctor']

export async function POST(req: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !STAFF.includes(profile.role)) {
    return NextResponse.json({ error: 'Only staff can upload course materials.' }, { status: 403 })
  }

  // Ingestion runs embeddings (cost) — global rate limit: 10 per 5 minutes per user.
  const { data: rlOk } = await supabase.rpc('rate_limit_hit', { p_bucket: `ingest:${user.id}`, p_max: 10, p_window: 300 })
  if (rlOk === false) {
    return NextResponse.json({ error: 'Too many uploads. Please wait a few minutes and try again.' }, { status: 429 })
  }

  let body: { course?: string; title?: string; fileUrl?: string; moduleId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }

  const course = body.course?.trim()
  const title = body.title?.trim()
  const fileUrl = body.fileUrl?.trim()
  const moduleId = body.moduleId?.trim() || null
  if (!course || !title || !fileUrl) {
    return NextResponse.json({ error: 'course, title and fileUrl are required.' }, { status: 400 })
  }

  // SSRF guard: fileUrl is fetched server-side, so it must point ONLY at our Supabase
  // storage (where legit uploads live). Without this a staff-level account could make the
  // server fetch internal/metadata endpoints (e.g. 169.254.169.254). Legit uploads always
  // produce a https://<project>.supabase.co/storage/... URL, so this changes no real flow.
  const SUPABASE_HOST = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').host
  let parsedUrl: URL
  try { parsedUrl = new URL(fileUrl) } catch { return NextResponse.json({ error: 'Invalid fileUrl.' }, { status: 400 }) }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.host !== SUPABASE_HOST || !parsedUrl.pathname.startsWith('/storage/')) {
    return NextResponse.json({ error: 'fileUrl must be an uploaded course-materials file.' }, { status: 400 })
  }

  // 1) Record the document as "processing".
  const { data: doc, error: docErr } = await supabase
    .from('course_documents')
    .insert({ course, title, file_url: fileUrl, module_id: moduleId, uploaded_by: user.id, status: 'processing' })
    .select()
    .single()
  if (docErr || !doc) {
    return NextResponse.json({ error: 'Could not create the document record.' }, { status: 500 })
  }

  try {
    // 2) Download + extract text.
    const pdfRes = await fetch(fileUrl)
    if (!pdfRes.ok) throw new Error('Could not download the PDF file.')
    const bytes = new Uint8Array(await pdfRes.arrayBuffer())
    const pdf = await getDocumentProxy(bytes)
    const { text } = await extractText(pdf, { mergePages: true })
    const fullText = Array.isArray(text) ? text.join('\n\n') : text
    if (!fullText || fullText.trim().length < 30) {
      throw new Error('No extractable text found (is this a scanned/image-only PDF?).')
    }

    // 3) Chunk.
    const chunks = chunkText(fullText)
    if (chunks.length === 0) throw new Error('Document produced no usable text chunks.')
    const selected = chunks.slice(0, MAX_CHUNKS)

    // 4) Embed + collect rows.
    const rows = []
    for (const c of selected) {
      const embedding = await embedText(c.content, 'RETRIEVAL_DOCUMENT')
      rows.push({
        document_id: doc.id,
        course,
        content: c.content,
        embedding: toVectorLiteral(embedding),
        chunk_index: c.index,
      })
    }

    // 5) Store chunks + mark ready.
    const { error: insErr } = await supabase.from('document_chunks').insert(rows)
    if (insErr) throw new Error('Could not store chunks: ' + insErr.message)

    await supabase
      .from('course_documents')
      .update({ status: 'ready', chunk_count: rows.length })
      .eq('id', doc.id)

    return NextResponse.json({
      ok: true,
      documentId: doc.id,
      chunksStored: rows.length,
      truncated: chunks.length > MAX_CHUNKS,
    })
  } catch (e: any) {
    await supabase
      .from('course_documents')
      .update({ status: 'failed', error: String(e?.message || e).slice(0, 300) })
      .eq('id', doc.id)
    return NextResponse.json({ error: e?.message || 'Ingestion failed.' }, { status: 500 })
  }
}
