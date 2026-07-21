// src/app/api/ai-tutor-pro/route.ts
// ═══════════════════════════════════════════════════════════
// SECURE AI PROXY (Anthropic Claude — paid tier)
// The browser talks to THIS route. This route talks to Claude.
// The API key never leaves the server — students never see it.
// Returns the SAME shape as the Gemini route: { reply } or { error }.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { retrieveCourseContext } from '@/lib/ai/retrieval'
import { masteryNote } from '@/lib/ai/mastery'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// Rate limiting is enforced in Postgres (public.rate_limit_hit) so the limit is GLOBAL across
// all serverless instances. An in-memory Map would only limit per instance — bypassable by
// firing concurrent bursts that fan out across warm instances. This matters MORE here than on
// the free route because every call spends real money on the Anthropic key. Stricter than free.
const RATE_LIMIT = 15
const RATE_WINDOW_SECONDS = 60

// Claude Sonnet 4.6 — best balance of speed, intelligence, and cost. Great for teaching.
const CLAUDE_MODEL = 'claude-sonnet-4-6'
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'The advanced AI is not configured. Please contact the administrator.' },
      { status: 503 }
    )
  }

  // Require a signed-in user — the AI tutor is not a public endpoint.
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to use the AI tutor.' }, { status: 401 })
  }

  // Global (cross-instance) rate limit via Postgres. Distinct bucket so it doesn't share a
  // counter with the free tutor. Fail-open if the limiter itself errors.
  const { data: rlOk } = await supabase.rpc('rate_limit_hit', {
    p_bucket: `ai-pro:${user.id}`, p_max: RATE_LIMIT, p_window: RATE_WINDOW_SECONDS,
  })
  if (rlOk === false) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 }
    )
  }

  let body: { system?: string; messages?: { role: string; content: string }[]; courseSlug?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request format.' }, { status: 400 })
  }

  const { system, messages, courseSlug } = body

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

  // RAG: ground the answer in uploaded course materials (best-effort, never blocks).
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
  const [{ context: ragContext, sources }, mastery] = await Promise.all([
    retrieveCourseContext(courseSlug, lastUser),
    masteryNote(courseSlug),
  ])
  const groundedSystem = (ragContext
    ? `${system || ''}\n\n--- COURSE MATERIALS (authoritative; use as the primary source. If the answer is not in them, rely on your own knowledge and make clear what is certain) ---\n${ragContext}`
    : (system || '')) + mastery

  // Our format already matches Claude's (role: 'user' | 'assistant', content: string)
  const claudeMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }))

  const requestBody: any = {
    model: CLAUDE_MODEL,
    max_tokens: 3000,
    temperature: 0.7,
    messages: claudeMessages,
  }
  if (groundedSystem) requestBody.system = groundedSystem

  try {
    const upstream = await fetch(CLAUDE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    })

    if (!upstream.ok) {
      const status = upstream.status
      // 429 = rate/credit limit. The client uses this to notify the owner.
      if (status === 429) {
        return NextResponse.json(
          { error: 'limit_reached', detail: 'The advanced AI limit has been reached.' },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: 'The advanced AI could not respond right now. Please try again.' },
        { status: 502 }
      )
    }

    const data = await upstream.json()
    // Claude returns content as an array of blocks; join the text blocks.
    const reply =
      Array.isArray(data?.content)
        ? data.content.map((b: any) => (b.type === 'text' ? b.text : '')).filter(Boolean).join('\n')
        : ''

    return NextResponse.json({
      reply: reply || 'Sorry, I could not generate a response. Please try rephrasing your question.',
      sources,
    })
  } catch {
    return NextResponse.json(
      { error: 'Connection error. Please check your internet and try again.' },
      { status: 500 }
    )
  }
}
