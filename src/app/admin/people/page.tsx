'use client'
// src/app/admin/people/page.tsx
// ───────────────────────────────────────────────────────────
// People & Roles — the full Owner/Admin control center.
// • Search by name or student ID (scales to many users)
// • Change anyone's global role (gated by hierarchy + DB-enforced)
// • Assign / unassign people to courses (doctor / master / guider)
// • Owner sees & controls everything (never themselves);
//   Admin can't see the owner and can't grant/revoke admin.
// Protected by middleware: only owner/admin reach /admin/*.
// ───────────────────────────────────────────────────────────
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import toast from 'react-hot-toast'
import {
  Loader2, Shield, Search, ChevronDown, ChevronUp,
  BookOpen, Plus, X, UserCog,
} from 'lucide-react'
import type { UserRole } from '@/types'

const ROLE_COLORS: Record<UserRole, string> = {
  owner: '#f59e0b',
  admin: '#6366f1',
  doctor: '#10b981',
  master: '#8b5cf6',
  guider: '#06b6d4',
  student: 'var(--t3)',
}
const ALL_ROLES: UserRole[] = ['owner', 'admin', 'doctor', 'master', 'guider', 'student']
const COURSE_ROLES = ['doctor', 'master', 'guider'] as const

interface Person { id: string; full_name: string; nickname: string | null; role: UserRole; avatar_url: string | null }
interface Assignment { id: string; user_id: string; course: string; role_in_course: string }
interface Course { code: string; title: string }

const initials = (name: string) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')

export default function PeoplePage() {
  const router = useRouter()
  const supabase = createClient()
  const { loading, isAdmin, isOwner, userId } = useAuth()

  const [people, setPeople] = useState<Person[]>([])
  const [idMap, setIdMap] = useState<Record<string, string>>({})
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [fetching, setFetching] = useState(true)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [draftCourse, setDraftCourse] = useState('')
  const [draftRole, setDraftRole] = useState<string>('master')
  const [err, setErr] = useState<string | null>(null)

  // Guard
  useEffect(() => {
    if (!loading && !isAdmin) router.push('/dashboard')
  }, [loading, isAdmin, router])

  const loadAssignments = useCallback(async () => {
    const { data } = await supabase
      .from('course_assignments')
      .select('id, user_id, course, role_in_course')
    setAssignments((data as any) || [])
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    const load = async () => {
      try {
        const [{ data: profs }, { data: ids }, { data: cs }] = await Promise.all([
          supabase.from('profiles')
            .select('id, full_name, nickname, role, avatar_url')
            .order('created_at', { ascending: true }),
          supabase.rpc('admin_student_ids'),
          supabase.from('courses').select('code, title').order('code'),
        ])
        const m: Record<string, string> = {}
        ;(ids || []).forEach((r: any) => { m[r.id] = r.student_id })
        setIdMap(m)
        setPeople((profs as any) || [])
        setCourses((cs as any) || [])
        if ((cs as any)?.length) setDraftCourse((cs as any)[0].code)
        await loadAssignments()
      } catch {
        setErr('Could not load people. Please refresh the page.')
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [isAdmin, loadAssignments])

  // Owner sees all; admin never sees the owner
  const visible = useMemo(
    () => people.filter(p => isOwner || p.role !== 'owner'),
    [people, isOwner]
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: visible.length }
    visible.forEach(p => { c[p.role] = (c[p.role] || 0) + 1 })
    return c
  }, [visible])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return visible.filter(p => {
      if (roleFilter !== 'all' && p.role !== roleFilter) return false
      if (!q) return true
      const name = (p.full_name || '').toLowerCase()
      const nick = (p.nickname || '').toLowerCase()
      const sid = (idMap[p.id] || '').toLowerCase()
      return name.includes(q) || nick.includes(q) || sid.includes(q)
    })
  }, [visible, roleFilter, search, idMap])

  // ── permissions (mirror the DB rules) ──
  const canEditRole = (p: Person) => {
    if (p.id === userId) return false       // never yourself
    if (p.role === 'owner') return false     // owner is protected
    if (!isOwner && p.role === 'admin') return false // only owner manages admins
    return true
  }
  const assignableRoles: UserRole[] = isOwner
    ? ['student', 'guider', 'master', 'doctor', 'admin']
    : ['student', 'guider', 'master', 'doctor']

  // ── actions ──
  const changeRole = async (id: string, newRole: UserRole) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    if (error) {
      toast.error(/permission|owner|admin/i.test(error.message)
        ? 'You do not have permission for this change.'
        : 'Could not update the role.')
      return
    }
    setPeople(ps => ps.map(p => p.id === id ? { ...p, role: newRole } : p))
    toast.success('Role updated.')
  }

  const addAssignment = async (id: string) => {
    if (!draftCourse) { toast.error('Pick a course first.'); return }
    const dup = assignments.find(a => a.user_id === id && a.course === draftCourse && a.role_in_course === draftRole)
    if (dup) { toast.error('Already assigned with that role.'); return }
    const { error } = await supabase.from('course_assignments').insert({
      user_id: id, course: draftCourse, role_in_course: draftRole, assigned_by: userId,
    })
    if (error) { toast.error('Could not assign (check permissions).'); return }
    toast.success(`Assigned to ${draftCourse} as ${draftRole}.`)
    loadAssignments()
  }

  const removeAssignment = async (a: Assignment) => {
    const { error } = await supabase.from('course_assignments').delete().eq('id', a.id)
    if (error) { toast.error('Could not remove the assignment.'); return }
    toast.success(`Removed from ${a.course}.`)
    loadAssignments()
  }

  if (loading || fetching) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--t3)' }}>
          <Loader2 size={20} className="animate-spin" />
        </div>
      </div>
    )
  }
  if (!isAdmin) return null

  if (err) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
        <Navbar />
        <main style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 14, padding: 26, color: 'var(--t2)', fontSize: 14 }}>
            {err}
          </div>
          <div style={{ marginTop: 20 }}>
            <Link href="/dashboard" style={{ color: 'var(--accent)', fontSize: 14, textDecoration: 'none' }}>← Back to dashboard</Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 20px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Shield size={20} style={{ color: 'var(--accent)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Control Center
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--t)', marginBottom: 6 }}>
          People &amp; Roles
        </h1>
        <p style={{ color: 'var(--t2)', marginBottom: 24 }}>
          {visible.length} {visible.length === 1 ? 'person' : 'people'} · manage roles and course assignments
        </p>

        {/* Role filter chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
          <Chip active={roleFilter === 'all'} color="var(--accent)" onClick={() => setRoleFilter('all')}>
            All {counts.all || 0}
          </Chip>
          {ALL_ROLES.filter(r => isOwner || r !== 'owner').map(r => (
            <Chip key={r} active={roleFilter === r} color={ROLE_COLORS[r]} onClick={() => setRoleFilter(r)}>
              {r} {counts[r] || 0}
            </Chip>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <Search size={15} style={{ position: 'absolute', left: 13, top: 12, color: 'var(--t3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            style={{
              width: '100%', boxSizing: 'border-box', padding: '11px 13px 11px 38px',
              borderRadius: 11, background: 'var(--s2)', border: '1px solid var(--br)',
              color: 'var(--t)', fontSize: 14, fontFamily: 'var(--font)', outline: 'none',
            }}
          />
        </div>

        {/* People list */}
        {filtered.length === 0 ? (
          <div style={{ background: 'var(--s2)', border: '1px dashed var(--br)', borderRadius: 14, padding: 30, textAlign: 'center', color: 'var(--t3)', fontSize: 14 }}>
            No people match your search.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(p => {
              const isSelf = p.id === userId
              const editable = canEditRole(p)
              const mine = assignments.filter(a => a.user_id === p.id)
              const isOpen = expanded === p.id
              return (
                <div key={p.id} style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 14, overflow: 'hidden' }}>
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', flexWrap: 'wrap' }}>
                    {/* Avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: p.avatar_url ? `center/cover url(${p.avatar_url})` : 'var(--s3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--t2)', fontSize: 13, fontWeight: 700,
                      border: '1px solid var(--br)',
                    }}>
                      {!p.avatar_url && initials(p.full_name)}
                    </div>

                    {/* Name + id */}
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <div style={{ fontWeight: 700, color: 'var(--t)', fontSize: 14.5 }}>
                        {p.full_name}
                        {isSelf && <span style={{ color: 'var(--t3)', fontWeight: 400, fontSize: 12 }}> (you)</span>}
                        {p.nickname && <span style={{ color: 'var(--t3)', fontStyle: 'italic', fontWeight: 400, fontSize: 12.5 }}> · {p.nickname}</span>}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--t3)', marginTop: 1 }}>
                        {idMap[p.id] || '—'}
                      </div>
                    </div>

                    {/* Role badge */}
                    <span style={{
                      fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: ROLE_COLORS[p.role], padding: '4px 10px', borderRadius: 7,
                      border: `1px solid ${ROLE_COLORS[p.role]}`,
                    }}>
                      {p.role}
                    </span>

                    {/* Role control */}
                    {editable ? (
                      <select
                        value={p.role}
                        onChange={e => changeRole(p.id, e.target.value as UserRole)}
                        style={{
                          padding: '7px 10px', borderRadius: 9, background: 'var(--s3)',
                          border: '1px solid var(--br)', color: 'var(--t)', fontSize: 13,
                          fontFamily: 'var(--font)', cursor: 'pointer', outline: 'none',
                        }}
                      >
                        {assignableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 11.5, color: 'var(--t3)' }}>
                        {p.role === 'owner' ? 'Protected' : isSelf ? '—' : 'Locked'}
                      </span>
                    )}

                    {/* Expand */}
                    <button
                      onClick={() => { setExpanded(isOpen ? null : p.id); setDraftRole('master'); if (courses[0]) setDraftCourse(courses[0].code) }}
                      title="Course assignments"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 9,
                        background: isOpen ? 'rgba(99,102,241,0.1)' : 'var(--s3)',
                        border: '1px solid var(--br)', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <BookOpen size={13} /> {mine.length}
                      {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>

                  {/* Expanded: assignments */}
                  {isOpen && (
                    <div style={{ padding: '4px 16px 16px', borderTop: '1px solid var(--br)' }}>
                      <div style={{ fontSize: 11.5, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 0 9px' }}>
                        Course assignments
                      </div>
                      {mine.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 12 }}>No course assignments yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
                          {mine.map(a => {
                            const col = ROLE_COLORS[a.role_in_course as UserRole] || 'var(--t3)'
                            return (
                              <span key={a.id} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 8px 5px 11px',
                                borderRadius: 8, background: 'var(--s3)', border: `1px solid ${col}`,
                              }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 12, color: col }}>{a.course}</span>
                                <span style={{ fontSize: 11, color: 'var(--t3)' }}>{a.role_in_course}</span>
                                <button onClick={() => removeAssignment(a)} title="Remove" style={{
                                  display: 'flex', width: 17, height: 17, borderRadius: 5, alignItems: 'center', justifyContent: 'center',
                                  background: 'transparent', border: 'none', color: 'var(--t3)', cursor: 'pointer',
                                }}><X size={12} /></button>
                              </span>
                            )
                          })}
                        </div>
                      )}

                      {/* Assign form */}
                      {courses.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: 'var(--t3)' }}>Add courses first to assign people.</p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                          <select value={draftCourse} onChange={e => setDraftCourse(e.target.value)} style={selStyle}>
                            {courses.map(c => <option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}
                          </select>
                          <select value={draftRole} onChange={e => setDraftRole(e.target.value)} style={selStyle}>
                            {COURSE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button onClick={() => addAssignment(p.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9,
                            background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'var(--font)',
                          }}><Plus size={14} /> Assign</button>
                        </div>
                      )}
                      <p style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <UserCog size={12} /> Tip: set the role above to match their course duty (e.g. role “master” + assigned as master).
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: 26 }}>
          <Link href="/dashboard" style={{ color: 'var(--accent)', fontSize: 14, textDecoration: 'none' }}>
            ← Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}

const selStyle: React.CSSProperties = {
  padding: '9px 11px', borderRadius: 9, background: 'var(--s3)', border: '1px solid var(--br)',
  color: 'var(--t)', fontSize: 13, fontFamily: 'var(--font)', cursor: 'pointer', outline: 'none', maxWidth: 240,
}

function Chip({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 13px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
      fontFamily: 'var(--font)', textTransform: 'capitalize',
      background: active ? color : 'var(--s2)',
      color: active ? (color === 'var(--t3)' ? 'var(--t)' : 'white') : 'var(--t2)',
      border: active ? `1px solid ${color}` : '1px solid var(--br)',
    }}>
      {children}
    </button>
  )
}