'use client'
// src/components/dashboard/StaffHub.tsx — Doctor & Master dashboard:
// their assigned courses with live student counts, plus the doctor's teach requests.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { BookOpen, Users, GraduationCap, Hourglass, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'

interface CourseRow { code: string; title: string; students: number }
interface Req { id: string; status: string; course: { code: string; title: string } | null }

export function StaffHub() {
  const supabase = createClient()
  const { userId, role, myCourses } = useAuth()
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [reqs, setReqs] = useState<Req[]>([])

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      if (myCourses.length) {
        const [{ data: cs }, { data: en }] = await Promise.all([
          supabase.from('courses').select('code, title').in('code', myCourses),
          supabase.from('enrollments').select('course').in('course', myCourses),
        ])
        const counts: Record<string, number> = {}
        ;(en || []).forEach((e: any) => { counts[e.course] = (counts[e.course] || 0) + 1 })
        setCourses(myCourses.map(code => ({
          code,
          title: (cs || []).find((c: any) => c.code === code)?.title || code,
          students: counts[code] || 0,
        })))
      } else {
        setCourses([])
      }
      if (role === 'doctor') {
        const { data: tr } = await supabase
          .from('teach_requests')
          .select('id, status, course:course_id (code, title)')
          .eq('doctor_id', userId)
          .order('created_at', { ascending: false })
        setReqs((tr as any) || [])
      }
    }
    load()
  }, [userId, role, myCourses.join(',')])

  const totalStudents = courses.reduce((a, c) => a + c.students, 0)
  const pending = reqs.filter(r => r.status === 'pending').length

  const card = (icon: any, label: string, value: React.ReactNode, color: string) => (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--t)' }}>{value}</div>
    </div>
  )

  const statusPill = (st: string) =>
    st === 'pending'  ? <span style={pill('#f59e0b')}><Hourglass size={11} /> Pending</span> :
    st === 'approved' ? <span style={pill('#10b981')}><CheckCircle2 size={11} /> Approved</span> :
                        <span style={pill('#ef4444')}><XCircle size={11} /> Rejected</span>

  return (
    <div className="anim-2">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 14, marginBottom: 30 }}>
        {card(<BookOpen size={15} />, 'My Courses', courses.length, 'var(--accent)')}
        {card(<Users size={15} />, 'Total Students', totalStudents, '#10b981')}
        {role === 'doctor' && card(<GraduationCap size={15} />, 'Pending Requests', pending, '#f59e0b')}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t)', marginBottom: 14 }}>My Courses</h2>
      {courses.length === 0 ? (
        <div style={{ background: 'var(--s2)', border: '1px dashed var(--br)', borderRadius: 14, padding: 26, textAlign: 'center', marginBottom: 30 }}>
          <p style={{ color: 'var(--t3)', fontSize: 13.5, marginBottom: 12 }}>
            {role === 'doctor'
              ? "You don't teach any course yet. Browse semesters and request to teach."
              : 'No courses assigned to you yet.'}
          </p>
          {role === 'doctor' && (
            <Link href="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10,
              background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>Browse semesters <ArrowRight size={13} /></Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 30 }}>
          {courses.map(c => (
            <div key={c.code} style={{
              display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap',
              background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 13, padding: '13px 16px',
            }}>
              <BookOpen size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 130 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{c.code}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t)' }}>{c.title}</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--t2)', fontWeight: 600 }}>
                <Users size={13} /> {c.students} {c.students === 1 ? 'student' : 'students'}
              </span>
              <Link href={`/courses/${c.code.toLowerCase()}`} style={{
                padding: '7px 15px', borderRadius: 9, background: 'var(--accent)', color: 'white',
                fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
              }}>Open</Link>
            </div>
          ))}
        </div>
      )}

      {role === 'doctor' && reqs.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t)', marginBottom: 14 }}>My Teach Requests</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {reqs.map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 12, padding: '11px 15px',
              }}>
                <GraduationCap size={15} style={{ color: 'var(--t3)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13.5, color: 'var(--t)', fontWeight: 600 }}>
                  <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{r.course?.code}</span>
                  {' '}— {r.course?.title}
                </span>
                {statusPill(r.status)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const pill = (color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px',
  borderRadius: 8, border: `1px solid ${color}`, color, fontSize: 11, fontWeight: 700,
})
