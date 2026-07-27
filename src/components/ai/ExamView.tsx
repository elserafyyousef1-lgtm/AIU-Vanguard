'use client'
// src/components/ai/ExamView.tsx
// ───────────────────────────────────────────────────────────
// Exam Simulator — a full timed mock exam (N questions) generated from the
// course's OWN materials, biased to the student's weak topics. Answer at your
// own pace, submit, and get a scored report broken down BY TOPIC + a full review.
// Every answer is saved to the mastery profile so weak topics resurface later.
// ───────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { GraduationCap, Loader2, ArrowLeft, ArrowRight, Check, X, Clock, RotateCcw, History, Trash2, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RichText } from './RichText'
import { FillTableInput } from './answers/FillTableInput'
import { gradeFillTable } from '@/lib/ai/grading'

interface Props {
  courseSlug: string
  courseName?: string
  onExit: () => void
}

type Difficulty = 'easy' | 'medium' | 'hard'
type Phase = 'intro' | 'loading' | 'exam' | 'error' | 'report' | 'past'

interface PastExam {
  id: string; course_name: string | null; difficulty: string | null
  question_count: number; score: number; total: number; percent: number; created_at: string
}

interface Question {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  topic: string
  type?: 'mcq' | 'fill_table'
  payload?: any                 // fill_table: { columns, solution, givens, colFormats, cellFormat }
}

// ── per-question helpers that work for both MCQ and worked (fill_table) types ──
const gradeOf = (q: Question, a: any) =>
  q.type === 'fill_table' ? gradeFillTable(q.payload, Array.isArray(a) ? a : []) : null
const isAnswered = (q: Question, a: any) =>
  q.type === 'fill_table' ? Array.isArray(a) && a.some(row => Array.isArray(row) && row.some(c => (c ?? '').toString().trim() !== '')) : a != null
const isCorrect = (q: Question, a: any) => {
  if (q.type === 'fill_table') { const r = gradeOf(q, a); return !!r && r.max > 0 && r.score === r.max }
  return a === q.correctIndex
}

const COUNTS = [10, 15, 20]
const DIFFS: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
]
const SECONDS_PER_Q = 90

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function ExamView({ courseSlug, courseName, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [count, setCount] = useState(10)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<any[]>([])   // MCQ: number|null · fill_table: string[][]
  const [idx, setIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [error, setError] = useState('')
  const [grounded, setGrounded] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [reviewing, setReviewing] = useState(false)     // viewing a saved past exam (read-only)
  const [mistakesOnly, setMistakesOnly] = useState(false)
  const [pastExams, setPastExams] = useState<PastExam[]>([])
  const [loadingPast, setLoadingPast] = useState(false)
  const supabase = createClient()
  const submittedRef = useRef(false)

  const start = async () => {
    setPhase('loading'); setError(''); setReviewing(false); setMistakesOnly(false)
    try {
      const res = await fetch('/api/ai-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseSlug, courseName, count, difficulty }),
      })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data.questions) || !data.questions.length) {
        setError(data.error || 'Could not generate the exam. Please try again.')
        setPhase('error'); return
      }
      const qs = data.questions as Question[]
      setQuestions(qs)
      setAnswers(new Array(qs.length).fill(null))
      setIdx(0)
      setTimeLeft(qs.length * SECONDS_PER_Q)
      setGrounded(typeof data.grounded === 'boolean' ? data.grounded : null)
      submittedRef.current = false
      setPhase('exam')
    } catch {
      setError('Connection error. Please try again.')
      setPhase('error')
    }
  }

  const submit = async () => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSaving(true)
    // Save the FULL exam server-side (authoritative grading + reviewable later).
    try {
      const res = await fetch('/api/ai-exam/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseSlug, courseName, difficulty,
          durationSeconds: questions.length * SECONDS_PER_Q - Math.max(0, timeLeft),
          grounded,
          questions: questions.map(q => ({ question: q.question, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation, topic: q.topic, type: q.type, payload: q.payload })),
          answers,
        }),
      })
      if (!res.ok) throw new Error('save failed')
    } catch {
      // Fallback: at least keep the mastery analytics working (client insert, as before).
      const rows = questions.map((q, i) => ({ q, a: answers[i] })).filter(x => x.a !== null)
        .map(x => ({ course: courseSlug, topic: x.q.topic, difficulty, correct: x.a === x.q.correctIndex, source: 'exam' }))
      if (rows.length) supabase.from('ai_quiz_attempts').insert(rows).then(() => {})
    } finally {
      setSaving(false)
      setPhase('report')
    }
  }

  // Open the "My saved exams" list for this course (RLS scopes it to the student).
  const openPast = async () => {
    setPhase('past'); setLoadingPast(true)
    const { data } = await supabase.from('ai_exams')
      .select('id, course_name, difficulty, question_count, score, total, percent, created_at')
      .eq('course', courseSlug).order('created_at', { ascending: false }).limit(50)
    setPastExams((data as PastExam[]) || [])
    setLoadingPast(false)
  }

  // Reopen a saved exam read-only and reuse the report renderer to review mistakes.
  const openExam = async (id: string) => {
    setLoadingPast(true)
    const { data } = await supabase.from('ai_exam_questions')
      .select('question, options, correct_index, chosen_index, explanation, topic, position, payload')
      .eq('exam_id', id).order('position')
    setLoadingPast(false)
    if (!data || !data.length) return
    setQuestions(data.map((r: any) => {
      if (r.payload && r.payload.type === 'fill_table') {
        return { type: 'fill_table', payload: r.payload.spec, question: r.question, options: [], correctIndex: -1, explanation: r.explanation || '', topic: r.topic || 'General' } as Question
      }
      return { type: 'mcq', question: r.question, options: Array.isArray(r.options) ? r.options : [], correctIndex: r.correct_index ?? -1, explanation: r.explanation || '', topic: r.topic || 'General' } as Question
    }))
    setAnswers(data.map((r: any) => (r.payload && r.payload.type === 'fill_table' ? (r.payload.answer ?? []) : (r.chosen_index ?? null))))
    setReviewing(true); setMistakesOnly(false); setPhase('report')
  }

  const delExam = async (id: string) => {
    await supabase.from('ai_exams').delete().eq('id', id)   // cascade removes its questions
    setPastExams(p => p.filter(e => e.id !== id))
  }

  // Countdown — auto-submit at zero.
  useEffect(() => {
    if (phase !== 'exam') return
    if (timeLeft <= 0) { submit(); return }
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft])

  const answeredCount = answers.filter((a, i) => isAnswered(questions[i], a)).length
  const score = questions.reduce((n, q, i) => n + (isCorrect(q, answers[i]) ? 1 : 0), 0)
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0

  // ── Intro ────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={{ flex:1, overflowY:'auto', padding:'24px 20px', display:'flex', flexDirection:'column', gap:18 }}>
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{ width:52, height:52, borderRadius:15, background:'linear-gradient(135deg, rgba(224,38,75,0.18), rgba(139,92,246,0.18))', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent)' }}>
            <GraduationCap size={24} />
          </div>
          <div style={{ fontWeight:800, fontSize:17, color:'var(--t)' }}>Exam Simulator</div>
          <div style={{ fontSize:12.5, color:'var(--t3)', lineHeight:1.6, maxWidth:290 }}>
            امتحان كامل محاكي لمادة <b style={{ color:'var(--t2)' }}>{courseSlug}</b> — من مواد المادة نفسها، بمؤقّت، وتقرير مفصّل بالمواضيع في الآخر.
          </div>
        </div>

        <div>
          <div style={{ fontSize:11.5, color:'var(--t3)', marginBottom:8, textAlign:'center' }}>Questions</div>
          <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
            {COUNTS.map(c => (
              <button key={c} onClick={() => setCount(c)} style={{
                padding:'8px 18px', borderRadius:10, cursor:'pointer', fontFamily:'var(--font)', fontSize:12.5, fontWeight:700,
                background: count === c ? 'var(--accent)' : 'var(--s3)', color: count === c ? 'white' : 'var(--t2)',
                border:'1px solid ' + (count === c ? 'var(--accent)' : 'var(--br)'),
              }}>{c}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize:11.5, color:'var(--t3)', marginBottom:8, textAlign:'center' }}>Difficulty</div>
          <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
            {DIFFS.map(d => (
              <button key={d.key} onClick={() => setDifficulty(d.key)} style={{
                padding:'8px 16px', borderRadius:10, cursor:'pointer', fontFamily:'var(--font)', fontSize:12.5, fontWeight:700,
                background: difficulty === d.key ? 'var(--accent)' : 'var(--s3)', color: difficulty === d.key ? 'white' : 'var(--t2)',
                border:'1px solid ' + (difficulty === d.key ? 'var(--accent)' : 'var(--br)'),
              }}>{d.label}</button>
            ))}
          </div>
        </div>

        <div style={{ fontSize:11.5, color:'var(--t3)', textAlign:'center' }}>
          ⏱ الوقت: {fmt(count * SECONDS_PER_Q)} دقيقة
        </div>

        <button onClick={start} style={{ marginTop:4, padding:'12px', borderRadius:12, background:'linear-gradient(135deg, var(--accent), var(--accent-2))', color:'white', border:'none', cursor:'pointer', fontFamily:'var(--font)', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <GraduationCap size={16} /> Start exam
        </button>
        <button onClick={openPast} style={{ padding:'10px', borderRadius:11, background:'var(--s3)', color:'var(--t2)', border:'1px solid var(--br)', cursor:'pointer', fontFamily:'var(--font)', fontSize:12.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
          <History size={14} /> امتحاناتي المحفوظة · Review past exams
        </button>
        <button onClick={onExit} style={{ background:'transparent', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:12.5, fontFamily:'var(--font)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <ArrowLeft size={13} /> Back to chat
        </button>
      </div>
    )
  }

  // ── Loading ──────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color:'var(--t3)' }}>
        <Loader2 size={26} style={{ animation:'spin 0.9s linear infinite', color:'var(--accent)' }} />
        <div style={{ fontSize:13 }}>بحضّر امتحان كامل من مادتك…</div>
        <div style={{ fontSize:11.5 }}>({count} سؤال — ممكن ياخد لحظات)</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:20 }}>
        <div style={{ fontSize:13, color:'var(--t2)', textAlign:'center', lineHeight:1.6 }}>{error}</div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={start} style={{ padding:'9px 16px', borderRadius:10, background:'var(--accent)', color:'white', border:'none', cursor:'pointer', fontSize:12.5, fontWeight:700, fontFamily:'var(--font)' }}>Try again</button>
          <button onClick={onExit} style={{ padding:'9px 16px', borderRadius:10, background:'var(--s3)', color:'var(--t2)', border:'1px solid var(--br)', cursor:'pointer', fontSize:12.5, fontFamily:'var(--font)' }}>Back to chat</button>
        </div>
      </div>
    )
  }

  // ── My saved exams ───────────────────────────────────────
  if (phase === 'past') {
    return (
      <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:11 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => setPhase('intro')} style={{ padding:'7px 10px', borderRadius:9, background:'var(--s3)', border:'1px solid var(--br)', color:'var(--t2)', cursor:'pointer', display:'flex', alignItems:'center', fontFamily:'var(--font)' }}><ArrowLeft size={14} /></button>
          <div style={{ fontWeight:800, fontSize:15, color:'var(--t)' }}>امتحاناتي المحفوظة</div>
        </div>
        {loadingPast ? (
          <div style={{ display:'flex', justifyContent:'center', padding:30, color:'var(--t3)' }}>
            <Loader2 size={22} style={{ animation:'spin 0.9s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : pastExams.length === 0 ? (
          <div style={{ textAlign:'center', color:'var(--t3)', fontSize:13, padding:'30px 10px', lineHeight:1.8 }}>
            لسه مفيش امتحانات محفوظة.<br />اعمل امتحان وهيتحفظ هنا عشان ترجعله وتراجع غلطاتك.
          </div>
        ) : (
          pastExams.map(e => {
            const col = e.percent >= 70 ? '#22c55e' : e.percent >= 40 ? '#f59e0b' : 'var(--accent)'
            const d = new Date(e.created_at)
            const when = d.toLocaleDateString(undefined, { day:'numeric', month:'short' }) + ' · ' + d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' })
            return (
              <div key={e.id} style={{ display:'flex', alignItems:'center', gap:9, background:'var(--s3)', border:'1px solid var(--br)', borderRadius:12, padding:'10px 12px' }}>
                <button onClick={() => openExam(e.id)} style={{ flex:1, textAlign:'start', background:'transparent', border:'none', cursor:'pointer', fontFamily:'var(--font)', display:'flex', flexDirection:'column', gap:3 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--t)' }}>{e.score} / {e.total} <span style={{ color:col, fontWeight:800 }}>· {e.percent}%</span></span>
                  <span style={{ fontSize:11, color:'var(--t3)' }}>{when}{e.difficulty ? ' · ' + e.difficulty : ''}</span>
                </button>
                <button onClick={() => openExam(e.id)} style={{ padding:'7px 12px', borderRadius:9, background:'var(--s2)', border:'1px solid var(--br)', color:'var(--t2)', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'var(--font)' }}>راجع</button>
                <button onClick={() => delExam(e.id)} title="Delete" style={{ padding:'7px', borderRadius:9, background:'transparent', border:'1px solid var(--br)', color:'var(--t3)', cursor:'pointer', display:'flex' }}><Trash2 size={13} /></button>
              </div>
            )
          })
        )}
      </div>
    )
  }

  // ── Report ───────────────────────────────────────────────
  if (phase === 'report') {
    const good = pct >= 70
    const wrongCount = questions.reduce((n, q, i) => n + (isCorrect(q, answers[i]) ? 0 : 1), 0)
    // Per-topic breakdown
    const byTopic: Record<string, { correct: number; total: number }> = {}
    questions.forEach((q, i) => {
      const t = byTopic[q.topic] || { correct: 0, total: 0 }
      t.total++; if (isCorrect(q, answers[i])) t.correct++
      byTopic[q.topic] = t
    })
    const topics = Object.entries(byTopic).sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
    return (
      <div style={{ flex:1, overflowY:'auto', padding:'22px 20px', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
          <div style={{ fontSize:32 }}>{good ? '🎉' : pct >= 40 ? '💪' : '📚'}</div>
          <div style={{ fontWeight:800, fontSize:20, color:'var(--t)' }}>{score} / {questions.length}</div>
          <div style={{ fontSize:14, fontWeight:700, color: good ? '#22c55e' : pct >= 40 ? '#f59e0b' : 'var(--accent)' }}>{pct}%</div>
        </div>

        {/* Per-topic breakdown */}
        <div style={{ background:'var(--s3)', border:'1px solid var(--br)', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ fontSize:12, color:'var(--t3)', fontWeight:600, marginBottom:10 }}>By topic</div>
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {topics.map(([topic, s]) => {
              const p = Math.round((s.correct / s.total) * 100)
              const col = p >= 70 ? '#22c55e' : p >= 40 ? '#f59e0b' : 'var(--accent)'
              return (
                <div key={topic}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                    <span style={{ color:'var(--t2)', fontWeight:600 }}>{topic}</span>
                    <span style={{ color:col, fontWeight:700 }}>{s.correct}/{s.total}</span>
                  </div>
                  <div style={{ height:5, borderRadius:3, background:'var(--s1)', overflow:'hidden' }}>
                    <div style={{ width:`${p}%`, height:'100%', background:col }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Full review */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <span style={{ fontSize:12, color:'var(--t3)', fontWeight:600 }}>Review{mistakesOnly ? ' · غلطاتي' : ''}</span>
          {wrongCount > 0 && (
            <button onClick={() => setMistakesOnly(v => !v)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, fontSize:11.5, fontWeight:700, fontFamily:'var(--font)', cursor:'pointer', background: mistakesOnly ? 'var(--accent)' : 'var(--s3)', color: mistakesOnly ? '#fff' : 'var(--t2)', border:'1px solid ' + (mistakesOnly ? 'var(--accent)' : 'var(--br)') }}>
              <Filter size={12} /> غلطاتي بس ({wrongCount})
            </button>
          )}
        </div>
        {questions.map((q, i) => ({ q, i })).filter(x => !mistakesOnly || !isCorrect(x.q, answers[x.i])).map(({ q, i }) => {
          const mine = answers[i]
          const right = isCorrect(q, mine)
          const grade = gradeOf(q, mine)
          return (
            <div key={i} style={{ background:'var(--s3)', border:'1px solid var(--br)', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:8 }}>
                <span style={{ flexShrink:0, width:20, height:20, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background: right ? '#22c55e' : 'var(--accent)', color:'white' }}>
                  {right ? <Check size={12} /> : <X size={12} />}
                </span>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--t)', lineHeight:1.5 }}><RichText content={`${i + 1}. ${q.question}`} /></div>
              </div>
              {q.type === 'fill_table' ? (
                <div style={{ marginBottom:6 }}>
                  <FillTableInput payload={q.payload} value={mine} review cellResults={grade?.cellResults} />
                  {grade && <div style={{ fontSize:11.5, color:'var(--t3)', marginTop:5, fontFamily:'var(--font-mono)' }}>الخلايا الصح: {grade.score}/{grade.max}</div>}
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:6 }}>
                  {q.options.map((opt, oi) => {
                    const optRight = oi === q.correctIndex
                    const isMine = oi === mine
                    const color = optRight ? '#22c55e' : isMine ? 'var(--accent)' : 'var(--t3)'
                    return (
                      <div key={oi} style={{ fontSize:12.5, color, display:'flex', gap:6, alignItems:'flex-start' }}>
                        <span style={{ flexShrink:0, fontWeight:700 }}>{String.fromCharCode(65 + oi)}.</span>
                        <span style={{ flex:1 }}><RichText content={opt} /></span>
                        {optRight && <Check size={12} style={{ flexShrink:0, marginTop:2 }} />}
                        {isMine && !optRight && <X size={12} style={{ flexShrink:0, marginTop:2 }} />}
                      </div>
                    )
                  })}
                </div>
              )}
              <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.55, borderTop:'1px solid var(--br)', paddingTop:6 }}>
                <RichText content={q.explanation} />
              </div>
            </div>
          )
        })}

        <div style={{ display:'flex', gap:8, marginTop:2 }}>
          {reviewing ? (
            <button onClick={openPast} style={{ flex:1, padding:'11px', borderRadius:11, background:'var(--s3)', color:'var(--t2)', border:'1px solid var(--br)', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'var(--font)', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              <History size={14} /> امتحاناتي
            </button>
          ) : (
            <button onClick={() => setPhase('intro')} style={{ flex:1, padding:'11px', borderRadius:11, background:'linear-gradient(135deg, var(--accent), var(--accent-2))', color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'var(--font)', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              <RotateCcw size={14} /> New exam
            </button>
          )}
          <button onClick={onExit} style={{ flex:1, padding:'11px', borderRadius:11, background:'var(--s3)', color:'var(--t2)', border:'1px solid var(--br)', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'var(--font)' }}>Back to chat</button>
        </div>
      </div>
    )
  }

  // ── Exam (answering) ─────────────────────────────────────
  const q = questions[idx]
  const low = timeLeft <= 60
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Top bar: progress + timer */}
      <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--br)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:12.5, fontWeight:700, color:'var(--t2)' }}>Q {idx + 1} / {questions.length}</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12.5, fontWeight:700, color: low ? 'var(--accent)' : 'var(--t2)' }}>
            <Clock size={13} /> {fmt(Math.max(0, timeLeft))}
          </span>
        </div>
        <div style={{ height:4, borderRadius:2, background:'var(--s1)', overflow:'hidden' }}>
          <div style={{ width:`${((idx + 1) / questions.length) * 100}%`, height:'100%', background:'var(--accent)', transition:'width 0.2s' }} />
        </div>
        {/* Question navigator: jump to any question; shows answered (green) vs current (accent) vs untouched */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:9 }}>
          {questions.map((_, i) => {
            const cur = i === idx
            const done = isAnswered(questions[i], answers[i])
            return (
              <button key={i} onClick={() => setIdx(i)} title={`Question ${i + 1}${done ? ' · answered' : ''}`}
                style={{ width:24, height:24, borderRadius:7, fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, cursor:'pointer',
                  background: cur ? 'var(--accent)' : done ? 'rgba(63,174,106,0.16)' : 'var(--s2)',
                  color: cur ? '#fff' : done ? '#3fae6a' : 'var(--t3)',
                  border:'1px solid ' + (cur ? 'transparent' : done ? 'rgba(63,174,106,0.4)' : 'var(--br)'),
                  transition:'all 0.12s' }}>{i + 1}</button>
            )
          })}
        </div>
      </div>

      {/* Question + options (no feedback until submit) */}
      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
        {q && (
          <>
            <div style={{ fontSize:14.5, lineHeight:1.6, color:'var(--t)', fontWeight:600 }}>
              <RichText content={q.question} />
            </div>
            {q.type === 'fill_table' ? (
              <FillTableInput payload={q.payload} value={answers[idx]}
                onChange={grid => setAnswers(a => { const c = [...a]; c[idx] = grid; return c })} />
            ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
              {q.options.map((opt, i) => {
                const chosen = answers[idx] === i
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers(a => { const c = [...a]; c[idx] = i; return c })}
                    style={{
                      textAlign:'left', padding:'11px 14px', borderRadius:11,
                      background: chosen ? 'rgba(224,38,75,0.12)' : 'var(--s3)',
                      border:'1px solid ' + (chosen ? 'var(--accent)' : 'var(--br)'),
                      color:'var(--t)', cursor:'pointer', fontFamily:'var(--font)',
                      fontSize:13.5, lineHeight:1.5, display:'flex', alignItems:'flex-start', gap:10, transition:'all 0.12s',
                    }}
                  >
                    <span style={{ flexShrink:0, width:22, height:22, borderRadius:7, marginTop:1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, background: chosen ? 'var(--accent)' : 'var(--s2)', color: chosen ? 'white' : 'var(--t3)', border:'1px solid ' + (chosen ? 'transparent' : 'var(--br)') }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ flex:1 }}><RichText content={opt} /></span>
                  </button>
                )
              })}
            </div>
            )}
          </>
        )}
      </div>

      {/* Nav + submit */}
      <div style={{ padding:'12px 16px', borderTop:'1px solid var(--br)', flexShrink:0, display:'flex', alignItems:'center', gap:8 }}>
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          style={{ padding:'9px 12px', borderRadius:10, background:'var(--s3)', border:'1px solid var(--br)', color: idx === 0 ? 'var(--t3)' : 'var(--t2)', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontFamily:'var(--font)', fontSize:12.5, display:'flex', alignItems:'center', gap:5 }}
        ><ArrowLeft size={14} /></button>

        <div style={{ flex:1, textAlign:'center', fontSize:11.5, color:'var(--t3)' }}>{answeredCount}/{questions.length} answered</div>

        {idx < questions.length - 1 ? (
          <button
            onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))}
            style={{ padding:'9px 16px', borderRadius:10, background:'var(--s3)', border:'1px solid var(--br)', color:'var(--t2)', cursor:'pointer', fontFamily:'var(--font)', fontSize:12.5, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}
          >Next <ArrowRight size={14} /></button>
        ) : (
          <button
            onClick={submit}
            disabled={saving}
            style={{ padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg, var(--accent), var(--accent-2))', border:'none', color:'white', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.75 : 1, fontFamily:'var(--font)', fontSize:12.5, fontWeight:700 }}
          >{saving ? 'Saving…' : 'Submit'}</button>
        )}
      </div>
    </div>
  )
}
