// src/app/api/ai-quiz/route.ts
// ═══════════════════════════════════════════════════════════
// QUIZ GENERATOR (Google Gemini — structured JSON output)
// Generates ONE multiple-choice question at a time, grounded in the
// course's OWN uploaded materials (RAG). This is what ChatGPT cannot do:
// quiz a student on their actual lecture slides / notes.
// The API key never leaves the server.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { retrieveCourseContext } from '@/lib/ai/retrieval'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const RATE_LIMIT = 40
const RATE_WINDOW_SECONDS = 60

const GEMINI_MODEL = 'gemini-2.5-flash'
// Non-streaming: we want ONE well-formed JSON object, not a token stream.
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

type Difficulty = 'easy' | 'medium' | 'hard'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service is not configured.' }, { status: 503 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to use the quiz.' }, { status: 401 })
  }

  const { data: rlOk } = await supabase.rpc('rate_limit_hit', {
    p_bucket: `quiz:${user.id}`, p_max: RATE_LIMIT, p_window: RATE_WINDOW_SECONDS,
  })
  if (rlOk === false) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  let body: {
    courseSlug?: string
    courseName?: string
    topic?: string
    difficulty?: Difficulty
    asked?: string[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request format.' }, { status: 400 })
  }

  const { courseSlug, courseName, topic } = body
  // Cap every attacker-controlled string that ends up in the Gemini systemInstruction, mirroring
  // the tutor route's guards — otherwise a signed-in user could push huge payloads through the
  // shared API key (cost/availability abuse). Reject over-limit input instead of truncating.
  if (courseSlug !== undefined && (typeof courseSlug !== 'string' || courseSlug.length > 64)) {
    return NextResponse.json({ error: 'Invalid course.' }, { status: 400 })
  }
  if (courseName !== undefined && (typeof courseName !== 'string' || courseName.length > 200)) {
    return NextResponse.json({ error: 'Invalid course name.' }, { status: 400 })
  }
  if (topic !== undefined && (typeof topic !== 'string' || topic.length > 200)) {
    return NextResponse.json({ error: 'Topic too long.' }, { status: 400 })
  }
  const difficulty: Difficulty = body.difficulty === 'easy' || body.difficulty === 'hard' ? body.difficulty : 'medium'
  // Titles of questions already asked this session — so we never repeat one. Cap count AND length.
  const asked = Array.isArray(body.asked)
    ? body.asked.slice(-15).filter(s => typeof s === 'string' && s.length <= 300)
    : []

  // RAG: pull the most relevant course material for the requested topic (or a broad sweep).
  const ragQuery = topic?.trim() || 'key concepts, definitions, formulas, and the most important exam topics'
  const [{ context: ragContext }, weakData] = await Promise.all([
    retrieveCourseContext(courseSlug, ragQuery),
    // Bias broad quizzes toward what the student keeps getting wrong (mastery profile).
    topic?.trim() ? Promise.resolve({ data: null }) : supabase.rpc('ai_weak_topics', { p_course: courseSlug, p_limit: 5 }),
  ])
  const weakTopics = Array.isArray((weakData as any)?.data)
    ? ((weakData as any).data as Array<{ topic: string }>).map(w => w.topic).filter(Boolean).map(t => t.slice(0, 120)).slice(0, 6)
    : []

  const grounding = ragContext
    ? `Base the question STRICTLY on these course materials. The correct answer must be supported by them.\n\n--- COURSE MATERIALS ---\n${ragContext}`
    : `No uploaded materials were found, so use standard, correct knowledge for this course. Keep it accurate.`

  const avoid = asked.length
    ? `\n\nDo NOT repeat any of these already-asked questions:\n${asked.map(a => `- ${a}`).join('\n')}`
    : ''

  const systemInstruction = [
    `You are an exam-setter for "${courseName || courseSlug || 'this university course'}" at Alamein International University.`,
    `Write ONE ${difficulty} multiple-choice question that tests real understanding (not trivia).`,
    topic?.trim()
      ? `Focus on this topic: "${topic.trim()}".`
      : weakTopics.length
        ? `Prefer testing a topic the student is weak on (or closely related): ${weakTopics.join(', ')}. Otherwise pick an important topic from the materials.`
        : `Pick an important topic from the materials.`,
    `Rules:`,
    `- Exactly 4 options. Exactly one is correct. The 3 distractors must be plausible common mistakes.`,
    `- "correctIndex" is the 0-based index of the correct option.`,
    `- "explanation" explains why the correct answer is right AND why the tempting wrong ones are wrong. 2-4 sentences.`,
    `- "topic" is a short 2-4 word label of what this question tests (used to track weak areas).`,
    `- Write in clear Egyptian Arabic if the concept is abstract, or English — but keep ALL technical terms, code, symbols, and formulas in English. Use LaTeX ($...$) for math.`,
    `- Never mention "the materials" or "the document" in the question or options.`,
    grounding,
    avoid,
  ].join('\n')

  const requestBody = {
    contents: [{ role: 'user', parts: [{ text: 'Generate the question now.' }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.9,
      // Headroom so the JSON (question + 4 options + explanation) is never truncated,
      // even with a little model "thinking" counting toward the output budget.
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      // Gemini's REST API expects UPPER-CASE OpenAPI type names.
      responseSchema: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          correctIndex: { type: 'INTEGER' },
          explanation: { type: 'STRING' },
          topic: { type: 'STRING' },
        },
        required: ['question', 'options', 'correctIndex', 'explanation', 'topic'],
      },
    },
  }

  try {
    const upstream = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(requestBody),
    })

    if (!upstream.ok) {
      const msg = upstream.status === 429
        ? 'The quiz generator is busy right now. Please try again in a moment.'
        : 'Could not generate a question right now. Please try again.'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const data = await upstream.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw) {
      return NextResponse.json({ error: 'Empty response. Please try again.' }, { status: 502 })
    }

    let q: any
    try { q = JSON.parse(raw) } catch {
      return NextResponse.json({ error: 'Malformed question. Please try again.' }, { status: 502 })
    }

    // Validate the shape before trusting it on the client.
    const options: unknown = q?.options
    if (
      typeof q?.question !== 'string' ||
      !Array.isArray(options) || options.length !== 4 ||
      options.some((o) => typeof o !== 'string') ||
      typeof q?.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3 ||
      typeof q?.explanation !== 'string'
    ) {
      return NextResponse.json({ error: 'Could not build a valid question. Please try again.' }, { status: 502 })
    }

    // NOTE: correctIndex + explanation are intentionally returned up-front. This is a self-study
    // tool — scoring is client-side and never graded/persisted, so a student inspecting the
    // response only cheats themselves. If the quiz ever becomes graded, split into a question
    // endpoint + a separate answer-submission endpoint that keeps correctIndex server-side.
    return NextResponse.json({
      question: q.question,
      options: options as string[],
      correctIndex: Math.round(q.correctIndex),
      explanation: q.explanation,
      topic: typeof q.topic === 'string' && q.topic.trim() ? q.topic.trim() : (topic?.trim() || 'General'),
      grounded: Boolean(ragContext),
    })
  } catch {
    return NextResponse.json({ error: 'Connection error. Please try again.' }, { status: 500 })
  }
}
