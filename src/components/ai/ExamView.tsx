'use client'
// src/components/ai/ExamView.tsx
// ───────────────────────────────────────────────────────────
// Exam Simulator — a full timed mock exam (N questions) generated from the
// course's OWN materials, biased to the student's weak topics. Answer at your
// own pace, submit, and get a scored report broken down BY TOPIC + a full review.
// Every answer is saved to the mastery profile so weak topics resurface later.
// ───────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { GraduationCap, Loader2, ArrowLeft, ArrowRight, Check, X, Clock, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RichText } from './RichText'

interface Props {
  courseSlug: string
  courseName?: string
  onExit: () => void
}

type Difficulty = 'easy' | 'medium' | 'hard'
type Phase = 'intro' | 'loading' | 'exam' | 'error' | 'report'

interface Question {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  topic: string
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
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [idx, setIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [error, setError] = useState('')
  const supabase = createClient()
  const submittedRef = useRef(false)

  const start = async () => {
    setPhase('loading'); setError('')
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
      submittedRef.current = false
      setPhase('exam')
    } catch {
      setError('Connection error. Please try again.')
      setPhase('error')
    }
  }

  const submit = () => {
    if (submittedRef.current) return
    submittedRef.current = true
    // Persist every answered question to the mastery profile (best-effort).
    const rows = questions
      .map((q, i) => ({ q, a: answers[i] }))
      .filter(x => x.a !== null)
      .map(x => ({ course: courseSlug, topic: x.q.topic, difficulty, correct: x.a === x.q.correctIndex, source: 'exam' }))
    if (rows.length) supabase.from('ai_quiz_attempts').insert(rows).then(() => {})
    setPhase('report')
  }

  // Countdown — auto-submit at zero.
  useEffect(() => {
    if (phase !== 'exam') return
    if (timeLeft <= 0) { submit(); return }
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft])

  const answeredCount = answers.filter(a => a !== null).length
  const score = questions.reduce((n, q, i) => n + (answers[i] === q.correctIndex ? 1 : 0), 0)
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

  // ── Report ───────────────────────────────────────────────
  if (phase === 'report') {
    const good = pct >= 70
    // Per-topic breakdown
    const byTopic: Record<string, { correct: number; total: number }> = {}
    questions.forEach((q, i) => {
      const t = byTopic[q.topic] || { correct: 0, total: 0 }
      t.total++; if (answers[i] === q.correctIndex) t.correct++
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
        <div style={{ fontSize:12, color:'var(--t3)', fontWeight:600 }}>Review</div>
        {questions.map((q, i) => {
          const mine = answers[i]
          const right = mine === q.correctIndex
          return (
            <div key={i} style={{ background:'var(--s3)', border:'1px solid var(--br)', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:8 }}>
                <span style={{ flexShrink:0, width:20, height:20, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background: right ? '#22c55e' : 'var(--accent)', color:'white' }}>
                  {right ? <Check size={12} /> : <X size={12} />}
                </span>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--t)', lineHeight:1.5 }}><RichText content={`${i + 1}. ${q.question}`} /></div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:6 }}>
                {q.options.map((opt, oi) => {
                  const isCorrect = oi === q.correctIndex
                  const isMine = oi === mine
                  const color = isCorrect ? '#22c55e' : isMine ? 'var(--accent)' : 'var(--t3)'
                  return (
                    <div key={oi} style={{ fontSize:12.5, color, display:'flex', gap:6, alignItems:'flex-start' }}>
                      <span style={{ flexShrink:0, fontWeight:700 }}>{String.fromCharCode(65 + oi)}.</span>
                      <span style={{ flex:1 }}><RichText content={opt} /></span>
                      {isCorrect && <Check size={12} style={{ flexShrink:0, marginTop:2 }} />}
                      {isMine && !isCorrect && <X size={12} style={{ flexShrink:0, marginTop:2 }} />}
                    </div>
                  )
                })}
              </div>
              <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.55, borderTop:'1px solid var(--br)', paddingTop:6 }}>
                <RichText content={q.explanation} />
              </div>
            </div>
          )
        })}

        <div style={{ display:'flex', gap:8, marginTop:2 }}>
          <button onClick={() => setPhase('intro')} style={{ flex:1, padding:'11px', borderRadius:11, background:'linear-gradient(135deg, var(--accent), var(--accent-2))', color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'var(--font)', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            <RotateCcw size={14} /> New exam
          </button>
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
      </div>

      {/* Question + options (no feedback until submit) */}
      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
        {q && (
          <>
            <div style={{ fontSize:14.5, lineHeight:1.6, color:'var(--t)', fontWeight:600 }}>
              <RichText content={q.question} />
            </div>
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
            style={{ padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg, var(--accent), var(--accent-2))', border:'none', color:'white', cursor:'pointer', fontFamily:'var(--font)', fontSize:12.5, fontWeight:700 }}
          >Submit</button>
        )}
      </div>
    </div>
  )
}
