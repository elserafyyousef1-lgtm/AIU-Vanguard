'use client'
// src/app/semesters/[id]/page.tsx — DB-driven semester courses, role-aware actions
// SPEC: students→Enroll | doctor→Request to Teach | owner/admin→direct access
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import toast from 'react-hot-toast'
import { BookOpen, Clock, Lock, CheckCircle2, MessageSquare, Loader2, ArrowLeft, GraduationCap, Hourglass } from 'lucide-react'

interface Course { id: string; code: string; title: string }
interface Enrollment { id: string; course: string; enrolled_at: string; completed: boolean }
interface TeachReq { id: string; course_id: string; status: string }

export default function SemesterPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const semId = parseInt((params?.id as string) || '0')
  const { loading: authLoading, userId, role, isStudent, myCourses } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [requests, setRequests] = useState<TeachReq[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: cs } = await supabase
      .from('courses').select('id, code, title')
      .eq('semester_id', semId).order('code')
    setCourses((cs as any) || [])
    if (userId) {
      if (isStudent) {
        const { data: en } = await supabase
          .from('enrollments').select('id, course, enrolled_at, completed')
          .eq('user_id', userId)
        setEnrollments((en as any) || [])
      }
      if (role === 'doctor') {
        const { data: tr } = await supabase
          .from('teach_requests').select('id, course_id, status')
          .eq('doctor_id', userId)
        setRequests((tr as any) || [])
      }
    }
    setLoading(false)
  }, [semId, userId, isStudent, role])

  useEffect(() => { if (!authLoading) load() }, [authLoading, load])

  // ── student actions ──
  const hoursLeft = (e: Enrollment) =>
    Math.max(0, Math.ceil((24 * 3600 * 1000 - (Date.now() - new Date(e.enrolled_at).getTime())) / 3600000))
  const editable = (e: Enrollment) =>
    Date.now() - new Date(e.enrolled_at).getTime() < 24 * 3600 * 1000

  const enroll = async (code: string) => {
    if (!userId) return
    setBusy(code)
    const { error } = await supabase.from('enrollments').insert({ user_id: userId, course: code })
    setBusy(null)
    if (error) { toast.error('Could not enroll. Please try again.'); return }
    toast.success(`Enrolled in ${code}. You can cancel within 24 hours.`)
    load()
  }
  const cancelOrRemove = async (e: Enrollment) => {
    setBusy(e.course)
    const { error } = await supabase.from('enrollments').delete().eq('id', e.id)
    setBusy(null)
    if (error) { toast.error('The 24-hour window has passed — request a change from the course master.'); return }
    toast.success(e.completed ? 'Course removed.' : 'Enrollment cancelled.')
    load()
  }
  const requestChange = async (code: string) => {
    if (!userId) return
    setBusy(code)
    const { data: masters } = await supabase
      .from('course_assignments').select('user_id')
      .eq('course', code).eq('role_in_course', 'master').limit(1)
    const target = masters?.[0]?.user_id
    if (!target) {
      setBusy(null)
      toast('No master assigned yet — please message the admin.', { icon: 'ℹ️' })
      router.push('/messages'); return
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

  // ── doctor action ──
  const requestTeach = async (c: Course) => {
    if (!userId) return
    setBusy(c.code)
    const { error } = await supabase.from('teach_requests').insert({ doctor_id: userId, course_id: c.id })
    setBusy(null)
    if (error) { toast.error('Could not send the request (maybe already pending).'); return }
    toast.success(`Request sent to the Owner for ${c.code}.`)
    load()
  }

  const actionArea = (c: Course) => {
    const isBusy = busy === c.code
    // Owner / Admin: direct full access
    if (role === 'owner' || role === 'admin') {
      return <Link href={`/courses/${c.code.toLowerCase()}`} style={btnPrimary}>Open</Link>
    }
    // Doctor: request → pending → approved(open)
    if (role === 'doctor') {
      if (myCourses.includes(c.code)) {
        return <Link href={`/courses/${c.code.toLowerCase()}`} style={btnPrimary}>Open · Manage</Link>
      }
      const req = requests.find(r => r.course_id === c.id)
      if (req?.status === 'pending') {
        return <span style={{ ...pill, color: '#f59e0b', borderColor: '#f59e0b' }}><Hourglass size={12} /> Pending approval</span>
      }
      return (
        <button onClick={() => requestTeach(c)} disabled={isBusy} style={btnOutline}>
          {isBusy ? '...' : <><GraduationCap size={13} /> Request to Teach</>}
        </button>
      )
    }
    // Master / Guider: open if assigned
    if (role === 'master' || role === 'guider') {
      return myCourses.includes(c.code)
        ? <Link href={`/courses/${c.code.toLowerCase()}`} style={btnPrimary}>Open</Link>
        : <span style={{ ...pill, color: 'var(--t3)', borderColor: 'var(--br)' }}>Not assigned</span>
    }
    // Student: full enrollment flow
    const e = enrollments.find(i => i.course === c.code)
    if (!e) {
      return <button onClick={() => enroll(c.code)} disabled={isBusy} style={btnPrimary as any}>
        {isBusy ? <Loader2 size={13} className="animate-spin" /> : 'Enroll'}
      </button>
    }
    if (e.completed) {
      return (
        <div style={rowGap}>
          <span style={{ ...pill, color: '#10b981', borderColor: '#10b981' }}><CheckCircle2 size={12} /> Completed</span>
          <button onClick={() => cancelOrRemove(e)} disabled={isBusy} style={btnOutline}>{isBusy ? '...' : 'Remove'}</button>
        </div>
      )
    }
    if (editable(e)) {
      return (
        <div style={rowGap}>
          <span style={{ ...pill, color: 'var(--accent)', borderColor: 'var(--accent)' }}><Clock size={12} /> Editable {hoursLeft(e)}h</span>
          <button onClick={() => cancelOrRemove(e)} disabled={isBusy} style={{ ...btnOutline, borderColor: '#ef4444', color: '#ef4444' }}>{isBusy ? '...' : 'Cancel'}</button>
          <Link href={`/courses/${c.code.toLowerCase()}`} style={btnOutline}>Open</Link>
        </div>
      )
    }
    return (
      <div style={rowGap}>
        <span style={{ ...pill, color: 'var(--t3)', borderColor: 'var(--br)' }}><Lock size={11} /> Enrolled</span>
        <button onClick={() => requestChange(c.code)} disabled={isBusy} style={btnOutline}>
          {isBusy ? '...' : <><MessageSquare size={12} /> Request change</>}
        </button>
        <Link href={`/courses/${c.code.toLowerCase()}`} style={btnPrimary}>Open</Link>
      </div>
    )
  }

  if (!semId || semId < 1 || semId > 8) {
    return <div style={center}>This semester doesn't exist.</div>
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '28px 16px 60px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--t3)', fontSize: 13, textDecoration: 'none', marginBottom: 18 }}>
          <ArrowLeft size={14} /> All semesters
        </Link>
        <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--t)', marginBottom: 4 }}>
          Semester {semId}
        </h1>
        <p style={{ color: 'var(--t3)', fontSize: 13.5, marginBottom: 24 }}>
          {isStudent ? 'Enroll in your courses. You can cancel within 24 hours.' :
           role === 'doctor' ? 'Request to teach a course — the Owner will review your request.' :
           'Courses in this semester.'}
        </p>

        {loading || authLoading ? (
          <div style={center}><Loader2 size={18} className="animate-spin" /></div>
        ) : courses.length === 0 ? (
          <p style={{ color: 'var(--t3)', fontSize: 14 }}>No courses in this semester yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {courses.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                padding: '15px 18px', borderRadius: 14,
                background: 'var(--s2)', border: '1px solid var(--br)',
              }}>
                <BookOpen size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{c.code}</div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--t)' }}>{c.title}</div>
                </div>
                {actionArea(c)}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

const center: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', color: 'var(--t3)' }
const rowGap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
const pill: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px',
  borderRadius: 8, border: '1px solid', fontSize: 11.5, fontWeight: 700, background: 'transparent',
}
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9,
  background: 'var(--accent)', color: 'white', border: 'none',
  fontSize: 12.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', fontFamily: 'var(--font)',
}
const btnOutline: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9,
  background: 'transparent', color: 'var(--t2)', border: '1px solid var(--br)',
  fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', fontFamily: 'var(--font)',
}
