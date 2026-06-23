'use client'
// src/components/dashboard/CourseModal.tsx
// Professional create/edit course modal — fully DB-driven, no manual SQL needed.
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { X, Loader2, Save, Sparkles, Calculator } from 'lucide-react'

export interface CourseRow {
  id?: string
  code: string
  title: string
  semester_id: number
  description?: string | null
  requirements?: string | null
  instructor?: string | null
  credit_hours?: number | null
  color?: string | null
  icon?: string | null
  tags?: string[] | null
  has_ai?: boolean | null
  has_formulas?: boolean | null
}

const COLORS = ['#e0264b', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']
const ICONS = ['📊', '📐', '🤖', '⚙️', '💻', '🧮', '🔬', '📡', '🧠', '🗄️', '🔐', '🌐', '📈', '⚡']

export function CourseModal({ course, onClose, onSaved }: { course: CourseRow | null; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const isEdit = !!course?.id

  const [code, setCode] = useState(course?.code || '')
  const [title, setTitle] = useState(course?.title || '')
  const [semId, setSemId] = useState(course?.semester_id || 4)
  const [description, setDescription] = useState(course?.description || '')
  const [requirements, setRequirements] = useState(course?.requirements || '')
  const [instructor, setInstructor] = useState(course?.instructor || '')
  const [creditHours, setCreditHours] = useState(course?.credit_hours != null ? String(course.credit_hours) : '')
  const [color, setColor] = useState(course?.color || '#e0264b')
  const [icon, setIcon] = useState(course?.icon || '📘')
  const [tags, setTags] = useState((course?.tags || []).join(', '))
  const [hasAi, setHasAi] = useState(course?.has_ai ?? true)
  const [hasFormulas, setHasFormulas] = useState(course?.has_formulas ?? false)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const c = code.trim().toUpperCase()
    const t = title.trim()
    if (!isEdit && !/^[A-Z]{2,4}[0-9]{2,4}$/.test(c)) return toast.error('Code must look like CSE221 / MAT312.')
    if (t.length < 3) return toast.error('Title must be at least 3 characters.')

    let credit: number | null = null
    if (creditHours.trim()) {
      const n = parseInt(creditHours, 10)
      if (isNaN(n) || n < 0 || n > 12) return toast.error('Credit hours must be a number 0–12.')
      credit = n
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return toast.error('Pick a valid colour (hex like #e0264b).')

    const tagArr = tags.split(',').map(s => s.trim()).filter(Boolean).slice(0, 12)
    const payload = {
      title: t,
      semester_id: semId,
      description: description.trim() || null,
      requirements: requirements.trim() || null,
      instructor: instructor.trim() || null,
      credit_hours: credit,
      color,
      icon: icon.trim() || '📘',
      tags: tagArr,
      has_ai: hasAi,
      has_formulas: hasFormulas,
    }

    setBusy(true)
    const res = isEdit
      ? await supabase.from('courses').update(payload).eq('id', course!.id as string)
      : await supabase.from('courses').insert({ code: c, ...payload })
    setBusy(false)

    if (res.error) {
      toast.error(isEdit ? 'Could not save changes.' : 'Could not create (maybe the code already exists).')
      return
    }
    toast.success(isEdit ? 'Course updated.' : `${c} created — live everywhere now.`)
    onSaved()
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(580px,100%)', background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 18,
        boxShadow: '0 30px 90px rgba(0,0,0,0.6)', animation: 'scaleIn 0.2s var(--ease-spring) both',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--br)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--t)' }}>{isEdit ? `Edit ${course!.code}` : 'Create Course'}</h2>
          <button onClick={onClose} style={iconBtn} aria-label="Close"><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Field label="Course Code" flex="1 1 120px">
              <input value={code} disabled={isEdit} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="CSE221"
                style={{ ...inp, opacity: isEdit ? 0.55 : 1, cursor: isEdit ? 'not-allowed' : 'text' }} />
            </Field>
            <Field label="Semester" flex="0 1 130px">
              <select value={semId} onChange={e => setSemId(parseInt(e.target.value))} style={{ ...inp, cursor: 'pointer' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>Semester {n}</option>)}
              </select>
            </Field>
            <Field label="Credit Hours" flex="0 1 110px">
              <input value={creditHours} onChange={e => setCreditHours(e.target.value)} placeholder="3" inputMode="numeric" style={inp} />
            </Field>
          </div>

          <Field label="Title"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Database Systems" style={inp} /></Field>
          <Field label="Instructor"><input value={instructor} onChange={e => setInstructor(e.target.value)} placeholder="Dr. Abdallah Hassan" style={inp} /></Field>
          <Field label="Description"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What this course covers…" style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} /></Field>
          <Field label="Requirements"><textarea value={requirements} onChange={e => setRequirements(e.target.value)} rows={2} placeholder="Prerequisites, tools, expectations…" style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} /></Field>
          <Field label="Tags (comma-separated)"><input value={tags} onChange={e => setTags(e.target.value)} placeholder="SQL, Normalization, ER Diagrams" style={inp} /></Field>

          <Field label="Color">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} title={c}
                  style={{ width: 28, height: 28, borderRadius: 8, background: c, border: color === c ? '2px solid var(--t)' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
              <input value={color} onChange={e => setColor(e.target.value)} style={{ ...inp, width: 104, fontFamily: 'var(--font-mono)' }} />
            </div>
          </Field>

          <Field label="Icon">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {ICONS.map(e => (
                <button key={e} onClick={() => setIcon(e)}
                  style={{ width: 34, height: 34, borderRadius: 8, fontSize: 18, background: icon === e ? 'var(--s4)' : 'var(--s3)', border: icon === e ? '1px solid var(--accent)' : '1px solid var(--br)', cursor: 'pointer' }}>{e}</button>
              ))}
              <input value={icon} onChange={e => setIcon(e.target.value)} maxLength={4} style={{ ...inp, width: 60, textAlign: 'center' }} />
            </div>
          </Field>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Toggle label="Has AI Tutor" icon={<Sparkles size={14} />} on={hasAi} set={setHasAi} />
            <Toggle label="Has Formulas" icon={<Calculator size={14} />} on={hasFormulas} set={setHasFormulas} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--br)', position: 'sticky', bottom: 0, background: 'var(--s2)' }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={save} disabled={busy} style={btnPrimary}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {isEdit ? 'Save changes' : 'Create course'}
          </button>
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

function Toggle({ label, icon, on, set }: { label: string; icon: React.ReactNode; on: boolean; set: (v: boolean) => void }) {
  return (
    <button onClick={() => set(!on)} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10,
      background: on ? 'rgba(224,38,75,0.12)' : 'var(--s3)', border: on ? '1px solid var(--accent-br)' : '1px solid var(--br)',
      color: on ? 'var(--accent)' : 'var(--t2)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
    }}>
      {icon} {label} <span style={{ fontSize: 11, opacity: 0.85 }}>{on ? 'ON' : 'OFF'}</span>
    </button>
  )
}

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, background: 'var(--s3)', border: '1px solid var(--br)', color: 'var(--t)', fontSize: 13.5, fontFamily: 'var(--font)', outline: 'none' }
const iconBtn: React.CSSProperties = { display: 'flex', padding: 6, borderRadius: 8, background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 10, background: 'var(--s3)', border: '1px solid var(--br)', color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }
