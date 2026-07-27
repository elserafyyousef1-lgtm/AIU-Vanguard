// src/app/api/ai-exam/submit/route.ts
// ───────────────────────────────────────────────────────────
// Persist a finished mock exam so the student can reopen it and review mistakes.
// Grades server-side (never trusts the client's score), writes ai_exams +
// ai_exam_questions, and moves the mastery-analytics insert here (it used to be a
// fire-and-forget client insert that could silently drop). Auth + RLS: rows are
// owner-only; user_id defaults to auth.uid() on both tables.
// ───────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeFillTable, gradeComputeValue, gradeDeriveEquation } from '@/lib/ai/grading'

export const runtime = 'nodejs'

const clampStr = (s: any, n: number) => (typeof s === 'string' ? s.slice(0, n) : '')

export async function POST(req: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { data: rlOk } = await supabase.rpc('rate_limit_hit', { p_bucket: `exam-save:${user.id}`, p_max: 20, p_window: 300 })
  if (rlOk === false) return NextResponse.json({ error: 'Too many saves. Please wait a moment.' }, { status: 429 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }

  const course = clampStr(body.courseSlug, 64).trim()
  if (!course) return NextResponse.json({ error: 'courseSlug is required.' }, { status: 400 })
  const courseName = clampStr(body.courseName, 200).trim() || null
  const difficulty = clampStr(body.difficulty, 20) || null
  const durationSeconds = Number.isFinite(body.durationSeconds) ? Math.max(0, Math.min(86400, Math.floor(body.durationSeconds))) : null
  const grounded = typeof body.grounded === 'boolean' ? body.grounded : null

  const rawQs = Array.isArray(body.questions) ? body.questions.slice(0, 30) : []
  const answers = Array.isArray(body.answers) ? body.answers : []
  if (!rawQs.length) return NextResponse.json({ error: 'No questions to save.' }, { status: 400 })

  // Normalize + grade every question on the server (authoritative). Worked
  // (fill_table) problems are graded deterministically; the student answer +
  // spec + score are kept in the JSONB payload so the review can be replayed.
  const items = rawQs.map((q: any, i: number) => {
    const options = Array.isArray(q.options) ? q.options.slice(0, 8).map((o: any) => clampStr(o, 800)) : []
    const base = {
      position: i,
      question: clampStr(q.question, 4000),
      options,
      explanation: clampStr(q.explanation, 4000) || null,
      topic: clampStr(q.topic, 200) || null,
    }
    if ((q.type === 'fill_table' || q.type === 'compute_value' || q.type === 'derive_equation') && q.payload) {
      const ans = answers[i]
      let correct = false, payload: any = null
      try {
        if (q.type === 'fill_table') {
          const gr = gradeFillTable(q.payload, Array.isArray(ans) ? ans : [])
          correct = gr.max > 0 && gr.score === gr.max
          payload = { type: 'fill_table', spec: q.payload, answer: ans, score: gr.score, max: gr.max }
        } else if (q.type === 'compute_value') {
          const gr = gradeComputeValue(q.payload, ans && typeof ans === 'object' ? ans : {})
          correct = gr.max > 0 && gr.score === gr.max
          payload = { type: 'compute_value', spec: q.payload, answer: ans, score: gr.score, max: gr.max }
        } else {
          const gr = gradeDeriveEquation(q.payload, typeof ans === 'string' ? ans : '')
          correct = gr.correct
          payload = { type: 'derive_equation', spec: q.payload, answer: ans, correct: gr.correct }
        }
      } catch { correct = false }
      return { ...base, correct_index: null as number | null, chosen_index: null as number | null, correct, payload }
    }
    const correctIndex = Number.isInteger(q.correctIndex) ? q.correctIndex : -1
    const chosen = Number.isInteger(answers[i]) ? answers[i] : null
    return { ...base, correct_index: correctIndex, chosen_index: chosen, correct: chosen !== null && chosen === correctIndex, payload: null as any }
  })
  const total = items.length
  const score = items.filter((x: any) => x.correct).length
  const percent = total ? Math.round((score / total) * 100) : 0

  // 1) the exam session row
  const { data: exam, error: exErr } = await supabase.from('ai_exams').insert({
    course, course_name: courseName, difficulty, question_count: total,
    score, total, percent, duration_seconds: durationSeconds, grounded,
  }).select('id').single()
  if (exErr || !exam) return NextResponse.json({ error: 'Could not save the exam.' }, { status: 500 })

  // 2) the questions
  const { error: qErr } = await supabase.from('ai_exam_questions').insert(items.map((it: any) => ({ ...it, exam_id: exam.id })))
  if (qErr) {
    await supabase.from('ai_exams').delete().eq('id', exam.id)   // don't leave an exam with no questions
    return NextResponse.json({ error: 'Could not save the exam questions.' }, { status: 500 })
  }

  // 3) mastery analytics — one boolean row per answered question (topic is NOT NULL there)
  const answeredWorked = (p: any) => {
    const a = p?.answer
    if (Array.isArray(a)) return a.some((r: any) => Array.isArray(r) && r.some((c: any) => (c ?? '').toString().trim() !== ''))  // fill_table grid
    if (a && typeof a === 'object') return Object.values(a).some((v: any) => (v ?? '').toString().trim() !== '')                  // compute_value record
    if (typeof a === 'string') return a.trim() !== ''                                                                            // derive_equation
    return false
  }
  const attempts = items
    .filter((it: any) => it.chosen_index !== null || answeredWorked(it.payload))
    .map((it: any) => ({ course, topic: it.topic || 'General', difficulty, correct: it.correct, source: 'exam' }))
  if (attempts.length) await supabase.from('ai_quiz_attempts').insert(attempts)

  return NextResponse.json({ examId: exam.id, score, total, percent })
}
