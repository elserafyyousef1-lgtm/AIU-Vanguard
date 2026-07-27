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
import { buildDivisionTable, buildTruthTable, buildIeee754, buildSlt, buildDerive } from '@/lib/ai/worked'

export const runtime = 'nodejs'
export const maxDuration = 60

const RATE_LIMIT = 8
const RATE_WINDOW_SECONDS = 60

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

type Difficulty = 'easy' | 'medium' | 'hard'

// Courses that get the professor's WORKED problems (deterministic answer keys) mixed in.
// Right now only Computer Architecture (CSE311), whose curriculum IS division traces + truth tables.
const WORKED_COURSES = new Set(['CSE311'])

// Boolean expressions representative of the arch course's CMOS/logic gates.
const TT_POOL: { expr: string; vars: string[] }[] = [
  { expr: '!(A*B + C)', vars: ['A', 'B', 'C'] },      // AND-OR-INVERT (the midterm Q1 gate)
  { expr: '!((A + B)*C)', vars: ['A', 'B', 'C'] },    // OR-AND-INVERT
  { expr: '!(A + B*C)', vars: ['A', 'B', 'C'] },
  { expr: "A'*B + A*C", vars: ['A', 'B', 'C'] },      // 2:1 multiplexer form
  { expr: '(A+B)*(A+C)', vars: ['A', 'B', 'C'] },
  { expr: '!(A*B)', vars: ['A', 'B'] },               // NAND
  { expr: '!(A + B)', vars: ['A', 'B'] },             // NOR
  { expr: 'A^B', vars: ['A', 'B'] },                  // XOR
]
// Exactly-representable float32 values so the IEEE-754 answer is clean + exact.
const FP_POOL = [228, -58.25, 12.5, 100, -7.75, 40.5, -320, 6.25, 85, -0.75]
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

const workedQ = (type: string, w: { question: string; topic: string; explanation: string }, payload: any) => ({
  type, question: w.question, options: [] as string[], correctIndex: -1, explanation: w.explanation, topic: w.topic, payload,
})

// Build `n` worked problems with CORRECT, code-computed answer keys — a varied mix of
// the professor's types. The model NEVER writes these keys; our own code computes them.
function buildWorkedProblems(n: number): any[] {
  const makers: Array<() => any> = [
    () => { const b = rint(2, 7); const a = Math.min(15, b * rint(2, 4) + rint(0, b - 1)); const t = buildDivisionTable(a, b, 4); return t && workedQ('fill_table', t, { columns: t.columns, solution: t.solution, givens: t.givens, colFormats: t.colFormats, cellFormat: t.cellFormat }) },
    () => { const p = TT_POOL[rint(0, TT_POOL.length - 1)]; const t = buildTruthTable(p.expr, p.vars); return t && workedQ('fill_table', t, { columns: t.columns, solution: t.solution, givens: t.givens, colFormats: t.colFormats, cellFormat: t.cellFormat }) },
    () => { const t = buildIeee754(FP_POOL[rint(0, FP_POOL.length - 1)]); return t && workedQ('compute_value', t, { fields: t.fields }) },
    () => { const t = buildSlt(rint(1, 60), rint(1, 60)); return workedQ('compute_value', t, { fields: t.fields }) },
    () => { const p = TT_POOL[rint(0, TT_POOL.length - 1)]; const t = buildDerive(p.expr, p.vars); return t && workedQ('derive_equation', t, { variables: t.variables, referenceEquation: t.referenceEquation }) },
  ]
  const order: number[] = []
  for (let k = 0; k < n; k++) order.push(k % makers.length)
  for (let k = order.length - 1; k > 0; k--) { const j = rint(0, k);[order[k], order[j]] = [order[j], order[k]] }  // shuffle
  const out: any[] = []
  for (const idx of order) { const q = makers[idx](); if (q) out.push(q) }
  return out
}

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

  // Reserve a few slots for the professor's worked problems (deterministic keys);
  // the rest are MCQs from the model.
  const nWorked = WORKED_COURSES.has(String(courseSlug)) ? Math.min(3, Math.max(1, Math.floor(count / 5))) : 0
  const nMcq = count - nWorked

  const grounding = ragContext
    ? `Base the exam STRICTLY on these course materials; every correct answer must be supported by them.\n\n--- COURSE MATERIALS ---\n${ragContext}`
    : `No uploaded materials were found, so use standard, correct knowledge for this course. Keep it accurate.`

  const systemInstruction = [
    `You are the exam-setter writing a realistic MOCK FINAL for "${courseName || courseSlug || 'this university course'}" at Alamein International University.`,
    `Produce EXACTLY ${nMcq} ${difficulty} multiple-choice questions that together simulate a real final: a spread of topics, a realistic difficulty curve, and genuine understanding (not trivia).`,
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
    contents: [{ role: 'user', parts: [{ text: `Generate the ${nMcq}-question mock exam now.` }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: Math.min(8000, 1200 + nMcq * 450),
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
      type: 'mcq' as const,
      question: q.question,
      options: q.options as string[],
      correctIndex: Math.round(q.correctIndex),
      explanation: q.explanation,
      topic: typeof q.topic === 'string' && q.topic.trim() ? q.topic.trim() : 'General',
    }))

    if (valid.length < Math.ceil(nMcq / 2)) {
      return NextResponse.json({ error: 'Could not build a valid exam. Please try again.' }, { status: 502 })
    }

    // Mix in the professor's worked problems (deterministic, correct answer keys) at a
    // spread of positions so the exam isn't "all MCQ then all worked problems".
    const worked = buildWorkedProblems(nWorked)
    const questions: any[] = valid.slice()
    if (worked.length) {
      const step = Math.max(1, Math.floor(questions.length / (worked.length + 1)))
      worked.forEach((w, i) => questions.splice(Math.min(questions.length, (i + 1) * step + i), 0, w))
    }

    return NextResponse.json({ questions, grounded: Boolean(ragContext) })
  } catch {
    return NextResponse.json({ error: 'Connection error. Please try again.' }, { status: 500 })
  }
}
