'use client'
// src/app/courses/[slug]/assignments/page.tsx
// Staff: create/edit/delete/publish (Step 2.2). Students: view published + submit (Step 2.3).
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Loader2, Clock, FileText, Eye, EyeOff, CheckCircle2, AlertTriangle, Award, Upload, ClipboardCheck } from 'lucide-react'
import { AssignmentModal, type AssignmentRow } from '@/components/course/AssignmentModal'
import { SubmissionModal, type SubmissionRow } from '@/components/course/SubmissionModal'
import { GradingPanel } from '@/components/course/GradingPanel'

export default function CourseAssignmentsPage() {
  const params = useParams()
  const slug = String(params?.slug || '').toUpperCase()
  const supabase = createClient()
  const { isAdmin, myCourses, userId, loading: authLoading } = useAuth()

  const [course, setCourse] = useState<{ id: string; code: string; title: string; color: string } | null>(null)
  const [items, setItems] = useState<AssignmentRow[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [subs, setSubs] = useState<Record<string, SubmissionRow>>({})
  const [grades, setGrades] = useState<Record<string, { score: number | null; feedback: string | null }>>({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ a: AssignmentRow | null } | null>(null)
  const [subModal, setSubModal] = useState<AssignmentRow | null>(null)
  const [gradingAsg, setGradingAsg] = useState<AssignmentRow | null>(null)

  const canManage = isAdmin || myCourses.includes(slug)

  const load = useCallback(async () => {
    const { data: c } = await supabase.from('courses').select('id, code, title, color').eq('code', slug).single()
    if (!c) { setLoading(false); return }
    setCourse({ id: (c as any).id, code: (c as any).code, title: (c as any).title, color: (c as any).color || '#e0264b' })

    const [{ data: a }, { data: cat }] = await Promise.all([
      supabase.from('assignments').select('*').eq('course_id', (c as any).id).order('created_at', { ascending: false }),
      supabase.from('grade_categories').select('id, name').eq('course_id', (c as any).id).order('order_index'),
    ])
    const list = (a as any[]) || []
    setItems(list)
    setCategories((cat as any) || [])

    const manage = isAdmin || myCourses.includes(slug)
    if (!manage && list.length) {
      const ids = list.map(x => x.id)
      const [{ data: ss }, { data: gg }] = await Promise.all([
        supabase.from('submissions').select('*').in('assignment_id', ids),
        supabase.from('grades').select('assignment_id, score, feedback').in('assignment_id', ids),
      ])
      const sm: Record<string, SubmissionRow> = {}; (ss as any[] || []).forEach(s => { sm[s.assignment_id] = s })
      const gm: Record<string, any> = {}; (gg as any[] || []).forEach(g => { gm[g.assignment_id] = g })
      setSubs(sm); setGrades(gm)
    }
    setLoading(false)
  }, [slug, isAdmin, myCourses])

  useEffect(() => { if (!authLoading) load() }, [authLoading, load])

  const del = async (id: string) => {
    if (!confirm('Delete this assignment? Submissions and grades will be removed too.')) return
    const { error } = await supabase.from('assignments').delete().eq('id', id)
    if (error) return toast.error('Could not delete.')
    toast.success('Deleted.'); load()
  }
  const togglePublish = async (a: AssignmentRow) => {
    const { error } = await supabase.from('assignments').update({ published: !a.published }).eq('id', a.id as string)
    if (error) return toast.error('Could not update.')
    toast.success(a.published ? 'Unpublished.' : 'Published — students notified.'); load()
  }

  const fmtDate = (iso?: string | null) => iso ? new Date(iso).toLocaleString('en-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null
  const overdue = (iso?: string | null) => !!iso && new Date(iso) < new Date()
  const catName = (id?: string | null) => categories.find(c => c.id === id)?.name

  if (loading || authLoading) {
    return <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}><Navbar /><div style={{ display: 'flex', justifyContent: 'center', padding: 80, color: 'var(--t3)' }}><Loader2 className="animate-spin" /></div></div>
  }
  if (!course) {
    return <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}><Navbar /><main style={{ maxWidth: 760, margin: '0 auto', padding: 40, color: 'var(--t2)' }}>This course isn’t set up yet.</main></div>
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: course.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{course.code} · Assignments</div>
            <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 800, color: 'var(--t)' }}>{course.title}</h1>
          </div>
          {canManage && (
            <button onClick={() => setModal({ a: null })} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              <Plus size={15} /> Create Assignment
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)', border: '1px dashed var(--br)', borderRadius: 14 }}>
            No assignments yet.{canManage ? ' Create the first one above.' : ''}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(a => {
              const sub = subs[a.id as string]
              const grade = grades[a.id as string]
              return (
                <div key={a.id} style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, opacity: a.published ? 1 : 0.72 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: course.color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: course.color, flexShrink: 0 }}>
                    <FileText size={17} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: 'var(--t)', fontSize: 14.5 }}>{a.title}</span>
                      {!a.published && canManage && <span style={pill('var(--t3)')}>Draft</span>}
                      {a.kind && a.kind !== 'assignment' && <span style={pill(course.color)}>{a.kind}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 5, fontSize: 12.5, color: 'var(--t3)' }}>
                      <span>{a.max_points} pts</span>
                      {catName(a.category_id) && <span>· {catName(a.category_id)}</span>}
                      {a.due_at && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: overdue(a.due_at) ? '#ef4444' : 'var(--t3)' }}>
                          <Clock size={12} /> Due {fmtDate(a.due_at)}
                        </span>
                      )}
                      {/* Student status */}
                      {!canManage && grade && grade.score != null && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 700 }}><Award size={12} /> {grade.score}/{a.max_points}</span>
                      )}
                      {!canManage && (!grade || grade.score == null) && sub && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: sub.is_late ? '#ef4444' : '#10b981' }}>
                          {sub.is_late ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />} {sub.is_late ? 'Submitted (late)' : 'Submitted'}
                        </span>
                      )}
                      {!canManage && !sub && !grade && (
                        <span style={{ color: 'var(--t3)' }}>· Not submitted</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {canManage ? (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                      <button onClick={() => setGradingAsg(a)} title="Grade submissions" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, background: 'var(--s3)', border: '1px solid var(--br)', color: 'var(--t)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}><ClipboardCheck size={13} /> Grade</button>
                      <button onClick={() => togglePublish(a)} title={a.published ? 'Unpublish' : 'Publish'} style={iconBtn(a.published ? '#10b981' : 'var(--t3)')}>{a.published ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                      <button onClick={() => setModal({ a })} title="Edit" style={iconBtn('var(--t2)')}><Pencil size={13} /></button>
                      <button onClick={() => del(a.id as string)} title="Delete" style={iconBtn('#ef4444')}><Trash2 size={13} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setSubModal(a)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: sub ? 'var(--s3)' : 'var(--accent)', color: sub ? 'var(--t2)' : 'white', border: sub ? '1px solid var(--br)' : 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>
                      {sub ? 'View' : <><Upload size={13} /> Submit</>}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {modal && course && (
        <AssignmentModal assignment={modal.a} courseId={course.id} categories={categories} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}
      {subModal && userId && (
        <SubmissionModal
          assignment={subModal}
          submission={subs[subModal.id as string] || null}
          grade={grades[subModal.id as string] || null}
          studentId={userId}
          onClose={() => setSubModal(null)}
          onSaved={() => { setSubModal(null); load() }}
        />
      )}
      {gradingAsg && (
        <GradingPanel assignment={gradingAsg} onClose={() => setGradingAsg(null)} onSaved={() => {}} />
      )}
    </div>
  )
}

const pill = (color: string): React.CSSProperties => ({ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color, border: `1px solid ${color}`, borderRadius: 6, padding: '2px 7px' })
const iconBtn = (color: string): React.CSSProperties => ({ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--br)', color, cursor: 'pointer' })
