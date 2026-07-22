'use client'
// src/components/dashboard/GuiderHub.tsx — the TA's WORKFLOW dashboard.
// First screen answers "what do I need to do now?": submissions waiting for MY
// grading (only when the doctor delegated 'grade'), fresh student questions,
// and community moderation for my courses. Shows my delegation state + expiry.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/lib/store'
import {
  BookOpen, MessageCircle, ClipboardList, Sparkles, Hourglass, ShieldCheck, Send,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatSkeleton } from './DoctorHub'

const timeAgo = (iso: string): string => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  return `${Math.floor(m / 1440)}d`
}

interface MyAssign { course: string; capabilities: string[]; caps_expire_at: string | null }
interface Question { id: string; content: string; created_at: string; author: string; course: string }

export function GuiderHub() {
  const supabase = createClient()
  const { userId } = useAuth()
  const { openAI } = useUIStore()
  const [assigns, setAssigns] = useState<MyAssign[]>([])
  const [ungraded, setUngraded] = useState<Record<string, number>>({})
  const [questions, setQuestions] = useState<Question[]>([])
  const [waiting, setWaiting] = useState(0)      // conversations with an unanswered student message
  const [loading, setLoading] = useState(true)

  const activeCaps = (a: MyAssign) =>
    (!a.caps_expire_at || new Date(a.caps_expire_at) > new Date()) ? (a.capabilities || []) : []
  const canGrade = assigns.some(a => activeCaps(a).includes('grade'))

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      const { data: mine } = await supabase
        .from('course_assignments')
        .select('course, capabilities, caps_expire_at')
        .eq('user_id', userId).eq('role_in_course', 'guider')
      const rows: MyAssign[] = (mine as any) || []
      setAssigns(rows)
      const codes = rows.map(r => r.course)
      if (!codes.length) { setLoading(false); return }

      // grading queue (visible only if the doctor delegated 'grade')
      const gradable = rows.filter(r => activeCaps(r).includes('grade')).map(r => r.course)
      if (gradable.length) {
        const { data: cs } = await supabase.from('courses').select('id, code').in('code', gradable)
        const ids = (cs || []).map((c: any) => c.id)
        if (ids.length) {
          const { data: asg } = await supabase.from('assignments').select('id, course_id').in('course_id', ids)
          const asgIds = (asg || []).map((a: any) => a.id)
          if (asgIds.length) {
            const [{ data: subs }, { data: grds }] = await Promise.all([
              supabase.from('submissions').select('id, assignment_id').in('assignment_id', asgIds),
              supabase.from('grades').select('submission_id').in('assignment_id', asgIds),
            ])
            const graded = new Set((grds || []).map((g: any) => g.submission_id))
            const codeOf: Record<string, string> = {}
            ;(asg || []).forEach((a: any) => {
              const c = (cs || []).find((x: any) => x.id === a.course_id)
              if (c) codeOf[a.id] = c.code
            })
            const counts: Record<string, number> = {}
            ;(subs || []).forEach((s: any) => {
              if (!graded.has(s.id)) {
                const code = codeOf[s.assignment_id]
                if (code) counts[code] = (counts[code] || 0) + 1
              }
            })
            setUngraded(counts)
          }
        }
      }

      // fresh student questions = latest comments on my courses' posts (exclude my own replies)
      const { data: posts } = await supabase
        .from('posts').select('id, course_tag').in('course_tag', codes)
      const postIds = (posts || []).map((p: any) => p.id)
      if (postIds.length) {
        const { data: cm } = await supabase
          .from('comments').select('id, content, created_at, user_id, post_id')
          .in('post_id', postIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(5)
        const authors = [...new Set((cm || []).map((c: any) => c.user_id))]
        const { data: profs } = authors.length
          ? await supabase.from('profiles').select('id, full_name').in('id', authors)
          : { data: [] as any[] }
        const nameOf: Record<string, string> = {}
        ;(profs || []).forEach((p: any) => { nameOf[p.id] = p.full_name })
        const courseOf: Record<string, string> = {}
        ;(posts || []).forEach((p: any) => { courseOf[p.id] = p.course_tag })
        setQuestions((cm || []).map((c: any) => ({
          id: c.id, content: c.content, created_at: c.created_at,
          author: nameOf[c.user_id] || 'Student', course: courseOf[c.post_id] || '',
        })))
      }

      // conversations where a student is WAITING for my reply (unread incoming messages)
      const { data: myConvs } = await supabase
        .from('conversations').select('id').eq('staff_id', userId)
      const convIds = (myConvs || []).map((c: any) => c.id)
      if (convIds.length) {
        const { data: unread } = await supabase
          .from('messages').select('conversation_id')
          .in('conversation_id', convIds).neq('sender_id', userId).is('read_at', null)
        setWaiting(new Set((unread || []).map((m: any) => m.conversation_id)).size)
      }
      setLoading(false)
    }
    load()
  }, [userId])

  const totalUngraded = Object.values(ungraded).reduce((a, b) => a + b, 0)
  const firstCourse = assigns[0]?.course

  const stat = (icon: any, label: string, value: React.ReactNode, color: string) => (
    <Card padding={18}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--t)', letterSpacing: '-0.02em' }}>{value}</div>
    </Card>
  )

  return (
    <div className="anim-2">
      {/* ── What needs me now ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 14, marginBottom: 26 }}>
        {loading ? [0, 1, 2, 3].map(i => <StatSkeleton key={i} />) : (
          <>
            {canGrade && stat(<ClipboardList size={15} />, 'Waiting for my grading', totalUngraded, totalUngraded ? '#f59e0b' : '#10b981')}
            {stat(<MessageCircle size={15} />, 'Student questions', questions.length, questions.length ? '#f59e0b' : '#10b981')}
            <Link href="/messages" style={{ textDecoration: 'none' }}>
              {stat(<Send size={15} />, 'Students waiting', waiting, waiting ? '#f59e0b' : '#10b981')}
            </Link>
            {stat(<BookOpen size={15} />, 'Courses I assist', assigns.length, '#8b5cf6')}
          </>
        )}
      </div>

      {/* ── My delegations ── */}
      <h2 style={h2}><ShieldCheck size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />My courses & permissions</h2>
      {assigns.length === 0 ? (
        <div style={emptyBox}>
          <p style={{ color: 'var(--t3)', fontSize: 13.5 }}>
            You're not assisting any course yet — the course doctor assigns guiders and delegates permissions.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 30 }}>
          {assigns.map(a => {
            const caps = activeCaps(a)
            const expired = a.caps_expire_at && new Date(a.caps_expire_at) < new Date()
            return (
              <div key={a.course} style={rowBox}>
                <BookOpen size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)', minWidth: 70 }}>{a.course}</span>
                <span style={pill('#06b6d4')}>posts & replies</span>
                {caps.includes('grade') && <span style={pill('#8b5cf6')}>grading</span>}
                {caps.includes('content') && <span style={pill('#8b5cf6')}>content</span>}
                {caps.includes('structure') && <span style={pill('#8b5cf6')}>structure</span>}
                {a.caps_expire_at && (
                  <span style={pill(expired ? '#ef4444' : '#f59e0b')}>
                    <Hourglass size={10} /> {expired ? 'delegation expired' : `until ${a.caps_expire_at.slice(0, 10)}`}
                  </span>
                )}
                {caps.includes('grade') && (ungraded[a.course] || 0) > 0 && (
                  <span style={pill('#f59e0b')}><ClipboardList size={11} /> {ungraded[a.course]} to grade</span>
                )}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {caps.includes('grade') && (
                    <Button href={`/courses/${a.course.toLowerCase()}/gradebook`} size="sm" variant="subtle">Grade</Button>
                  )}
                  <Button href={`/community/${a.course.toLowerCase()}`} size="sm">Community</Button>
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Student questions feed ── */}
      {questions.length > 0 && (
        <>
          <h2 style={h2}>Latest student activity — jump in</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 26 }}>
            {questions.map(q => (
              <Link key={q.id} href={`/community/${q.course.toLowerCase()}`} style={{ textDecoration: 'none' }}>
                <div style={{ ...rowBox, padding: '11px 15px', cursor: 'pointer' }}>
                  <MessageCircle size={14} style={{ color: '#06b6d4', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent)' }}>{q.course}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t)' }}>{q.author}:</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.content}</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)', flexShrink: 0 }}>{timeAgo(q.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── AI-first helper ── */}
      {firstCourse && (
        <div style={{ ...rowBox, background: 'linear-gradient(135deg, rgba(224,38,75,0.06), rgba(139,92,246,0.05))' }}>
          <Sparkles size={16} style={{ color: 'var(--accent-2)' }} />
          <span style={{ flex: 1, fontSize: 13.5, color: 'var(--t2)' }}>
            Not sure how to explain something to a student? Draft the answer with Vanguard AI first.
          </span>
          <Button size="sm" onClick={() => openAI(firstCourse)}>Open AI ✦</Button>
        </div>
      )}
    </div>
  )
}

const h2: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: 'var(--t)', marginBottom: 14 }
const rowBox: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap',
  background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 13, padding: '13px 16px',
}
const emptyBox: React.CSSProperties = {
  background: 'var(--s2)', border: '1px dashed var(--br)', borderRadius: 14,
  padding: 26, textAlign: 'center', marginBottom: 30,
}
const pill = (color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px',
  borderRadius: 8, border: `1px solid ${color}`, color, fontSize: 11, fontWeight: 700,
})
