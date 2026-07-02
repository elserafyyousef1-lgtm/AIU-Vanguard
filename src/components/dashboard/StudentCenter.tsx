'use client'
// src/components/dashboard/StudentCenter.tsx — full control center:
// semester → courses (counts) → students: remove / move / section / completed / edit name.
// Every action auto-notifies the student via the Phase-4 DB triggers.
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Users, BookOpen, Trash2, ArrowRightLeft, Tag, CheckCircle2, Pencil, Search } from 'lucide-react'

interface Course { code: string; title: string; semester_id: number }
interface Row {
  id: string; user_id: string; course: string; section: string | null; completed: boolean
  student: { full_name: string; student_id: string | null } | null
}

export function StudentCenter() {
  const supabase = createClient()
  const [courses, setCourses] = useState<Course[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [sem, setSem] = useState(4)
  const [openCourse, setOpenCourse] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [allMode, setAllMode] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [idMap, setIdMap] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.rpc('admin_student_ids').then(({ data }) => {
      const m: Record<string, string> = {}
      ;(data || []).forEach((r: any) => { m[r.id] = r.student_id })
      setIdMap(m)
    })
  }, [])

  const loadBase = useCallback(async () => {
    const [{ data: cs }, { data: en }] = await Promise.all([
      supabase.from('courses').select('code, title, semester_id').order('code'),
      supabase.from('enrollments').select('course'),
    ])
    setCourses((cs as any) || [])
    const c: Record<string, number> = {}
    ;(en || []).forEach((e: any) => { c[e.course] = (c[e.course] || 0) + 1 })
    setCounts(c)
  }, [])

  const loadRows = useCallback(async (code: string) => {
    const { data } = await supabase
      .from('enrollments')
      .select('id, user_id, course, section, completed, student:user_id (full_name)')
      .eq('course', code).order('enrolled_at')
    setRows((data as any) || [])
  }, [])

  useEffect(() => { loadBase() }, [loadBase])
  useEffect(() => { if (openCourse) loadRows(openCourse) }, [openCourse, loadRows])
  useEffect(() => {
    if (!allMode) return
    Promise.all([
      supabase.from('profiles').select('id, full_name').eq('role', 'student').order('full_name'),
      supabase.rpc('admin_student_ids'),
    ]).then(([{ data: ps }, { data: ids }]) => {
      const m: Record<string,string> = {}
      ;(ids || []).forEach((r: any) => { m[r.id] = r.student_id })
      setStudents(((ps as any[]) || []).map(p => ({ ...p, student_id: m[p.id] })))
    })
  }, [allMode])

  const refresh = () => { loadBase(); if (openCourse) loadRows(openCourse) }

  const removeStudent = async (r: Row) => {
    if (!confirm(`Remove ${r.student?.full_name || 'this student'} from ${r.course}?`)) return
    const { error } = await supabase.from('enrollments').delete().eq('id', r.id)
    if (error) { toast.error('Could not remove.'); return }
    toast.success('Removed — the student was notified.'); refresh()
  }

  const moveStudent = async (r: Row) => {
    const dest = prompt(`Move to which course code?\nAvailable: ${courses.map(c => c.code).join(', ')}`, '')?.trim().toUpperCase()
    if (!dest) return
    if (!courses.find(c => c.code === dest)) { toast.error('Unknown course code.'); return }
    if (dest === r.course) return
    const { error } = await supabase.from('enrollments').update({ course: dest }).eq('id', r.id)
    if (error) { toast.error('Could not move (maybe already enrolled there).'); return }
    toast.success(`Moved to ${dest} — the student was notified.`); refresh()
  }

  const setSection = async (r: Row) => {
    const sec = prompt('Section (leave empty to clear):', r.section || '')
    if (sec === null) return
    const { error } = await supabase.from('enrollments').update({ section: sec.trim() || null }).eq('id', r.id)
    if (error) { toast.error('Could not update the section.'); return }
    toast.success('Section updated — the student was notified.'); refresh()
  }

  const toggleCompleted = async (r: Row) => {
    const { error } = await supabase.from('enrollments').update({ completed: !r.completed }).eq('id', r.id)
    if (error) { toast.error('Could not update.'); return }
    toast.success(!r.completed ? 'Marked completed.' : 'Completion removed.'); refresh()
  }

  const editName = async (r: Row) => {
    const name = prompt('Student full name:', r.student?.full_name || '')?.trim()
    if (!name || name.length < 3) return
    const { error } = await supabase.from('profiles').update({ full_name: name }).eq('id', r.user_id)
    if (error) { toast.error('Could not update the name.'); return }
    toast.success('Name updated — the student was notified.'); refresh()
  }

  const semCourses = courses.filter(c => c.semester_id === sem)

  return (
    <section style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 16, padding: 22, marginTop: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: 'var(--t)' }}>
          <Users size={16} style={{ color: 'var(--accent)' }} /> Student Management Center
        </h2>
        <button onClick={() => { setAllMode(!allMode); setOpenCourse(null) }} style={tabBtn(allMode)}>
          {allMode ? 'Back to courses' : 'All students'}
        </button>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 16 }}>
        {allMode ? 'Every registered student on the platform.' : 'Pick a semester, open a course, manage its students.'}
      </p>

      {allMode ? (
        <>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--t3)' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search students..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', borderRadius: 10, background: 'var(--s3)', border: '1px solid var(--br)', color: 'var(--t)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 320, overflowY: 'auto' }}>
            {students.filter(s => (s.full_name || '').toLowerCase().includes(q.toLowerCase())).map(s => (
              <div key={s.id} style={rowStyle}>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--t)' }}>{s.full_name}</span>
                <span style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{idMap[s.id] || '—'}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {[1,2,3,4,5,6,7,8].map(n => (
              <button key={n} onClick={() => { setSem(n); setOpenCourse(null) }} style={tabBtn(sem === n)}>S{n}</button>
            ))}
          </div>

          {semCourses.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--t3)' }}>No courses in Semester {sem} yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {semCourses.map(c => (
                <div key={c.code}>
                  <button onClick={() => setOpenCourse(openCourse === c.code ? null : c.code)}
                    style={{ ...rowStyle, width: '100%', cursor: 'pointer', textAlign: 'left', background: openCourse === c.code ? 'rgba(224,38,75,0.08)' : 'var(--s3)' }}>
                    <BookOpen size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{c.code}</span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--t)' }}>{c.title}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--t2)' }}>
                      <Users size={12} /> {counts[c.code] || 0}
                    </span>
                  </button>

                  {openCourse === c.code && (
                    <div style={{ margin: '6px 0 10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {rows.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: 'var(--t3)', padding: '4px 0' }}>No students enrolled.</p>
                      ) : rows.map(r => (
                        <div key={r.id} style={{ ...rowStyle, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 130 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t)' }}>{r.student?.full_name || '—'}</div>
                            <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
                              {idMap[r.user_id] || ''} {r.section ? `· Sec ${r.section}` : ''} {r.completed ? '· ✓ Completed' : ''}
                            </div>
                          </div>
                          <button title="Edit name" onClick={() => editName(r)} style={iconBtn('var(--t2)')}><Pencil size={13} /></button>
                          <button title="Section" onClick={() => setSection(r)} style={iconBtn('var(--accent)')}><Tag size={13} /></button>
                          <button title={r.completed ? 'Unmark completed' : 'Mark completed'} onClick={() => toggleCompleted(r)} style={iconBtn('#10b981')}><CheckCircle2 size={13} /></button>
                          <button title="Move to another course" onClick={() => moveStudent(r)} style={iconBtn('#f59e0b')}><ArrowRightLeft size={13} /></button>
                          <button title="Remove from course" onClick={() => removeStudent(r)} style={iconBtn('#ef4444')}><Trash2 size={13} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 13px', borderRadius: 11,
  background: 'var(--s3)', border: '1px solid var(--br)',
}
const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: '6px 13px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'var(--font)',
  background: active ? 'var(--accent)' : 'var(--s3)',
  color: active ? 'white' : 'var(--t2)',
  border: active ? '1px solid var(--accent)' : '1px solid var(--br)',
})
const iconBtn = (color: string): React.CSSProperties => ({
  width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: '1px solid var(--br)', color, cursor: 'pointer', flexShrink: 0,
})
