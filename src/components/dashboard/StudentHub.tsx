'use client'
// src/components/dashboard/StudentHub.tsx — the student's WORKFLOW dashboard:
// "what's next" first (deadlines + GPA computed BY THE DATABASE, never by AI),
// then enrolled courses, level, and a PRIVATE rank among all students.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUIStore } from '@/lib/store'
import { BookOpen, Trophy, BarChart3, Clock, Lock, CheckCircle2, EyeOff, ArrowRight, CalendarClock, Sparkles, Brain, Target } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Enr { id: string; course: string; enrolled_at: string; completed: boolean }
interface RankRow { rank: number; total: number; score: number }
interface Deadline { id: string; title: string; due_at: string; course: string; submitted: boolean }
interface FinalGrade { course: string; final_percent: number | null; graded_count: number }
interface Learning { total: number; correct: number; topics_practiced: number; weak: { course: string; topic: string; accuracy: number }[] }

// AIU letter scale — pure math on DB-computed percentages (AI never touches grades)
const gradePoint = (p: number) =>
  p >= 93 ? { l: 'A',  pts: 4.0 } : p >= 89 ? { l: 'A-', pts: 3.7 } :
  p >= 84 ? { l: 'B+', pts: 3.3 } : p >= 80 ? { l: 'B',  pts: 3.0 } :
  p >= 76 ? { l: 'B-', pts: 2.7 } : p >= 73 ? { l: 'C+', pts: 2.3 } :
  p >= 70 ? { l: 'C',  pts: 2.0 } : p >= 67 ? { l: 'C-', pts: 1.7 } :
  p >= 64 ? { l: 'D+', pts: 1.3 } : p >= 60 ? { l: 'D',  pts: 1.0 } :
            { l: 'F',  pts: 0.0 }

const levelOf = (s: number) =>
  s >= 600 ? { label: 'Elite',    color: '#f59e0b' } :
  s >= 300 ? { label: 'Veteran',  color: '#8b5cf6' } :
  s >= 100 ? { label: 'Survivor', color: '#10b981' } :
             { label: 'Recruit',  color: '#06b6d4' }

export function StudentHub({ userId }: { userId: string }) {
  const supabase = createClient()
  const { openAI } = useUIStore()
  const [enrs, setEnrs] = useState<Enr[]>([])
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [rank, setRank] = useState<RankRow | null>(null)
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [finals, setFinals] = useState<FinalGrade[]>([])
  const [learning, setLearning] = useState<Learning | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: en } = await supabase
        .from('enrollments').select('id, course, enrolled_at, completed')
        .eq('user_id', userId)
      const list: Enr[] = (en as any) || []
      setEnrs(list)
      if (list.length) {
        const codes = list.map(e => e.course)
        const { data: cs } = await supabase
          .from('courses').select('id, code, title').in('code', codes)
        const map: Record<string, string> = {}
        ;(cs || []).forEach((c: any) => { map[c.code] = c.title })
        setTitles(map)

        // ── upcoming deadlines: published work due in the next 14 days, not yet submitted
        const courseIds = (cs || []).map((c: any) => c.id)
        if (courseIds.length) {
          const soon = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString()
          const { data: asg } = await supabase
            .from('assignments').select('id, title, due_at, course_id')
            .in('course_id', courseIds).eq('published', true)
            .not('due_at', 'is', null).gte('due_at', new Date().toISOString()).lte('due_at', soon)
            .order('due_at').limit(5)
          const asgIds = (asg || []).map((a: any) => a.id)
          const { data: mySubs } = asgIds.length
            ? await supabase.from('submissions').select('assignment_id')
                .in('assignment_id', asgIds).eq('student_id', userId)
            : { data: [] as any[] }
          const submitted = new Set((mySubs || []).map((s: any) => s.assignment_id))
          const codeOf: Record<string, string> = {}
          ;(cs || []).forEach((c: any) => { codeOf[c.id] = c.code })
          setDeadlines((asg || []).map((a: any) => ({
            id: a.id, title: a.title, due_at: a.due_at,
            course: codeOf[a.course_id] || '', submitted: submitted.has(a.id),
          })))
        }
      }
      // ── GPA: the DATABASE computes the percentages (deterministic — never the AI)
      const { data: fg } = await supabase.rpc('my_final_grades')
      setFinals(((fg as any) || []).filter((f: FinalGrade) => f.final_percent != null))

      const { data: r } = await supabase.rpc('my_student_rank')
      if (r && (r as any).length) setRank((r as any)[0])

      // ── AI mastery profile (from the tutor's quizzes/exams) — surfaced on the dashboard
      const { data: ls } = await supabase.rpc('my_learning_summary')
      if (ls) setLearning(ls as any)
    }
    load()
  }, [userId])

  const gpa = finals.length
    ? (finals.reduce((a, f) => a + gradePoint(Number(f.final_percent)).pts, 0) / finals.length)
    : null
  const dueSoonUnsubmitted = deadlines.filter(d => !d.submitted).length

  const editable = (e: Enr) => Date.now() - new Date(e.enrolled_at).getTime() < 24 * 3600 * 1000
  const hoursLeft = (e: Enr) =>
    Math.max(0, Math.ceil((24 * 3600 * 1000 - (Date.now() - new Date(e.enrolled_at).getTime())) / 3600000))
  const lvl = levelOf(rank?.score || 0)
  const completed = enrs.filter(e => e.completed).length

  const card = (icon: any, label: string, value: React.ReactNode, color: string, sub?: React.ReactNode) => (
    <Card padding={18}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--t)', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ marginTop: 4 }}>{sub}</div>}
    </Card>
  )

  return (
    <div className="anim-2">
      {/* ── What's next (deadlines + DB-computed GPA) ── */}
      {(deadlines.length > 0 || gpa !== null) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
          {gpa !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap',
              background: 'linear-gradient(135deg, rgba(224,38,75,0.07), rgba(139,92,246,0.05))',
              border: '1px solid var(--accent-br)', borderRadius: 13, padding: '13px 16px',
            }}>
              <BarChart3 size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t)' }}>
                Current GPA: <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--accent)' }}>{gpa.toFixed(2)}</span>
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>
                {finals.map(f => `${f.course} ${gradePoint(Number(f.final_percent)).l} (${f.final_percent}%)`).join(' · ')}
              </span>
              <span style={{ marginLeft: 'auto' }}>
                <Button size="sm" variant="subtle" onClick={() => openAI(finals[0]?.course || enrs[0]?.course || 'CSE221')}>
                  <Sparkles size={13} style={{ marginRight: 5 }} /> Ask AI how to improve
                </Button>
              </span>
            </div>
          )}
          {deadlines.map(d => (
            <div key={d.id} style={{
              display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap',
              background: 'var(--s2)', border: `1px solid ${d.submitted ? 'var(--br)' : 'rgba(245,158,11,0.4)'}`,
              borderRadius: 13, padding: '12px 16px',
            }}>
              <CalendarClock size={15} style={{ color: d.submitted ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent)' }}>{d.course}</span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--t)' }}>{d.title}</span>
              <span style={{ fontSize: 12, color: d.submitted ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                {d.submitted ? 'Submitted ✓' : `Due ${new Date(d.due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
              </span>
              {!d.submitted && (
                <Button href={`/courses/${d.course.toLowerCase()}/assignments`} size="sm">Open</Button>
              )}
            </div>
          ))}
          {dueSoonUnsubmitted === 0 && deadlines.length === 0 && null}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 14, marginBottom: 30 }}>
        {card(<BookOpen size={15} />, 'Enrolled Courses', enrs.length, 'var(--accent)')}
        {card(<CheckCircle2 size={15} />, 'Completed', completed, '#10b981')}
        {card(<Trophy size={15} />, 'Your Level', <span style={{ color: lvl.color }}>{lvl.label}</span>, lvl.color,
          <span style={{ fontSize: 11.5, color: 'var(--t3)' }}>{rank?.score ?? 0} pts</span>)}
        {card(<BarChart3 size={15} />, 'Your Rank',
          rank ? <>#{rank.rank} <span style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 600 }}>of {rank.total}</span></> : '—',
          '#f59e0b',
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--t3)' }}>
            <EyeOff size={10} /> Only you can see this
          </span>)}
      </div>

      {/* ── Your Learning — the AI mastery profile, surfaced so its value shows even off-chat ── */}
      <div style={{ marginBottom: 30 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={18} style={{ color: 'var(--accent)' }} /> Your Learning
        </h2>
        {learning && learning.total > 0 ? (
          <Card padding={18}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26, marginBottom: learning.weak.length ? 16 : 0 }}>
              {lstat(learning.total, 'Questions practiced')}
              {(() => { const acc = Math.round((learning.correct / learning.total) * 100); return lstat(`${acc}%`, 'Accuracy', acc >= 70 ? '#10b981' : acc >= 40 ? '#f59e0b' : 'var(--accent)') })()}
              {lstat(learning.topics_practiced, 'Topics covered')}
            </div>
            {learning.weak.length > 0 && (
              <div style={{ borderTop: '1px solid var(--br)', paddingTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--t3)', fontWeight: 600, marginBottom: 10 }}>
                  <Target size={13} style={{ color: 'var(--accent)' }} /> Focus areas — tap to practice with the AI
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {learning.weak.map((w, i) => (
                    <button key={i} onClick={() => openAI(w.course)} title={`Practice ${w.topic} (${w.course})`} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 10, cursor: 'pointer',
                      background: 'var(--s3)', border: '1px solid var(--br)', fontFamily: 'var(--font)',
                    }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{w.course}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t)' }}>{w.topic}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#f59e0b' }}>{Math.round(w.accuracy * 100)}%</span>
                      <ArrowRight size={12} style={{ color: 'var(--t3)' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card padding={22}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg, rgba(224,38,75,0.16), rgba(139,92,246,0.16))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <Sparkles size={20} />
              </div>
              <p style={{ color: 'var(--t3)', fontSize: 13.5, lineHeight: 1.6, maxWidth: 340 }}>
                ذاكر مع الـ AI Tutor — خُد كويز سريع أو امتحان، ونقط ضعفك وتقدّمك ودقّتك هتظهرلك هنا وتفضل محفوظة.
              </p>
              <Button size="sm" onClick={() => openAI(enrs[0]?.course || 'CSE221')} iconRight={<ArrowRight size={14} />}>
                <Sparkles size={13} style={{ marginRight: 5 }} /> جرّب كويز
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* My courses */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t)', marginBottom: 14 }}>My Courses</h2>
      {enrs.length === 0 ? (
        <div style={{ background: 'var(--s2)', border: '1px dashed var(--br)', borderRadius: 14, padding: 26, textAlign: 'center' }}>
          <p style={{ color: 'var(--t3)', fontSize: 13.5, marginBottom: 12 }}>You haven't enrolled in any course yet.</p>
          <Button href="/" size="sm" iconRight={<ArrowRight size={14} />}>Browse semesters</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {enrs.map(e => (
            <div key={e.id} style={{
              display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap',
              background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 13, padding: '13px 16px',
            }}>
              <BookOpen size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 130 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{e.course}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t)' }}>{titles[e.course] || e.course}</div>
              </div>
              {e.completed ? (
                <span style={pill('#10b981')}><CheckCircle2 size={11} /> Completed</span>
              ) : editable(e) ? (
                <span style={pill('var(--accent)')}><Clock size={11} /> Editable {hoursLeft(e)}h</span>
              ) : (
                <span style={pill('var(--t3)')}><Lock size={10} /> Enrolled</span>
              )}
              <Button href={`/courses/${e.course.toLowerCase()}`} size="sm">Open</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const pill = (color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px',
  borderRadius: 8, border: `1px solid ${color}`, color, fontSize: 11, fontWeight: 700,
})

// A compact "big number + label" stat used in the Your Learning card.
const lstat = (value: React.ReactNode, label: string, color = 'var(--t)'): React.ReactNode => (
  <div>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</div>
    <div style={{ fontSize: 11.5, color: 'var(--t3)', fontWeight: 600, marginTop: 2 }}>{label}</div>
  </div>
)
