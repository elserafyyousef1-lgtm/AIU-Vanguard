'use client'
// src/components/dashboard/AdminHub.tsx — Owner/Admin dashboard:
// live stats, teach requests, full course management (create/edit/delete), Student Center.
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Users, GraduationCap, BookOpen, Hourglass, Plus, Pencil, Trash2, UserCog, ArrowRight } from 'lucide-react'
import { TeachRequests } from '@/components/course/TeachRequests'
import { StudentCenter } from './StudentCenter'
import { CourseModal, type CourseRow } from './CourseModal'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function AdminHub() {
  const supabase = createClient()
  const [stats, setStats] = useState({ students: 0, doctors: 0, courses: 0, pending: 0 })
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [modal, setModal] = useState<{ course: CourseRow | null } | null>(null)

  const load = useCallback(async () => {
    const [st, dr, cs, pd, list] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'doctor'),
      supabase.from('courses').select('id', { count: 'exact', head: true }),
      supabase.from('teach_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('courses')
        .select('id, code, title, semester_id, description, requirements, instructor, credit_hours, color, icon, tags, has_ai, has_formulas')
        .order('semester_id').order('code'),
    ])
    setStats({ students: st.count || 0, doctors: dr.count || 0, courses: cs.count || 0, pending: pd.count || 0 })
    setCourses((list.data as any) || [])
  }, [])

  useEffect(() => { load() }, [load])

  const deleteCourse = async (c: CourseRow) => {
    if (!confirm(`Delete ${c.code} (${c.title})?\nThis removes its enrollments and assignments too.`)) return
    await supabase.from('enrollments').delete().eq('course', c.code)
    await supabase.from('course_assignments').delete().eq('course', c.code)
    const { error } = await supabase.from('courses').delete().eq('id', c.id as string)
    if (error) { toast.error('Could not delete the course.'); return }
    toast.success(`${c.code} deleted.`); load()
  }

  const card = (icon: any, label: string, value: number, color: string) => (
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14, marginBottom: 26 }}>
        {card(<Users size={15} />, 'Students', stats.students, 'var(--accent)')}
        {card(<GraduationCap size={15} />, 'Doctors', stats.doctors, '#10b981')}
        {card(<BookOpen size={15} />, 'Courses', stats.courses, '#8b5cf6')}
        {card(<Hourglass size={15} />, 'Pending Requests', stats.pending, '#f59e0b')}
      </div>

      <Link href="/admin/people" style={{ textDecoration: 'none' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 13, padding: '16px 18px', marginBottom: 26,
          background: 'linear-gradient(90deg, rgba(224,38,75,0.12), rgba(168,19,47,0.08))',
          border: '1px solid var(--accent-br)', borderRadius: 14, cursor: 'pointer',
        }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(224,38,75,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
            <UserCog size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: 'var(--t)', fontSize: 15 }}>People &amp; Roles</div>
            <div style={{ fontSize: 12.5, color: 'var(--t2)' }}>Search everyone, change roles, assign masters &amp; guiders to courses</div>
          </div>
          <ArrowRight size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        </div>
      </Link>

      <TeachRequests />

      {/* Course management */}
      <section style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 16, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: 'var(--t)' }}>
            <BookOpen size={16} style={{ color: 'var(--accent)' }} /> Course Management
          </h2>
          <Button onClick={() => setModal({ course: null })} size="sm" icon={<Plus size={14} />}>Create Course</Button>
        </div>

        {courses.length === 0 ? (
          <p style={{ color: 'var(--t3)', fontSize: 13.5 }}>No courses yet — create the first one.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
            {courses.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 13px', borderRadius: 10, background: 'var(--s3)', border: '1px solid var(--br)',
              }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: (c.color || 'var(--accent)') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{c.icon || '📘'}</span>
                <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>S{c.semester_id}</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: c.color || 'var(--accent)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{c.code}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--t)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                {c.has_ai && <span title="AI enabled" style={{ fontSize: 11, color: 'var(--accent)' }}>✦</span>}
                <button title="Edit course" onClick={() => setModal({ course: c })} style={iconBtn('var(--t2)')}><Pencil size={12} /></button>
                <button title="Delete course" onClick={() => deleteCourse(c)} style={iconBtn('#ef4444')}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <StudentCenter />

      {modal && (
        <CourseModal
          course={modal.course}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}

const iconBtn = (color: string): React.CSSProperties => ({
  width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: '1px solid var(--br)', color, cursor: 'pointer', flexShrink: 0,
})
