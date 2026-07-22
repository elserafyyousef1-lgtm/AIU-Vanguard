'use client'
// src/components/ai/StudyPlanView.tsx
// ───────────────────────────────────────────────────────────
// Exam-countdown study plan. Pick how many days are left + hours/day, and get a
// day-by-day plan drawn from the course's OWN materials and front-loaded with the
// student's weak topics. Tick tasks off as you go. ChatGPT can't do this — it
// doesn't know this syllabus or this student's gaps.
// ───────────────────────────────────────────────────────────
import { useState } from 'react'
import { CalendarDays, Loader2, ArrowLeft, RotateCcw, Check } from 'lucide-react'

interface Props {
  courseSlug: string
  courseName?: string
  onExit: () => void
}

type Phase = 'intro' | 'loading' | 'plan' | 'error'
interface Day { day: number; focus: string; tasks: string[] }

const DAYS_OPTS = [3, 7, 14]
const HOURS_OPTS = [1, 2, 3]

export function StudyPlanView({ courseSlug, courseName, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [daysLeft, setDaysLeft] = useState(7)
  const [hoursPerDay, setHoursPerDay] = useState(2)
  const [days, setDays] = useState<Day[]>([])
  const [done, setDone] = useState<Record<string, boolean>>({})   // "dayIdx:taskIdx" → checked
  const [grounded, setGrounded] = useState(false)
  const [error, setError] = useState('')

  const build = async () => {
    setPhase('loading'); setError(''); setDone({})
    try {
      const res = await fetch('/api/ai-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseSlug, courseName, daysLeft, hoursPerDay }),
      })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data.days) || !data.days.length) {
        setError(data.error || 'Could not build the plan. Please try again.')
        setPhase('error'); return
      }
      setDays(data.days as Day[])
      setGrounded(Boolean(data.grounded))
      setPhase('plan')
    } catch {
      setError('Connection error. Please try again.')
      setPhase('error')
    }
  }

  const totalTasks = days.reduce((n, d) => n + d.tasks.length, 0)
  const doneCount = Object.values(done).filter(Boolean).length
  const pct = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0

  // ── Intro ────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={{ flex:1, overflowY:'auto', padding:'24px 20px', display:'flex', flexDirection:'column', gap:18 }}>
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{ width:52, height:52, borderRadius:15, background:'linear-gradient(135deg, rgba(224,38,75,0.18), rgba(139,92,246,0.18))', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent)' }}>
            <CalendarDays size={24} />
          </div>
          <div style={{ fontWeight:800, fontSize:17, color:'var(--t)' }}>Study Plan</div>
          <div style={{ fontSize:12.5, color:'var(--t3)', lineHeight:1.6, maxWidth:290 }}>
            خطة يوم بيوم لمادة <b style={{ color:'var(--t2)' }}>{courseSlug}</b> لحد الامتحان — من مواد المادة، ومركّزة على نقط ضعفك الأول.
          </div>
        </div>

        <div>
          <div style={{ fontSize:11.5, color:'var(--t3)', marginBottom:8, textAlign:'center' }}>كام يوم فاضل للامتحان؟</div>
          <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
            {DAYS_OPTS.map(d => (
              <button key={d} onClick={() => setDaysLeft(d)} style={{
                padding:'8px 18px', borderRadius:10, cursor:'pointer', fontFamily:'var(--font)', fontSize:12.5, fontWeight:700,
                background: daysLeft === d ? 'var(--accent)' : 'var(--s3)', color: daysLeft === d ? 'white' : 'var(--t2)',
                border:'1px solid ' + (daysLeft === d ? 'var(--accent)' : 'var(--br)'),
              }}>{d} يوم</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize:11.5, color:'var(--t3)', marginBottom:8, textAlign:'center' }}>ساعات المذاكرة في اليوم</div>
          <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
            {HOURS_OPTS.map(h => (
              <button key={h} onClick={() => setHoursPerDay(h)} style={{
                padding:'8px 18px', borderRadius:10, cursor:'pointer', fontFamily:'var(--font)', fontSize:12.5, fontWeight:700,
                background: hoursPerDay === h ? 'var(--accent)' : 'var(--s3)', color: hoursPerDay === h ? 'white' : 'var(--t2)',
                border:'1px solid ' + (hoursPerDay === h ? 'var(--accent)' : 'var(--br)'),
              }}>{h === 3 ? '3+' : h} ساعة</button>
            ))}
          </div>
        </div>

        <button onClick={build} style={{ marginTop:4, padding:'12px', borderRadius:12, background:'linear-gradient(135deg, var(--accent), var(--accent-2))', color:'white', border:'none', cursor:'pointer', fontFamily:'var(--font)', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <CalendarDays size={16} /> اعملي الخطة
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
        <div style={{ fontSize:13 }}>بحضّرلك خطة على مقاسك…</div>
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
          <button onClick={build} style={{ padding:'9px 16px', borderRadius:10, background:'var(--accent)', color:'white', border:'none', cursor:'pointer', fontSize:12.5, fontWeight:700, fontFamily:'var(--font)' }}>Try again</button>
          <button onClick={onExit} style={{ padding:'9px 16px', borderRadius:10, background:'var(--s3)', color:'var(--t2)', border:'1px solid var(--br)', cursor:'pointer', fontSize:12.5, fontFamily:'var(--font)' }}>Back to chat</button>
        </div>
      </div>
    )
  }

  // ── Plan ─────────────────────────────────────────────────
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Progress bar */}
      <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--br)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12.5, fontWeight:700, color:'var(--t2)' }}>
            <CalendarDays size={13} style={{ color:'var(--accent)' }} /> {daysLeft}-day plan
            {grounded && <span title="From your course materials" style={{ fontSize:10, color:'var(--t3)', border:'1px solid var(--br)', borderRadius:6, padding:'1px 6px', fontWeight:600 }}>from materials</span>}
          </span>
          <span style={{ fontSize:11.5, color:'var(--t3)' }}>{doneCount}/{totalTasks} · {pct}%</span>
        </div>
        <div style={{ height:5, borderRadius:3, background:'var(--s1)', overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', background:'#22c55e', transition:'width 0.2s' }} />
        </div>
      </div>

      {/* Days */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
        {days.map((d, di) => (
          <div key={di} style={{ background:'var(--s3)', border:'1px solid var(--br)', borderRadius:12, padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={{ flexShrink:0, minWidth:52, height:22, padding:'0 8px', borderRadius:7, background:'var(--accent)', color:'white', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
                يوم {d.day}
              </span>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--t)' }}>{d.focus}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {d.tasks.map((t, ti) => {
                const key = `${di}:${ti}`
                const checked = !!done[key]
                return (
                  <button
                    key={ti}
                    onClick={() => setDone(prev => ({ ...prev, [key]: !prev[key] }))}
                    style={{
                      textAlign:'left', display:'flex', gap:9, alignItems:'flex-start',
                      background:'transparent', border:'none', cursor:'pointer', fontFamily:'var(--font)', padding:0,
                    }}
                  >
                    <span style={{
                      flexShrink:0, width:18, height:18, borderRadius:5, marginTop:1,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      background: checked ? '#22c55e' : 'transparent',
                      border:'1px solid ' + (checked ? '#22c55e' : 'var(--br2)'),
                      color:'white',
                    }}>{checked && <Check size={12} />}</span>
                    <span style={{ flex:1, fontSize:13, lineHeight:1.5, color: checked ? 'var(--t3)' : 'var(--t2)', textDecoration: checked ? 'line-through' : 'none' }}>{t}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div style={{ display:'flex', gap:8, marginTop:2 }}>
          <button onClick={() => setPhase('intro')} style={{ flex:1, padding:'11px', borderRadius:11, background:'var(--s3)', color:'var(--t2)', border:'1px solid var(--br)', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'var(--font)', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            <RotateCcw size={14} /> خطة جديدة
          </button>
          <button onClick={onExit} style={{ flex:1, padding:'11px', borderRadius:11, background:'var(--s3)', color:'var(--t2)', border:'1px solid var(--br)', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'var(--font)' }}>Back to chat</button>
        </div>
      </div>
    </div>
  )
}
