'use client'
// src/components/course/SubmissionModal.tsx — student views an assignment and submits.
// Files go to the PRIVATE `submissions` bucket; only the path is stored; viewing uses signed URLs.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { X, Loader2, Upload, FileText, Download, Clock, CheckCircle2, AlertTriangle, Award } from 'lucide-react'
import type { AssignmentRow } from './AssignmentModal'

export interface SubmissionRow {
  id?: string
  assignment_id: string
  file_url?: string | null   // storage PATH (private)
  file_name?: string | null
  text_answer?: string | null
  is_late?: boolean | null
  submitted_at?: string | null
  attempt?: number | null
}

export function SubmissionModal({
  assignment, submission, grade, studentId, onClose, onSaved,
}: {
  assignment: AssignmentRow
  submission: SubmissionRow | null
  grade: { score: number | null; feedback: string | null } | null
  studentId: string
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [text, setText] = useState(submission?.text_answer || '')
  const [file, setFile] = useState<File | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const st = assignment.submission_type || 'file'
  const notOpenYet = !!assignment.available_at && new Date(assignment.available_at) > new Date()
  const pastDue = !!assignment.due_at && new Date(assignment.due_at) < new Date()
  const closed = pastDue && !assignment.allow_late
  const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' }) : null

  // Signed URL for the already-submitted file (private bucket).
  useEffect(() => {
    if (submission?.file_url) {
      supabase.storage.from('submissions').createSignedUrl(submission.file_url, 3600)
        .then(({ data }) => setSignedUrl(data?.signedUrl || null))
    }
  }, [submission?.file_url])

  const submit = async () => {
    if (notOpenYet) return toast.error('This assignment is not open yet.')
    if (closed) return toast.error('The due date has passed and late submission is off.')
    if (st === 'file' && !file && !submission?.file_url) return toast.error('Please attach a file.')
    if (st === 'text' && !text.trim()) return toast.error('Please write your answer.')
    if (st === 'both' && !file && !submission?.file_url && !text.trim()) return toast.error('Attach a file or write an answer.')

    let path = submission?.file_url || null
    let fname = submission?.file_name || null

    if (file) {
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      const allowed = (assignment.allowed_file_types || []).map(t => t.toLowerCase())
      if (allowed.length && !allowed.includes(ext)) return toast.error(`Allowed types: ${allowed.join(', ')}`)
      const maxMb = assignment.max_file_size_mb || 20
      if (file.size > maxMb * 1024 * 1024) return toast.error(`File too large (max ${maxMb} MB).`)
    }

    setBusy(true)
    try {
      if (file) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        path = `${assignment.id}/${studentId}/${Date.now()}-${safe}`   // {assignment}/{student}/... → matches RLS
        const { error: upErr } = await supabase.storage.from('submissions').upload(path, file)
        if (upErr) throw upErr
        fname = file.name
      }
      const payload = { file_url: path, file_name: fname, text_answer: text.trim() || null, is_late: pastDue }
      const res = submission?.id
        ? await supabase.from('submissions').update(payload).eq('id', submission.id)
        : await supabase.from('submissions').insert({ assignment_id: assignment.id, student_id: studentId, ...payload })
      if (res.error) throw res.error
      toast.success(pastDue ? 'Submitted (late).' : 'Submitted!')
      onSaved()
    } catch (e: any) {
      toast.error(e?.message || 'Could not submit. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px,100%)', background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 18, boxShadow: '0 30px 90px rgba(0,0,0,0.6)', animation: 'scaleIn 0.2s var(--ease-spring) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--br)' }}>
          <h2 style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--t)', paddingRight: 12 }}>{assignment.title}</h2>
          <button onClick={onClose} style={iconBtn} aria-label="Close"><X size={18} /></button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--t3)' }}>
            <span>{assignment.max_points} pts</span>
            {assignment.due_at && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: pastDue ? '#ef4444' : 'var(--t3)' }}><Clock size={12} /> Due {fmt(assignment.due_at)}</span>}
          </div>

          {assignment.instructions && (
            <div style={{ background: 'var(--s3)', border: '1px solid var(--br)', borderRadius: 12, padding: 14, fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{assignment.instructions}</div>
          )}

          {/* Grade (if returned) */}
          {grade && grade.score != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <Award size={18} style={{ color: '#10b981' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: 'var(--t)' }}>Grade: {grade.score} / {assignment.max_points}</div>
                {grade.feedback && <div style={{ fontSize: 12.5, color: 'var(--t2)', marginTop: 2, whiteSpace: 'pre-wrap' }}>{grade.feedback}</div>}
              </div>
            </div>
          )}

          {/* Current submission */}
          {submission && (submission.file_url || submission.text_answer) && (
            <div style={{ border: '1px solid var(--br)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--t)' }}>
                <CheckCircle2 size={15} style={{ color: '#10b981' }} /> Submitted {fmt(submission.submitted_at)}
                {submission.is_late && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#ef4444' }}><AlertTriangle size={11} /> Late</span>}
                {(submission.attempt || 1) > 1 && <span style={{ fontSize: 11, color: 'var(--t3)' }}>· attempt {submission.attempt}</span>}
              </div>
              {submission.file_name && (
                <a href={signedUrl || undefined} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: signedUrl ? 'var(--accent)' : 'var(--t3)', textDecoration: 'none' }}>
                  <FileText size={15} /> {submission.file_name} {signedUrl && <Download size={13} />}
                </a>
              )}
              {submission.text_answer && <p style={{ fontSize: 13, color: 'var(--t2)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{submission.text_answer}</p>}
            </div>
          )}

          {/* Submit form */}
          {st === 'none' ? (
            <p style={{ fontSize: 13, color: 'var(--t3)' }}>This assignment has no online submission.</p>
          ) : notOpenYet ? (
            <p style={{ fontSize: 13, color: 'var(--t3)' }}>Opens on {fmt(assignment.available_at)}.</p>
          ) : closed ? (
            <p style={{ fontSize: 13, color: '#ef4444' }}>The due date has passed — submissions are closed.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {submission ? 'Resubmit' : 'Your submission'}{pastDue ? ' (will be marked late)' : ''}
              </div>
              {(st === 'text' || st === 'both') && (
                <textarea value={text} onChange={e => setText(e.target.value)} rows={4} placeholder="Write your answer…"
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
              )}
              {(st === 'file' || st === 'both') && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'var(--s3)', border: '1px dashed var(--br)', cursor: 'pointer', color: 'var(--t2)', fontSize: 13.5 }}>
                  <Upload size={16} /> {file ? file.name : 'Choose a file…'}
                  <input type="file" style={{ display: 'none' }}
                    accept={assignment.allowed_file_types?.length ? assignment.allowed_file_types.map(t => '.' + t).join(',') : undefined}
                    onChange={e => setFile(e.target.files?.[0] || null)} />
                </label>
              )}
              {assignment.allowed_file_types?.length ? (
                <p style={{ fontSize: 11.5, color: 'var(--t3)' }}>Allowed: {assignment.allowed_file_types.join(', ')} · max {assignment.max_file_size_mb || 20} MB</p>
              ) : null}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--br)', position: 'sticky', bottom: 0, background: 'var(--s2)' }}>
          <button onClick={onClose} style={btnGhost}>Close</button>
          {st !== 'none' && !notOpenYet && !closed && (
            <button onClick={submit} disabled={busy} style={btnPrimary}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} {submission ? 'Resubmit' : 'Submit'}</button>
          )}
        </div>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, background: 'var(--s3)', border: '1px solid var(--br)', color: 'var(--t)', fontSize: 13.5, fontFamily: 'var(--font)', outline: 'none' }
const iconBtn: React.CSSProperties = { display: 'flex', padding: 6, borderRadius: 8, background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 10, background: 'var(--s3)', border: '1px solid var(--br)', color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }
