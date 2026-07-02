'use client'
// src/components/course/ExamTab.tsx
import { useState, useCallback } from 'react'
import type { Question, Course } from '@/types'
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react'

interface Props { questions: Question[]; course: Course }

export function ExamTab({ questions, course }: Props) {
  const [answers, setAnswers] = useState<Record<number, string | boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [expandedFeedback, setExpandedFeedback] = useState<Record<number, boolean>>({})

  const handleAnswer = useCallback((n: number, val: string | boolean) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [n]: val }))
  }, [submitted])

  const handleSubmit = () => {
    let correct = 0
    questions.forEach(q => {
      const ans = answers[q.n]
      if (ans !== undefined && ans === q.c) correct++
    })
    setScore(Math.round((correct / questions.length) * 100))
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleReset = () => {
    setAnswers({})
    setSubmitted(false)
    setScore(null)
    setExpandedFeedback({})
  }

  const answeredCount = Object.keys(answers).length

  return (
    <div>
      {/* Score panel (after submit) */}
      {submitted && score !== null && (
        <div style={{
          background: score >= 70 ? 'rgba(16,185,129,0.08)' : score >= 50 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${score >= 70 ? 'rgba(16,185,129,0.3)' : score >= 50 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius:16, padding:28, marginBottom:28,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          flexWrap:'wrap', gap:16,
        }}>
          <div>
            <div style={{ fontSize:12, color:'var(--t2)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:'var(--font-mono)' }}>
              Your Score
            </div>
            <div style={{
              fontSize:52, fontWeight:800, letterSpacing:'-0.03em',
              color: score >= 70 ? 'var(--accent-green)' : score >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)',
              lineHeight:1,
            }}>{score}%</div>
            <div style={{ color:'var(--t2)', marginTop:6, fontSize:14 }}>
              {Object.values(answers).filter((a, i) => a === questions[i]?.c).length} / {questions.length} correct
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontSize:14, color:'var(--t2)' }}>
              {score >= 90 ? '🏆 Excellent! Exam ready.' :
               score >= 70 ? '👍 Good work! Review weak areas.' :
               score >= 50 ? '📚 Keep studying, you\'re getting there.' :
               '💪 Don\'t give up — review the material!'}
            </div>
            <button
              onClick={handleReset}
              style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'8px 16px', borderRadius:9,
                background:'var(--s3)', border:'1px solid var(--br2)',
                color:'var(--t)', fontSize:13, fontWeight:500,
                cursor:'pointer', fontFamily:'var(--font)',
              }}
            >
              <RotateCcw size={14} /> Retry Exam
            </button>
          </div>
        </div>
      )}

      {/* Progress bar (before submit) */}
      {!submitted && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:12, color:'var(--t3)' }}>Progress</span>
            <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--t2)' }}>
              {answeredCount}/{questions.length}
            </span>
          </div>
          <div style={{ height:4, background:'var(--s3)', borderRadius:2, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:2,
              background:`linear-gradient(90deg, ${course.color}, var(--accent-2))`,
              width:`${(answeredCount/questions.length)*100}%`,
              transition:'width 0.3s var(--ease-out)',
            }} />
          </div>
        </div>
      )}

      {/* Questions */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {questions.map((q) => {
          const userAns = answers[q.n]
          const isCorrect = submitted && userAns === q.c
          const isWrong = submitted && userAns !== undefined && userAns !== q.c
          const showFeedback = expandedFeedback[q.n]

          return (
            <div key={q.n} style={{
              background:'var(--s2)',
              border: `1px solid ${submitted ? (isCorrect ? 'rgba(16,185,129,0.3)' : isWrong ? 'rgba(239,68,68,0.3)' : 'var(--br)') : 'var(--br)'}`,
              borderRadius:14, padding:20,
              transition:'border-color 0.2s',
            }}>
              {/* Question */}
              <div style={{ display:'flex', gap:12, marginBottom:14 }}>
                <span style={{
                  fontFamily:'var(--font-mono)', fontSize:11,
                  color:course.color, flexShrink:0, marginTop:1,
                }}>Q{q.n}</span>
                <div>
                  <div style={{ color:'var(--t)', fontSize:14, fontWeight:500, lineHeight:1.55 }}>
                    {q.q}
                  </div>
                  <div style={{
                    fontFamily:'var(--font-mono)', fontSize:10,
                    color:'var(--t3)', marginTop:4, textTransform:'uppercase',
                    letterSpacing:'0.05em',
                  }}>{q.tag}</div>
                </div>
              </div>

              {/* MCQ options */}
              {q.t === 'mcq' && q.opts && (
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {q.opts.map((opt, idx) => {
                    const letter = ['a','b','c','d'][idx]
                    const isSelected = userAns === letter
                    const isCorrectOpt = submitted && q.c === letter
                    const isWrongOpt = submitted && isSelected && !isCorrectOpt

                    return (
                      <button
                        key={letter}
                        onClick={() => handleAnswer(q.n, letter)}
                        style={{
                          display:'flex', alignItems:'center', gap:10,
                          padding:'10px 14px', borderRadius:10, textAlign:'left',
                          background: isCorrectOpt ? 'rgba(16,185,129,0.08)' :
                                      isWrongOpt ? 'rgba(239,68,68,0.08)' :
                                      isSelected ? 'rgba(224,38,75,0.08)' : 'var(--s3)',
                          border: `1px solid ${isCorrectOpt ? 'rgba(16,185,129,0.4)' :
                                                isWrongOpt ? 'rgba(239,68,68,0.4)' :
                                                isSelected ? 'rgba(224,38,75,0.4)' : 'var(--br)'}`,
                          color: isCorrectOpt ? 'var(--accent-green)' :
                                 isWrongOpt ? 'var(--accent-red)' :
                                 isSelected ? 'var(--t)' : 'var(--t2)',
                          fontSize:13, cursor: submitted ? 'default' : 'pointer',
                          fontFamily:'var(--font)',
                          transition:'all 0.12s',
                        }}
                      >
                        <span style={{
                          fontFamily:'var(--font-mono)', fontSize:10, fontWeight:700,
                          flexShrink:0, width:18,
                          color: isCorrectOpt ? 'var(--accent-green)' :
                                 isWrongOpt ? 'var(--accent-red)' : 'inherit',
                        }}>{letter.toUpperCase()}</span>
                        {opt}
                        {isCorrectOpt && <CheckCircle size={14} style={{ marginLeft:'auto', flexShrink:0 }} />}
                        {isWrongOpt && <XCircle size={14} style={{ marginLeft:'auto', flexShrink:0 }} />}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* T/F options */}
              {q.t === 'tf' && (
                <div style={{ display:'flex', gap:8 }}>
                  {[true, false].map((val) => {
                    const label = val ? 'True' : 'False'
                    const isSelected = userAns === val
                    const isCorrectOpt = submitted && q.c === val
                    const isWrongOpt = submitted && isSelected && !isCorrectOpt

                    return (
                      <button
                        key={String(val)}
                        onClick={() => handleAnswer(q.n, val)}
                        style={{
                          padding:'8px 20px', borderRadius:9,
                          background: isCorrectOpt ? 'rgba(16,185,129,0.1)' :
                                      isWrongOpt ? 'rgba(239,68,68,0.1)' :
                                      isSelected ? 'rgba(224,38,75,0.1)' : 'var(--s3)',
                          border: `1px solid ${isCorrectOpt ? 'rgba(16,185,129,0.4)' :
                                                isWrongOpt ? 'rgba(239,68,68,0.4)' :
                                                isSelected ? 'rgba(224,38,75,0.4)' : 'var(--br)'}`,
                          color: isCorrectOpt ? 'var(--accent-green)' :
                                 isWrongOpt ? 'var(--accent-red)' :
                                 isSelected ? 'var(--t)' : 'var(--t2)',
                          fontSize:13, fontWeight:500,
                          cursor: submitted ? 'default' : 'pointer',
                          fontFamily:'var(--font)',
                          transition:'all 0.12s',
                        }}
                      >{label}</button>
                    )
                  })}
                </div>
              )}

              {/* Feedback (after submit) */}
              {submitted && (
                <div style={{ marginTop:12 }}>
                  <button
                    onClick={() => setExpandedFeedback(prev => ({ ...prev, [q.n]: !prev[q.n] }))}
                    style={{
                      fontSize:12, color: isCorrect ? 'var(--accent-green)' : isWrong ? 'var(--accent-red)' : 'var(--t3)',
                      cursor:'pointer', background:'none', border:'none',
                      display:'flex', alignItems:'center', gap:5, fontFamily:'var(--font)',
                    }}
                  >
                    {isCorrect ? '✓ Correct' : isWrong ? '✗ Wrong' : '— Skipped'}
                    {showFeedback ? ' ▲' : ' — View explanation ▼'}
                  </button>
                  {showFeedback && (
                    <div className="tip" style={{ marginTop:8 }}>
                      <strong>Explanation:</strong> {q.f}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Submit button */}
      {!submitted && (
        <div style={{ marginTop:32, textAlign:'center' }}>
          <button
            onClick={handleSubmit}
            disabled={answeredCount === 0}
            style={{
              padding:'14px 40px', borderRadius:12,
              background: answeredCount > 0 ? `linear-gradient(135deg, ${course.color}, var(--accent-2))` : 'var(--s3)',
              color: answeredCount > 0 ? 'white' : 'var(--t3)',
              border:'none', fontSize:15, fontWeight:700,
              cursor: answeredCount > 0 ? 'pointer' : 'not-allowed',
              fontFamily:'var(--font)', letterSpacing:'-0.01em',
              boxShadow: answeredCount > 0 ? `0 4px 20px ${course.color}40` : 'none',
              transition:'all 0.2s',
            }}
          >
            Submit Exam ({answeredCount}/{questions.length} answered)
          </button>
        </div>
      )}
    </div>
  )
}
