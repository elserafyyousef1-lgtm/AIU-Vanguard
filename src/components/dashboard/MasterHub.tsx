'use client'
// src/components/dashboard/MasterHub.tsx — the master's WORKFLOW dashboard.
// The master owns media & logistics: course structure, the media/AI-knowledge
// library, and enrollment organization. First screen = today's content tasks.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import {
  BookOpen, Users, Layers, FileText, AlertTriangle, CheckCircle2, Clapperboard,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface CourseRow {
  id: string; code: string; title: string
  students: number; weeks: number; docs: number; docsPending: number
}
interface Doc { id: string; course: string; title: string; status: string; created_at: string }

export function MasterHub() {
  const supabase = createClient()
  const { userId } = useAuth()
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [docs, setDocs] = useState<Doc[]>([])

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      const { data: mine } = await supabase
        .from('course_assignments').select('course')
        .eq('user_id', userId).eq('role_in_course', 'master')
      const codes = (mine || []).map((r: any) => r.course)
      if (!codes.length) { setCourses([]); setDocs([]); return }

      const [{ data: cs }, { data: en }, { data: dc }] = await Promise.all([
        supabase.from('courses').select('id, code, title').in('code', codes),
        supabase.from('enrollments').select('course').in('course', codes),
        supabase.from('course_documents')
          .select('id, course, title, status, created_at')
          .in('course', codes).order('created_at', { ascending: false }).limit(8),
      ])
      const courseIds = (cs || []).map((c: any) => c.id)
      const { data: wk } = courseIds.length
        ? await supabase.from('weeks').select('course_id').in('course_id', courseIds)
        : { data: [] as any[] }

      const enCounts: Record<string, number> = {}
      ;(en || []).forEach((e: any) => { enCounts[e.course] = (enCounts[e.course] || 0) + 1 })
      const wkCounts: Record<string, number> = {}
      ;(wk || []).forEach((w: any) => { wkCounts[w.course_id] = (wkCounts[w.course_id] || 0) + 1 })
      const docCounts: Record<string, { total: number; pending: number }> = {}
      ;(dc || []).forEach((d: any) => {
        docCounts[d.course] = docCounts[d.course] || { total: 0, pending: 0 }
        docCounts[d.course].total++
        if (d.status && d.status !== 'ready') docCounts[d.course].pending++
      })

      setCourses((cs || []).map((c: any) => ({
        id: c.id, code: c.code, title: c.title,
        students: enCounts[c.code] || 0,
        weeks: wkCounts[c.id] || 0,
        docs: docCounts[c.code]?.total || 0,
        docsPending: docCounts[c.code]?.pending || 0,
      })))
      setDocs((dc as any) || [])
    }
    load()
  }, [userId])

  const needsStructure = courses.filter(c => c.weeks === 0).length
  const totalStudents = courses.reduce((a, c) => a + c.students, 0)
  const pendingDocs = courses.reduce((a, c) => a + c.docsPending, 0)

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
        {stat(<Layers size={15} />, 'Courses needing structure', needsStructure, needsStructure ? '#f59e0b' : '#10b981')}
        {stat(<FileText size={15} />, 'Docs processing', pendingDocs, pendingDocs ? '#f59e0b' : '#10b981')}
        {stat(<Clapperboard size={15} />, 'Media items', docs.length, '#8b5cf6')}
        {stat(<Users size={15} />, 'Students organized', totalStudents, '#10b981')}
      </div>

      {/* ── Content & organization tasks per course ── */}
      <h2 style={h2}>My Courses — content & logistics</h2>
      {courses.length === 0 ? (
        <div style={emptyBox}>
          <p style={{ color: 'var(--t3)', fontSize: 13.5 }}>No courses assigned to you yet — the course doctor or an admin assigns masters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 30 }}>
          {courses.map(c => (
            <div key={c.code} style={rowBox}>
              <BookOpen size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{c.code}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t)' }}>{c.title}</div>
              </div>
              {c.weeks === 0
                ? <span style={pill('#f59e0b')}><AlertTriangle size={11} /> no structure yet</span>
                : <span style={pill('var(--t3)')}><Layers size={11} /> {c.weeks} weeks</span>}
              <span style={pill('var(--t3)')}><FileText size={11} /> {c.docs} docs</span>
              <span style={pill('var(--t3)')}><Users size={11} /> {c.students}</span>
              <Button href={`/courses/${c.code.toLowerCase()}/modules`} size="sm">Manage content</Button>
            </div>
          ))}
        </div>
      )}

      {/* ── Media / AI-knowledge library ── */}
      {docs.length > 0 && (
        <>
          <h2 style={h2}>Media & AI knowledge — recent uploads</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {docs.map(d => (
              <div key={d.id} style={{ ...rowBox, padding: '11px 15px' }}>
                <FileText size={14} style={{ color: 'var(--t3)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent)' }}>{d.course}</span>
                <span style={{ flex: 1, fontSize: 13.5, color: 'var(--t)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>
                {d.status === 'ready'
                  ? <span style={pill('#10b981')}><CheckCircle2 size={11} /> in AI tutor</span>
                  : <span style={pill('#f59e0b')}>{d.status}</span>}
              </div>
            ))}
          </div>
        </>
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
