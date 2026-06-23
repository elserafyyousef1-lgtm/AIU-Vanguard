'use client'
// src/components/dashboard/StudentHub.tsx — real student dashboard:
// enrolled courses, level, and a PRIVATE rank among all students.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Trophy, BarChart3, Clock, Lock, CheckCircle2, EyeOff, ArrowRight } from 'lucide-react'

interface Enr { id: string; course: string; enrolled_at: string; completed: boolean }
interface RankRow { rank: number; total: number; score: number }

const levelOf = (s: number) =>
  s >= 600 ? { label: 'Elite',    color: '#f59e0b' } :
  s >= 300 ? { label: 'Veteran',  color: '#8b5cf6' } :
  s >= 100 ? { label: 'Survivor', color: '#10b981' } :
             { label: 'Recruit',  color: '#06b6d4' }

export function StudentHub({ userId }: { userId: string }) {
  const supabase = createClient()
  const [enrs, setEnrs] = useState<Enr[]>([])
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [rank, setRank] = useState<RankRow | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: en } = await supabase
        .from('enrollments').select('id, course, enrolled_at, completed')
        .eq('user_id', userId)
      const list: Enr[] = (en as any) || []
      setEnrs(list)
      if (list.length) {
        const { data: cs } = await supabase
          .from('courses').select('code, title')
          .in('code', list.map(e => e.course))
        const map: Record<string, string> = {}
        ;(cs || []).forEach((c: any) => { map[c.code] = c.title })
        setTitles(map)
      }
      const { data: r } = await supabase.rpc('my_student_rank')
      if (r && (r as any).length) setRank((r as any)[0])
    }
    load()
  }, [userId])

  const editable = (e: Enr) => Date.now() - new Date(e.enrolled_at).getTime() < 24 * 3600 * 1000
  const hoursLeft = (e: Enr) =>
    Math.max(0, Math.ceil((24 * 3600 * 1000 - (Date.now() - new Date(e.enrolled_at).getTime())) / 3600000))
  const lvl = levelOf(rank?.score || 0)
  const completed = enrs.filter(e => e.completed).length

  const card = (icon: any, label: string, value: React.ReactNode, color: string, sub?: React.ReactNode) => (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--t)' }}>{value}</div>
      {sub && <div style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  )

  return (
    <div className="anim-2">
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

      {/* My courses */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t)', marginBottom: 14 }}>My Courses</h2>
      {enrs.length === 0 ? (
        <div style={{ background: 'var(--s2)', border: '1px dashed var(--br)', borderRadius: 14, padding: 26, textAlign: 'center' }}>
          <p style={{ color: 'var(--t3)', fontSize: 13.5, marginBottom: 12 }}>You haven't enrolled in any course yet.</p>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10,
            background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}>Browse semesters <ArrowRight size={13} /></Link>
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
              <Link href={`/courses/${e.course.toLowerCase()}`} style={{
                padding: '7px 15px', borderRadius: 9, background: 'var(--accent)', color: 'white',
                fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
              }}>Open</Link>
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
