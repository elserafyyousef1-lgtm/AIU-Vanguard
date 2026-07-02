'use client'
// src/app/courses/[slug]/gradebook/page.tsx — Instructor Gradebook (Step 2.5).
// Read-only matrix. Finals come from the authoritative DB function `course_final_grades`
// (depends only on grades + grade_categories). Staff-only.
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { SiteNav } from '@/components/layout/SiteNav'
import { letterGrade, letterColor } from '@/lib/grade-scale'
import { CategoriesModal } from '@/components/course/CategoriesModal'
import { Loader2, Download, Search, ArrowUpDown, SlidersHorizontal } from 'lucide-react'

interface Asg { id: string; title: string; max_points: number }
interface Student { id: string; name: string }

export default function GradebookPage() {
  const params = useParams()
  const slug = String(params?.slug || '').toUpperCase()
  const supabase = createClient()
  const { isAdmin, myCourses, loading: authLoading } = useAuth()
  const canManage = isAdmin || myCourses.includes(slug)

  const [course, setCourse] = useState<{ id: string; code: string; title: string; color: string; grade_scale: any } | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<Asg[]>([])
  const [cells, setCells] = useState<Record<string, number | null>>({})   // `${studentId}|${assignmentId}` → score
  const [finals, setFinals] = useState<Record<string, number | null>>({})  // studentId → final %
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [sortDesc, setSortDesc] = useState(true)
  const [asgFilter, setAsgFilter] = useState('')
  const [showCats, setShowCats] = useState(false)

  const load = useCallback(async () => {
    const { data: c } = await supabase.from('courses').select('id, code, title, color, grade_scale').eq('code', slug).single()
    if (!c) { setLoading(false); return }
    setCourse({ ...(c as any), color: (c as any).color || '#e0264b' })
    const cid = (c as any).id

    const [{ data: enr }, { data: asg }, { data: fin }] = await Promise.all([
      supabase.from('enrollments').select('user_id').eq('course', slug),
      supabase.from('assignments').select('id, title, max_points').eq('course_id', cid).eq('published', true).order('created_at'),
      supabase.rpc('course_final_grades', { p_course_id: cid }),
    ])

    const uids = (enr as any[] || []).map(e => e.user_id)
    let studs: Student[] = []
    if (uids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, full_name, role').in('id', uids)
      studs = (ps as any[] || []).filter(p => p.role === 'student' || p.role === 'rep').map(p => ({ id: p.id, name: p.full_name || 'Student' }))
    }
    setStudents(studs)

    const asgs = (asg as any[] || []).map(a => ({ id: a.id, title: a.title, max_points: Number(a.max_points) }))
    setAssignments(asgs)

    if (asgs.length) {
      const { data: gr } = await supabase.from('grades').select('assignment_id, student_id, score').in('assignment_id', asgs.map(a => a.id))
      const cm: Record<string, number | null> = {}
      ;(gr as any[] || []).forEach(g => { cm[`${g.student_id}|${g.assignment_id}`] = g.score == null ? null : Number(g.score) })
      setCells(cm)
    }
    const fm: Record<string, number | null> = {}
    ;(fin as any[] || []).forEach((f: any) => { fm[f.student_id] = f.final_percent == null ? null : Number(f.final_percent) })
    setFinals(fm)
    setLoading(false)
  }, [slug])

  useEffect(() => { if (!authLoading) load() }, [authLoading, load])

  const rows = useMemo(() => {
    const f = students.filter(s => s.name.toLowerCase().includes(q.trim().toLowerCase()))
    return f.slice().sort((a, b) => {
      const fa = finals[a.id] ?? -1, fb = finals[b.id] ?? -1
      return sortDesc ? fb - fa : fa - fb
    })
  }, [students, q, finals, sortDesc])

  const visibleAsg = asgFilter ? assignments.filter(a => a.id === asgFilter) : assignments

  const exportCsv = () => {
    const header = ['Student', ...visibleAsg.map(a => `${a.title} (/${a.max_points})`), 'Final %', 'Letter']
    const body = rows.map(s => [
      s.name,
      ...visibleAsg.map(a => { const v = cells[`${s.id}|${a.id}`]; return v == null ? '' : String(v) }),
      finals[s.id] != null ? String(finals[s.id]) : '',
      letterGrade(finals[s.id], course?.grade_scale),
    ])
    const csv = [header, ...body].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${course?.code || 'course'}-gradebook.csv`; a.click(); URL.revokeObjectURL(url)
  }

  if (loading || authLoading) {
    return <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}><SiteNav /><div style={{ display: 'flex', justifyContent: 'center', padding: 80, color: 'var(--t3)' }}><Loader2 className="animate-spin" /></div></div>
  }
  if (!course) {
    return <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}><SiteNav /><main style={{ maxWidth: 760, margin: '0 auto', padding: 40, color: 'var(--t2)' }}>This course isn’t set up yet.</main></div>
  }
  if (!canManage) {
    return <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}><SiteNav /><main style={{ maxWidth: 760, margin: '0 auto', padding: 40, color: 'var(--t2)' }}>The gradebook is available to course staff only.</main></div>
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <SiteNav />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: course.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{course.code} · Gradebook</div>
          <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 800, color: 'var(--t)' }}>{course.title}</h1>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--t3)' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search students…" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', borderRadius: 10, background: 'var(--s2)', border: '1px solid var(--br)', color: 'var(--t)', fontSize: 13.5, fontFamily: 'var(--font)', outline: 'none' }} />
          </div>
          <select value={asgFilter} onChange={e => setAsgFilter(e.target.value)} style={ctrl}>
            <option value="">All assignments</option>
            {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
          <button onClick={() => setSortDesc(s => !s)} style={ctrl}><ArrowUpDown size={14} /> Final {sortDesc ? '↓' : '↑'}</button>
          <button onClick={() => setShowCats(true)} style={ctrl}><SlidersHorizontal size={14} /> Weights</button>
          <button onClick={exportCsv} disabled={rows.length === 0} style={{ ...ctrl, background: 'var(--accent)', color: 'white', border: 'none', fontWeight: 700 }}><Download size={14} /> Export CSV</button>
        </div>

        {students.length === 0 ? (
          <div style={empty}>No students enrolled in this course yet.</div>
        ) : assignments.length === 0 ? (
          <div style={empty}>No published assignments yet — publish assignments to populate the gradebook.</div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--br)', borderRadius: 14, background: 'var(--s2)' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, minWidth: 520 }}>
              <thead>
                <tr>
                  <th style={{ ...th, position: 'sticky', left: 0, zIndex: 2, background: 'var(--s3)', textAlign: 'left', minWidth: 160 }}>Student</th>
                  {visibleAsg.map(a => (
                    <th key={a.id} style={th}>{a.title}<div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 500 }}>/{a.max_points}</div></th>
                  ))}
                  <th style={{ ...th, background: 'var(--s4)' }}>Final</th>
                  <th style={{ ...th, background: 'var(--s4)' }}>Letter</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(s => {
                  const fp = finals[s.id]
                  const lt = letterGrade(fp, course.grade_scale)
                  return (
                    <tr key={s.id}>
                      <td style={{ ...td, position: 'sticky', left: 0, zIndex: 1, background: 'var(--s2)', textAlign: 'left', fontWeight: 600, color: 'var(--t)' }}>{s.name}</td>
                      {visibleAsg.map(a => {
                        const v = cells[`${s.id}|${a.id}`]
                        return <td key={a.id} style={{ ...td, color: v == null ? 'var(--t3)' : 'var(--t)' }}>{v == null ? '—' : v}</td>
                      })}
                      <td style={{ ...td, fontWeight: 800, color: 'var(--t)' }}>{fp == null ? '—' : `${fp}%`}</td>
                      <td style={{ ...td, fontWeight: 800, color: letterColor(lt) }}>{lt}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 12 }}>
          Final = current grade from published, graded assignments only (category-weighted via grade_categories). Computed by the database, not the UI.
        </p>
      </main>

      {showCats && course && (
        <CategoriesModal courseId={course.id} onClose={() => setShowCats(false)} onSaved={load} />
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '11px 12px', textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '1px solid var(--br)', whiteSpace: 'nowrap', background: 'var(--s3)' }
const td: React.CSSProperties = { padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--br)', whiteSpace: 'nowrap' }
const ctrl: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, background: 'var(--s2)', border: '1px solid var(--br)', color: 'var(--t)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }
const empty: React.CSSProperties = { padding: 40, textAlign: 'center', color: 'var(--t3)', border: '1px dashed var(--br)', borderRadius: 14, fontSize: 13.5 }
