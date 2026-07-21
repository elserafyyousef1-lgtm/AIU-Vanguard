// src/app/api/ai-exam/route.ts
// ═══════════════════════════════════════════════════════════
// EXAM SIMULATOR — generates a FULL mock exam (N questions) in ONE
// Gemini structured-JSON call, grounded in the course's own materials and
// biased toward the student's weak topics. This is what ChatGPT can't do:
// a realistic dry-run of THIS course's final, from THIS professor's slides.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { retrieveCourseContext } from '@/lib/ai/retrieval'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const RATE_LIMIT = 8
const RATE_WINDOW_SECONDS = 60

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

type Difficulty = 'easy' | 'medium' | 'hard'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI service is not configured.' }, { status: 503 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to use the exam simulator.' }, { status: 401 })

  const { data: rlOk } = await supabase.rpc('rate_limit_hit', {
    p_bucket: `exam:${user.id}`, p_max: RATE_LIMIT, p_window: RATE_WINDOW_SECONDS,
  })
  if (rlOk === false) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

  let body: { courseSlug?: string; courseName?: string; count?: number; difficulty?: Difficulty }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request format.' }, { status: 400 })
  }

  const { courseSlug, courseName } = body
  if (courseSlug !== undefined && (typeof courseSlug !== 'string' || courseSlug.length > 64)) {
    return NextResponse.json({ error: 'Invalid course.' }, { status: 400 })
  }
  if (courseName !== undefined && (typeof courseName !== 'string' || courseName.length > 200)) {
    return NextResponse.json({ error: 'Invalid course name.' }, { status: 400 })
  }
  const count = Math.min(20, Math.max(5, Math.round(Number(body.count) || 10)))
  const difficulty: Difficulty = body.difficulty === 'easy' || body.difficulty === 'hard' ? body.difficulty : 'medium'

  // Broad RAG sweep + weak-topic bias, run together.
  const [{ context: ragContext }, weakData] = await Promise.all([
    retrieveCourseContext(courseSlug, 'full exam: key concepts, definitions, formulas, problem-solving across the whole course'),
    supabase.rpc('ai_weak_topics', { p_course: courseSlug, p_limit: 6 }),
  ])
  const weakTopics = Array.isArray((weakData as any)?.data)
    ? ((weakData as any).data as Array<{ topic: string }>).map(w => w.topic).filter(Boolean).map(t => t.slice(0, 120)).slice(0, 6)
    : []

  const grounding = ragContext
    ? `Base the exam STRICTLY on these course materials; every correct answer must be supported by them.\n\n--- COURSE MATERIALS ---\n${ragContext}`
    : `No uploaded materials were found, so use standard, correct knowledge for this course. Keep it accurate.`

  const systemInstruction = [
    `You are the exam-setter writing a realistic MOCK FINAL for "${courseName || courseSlug || 'this university course'}" at Alamein International University.`,
    `Produce EXACTLY ${count} ${difficulty} multiple-choice questions that together simulate a real final: a spread of topics, a realistic difficulty curve, and genuine understanding (not trivia).`,
    weakTopics.length ? `Give extra weight to topics the student is weak on: ${weakTopics.join(', ')}.` : ``,
    `Rules for EVERY question:`,
    `- Exactly 4 options; exactly one correct. The 3 distractors must be plausible common mistakes.`,
    `- "correctIndex" is the 0-based index of the correct option.`,
    `- "explanation" says why the correct answer is right and why the tempting wrong ones are wrong (2-4 sentences).`,
    `- "topic" is a short 2-4 word label (used to score the student by topic).`,
    `- Every question must test a DIFFERENT concept — no two near-duplicates.`,
    `- Write in clear Egyptian Arabic or English, but keep ALL technical terms, code, symbols, and formulas in English. Use LaTeX ($...$) for math.`,
    `- Never mention "the materials" or "the document".`,
    grounding,
  ].filter(Boolean).join('\n')

  const requestBody = {
    contents: [{ role: 'user', parts: [{ text: `Generate the ${count}-question mock exam now.` }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: Math.min(8000, 1200 + count * 450),
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          questions: {
            type: 'ARRAY',
            items: {
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
        },
        required: ['questions'],
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
        ? 'The exam generator is busy right now. Please try again in a moment.'
        : 'Could not generate the exam right now. Please try again.'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const data = await upstream.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw) return NextResponse.json({ error: 'Empty response. Please try again.' }, { status: 502 })

    let parsed: any
    try { parsed = JSON.parse(raw) } catch {
      return NextResponse.json({ error: 'Malformed exam. Please try again.' }, { status: 502 })
    }

    // Keep only well-formed questions.
    const valid = (Array.isArray(parsed?.questions) ? parsed.questions : []).filter((q: any) =>
      q && typeof q.question === 'string' &&
      Array.isArray(q.options) && q.options.length === 4 && q.options.every((o: any) => typeof o === 'string') &&
      typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3 &&
      typeof q.explanation === 'string'
    ).map((q: any) => ({
      question: q.question,
      options: q.options as string[],
      correctIndex: Math.round(q.correctIndex),
      explanation: q.explanation,
      topic: typeof q.topic === 'string' && q.topic.trim() ? q.topic.trim() : 'General',
    }))

    if (valid.length < Math.ceil(count / 2)) {
      return NextResponse.json({ error: 'Could not build a valid exam. Please try again.' }, { status: 502 })
    }

    return NextResponse.json({ questions: valid, grounded: Boolean(ragContext) })
  } catch {
    return NextResponse.json({ error: 'Connection error. Please try again.' }, { status: 500 })
  }
}
