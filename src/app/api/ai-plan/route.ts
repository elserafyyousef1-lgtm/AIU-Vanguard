// src/app/api/ai-plan/route.ts
// ═══════════════════════════════════════════════════════════
// EXAM-COUNTDOWN STUDY PLAN — a day-by-day plan to an exam date, built from the
// course's OWN materials and weighted toward THIS student's weak topics.
// ChatGPT can draft a generic plan; it doesn't know this syllabus or these gaps.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { retrieveCourseContext } from '@/lib/ai/retrieval'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 45

const RATE_LIMIT = 6
const RATE_WINDOW_SECONDS = 60

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI service is not configured.' }, { status: 503 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to build a study plan.' }, { status: 401 })

  const { data: rlOk } = await supabase.rpc('rate_limit_hit', {
    p_bucket: `plan:${user.id}`, p_max: RATE_LIMIT, p_window: RATE_WINDOW_SECONDS,
  })
  if (rlOk === false) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })

  let body: { courseSlug?: string; courseName?: string; daysLeft?: number; hoursPerDay?: number }
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
  const daysLeft = Math.min(30, Math.max(1, Math.round(Number(body.daysLeft) || 7)))
  const hoursPerDay = Math.min(12, Math.max(1, Math.round(Number(body.hoursPerDay) || 2)))

  const [{ context: ragContext }, weakData] = await Promise.all([
    retrieveCourseContext(courseSlug, 'full syllabus: all key topics, concepts, and problem types for the final exam'),
    supabase.rpc('ai_weak_topics', { p_course: courseSlug, p_limit: 6 }),
  ])
  const weakTopics = Array.isArray((weakData as any)?.data)
    ? ((weakData as any).data as Array<{ topic: string }>).map(w => w.topic).filter(Boolean).map(t => t.slice(0, 120)).slice(0, 6)
    : []

  const grounding = ragContext
    ? `Draw the topics from these course materials (this is the real syllabus):\n\n--- COURSE MATERIALS ---\n${ragContext}`
    : `No uploaded materials were found, so use standard topics for this course. Keep it accurate.`

  const systemInstruction = [
    `You are a study coach building a focused exam-prep plan for "${courseName || courseSlug || 'this university course'}" at Alamein International University.`,
    `The student has ${daysLeft} day(s) until the exam and about ${hoursPerDay} hour(s) per day.`,
    `Produce EXACTLY ${daysLeft} day entries (day 1 = today, the last day = exam eve).`,
    weakTopics.length ? `FRONT-LOAD the student's weak topics: ${weakTopics.join(', ')} — put them earliest and revisit them.` : ``,
    `Rules:`,
    `- Each day has: "day" (number), "focus" (a short topic/theme for the day), and "tasks" (2-4 concrete, doable items — e.g. "راجع Normalization من المواد", "حل 10 أسئلة على SQL Joins", "اعمل mock exam قصير").`,
    `- Fit each day's tasks into ~${hoursPerDay}h.`,
    `- Cover the most exam-relevant topics; don't over-cover easy ones.`,
    `- Reserve the LAST day (and second-last if ${daysLeft} >= 5) for a full review + a timed mock exam.`,
    `- Write in clear Egyptian Arabic or English; keep technical terms in English.`,
    `- Never mention "the materials" or "the document" literally in the tasks.`,
    grounding,
  ].filter(Boolean).join('\n')

  const requestBody = {
    contents: [{ role: 'user', parts: [{ text: `Build the ${daysLeft}-day study plan now.` }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: Math.min(8000, 800 + daysLeft * 260),
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          days: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                day: { type: 'INTEGER' },
                focus: { type: 'STRING' },
                tasks: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['day', 'focus', 'tasks'],
            },
          },
        },
        required: ['days'],
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
        ? 'The planner is busy right now. Please try again in a moment.'
        : 'Could not build the plan right now. Please try again.'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const data = await upstream.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw) return NextResponse.json({ error: 'Empty response. Please try again.' }, { status: 502 })

    let parsed: any
    try { parsed = JSON.parse(raw) } catch {
      return NextResponse.json({ error: 'Malformed plan. Please try again.' }, { status: 502 })
    }

    const days = (Array.isArray(parsed?.days) ? parsed.days : [])
      .filter((d: any) => d && typeof d.focus === 'string' && Array.isArray(d.tasks) && d.tasks.every((t: any) => typeof t === 'string'))
      .map((d: any, i: number) => ({
        day: typeof d.day === 'number' ? Math.round(d.day) : i + 1,
        focus: d.focus,
        tasks: (d.tasks as string[]).slice(0, 6),
      }))

    if (!days.length) return NextResponse.json({ error: 'Could not build a valid plan. Please try again.' }, { status: 502 })

    return NextResponse.json({ days, grounded: Boolean(ragContext) })
  } catch {
    return NextResponse.json({ error: 'Connection error. Please try again.' }, { status: 500 })
  }
}
