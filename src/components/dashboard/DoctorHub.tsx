'use client'
// src/components/dashboard/DoctorHub.tsx — the doctor's WORKFLOW dashboard.
// Answers "what do I need to do now?": grading queue, unpublished results,
// TA management (presets · per-capability toggles · expiry · audited reason),
// and teach-request status. Data is capability-scoped; RLS enforces everything.
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import {
  BookOpen, Users, GraduationCap, Hourglass, CheckCircle2, XCircle,
  ClipboardList, Send, UserCog, ArrowRight, ShieldCheck, Trash2,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

interface CourseRow { id: string; code: string; title: string; students: number; ungraded: number; unpublished: number }
interface Req { id: string; status: string; course: { code: string; title: string } | null }
interface TA {
  id: string; user_id: string; course: string; role_in_course: string
  capabilities: string[]; caps_expire_at: string | null; name: string
}
interface Preset { id: string; name: string; capabilities: string[] }

const DELEGABLE = ['grade', 'content', 'structure', 'post'] as const

export function DoctorHub() {
  const supabase = createClient()
  const { userId } = useAuth()
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [reqs, setReqs] = useState<Req[]>([])
  const [tas, setTas] = useState<TA[]>([])
  const [presets, setPresets] = useState<Preset[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // per-TA editor state
  const [edit, setEdit] = useState<Record<string, { caps: string[]; expiry: string; reason: string }>>({})

  const load = useCallback(async () => {
    if (!userId) return
    const { data: mine } = await supabase
      .from('course_assignments').select('course')
      .eq('user_id', userId).eq('role_in_course', 'doctor')
    const codes = (mine || []).map((r: any) => r.course)
    if (!codes.length) { setCourses([]); setTas([]) } else {
      const [{ data: cs }, { data: en }, { data: taRows }, { data: pr }] = await Promise.all([
        supabase.from('courses').select('id, code, title').in('code', codes),
        supabase.from('enrollments').select('course').in('course', codes),
        supabase.from('course_assignments')
          .select('id, user_id, course, role_in_course, capabilities, caps_expire_at')
          .in('course', codes).in('role_in_course', ['master', 'guider']),
        supabase.from('capability_presets').select('id, name, capabilities').order('name'),
      ])
      const courseIds = (cs || []).map((c: any) => c.id)
      // grading + publish queues
      const { data: asg } = await supabase
        .from('assignments').select('id, course_id, published').in('course_id', courseIds)
      const asgIds = (asg || []).map((a: any) => a.id)
      let subRows: any[] = [], grdRows: any[] = []
      if (asgIds.length) {
        const [s2, g2] = await Promise.all([
          supabase.from('submissions').select('id, assignment_id').in('assignment_id', asgIds),
          supabase.from('grades').select('submission_id').in('assignment_id', asgIds),
        ])
        subRows = s2.data || []; grdRows = g2.data || []
      }
      const gradedSet = new Set(grdRows.map((g: any) => g.submission_id))
      const asgById: Record<string, any> = {}
      ;(asg || []).forEach((a: any) => { asgById[a.id] = a })
      const enCounts: Record<string, number> = {}
      ;(en || []).forEach((e: any) => { enCounts[e.course] = (enCounts[e.course] || 0) + 1 })

      setCourses((cs || []).map((c: any) => ({
        id: c.id, code: c.code, title: c.title,
        students: enCounts[c.code] || 0,
        ungraded: subRows.filter((s: any) => !gradedSet.has(s.id) && asgById[s.assignment_id]?.course_id === c.id).length,
        unpublished: (asg || []).filter((a: any) => a.course_id === c.id && !a.published).length,
      })))

      // TA names
      const taList: TA[] = (taRows || []) as any
      if (taList.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name')
          .in('id', taList.map(t => t.user_id))
        const nameOf: Record<string, string> = {}
        ;(profs || []).forEach((p: any) => { nameOf[p.id] = p.full_name })
        taList.forEach(t => { t.name = nameOf[t.user_id] || 'Unknown' })
      }
      setTas(taList)
      setPresets((pr as any) || [])
    }
    const { data: tr } = await supabase
      .from('teach_requests')
      .select('id, status, course:course_id (code, title)')
      .eq('doctor_id', userId).order('created_at', { ascending: false })
    setReqs((tr as any) || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  const editorFor = (t: TA) => edit[t.id] || {
    caps: t.capabilities || [],
    expiry: t.caps_expire_at ? t.caps_expire_at.slice(0, 10) : '',
    reason: '',
  }
  const setEditor = (id: string, patch: Partial<{ caps: string[]; expiry: string; reason: string }>) =>
    setEdit(prev => ({ ...prev, [id]: { ...editorFor(tas.find(t => t.id === id)!), ...prev[id], ...patch } }))

  const applyPreset = (t: TA, presetId: string) => {
    const p = presets.find(x => x.id === presetId)
    if (p) setEditor(t.id, { caps: p.capabilities.filter(c => (DELEGABLE as readonly string[]).includes(c) || c === 'enrollments') })
  }

  const saveTA = async (t: TA) => {
    const e = editorFor(t)
    setSaving(t.id)
    const { error } = await supabase.rpc('set_course_capabilities', {
      p_user: t.user_id, p_course: t.course,
      p_caps: e.caps,
      p_expires_at: e.expiry ? new Date(e.expiry + 'T23:59:59Z').toISOString() : null,
      p_reason: e.reason || null,
    })
    setSaving(null)
    if (error) { toast.error(error.message || 'Could not save permissions.'); return }
    toast.success(`Permissions updated for ${t.name}.`)
    setEdit(prev => { const n = { ...prev }; delete n[t.id]; return n })
    load()
  }

  const removeTA = async (t: TA) => {
    setSaving(t.id)
    const { error } = await supabase.from('course_assignments').delete().eq('id', t.id)
    setSaving(null)
    if (error) { toast.error('Could not remove.'); return }
    toast.success(`${t.name} removed from ${t.course}.`)
    load()
  }

  const totalUngraded = courses.reduce((a, c) => a + c.ungraded, 0)
  const totalUnpublished = courses.reduce((a, c) => a + c.unpublished, 0)
  const pending = reqs.filter(r => r.status === 'pending').length

  const stat = (icon: any, label: string, value: React.ReactNode, color: string) => (
    <Card padding={18}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--t)', letterSpacing: '-0.02em' }}>{value}</div>
    </Card>
  )

  const statusPill = (st: string) =>
    st === 'pending'  ? <span style={pill('#f59e0b')}><Hourglass size={11} /> Pending</span> :
    st === 'approved' ? <span style={pill('#10b981')}><CheckCircle2 size={11} /> Approved</span> :
                        <span style={pill('#ef4444')}><XCircle size={11} /> Rejected</span>

  return (
    <div className="anim-2">
      {/* ── What needs me now ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 14, marginBottom: 26 }}>
        {loading ? [0, 1, 2, 3].map(i => <StatSkeleton key={i} />) : (
          <>
            {stat(<ClipboardList size={15} />, 'Waiting for grading', totalUngraded, totalUngraded ? '#f59e0b' : '#10b981')}
            {stat(<Send size={15} />, 'Unpublished results', totalUnpublished, totalUnpublished ? 'var(--accent)' : '#10b981')}
            {stat(<UserCog size={15} />, 'Teaching assistants', tas.length, '#8b5cf6')}
            {stat(<GraduationCap size={15} />, 'Pending requests', pending, pending ? '#f59e0b' : '#10b981')}
          </>
        )}
      </div>

      {/* ── Action queues per course ── */}
      <h2 style={h2}>My Courses — action queues</h2>
      {courses.length === 0 ? (
        <div style={emptyBox}>
          <p style={{ color: 'var(--t3)', fontSize: 13.5, marginBottom: 12 }}>
            You don't teach any course yet. Browse semesters and request to teach.
          </p>
          <Button href="/" size="sm" iconRight={<ArrowRight size={14} />}>Browse semesters</Button>
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
              <span style={pill(c.ungraded ? '#f59e0b' : 'var(--t3)')}><ClipboardList size={11} /> {c.ungraded} to grade</span>
              <span style={pill(c.unpublished ? 'var(--accent)' : 'var(--t3)')}><Send size={11} /> {c.unpublished} unpublished</span>
              <span style={pill('var(--t3)')}><Users size={11} /> {c.students}</span>
              <Button href={`/courses/${c.code.toLowerCase()}/gradebook`} size="sm" variant="subtle">Gradebook</Button>
              <Button href={`/courses/${c.code.toLowerCase()}/assignments`} size="sm">Assignments</Button>
            </div>
          ))}
        </div>
      )}

      {/* ── TA management (delegation with presets · expiry · audited reason) ── */}
      {courses.length > 0 && (
        <>
          <h2 style={h2}><ShieldCheck size={17} style={{ verticalAlign: '-3px', marginRight: 6 }} />Teaching assistants & delegation</h2>
          {tas.length === 0 ? (
            <div style={emptyBox}>
              <p style={{ color: 'var(--t3)', fontSize: 13.5 }}>
                No masters or guiders on your courses yet. Assign them from the course page — then delegate
                exactly what each one may do here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 30 }}>
              {tas.map(t => {
                const e = editorFor(t)
                const expired = t.caps_expire_at && new Date(t.caps_expire_at) < new Date()
                return (
                  <div key={t.id} style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 13, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                      <UserCog size={15} style={{ color: '#8b5cf6' }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t)' }}>{t.name}</span>
                      <span style={pill(t.role_in_course === 'master' ? '#8b5cf6' : '#06b6d4')}>{t.role_in_course}</span>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 800 }}>{t.course}</span>
                      {t.caps_expire_at && (
                        <span style={pill(expired ? '#ef4444' : '#f59e0b')}>
                          <Hourglass size={10} /> {expired ? 'expired' : 'until'} {t.caps_expire_at.slice(0, 10)}
                        </span>
                      )}
                      <button onClick={() => removeTA(t)} disabled={saving === t.id} title="Remove from course"
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {/* preset picker */}
                      <select
                        value=""
                        onChange={ev => applyPreset(t, ev.target.value)}
                        style={selectStyle}
                        aria-label="Apply preset"
                      >
                        <option value="" disabled>Preset…</option>
                        {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>

                      {/* capability toggles */}
                      {DELEGABLE.map(cap => {
                        const on = e.caps.includes(cap)
                        return (
                          <button key={cap}
                            onClick={() => setEditor(t.id, { caps: on ? e.caps.filter(c => c !== cap) : [...e.caps, cap] })}
                            style={{
                              padding: '6px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              fontFamily: 'var(--font)',
                              background: on ? 'rgba(139,92,246,0.15)' : 'var(--s3)',
                              border: `1px solid ${on ? '#8b5cf6' : 'var(--br)'}`,
                              color: on ? '#a78bfa' : 'var(--t3)',
                            }}>
                            {cap}
                          </button>
                        )
                      })}

                      <input type="date" value={e.expiry}
                        onChange={ev => setEditor(t.id, { expiry: ev.target.value })}
                        title="Delegation expires (optional)"
                        style={{ ...selectStyle, width: 140 }} />
                      <input value={e.reason} placeholder="Reason (audited)…"
                        onChange={ev => setEditor(t.id, { reason: ev.target.value })}
                        style={{ ...selectStyle, flex: 1, minWidth: 140 }} />
                      <Button size="sm" onClick={() => saveTA(t)} disabled={saving === t.id}>
                        {saving === t.id ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Teach requests ── */}
      {reqs.length > 0 && (
        <>
          <h2 style={h2}>My Teach Requests</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {reqs.map(r => (
              <div key={r.id} style={{ ...rowBox, padding: '11px 15px' }}>
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

// Skeleton stat card — shown while a hub's data loads so it never flashes a false "0".
export function StatSkeleton() {
  return (
    <Card padding={18}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Skeleton w={30} h={30} radius={9} />
        <Skeleton w={92} h={12} radius={6} />
      </div>
      <Skeleton w={54} h={24} radius={7} />
    </Card>
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
const selectStyle: React.CSSProperties = {
  background: 'var(--s3)', border: '1px solid var(--br)', borderRadius: 9,
  color: 'var(--t)', fontSize: 12.5, padding: '7px 10px', fontFamily: 'var(--font)', outline: 'none',
}
const pill = (color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px',
  borderRadius: 8, border: `1px solid ${color}`, color, fontSize: 11, fontWeight: 700,
})
