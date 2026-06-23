'use client'
// src/components/course/AssignmentModal.tsx — create/edit an assignment (staff).
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { X, Loader2, Save, Sparkles } from 'lucide-react'

export interface AssignmentRow {
  id?: string
  course_id: string
  category_id?: string | null
  title: string
  instructions?: string | null
  kind?: string
  max_points?: number
  submission_type?: string
  allowed_file_types?: string[] | null
  max_file_size_mb?: number | null
  available_at?: string | null
  due_at?: string | null
  allow_late?: boolean | null
  late_penalty_percent?: number | null
  published?: boolean | null
}

const KINDS = ['assignment', 'quiz', 'exam', 'project']
const SUB_TYPES = [
  { v: 'file', l: 'File upload' },
  { v: 'text', l: 'Text entry' },
  { v: 'both', l: 'File + Text' },
  { v: 'none', l: 'No submission (offline)' },
]

const pad = (n: number) => String(n).padStart(2, '0')
const toLocal = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null)

export function AssignmentModal({
  assignment, courseId, categories, onClose, onSaved,
}: {
  assignment: AssignmentRow | null
  courseId: string
  categories: { id: string; name: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const isEdit = !!assignment?.id

  const [title, setTitle] = useState(assignment?.title || '')
  const [instructions, setInstructions] = useState(assignment?.instructions || '')
  const [kind, setKind] = useState(assignment?.kind || 'assignment')
  const [categoryId, setCategoryId] = useState(assignment?.category_id || '')
  const [maxPoints, setMaxPoints] = useState(assignment?.max_points != null ? String(assignment.max_points) : '100')
  const [subType, setSubType] = useState(assignment?.submission_type || 'file')
  const [allowedTypes, setAllowedTypes] = useState((assignment?.allowed_file_types || []).join(', '))
  const [maxSize, setMaxSize] = useState(assignment?.max_file_size_mb != null ? String(assignment.max_file_size_mb) : '20')
  const [availableAt, setAvailableAt] = useState(toLocal(assignment?.available_at))
  const [dueAt, setDueAt] = useState(toLocal(assignment?.due_at))
  const [allowLate, setAllowLate] = useState(assignment?.allow_late ?? true)
  const [latePenalty, setLatePenalty] = useState(assignment?.late_penalty_percent != null ? String(assignment.late_penalty_percent) : '0')
  const [published, setPublished] = useState(assignment?.published ?? false)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const t = title.trim()
    if (t.length < 3) return toast.error('Title must be at least 3 characters.')
    const pts = parseFloat(maxPoints)
    if (isNaN(pts) || pts <= 0) return toast.error('Max points must be greater than 0.')
    const penalty = latePenalty.trim() ? parseFloat(latePenalty) : 0
    if (isNaN(penalty) || penalty < 0 || penalty > 100) return toast.error('Late penalty must be 0–100.')
    const size = maxSize.trim() ? parseInt(maxSize, 10) : 20
    const avail = fromLocal(availableAt)
    const due = fromLocal(dueAt)
    if (avail && due && new Date(due) < new Date(avail)) return toast.error('Due date must be after the available date.')

    const payload = {
      category_id: categoryId || null,
      title: t,
      instructions: instructions.trim() || null,
      kind,
      max_points: pts,
      submission_type: subType,
      allowed_file_types: allowedTypes.split(',').map(s => s.trim().replace(/^\./, '')).filter(Boolean),
      max_file_size_mb: size,
      available_at: avail,
      due_at: due,
      allow_late: allowLate,
      late_penalty_percent: penalty,
      published,
    }

    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    const res = isEdit
      ? await supabase.from('assignments').update(payload).eq('id', assignment!.id as string)
      : await supabase.from('assignments').insert({ course_id: courseId, created_by: user?.id, ...payload })
    setBusy(false)

    if (res.error) { toast.error('Could not save (check your permissions).'); return }
    toast.success(isEdit ? 'Assignment saved.' : published ? 'Assignment created & published.' : 'Assignment saved as draft.')
    onSaved()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(600px,100%)', background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 18, boxShadow: '0 30px 90px rgba(0,0,0,0.6)', animation: 'scaleIn 0.2s var(--ease-spring) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--br)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--t)' }}>{isEdit ? 'Edit Assignment' : 'Create Assignment'}</h2>
          <button onClick={onClose} style={iconBtn} aria-label="Close"><X size={18} /></button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Title"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Assignment 1 — Normalization" style={inp} /></Field>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Field label="Type" flex="1 1 130px">
              <select value={kind} onChange={e => setKind(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {KINDS.map(k => <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Category" flex="1 1 150px">
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="">Uncategorized</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Max Points" flex="0 1 110px"><input value={maxPoints} onChange={e => setMaxPoints(e.target.value)} inputMode="decimal" style={inp} /></Field>
          </div>

          <Field label="Instructions"><textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={3} placeholder="What students should do…" style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} /></Field>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Field label="Submission" flex="1 1 170px">
              <select value={subType} onChange={e => setSubType(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {SUB_TYPES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>
            {(subType === 'file' || subType === 'both') && (
              <>
                <Field label="Allowed types" flex="1 1 150px"><input value={allowedTypes} onChange={e => setAllowedTypes(e.target.value)} placeholder="pdf, docx, zip" style={inp} /></Field>
                <Field label="Max size (MB)" flex="0 1 110px"><input value={maxSize} onChange={e => setMaxSize(e.target.value)} inputMode="numeric" style={inp} /></Field>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Field label="Available from" flex="1 1 200px"><input type="datetime-local" value={availableAt} onChange={e => setAvailableAt(e.target.value)} style={inp} /></Field>
            <Field label="Due date" flex="1 1 200px"><input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} style={inp} /></Field>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Toggle label="Allow late" on={allowLate} set={setAllowLate} />
            {allowLate && (
              <Field label="Late penalty %" flex="0 1 130px"><input value={latePenalty} onChange={e => setLatePenalty(e.target.value)} inputMode="decimal" style={inp} /></Field>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: published ? 'rgba(224,38,75,0.1)' : 'var(--s3)', border: published ? '1px solid var(--accent-br)' : '1px solid var(--br)' }}>
            <Sparkles size={16} style={{ color: published ? 'var(--accent)' : 'var(--t3)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: 'var(--t)', fontSize: 13.5 }}>{published ? 'Published' : 'Draft'}</div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>{published ? 'Visible to enrolled students + they get notified.' : 'Hidden from students until you publish.'}</div>
            </div>
            <Toggle label={published ? 'Published' : 'Publish'} on={published} set={setPublished} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--br)', position: 'sticky', bottom: 0, background: 'var(--s2)' }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={save} disabled={busy} style={btnPrimary}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {isEdit ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: string }) {
  return (
    <div style={{ flex, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  )
}
function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button onClick={() => set(!on)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10, background: on ? 'rgba(224,38,75,0.12)' : 'var(--s3)', border: on ? '1px solid var(--accent-br)' : '1px solid var(--br)', color: on ? 'var(--accent)' : 'var(--t2)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
      {label} <span style={{ fontSize: 11, opacity: 0.85 }}>{on ? 'ON' : 'OFF'}</span>
    </button>
  )
}

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, background: 'var(--s3)', border: '1px solid var(--br)', color: 'var(--t)', fontSize: 13.5, fontFamily: 'var(--font)', outline: 'none' }
const iconBtn: React.CSSProperties = { display: 'flex', padding: 6, borderRadius: 8, background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 10, background: 'var(--s3)', border: '1px solid var(--br)', color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }
