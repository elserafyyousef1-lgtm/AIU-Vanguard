'use client'
// src/components/course/GradingPanel.tsx — instructor grades submissions for one assignment.
// Reads submissions (staff RLS), shows file via signed URL, saves score + feedback to `grades`.
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { X, Loader2, Save, FileText, Download, Clock, AlertTriangle, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react'
import type { AssignmentRow } from './AssignmentModal'

interface Sub { id: string; student_id: string; file_url: string | null; file_name: string | null; text_answer: string | null; is_late: boolean | null; submitted_at: string | null; attempt: number | null }
interface Grade { id: string; student_id: string; score: number | null; feedback: string | null }

export function GradingPanel({ assignment, onClose, onSaved }: { assignment: AssignmentRow; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [subs, setSubs] = useState<Sub[]>([])
  const [grades, setGrades] = useState<Record<string, Grade>>({})
  const [names, setNames] = useState<Record<string, string>>({})
  const [signed, setSigned] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<string | null>(null)
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [{ data: ss }, { data: gg }] = await Promise.all([
      supabase.from('submissions').select('*').eq('assignment_id', assignment.id as string).order('submitted_at'),
      supabase.from('grades').select('id, student_id, score, feedback').eq('assignment_id', assignment.id as string),
    ])
    const list = (ss as any[]) || []
    setSubs(list)
    const gm: Record<string, Grade> = {}; (gg as any[] || []).forEach(g => { gm[g.student_id] = g }); setGrades(gm)
    const ids = list.map(s => s.student_id)
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, full_name').in('id', ids)
      const nm: Record<string, string> = {}; (ps as any[] || []).forEach(p => { nm[p.id] = p.full_name }); setNames(nm)
    }
    setLoading(false)
  }, [assignment.id])

  useEffect(() => { load() }, [load])

  const expand = async (s: Sub) => {
    if (open === s.student_id) { setOpen(null); return }
    setOpen(s.student_id)
    const g = grades[s.student_id]
    setScore(g?.score != null ? String(g.score) : '')
    setFeedback(g?.feedback || '')
    if (s.file_url && !signed[s.id]) {
      const { data } = await supabase.storage.from('submissions').createSignedUrl(s.file_url, 3600)
      if (data?.signedUrl) setSigned(prev => ({ ...prev, [s.id]: data.signedUrl }))
    }
  }

  const saveGrade = async (s: Sub) => {
    const sc = parseFloat(score)
    const max = assignment.max_points || 100
    if (isNaN(sc) || sc < 0 || sc > max) return toast.error(`Score must be 0–${max}.`)
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    const existing = grades[s.student_id]
    const payload = { score: sc, feedback: feedback.trim() || null, submission_id: s.id, graded_by: user?.id, graded_at: new Date().toISOString() }
    const res = existing
      ? await supabase.from('grades').update(payload).eq('id', existing.id)
      : await supabase.from('grades').insert({ assignment_id: assignment.id, student_id: s.student_id, ...payload })
    setBusy(false)
    if (res.error) return toast.error('Could not save grade.')
    toast.success('Grade saved — student notified.')
    load(); onSaved()
  }

  const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' }) : null

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(620px,100%)', background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 18, boxShadow: '0 30px 90px rgba(0,0,0,0.6)', animation: 'scaleIn 0.2s var(--ease-spring) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--br)' }}>
          <div>
            <h2 style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--t)' }}>Grade: {assignment.title}</h2>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{subs.length} submission{subs.length === 1 ? '' : 's'} · {assignment.max_points} pts</div>
          </div>
          <button onClick={onClose} style={iconBtn} aria-label="Close"><X size={18} /></button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: 'var(--t3)' }}><Loader2 className="animate-spin" /></div>
          ) : subs.length === 0 ? (
            <p style={{ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 13.5 }}>No submissions yet.</p>
          ) : subs.map(s => {
            const g = grades[s.student_id]
            const isOpen = open === s.student_id
            return (
              <div key={s.id} style={{ border: '1px solid var(--br)', borderRadius: 12, overflow: 'hidden' }}>
                <button onClick={() => expand(s)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--s3)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  {isOpen ? <ChevronDown size={15} style={{ color: 'var(--t3)' }} /> : <ChevronRight size={15} style={{ color: 'var(--t3)' }} />}
                  <span style={{ flex: 1, fontWeight: 700, color: 'var(--t)', fontSize: 13.5 }}>{names[s.student_id] || 'Student'}</span>
                  {s.is_late && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#ef4444' }}><AlertTriangle size={11} /> Late</span>}
                  {g?.score != null
                    ? <span style={{ fontSize: 12.5, fontWeight: 800, color: '#10b981' }}>{g.score}/{assignment.max_points}</span>
                    : <span style={{ fontSize: 11.5, color: 'var(--t3)' }}>Not graded</span>}
                </button>

                {isOpen && (
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--br)' }}>
                    <div style={{ fontSize: 12, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={12} /> Submitted {fmt(s.submitted_at)}{(s.attempt || 1) > 1 ? ` · attempt ${s.attempt}` : ''}
                    </div>
                    {s.file_name && (
                      <a href={signed[s.id] || undefined} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: signed[s.id] ? 'var(--accent)' : 'var(--t3)', textDecoration: 'none' }}>
                        <FileText size={15} /> {s.file_name} {signed[s.id] && <Download size={13} />}
                      </a>
                    )}
                    {s.text_answer && (
                      <div style={{ background: 'var(--s3)', border: '1px solid var(--br)', borderRadius: 10, padding: 12, fontSize: 13, color: 'var(--t2)', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 200, overflowY: 'auto' }}>{s.text_answer}</div>
                    )}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={lbl}>Score (/{assignment.max_points})</label>
                        <input value={score} onChange={e => setScore(e.target.value)} inputMode="decimal" style={{ ...inp, width: 110 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={lbl}>Feedback (visible to student)</label>
                        <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Well done / fix the join…" />
                      </div>
                    </div>
                    <button onClick={() => saveGrade(s)} disabled={busy} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                      {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {g ? 'Update grade' : 'Save grade'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--br)' }}>
          <button onClick={onClose} style={btnGhost}>Done</button>
        </div>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, background: 'var(--s3)', border: '1px solid var(--br)', color: 'var(--t)', fontSize: 13.5, fontFamily: 'var(--font)', outline: 'none' }
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }
const iconBtn: React.CSSProperties = { display: 'flex', padding: 6, borderRadius: 8, background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 10, background: 'var(--s3)', border: '1px solid var(--br)', color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }
