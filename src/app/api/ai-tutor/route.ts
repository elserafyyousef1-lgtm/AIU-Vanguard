// src/app/api/ai-tutor/route.ts
// ═══════════════════════════════════════════════════════════
// SECURE AI PROXY (Google Gemini — free tier)
// The browser talks to THIS route. This route talks to Gemini.
// The API key never leaves the server — students never see it.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { retrieveCourseContext } from '@/lib/ai/retrieval'
import { masteryNote } from '@/lib/ai/mastery'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// Rate limiting is enforced in Postgres (public.rate_limit_hit) so the limit is GLOBAL
// across all serverless instances — an in-memory Map would only limit per instance, which
// an attacker rotating instances could bypass. 20 requests / 60s / user.
const RATE_LIMIT = 20
const RATE_WINDOW_SECONDS = 60

// Pinned to a specific fast model. The `gemini-flash-latest` alias was silently repointed
// by Google to gemini-3.5-flash, which "thinks" by default and took 30–50s per reply.
// gemini-2.5-flash answers in ~3s and is pinned so an alias change can't slow us down again.
const GEMINI_MODEL = 'gemini-2.5-flash'
// Streaming endpoint (Server-Sent Events) so the answer appears word-by-word, like a premium
// chat — closing the "feel" gap with ChatGPT while our answers stay course-grounded.
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI service is not configured. Please contact the administrator.' },
      { status: 503 }
    )
  }

  // Require a signed-in user — the AI tutor is not a public endpoint.
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to use the AI tutor.' }, { status: 401 })
  }

  // Global (cross-instance) rate limit via Postgres. Fail-open if the limiter itself errors.
  const { data: rlOk } = await supabase.rpc('rate_limit_hit', {
    p_bucket: `ai:${user.id}`, p_max: RATE_LIMIT, p_window: RATE_WINDOW_SECONDS,
  })
  if (rlOk === false) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 }
    )
  }

  let body: {
    system?: string
    messages?: { role: string; content: string }[]
    courseSlug?: string
    image?: { mimeType?: string; data?: string }
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request format.' }, { status: 400 })
  }

  const { system, messages, courseSlug, image } = body

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided.' }, { status: 400 })
  }
  if (messages.length > 30) {
    return NextResponse.json({ error: 'Conversation too long.' }, { status: 400 })
  }
  for (const m of messages) {
    if (typeof m.content !== 'string' || m.content.length > 4000) {
      return NextResponse.json({ error: 'Message too long.' }, { status: 400 })
    }
  }

  // Optional attached image (Vision). Validate hard: must be an image mime and within a size
  // cap (~5MB of base64) so a caller can't push a huge blob through the shared key.
  let imagePart: { inlineData: { mimeType: string; data: string } } | null = null
  if (image) {
    const mime = typeof image.mimeType === 'string' ? image.mimeType : ''
    const data = typeof image.data === 'string' ? image.data : ''
    if (!mime.startsWith('image/') || !data || data.length > 7_000_000) {
      return NextResponse.json({ error: 'Invalid or too-large image. Please use an image under 5 MB.' }, { status: 400 })
    }
    imagePart = { inlineData: { mimeType: mime, data } }
  }

  // RAG: ground the answer in uploaded course materials (best-effort, never blocks).
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
  const [{ context: ragContext, sources }, mastery] = await Promise.all([
    retrieveCourseContext(courseSlug, lastUser),
    masteryNote(courseSlug),
  ])
  const groundedSystem = (ragContext
    ? `${system || ''}\n\n--- COURSE MATERIALS (authoritative; use as the primary source. If the answer is not in them, rely on your own knowledge and make clear what is certain) ---\n${ragContext}`
    : (system || '')) + mastery

  // Convert our format -> Gemini format (assistant -> model)
  const contents: any[] = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  // Attach the image to the latest user turn so the tutor can "see" and solve it.
  if (imagePart && contents.length) {
    contents[contents.length - 1].parts.push(imagePart)
  }

  const requestBody: any = {
    contents,
    generationConfig: { maxOutputTokens: 3000, temperature: 0.7 },
  }
  if (groundedSystem) {
    requestBody.systemInstruction = { parts: [{ text: groundedSystem }] }
  }

  try {
    const upstream = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    })

    if (!upstream.ok || !upstream.body) {
      const status = upstream.status
      const msg =
        status === 429
          ? 'The AI is busy right now (free limit reached). Please try again in a moment.'
          : 'The AI could not respond right now. Please try again.'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    // Transform Gemini's SSE stream into a plain-text delta stream the client appends live.
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = upstream.body!.getReader()
        let buffer = ''
        let sent = false
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
              const s = line.trim()
              if (!s.startsWith('data:')) continue
              const payload = s.slice(5).trim()
              if (!payload || payload === '[DONE]') continue
              try {
                const obj = JSON.parse(payload)
                const text = obj?.candidates?.[0]?.content?.parts?.[0]?.text
                if (text) { controller.enqueue(encoder.encode(text)); sent = true }
              } catch { /* a JSON chunk split across reads — the buffer keeps the remainder */ }
            }
          }
          if (!sent) controller.enqueue(encoder.encode('Sorry, I could not generate a response. Please try rephrasing your question.'))
        } catch {
          if (!sent) controller.enqueue(encoder.encode('The AI response was interrupted. Please try again.'))
        } finally {
          controller.close()
        }
      },
    })

    // Ship the grounding sources in a header (base64 UTF-8) so they arrive with the
    // response start, separate from the text token stream. The client renders them as
    // "📄 from <document>" chips under the answer — visible proof it used real materials.
    const headers: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    }
    if (sources.length) {
      headers['X-Sources'] = Buffer.from(JSON.stringify(sources), 'utf8').toString('base64')
    }

    return new Response(stream, { headers })
  } catch {
    return NextResponse.json(
      { error: 'Connection error. Please check your internet and try again.' },
      { status: 500 }
    )
  }
}