// src/app/api/ai-tutor/route.ts
// ═══════════════════════════════════════════════════════════
// SECURE AI PROXY (Google Gemini — free tier)
// The browser talks to THIS route. This route talks to Gemini.
// The API key never leaves the server — students never see it.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { retrieveCourseContext } from '@/lib/ai/retrieval'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// ── Simple in-memory rate limiting (per IP) ────────────────
const RATE_LIMIT = 20
const RATE_WINDOW = 60_000
const hits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

const GEMINI_MODEL = 'gemini-flash-latest'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

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

  if (!checkRateLimit(user.id)) {
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
  const ragContext = await retrieveCourseContext(courseSlug, lastUser)
  const groundedSystem = ragContext
    ? `${system || ''}\n\n--- COURSE MATERIALS (authoritative; use as the primary source. If the answer is not in them, rely on your own knowledge and make clear what is certain) ---\n${ragContext}`
    : system

  // Convert our format -> Gemini format (assistant -> model)
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

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

    if (!upstream.ok) {
      const status = upstream.status
      const msg =
        status === 429
          ? 'The AI is busy right now (free limit reached). Please try again in a moment.'
          : 'The AI could not respond right now. Please try again.'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const data = await upstream.json()
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Sorry, I could not generate a response. Please try rephrasing your question.'

    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json(
      { error: 'Connection error. Please check your internet and try again.' },
      { status: 500 }
    )
  }
}