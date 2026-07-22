'use client'
// src/components/ai/QuizView.tsx
// ───────────────────────────────────────────────────────────
// Interactive Quiz Mode. One multiple-choice question at a time,
// generated from the course's OWN materials (RAG). Instant feedback +
// explanation, a running score, and weak-topic tracking at the end.
// This is the feature ChatGPT can't match — it quizzes you on YOUR slides.
// ───────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Target, Check, X, RotateCcw, ArrowRight, Loader2, ArrowLeft, History, GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RichText } from './RichText'

interface Props {
  courseSlug: string
  courseName?: string
  onExit: () => void
  onStartExam?: () => void   // switch to the full Exam Simulator
}

type Difficulty = 'easy' | 'medium' | 'hard'
type Phase = 'intro' | 'loading' | 'question' | 'error' | 'summary'

interface Question {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  topic: string
  grounded: boolean
  _difficulty?: Difficulty   // the level this question was actually generated at
}

const ORDER: Difficulty[] = ['easy', 'medium', 'hard']

const DIFFS: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
]

export function QuizView({ courseSlug, courseName, onExit, onStartExam }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [current, setCurrent] = useState<Question | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [asked, setAsked] = useState<string[]>([])
  const [weak, setWeak] = useState<string[]>([])
  const [focusTopic, setFocusTopic] = useState<string | null>(null)  // when drilling one weak topic
  const [allTimeWeak, setAllTimeWeak] = useState<string[]>([])       // weak topics across ALL past sessions
  const [liveDifficulty, setLiveDifficulty] = useState<Difficulty>('medium')  // adapts to performance
  const [recent, setRecent] = useState<boolean[]>([])                // last few correct/wrong, for adapting
  const [error, setError] = useState('')
  const supabase = createClient()

  // Load the student's persistent weak topics for this course (mastery profile).
  useEffect(() => {
    let alive = true
    supabase.rpc('ai_weak_topics', { p_course: courseSlug, p_limit: 6 }).then(({ data }) => {
      if (alive && Array.isArray(data)) setAllTimeWeak(data.map((r: any) => r.topic).filter(Boolean))
    })
    return () => { alive = false }
  }, [courseSlug])

  // Persist one answered question to the mastery profile (best-effort — never blocks the UI).
  const persistAttempt = (topic: string, correct: boolean, diff: Difficulty) => {
    supabase.from('ai_quiz_attempts').insert({ course: courseSlug, topic, difficulty: diff, correct, source: 'quiz' }).then(() => {})
  }

  // topicArg === undefined → keep the current focusTopic; pass null to force a broad quiz,
  // or a string to drill that topic. diffArg overrides the level for the initial call (state is async).
  const fetchQuestion = async (nextAsked: string[], topicArg?: string | null, diffArg?: Difficulty) => {
    const useTopic = topicArg !== undefined ? topicArg : focusTopic
    const useDiff = diffArg || liveDifficulty
    setPhase('loading')
    setSelected(null)
    setError('')
    try {
      const res = await fetch('/api/ai-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseSlug, courseName, difficulty: useDiff, asked: nextAsked, topic: useTopic || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not generate a question. Please try again.')
        setPhase('error')
        return
      }
      setCurrent({ ...(data as Question), _difficulty: useDiff })
      setAsked([...nextAsked, data.question].slice(-15))
      setPhase('question')
    } catch {
      setError('Connection error. Please try again.')
      setPhase('error')
    }
  }

  const start = () => {
    setScore(0); setTotal(0); setWeak([]); setAsked([]); setFocusTopic(null); setRecent([]); setLiveDifficulty(difficulty)
    fetchQuestion([], null, difficulty)
  }

  // Drill a single weak topic — closes the loop from "here's what you're bad at" to practice.
  const startFocused = (t: string) => {
    setScore(0); setTotal(0); setWeak([]); setAsked([]); setFocusTopic(t); setRecent([]); setLiveDifficulty(difficulty)
    fetchQuestion([], t, difficulty)
  }

  const answer = (i: number) => {
    if (selected !== null || !current) return
    setSelected(i)
    setTotal(t => t + 1)
    const correct = i === current.correctIndex
    if (correct) setScore(s => s + 1)
    else setWeak(w => (w.includes(current.topic) ? w : [...w, current.topic]))
    persistAttempt(current.topic, correct, current._difficulty || liveDifficulty)   // remember this across sessions
    // Adapt: two right in a row → step up; two wrong in a row → step down. Keeps it challenging.
    const nr = [...recent, correct].slice(-3)
    setRecent(nr)
    const last2 = nr.slice(-2)
    if (last2.length === 2) {
      const idx = ORDER.indexOf(liveDifficulty)
      if (last2[0] && last2[1] && idx < 2) setLiveDifficulty(ORDER[idx + 1])
      else if (!last2[0] && !last2[1] && idx > 0) setLiveDifficulty(ORDER[idx - 1])
    }
  }

  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  // ── Intro ────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={{ flex:1, overflowY:'auto', padding:'24px 20px', display:'flex', flexDirection:'column', gap:18 }}>
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{
            width:52, height:52, borderRadius:15,
            background:'linear-gradient(135deg, rgba(224,38,75,0.18), rgba(139,92,246,0.18))',
            display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent)',
          }}>
            <Target size={24} />
          </div>
          <div style={{ fontWeight:800, fontSize:17, color:'var(--t)' }}>Quiz Mode</div>
          <div style={{ fontSize:12.5, color:'var(--t3)', lineHeight:1.6, maxWidth:280 }}>
            أسئلة اختيار من متعدد من مادة <b style={{ color:'var(--t2)' }}>{courseSlug}</b> نفسها.
            كل سؤال بيتولّد من محتوى المادة، ونتابع نقاط ضعفك في الآخر.
          </div>
        </div>

        <div>
          <div style={{ fontSize:11.5, color:'var(--t3)', marginBottom:8, textAlign:'center' }}>Starting level — adapts as you go</div>
          <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
            {DIFFS.map(d => (
              <button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                style={{
                  padding:'8px 16px', borderRadius:10, cursor:'pointer', fontFamily:'var(--font)',
                  fontSize:12.5, fontWeight:700,
                  background: difficulty === d.key ? 'var(--accent)' : 'var(--s3)',
                  color: difficulty === d.key ? 'white' : 'var(--t2)',
                  border:'1px solid ' + (difficulty === d.key ? 'var(--accent)' : 'var(--br)'),
                  transition:'all 0.12s',
                }}
              >{d.label}</button>
            ))}
          </div>
        </div>

        {/* Persistent mastery: the topics this student has kept getting wrong, across sessions. */}
        {allTimeWeak.length > 0 && (
          <div style={{ background:'var(--s3)', border:'1px solid var(--br)', borderRadius:12, padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11.5, color:'var(--t3)', fontWeight:600, marginBottom:8 }}>
              <History size={12} /> نقاط ضعفك من جلسات قبل كده — دوس تتمرن عليها
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {allTimeWeak.map(t => (
                <button
                  key={t}
                  onClick={() => startFocused(t)}
                  title={`Practice "${t}" only`}
                  style={{
                    padding:'5px 11px', borderRadius:20, fontSize:11.5, fontWeight:600, cursor:'pointer',
                    fontFamily:'var(--font)', display:'inline-flex', alignItems:'center', gap:5,
                    background:'rgba(224,38,75,0.12)', color:'var(--accent)', border:'1px solid rgba(224,38,75,0.25)',
                  }}
                >{t} <ArrowRight size={11} /></button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={start}
          style={{
            marginTop:4, padding:'12px', borderRadius:12,
            background:'linear-gradient(135deg, var(--accent), var(--accent-2))',
            color:'white', border:'none', cursor:'pointer', fontFamily:'var(--font)',
            fontSize:14, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}
        >
          <Target size={16} /> Start quiz
        </button>

        {onStartExam && (
          <button
            onClick={onStartExam}
            style={{
              padding:'11px', borderRadius:12, background:'var(--s3)', border:'1px solid var(--br)',
              color:'var(--t2)', cursor:'pointer', fontFamily:'var(--font)',
              fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}
          >
            <GraduationCap size={15} /> Simulate a full exam
          </button>
        )}

        <button
          onClick={onExit}
          style={{
            background:'transparent', border:'none', color:'var(--t3)', cursor:'pointer',
            fontSize:12.5, fontFamily:'var(--font)', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}
        >
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
        <div style={{ fontSize:13 }}>بحضّر سؤال من مادتك…</div>
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
          <button
            onClick={() => fetchQuestion(asked)}
            style={{ padding:'9px 16px', borderRadius:10, background:'var(--accent)', color:'white', border:'none', cursor:'pointer', fontSize:12.5, fontWeight:700, fontFamily:'var(--font)' }}
          >Try again</button>
          <button
            onClick={onExit}
            style={{ padding:'9px 16px', borderRadius:10, background:'var(--s3)', color:'var(--t2)', border:'1px solid var(--br)', cursor:'pointer', fontSize:12.5, fontFamily:'var(--font)' }}
          >Back to chat</button>
        </div>
      </div>
    )
  }

  // ── Summary ──────────────────────────────────────────────
  if (phase === 'summary') {
    const good = pct >= 70
    return (
      <div style={{ flex:1, overflowY:'auto', padding:'24px 20px', display:'flex', flexDirection:'column', gap:18, alignItems:'center' }}>
        <div style={{ fontSize:34 }}>{good ? '🎉' : total === 0 ? '👋' : '💪'}</div>
        <div style={{ fontWeight:800, fontSize:18, color:'var(--t)' }}>
          {total === 0 ? 'No questions answered' : `${score} / ${total} correct`}
        </div>
        {total > 0 && (
          <div style={{
            fontSize:13, fontWeight:700,
            color: good ? '#22c55e' : pct >= 40 ? '#f59e0b' : 'var(--accent)',
          }}>{pct}%</div>
        )}
        {weak.length > 0 && (
          <div style={{ width:'100%', background:'var(--s3)', border:'1px solid var(--br)', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:12, color:'var(--t3)', marginBottom:8, fontWeight:600 }}>
              Topics to review — tap one to drill it
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {weak.map(t => (
                <button
                  key={t}
                  onClick={() => startFocused(t)}
                  title={`Practice "${t}" only`}
                  style={{
                    padding:'5px 11px', borderRadius:20, fontSize:11.5, fontWeight:600, cursor:'pointer',
                    fontFamily:'var(--font)', display:'inline-flex', alignItems:'center', gap:5,
                    background:'rgba(224,38,75,0.12)', color:'var(--accent)', border:'1px solid rgba(224,38,75,0.25)',
                  }}
                >{t} <ArrowRight size={11} /></button>
              ))}
            </div>
          </div>
        )}
        <div style={{ display:'flex', gap:8, width:'100%', marginTop:4 }}>
          <button
            onClick={start}
            style={{ flex:1, padding:'11px', borderRadius:11, background:'linear-gradient(135deg, var(--accent), var(--accent-2))', color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'var(--font)', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}
          ><RotateCcw size={14} /> New quiz</button>
          <button
            onClick={onExit}
            style={{ flex:1, padding:'11px', borderRadius:11, background:'var(--s3)', color:'var(--t2)', border:'1px solid var(--br)', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'var(--font)' }}
          >Back to chat</button>
        </div>
      </div>
    )
  }

  // ── Question ─────────────────────────────────────────────
  const answered = selected !== null
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Score bar */}
      <div style={{
        padding:'10px 20px', borderBottom:'1px solid var(--br)',
        display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
          <Target size={14} style={{ color:'var(--accent)', flexShrink:0 }} />
          <span style={{ fontSize:12.5, fontWeight:700, color:'var(--t2)', flexShrink:0 }}>{score} / {total}</span>
          {focusTopic && (
            <span title={`Focused on ${focusTopic}`} style={{
              fontSize:10.5, fontWeight:700, color:'var(--accent)',
              background:'rgba(224,38,75,0.12)', border:'1px solid rgba(224,38,75,0.25)',
              borderRadius:6, padding:'1px 7px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>🎯 {focusTopic}</span>
          )}
          {current?.grounded && (
            <span title="From your course materials" style={{ fontSize:10, color:'var(--t3)', border:'1px solid var(--br)', borderRadius:6, padding:'1px 6px', flexShrink:0 }}>
              from materials
            </span>
          )}
          <span title="Difficulty adapts to your performance" style={{ fontSize:10, fontWeight:700, color:'var(--t3)', border:'1px solid var(--br)', borderRadius:6, padding:'1px 6px', flexShrink:0, textTransform:'capitalize' }}>
            {liveDifficulty}
          </span>
        </div>
        <button
          onClick={() => setPhase('summary')}
          style={{ background:'transparent', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:12, fontFamily:'var(--font)', fontWeight:600 }}
        >Finish</button>
      </div>

      {/* Question + options */}
      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
        {current && (
          <>
            <div style={{ fontSize:14.5, lineHeight:1.6, color:'var(--t)', fontWeight:600 }}>
              <RichText content={current.question} />
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
              {current.options.map((opt, i) => {
                const isCorrect = i === current.correctIndex
                const isChosen = i === selected
                let bg = 'var(--s3)', border = 'var(--br)', fg = 'var(--t)'
                if (answered) {
                  if (isCorrect) { bg = 'rgba(34,197,94,0.14)'; border = '#22c55e'; fg = 'var(--t)' }
                  else if (isChosen) { bg = 'rgba(239,68,68,0.12)'; border = '#ef4444'; fg = 'var(--t)' }
                  else { fg = 'var(--t3)' }
                }
                return (
                  <button
                    key={i}
                    onClick={() => answer(i)}
                    disabled={answered}
                    style={{
                      textAlign:'left', padding:'11px 14px', borderRadius:11,
                      background:bg, border:'1px solid ' + border, color:fg,
                      cursor: answered ? 'default' : 'pointer', fontFamily:'var(--font)',
                      fontSize:13.5, lineHeight:1.5, display:'flex', alignItems:'flex-start', gap:10,
                      transition:'all 0.12s',
                    }}
                  >
                    <span style={{
                      flexShrink:0, width:22, height:22, borderRadius:7, marginTop:1,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:800,
                      background: answered && isCorrect ? '#22c55e' : answered && isChosen ? '#ef4444' : 'var(--s2)',
                      color: answered && (isCorrect || isChosen) ? 'white' : 'var(--t3)',
                      border:'1px solid ' + (answered && (isCorrect || isChosen) ? 'transparent' : 'var(--br)'),
                    }}>
                      {answered && isCorrect ? <Check size={13} /> : answered && isChosen ? <X size={13} /> : String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ flex:1 }}><RichText content={opt} /></span>
                  </button>
                )
              })}
            </div>

            {/* Explanation after answering */}
            {answered && (
              <div style={{
                background:'var(--s3)', border:'1px solid var(--br)', borderRadius:12, padding:'12px 14px',
                animation:'fadeIn 0.2s ease both',
              }}>
                <div style={{ fontSize:11.5, fontWeight:700, color: selected === current.correctIndex ? '#22c55e' : 'var(--accent)', marginBottom:6 }}>
                  {selected === current.correctIndex ? '✓ Correct' : '✗ Not quite'}
                </div>
                <div style={{ fontSize:13, lineHeight:1.6, color:'var(--t2)' }}>
                  <RichText content={current.explanation} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Next */}
      {answered && (
        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--br)', flexShrink:0 }}>
          <button
            onClick={() => fetchQuestion(asked)}
            style={{
              width:'100%', padding:'11px', borderRadius:11,
              background:'linear-gradient(135deg, var(--accent), var(--accent-2))',
              color:'white', border:'none', cursor:'pointer', fontFamily:'var(--font)',
              fontSize:13.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}
          >Next question <ArrowRight size={15} /></button>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  )
}
