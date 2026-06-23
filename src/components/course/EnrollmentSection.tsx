'use client'
// src/components/course/EnrollmentSection.tsx
// Course enrollment with Yousef's rules:
// enroll → editable for 24h (cancel) → locked (request change from course master)
// completed → can be removed by the student.
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { BookOpen, Lock, Clock, CheckCircle2, MessageSquare, Loader2 } from 'lucide-react'

const COURSES = ['CSE221', 'MAT312', 'CSE301', 'CSE311']

interface Enrollment { id: string; course: string; enrolled_at: string; completed: boolean }

export function EnrollmentSection({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [items, setItems] = useState<Enrollment[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('enrollments')
      .select('id, course, enrolled_at, completed')
      .eq('user_id', userId)
    setItems((data as any) || [])
  }, [userId])

  useEffect(() => { load() }, [load])

  const hoursLeft = (e: Enrollment) =>
    Math.max(0, Math.ceil((24 * 3600 * 1000 - (Date.now() - new Date(e.enrolled_at).getTime())) / 3600000))
  const editable = (e: Enrollment) =>
    Date.now() - new Date(e.enrolled_at).getTime() < 24 * 3600 * 1000

  const enroll = async (course: string) => {
    setBusy(course)
    const { error } = await supabase.from('enrollments').insert({ user_id: userId, course })
    setBusy(null)
    if (error) { toast.error('Could not enroll. Please try again.'); return }
    toast.success(`Enrolled in ${course}. You can cancel within 24 hours.`)
    load()
  }

  const cancelOrRemove = async (e: Enrollment) => {
    setBusy(e.course)
    const { error } = await supabase.from('enrollments').delete().eq('id', e.id)
    setBusy(null)
    if (error) {
      toast.error('The 24-hour window has passed — request a change from the course master.')
      return
    }
    toast.success(e.completed ? 'Course removed.' : 'Enrollment cancelled.')
    load()
  }

  const requestChange = async (course: string) => {
    setBusy(course)
    const { data: masters } = await supabase
      .from('course_assignments').select('user_id')
      .eq('course', course).eq('role_in_course', 'master').limit(1)
    const target = masters?.[0]?.user_id
    if (!target) {
      setBusy(null)
      toast('No master assigned to this course yet — please message the admin.', { icon: 'ℹ️' })
      router.push('/messages')
      return
    }
    const { data: existing } = await supabase
      .from('conversations').select('id')
      .or(`and(student_id.eq.${userId},staff_id.eq.${target}),and(student_id.eq.${target},staff_id.eq.${userId})`)
      .limit(1)
    if (!existing || existing.length === 0) {
      await supabase.from('conversations').insert({ student_id: userId, staff_id: target })
    }
    setBusy(null)
    router.push('/messages')
  }

  const row = (course: string) => {
    const e = items.find(i => i.course === course)
    const isBusy = busy === course
    return (
      <div key={course} style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '13px 16px', borderRadius: 12,
        background: 'var(--s3)', border: '1px solid var(--br)',
      }}>
        <BookOpen size={16} style={{ color: e ? 'var(--accent)' : 'var(--t3)', flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 90, fontSize: 14, fontWeight: 700, color: 'var(--t)', fontFamily: 'var(--font-mono)' }}>
          {course}
        </span>

        {!e && (
          <button onClick={() => enroll(course)} disabled={isBusy} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 9,
            background: 'var(--accent)', color: 'white', border: 'none',
            fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
          }}>{isBusy ? <Loader2 size={13} className="animate-spin" /> : 'Enroll'}</button>
        )}

        {e && e.completed && (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#10b981', fontWeight: 700 }}>
              <CheckCircle2 size={13} /> Completed
            </span>
            <button onClick={() => cancelOrRemove(e)} disabled={isBusy} style={{
              padding: '7px 14px', borderRadius: 9, background: 'transparent',
              border: '1px solid var(--br)', color: 'var(--t2)',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
            }}>{isBusy ? '...' : 'Remove'}</button>
          </>
        )}

        {e && !e.completed && editable(e) && (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
              <Clock size={13} /> Editable for {hoursLeft(e)}h
            </span>
            <button onClick={() => cancelOrRemove(e)} disabled={isBusy} style={{
              padding: '7px 14px', borderRadius: 9, background: 'transparent',
              border: '1px solid #ef4444', color: '#ef4444',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
            }}>{isBusy ? '...' : 'Cancel'}</button>
          </>
        )}

        {e && !e.completed && !editable(e) && (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>
              <Lock size={12} /> Enrolled
            </span>
            <button onClick={() => requestChange(course)} disabled={isBusy} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9,
              background: 'transparent', border: '1px solid var(--br)', color: 'var(--t2)',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
            }}>{isBusy ? '...' : <><MessageSquare size={13} /> Request change</>}</button>
          </>
        )}
      </div>
    )
  }

  return (
    <section style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 16, padding: 22, marginTop: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--t)', marginBottom: 4 }}>Course Enrollment</h2>
      <p style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 16 }}>
        You can cancel within 24 hours of enrolling. After that, contact the course master.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {COURSES.map(row)}
      </div>
    </section>
  )
}
