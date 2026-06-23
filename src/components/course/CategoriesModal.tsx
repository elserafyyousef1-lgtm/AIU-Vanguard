'use client'
// src/components/course/CategoriesModal.tsx — Step 2.6
// Staff-only management of grade_categories (name + weight) for one course.
// Surfaces two data-integrity signals the final-grade function depends on:
//   1. total weight ≠ 100  (the DB function re-normalises, so this is informational, not fatal)
//   2. published assignments with NO category — these are silently excluded from the weighted final.
// Writes go straight to grade_categories (RLS gc_write = staff). No final-grade math lives here.
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { X, Loader2, Plus, Trash2, Check, AlertTriangle, Info } from 'lucide-react'

interface Cat { id?: string; name: string; weight_percent: number }

export function CategoriesModal({ courseId, onClose, onSaved }: { courseId: string; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [cats, setCats] = useState<Cat[]>([])
  const [uncategorized, setUncategorized] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)

  const load = useCallback(async () => {
    const [{ data: gc }, { count }] = await Promise.all([
      supabase.from('grade_categories').select('id, name, weight_percent').eq('course_id', courseId).order('order_index'),
      supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('course_id', courseId).eq('published', true).is('category_id', null),
    ])
    setCats((gc as any[] || []).map(c => ({ id: c.id, name: c.name, weight_percent: Number(c.weight_percent) })))
    setUncategorized(count || 0)
    setLoading(false)
  }, [courseId])

  useEffect(() => { load() }, [load])

  const total = cats.reduce((s, c) => s + (Number(c.weight_percent) || 0), 0)
  const totalOk = Math.abs(total - 100) < 0.001
  const update = (i: number, patch: Partial<Cat>) => setCats(cs => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  const addRow = () => setCats(cs => [...cs, { name: '', weight_percent: 0 }])

  const saveRow = async (i: number) => {
    const c = cats[i]
    if (!c.name.trim()) return toast.error('Category name is required.')
    const w = Number(c.weight_percent)
    if (isNaN(w) || w < 0 || w > 100) return toast.error('Weight must be between 0 and 100.')
    setBusy(i)
    const res = c.id
      ? await supabase.from('grade_categories').update({ name: c.name.trim(), weight_percent: w }).eq('id', c.id)
      : await supabase.from('grade_categories').insert({ course_id: courseId, name: c.name.trim(), weight_percent: w, order_index: i })
    setBusy(null)
    if (res.error) return toast.error('Could not save — check your permissions.')
    toast.success('Saved.'); onSaved(); load()
  }

  const delRow = async (i: number) => {
    const c = cats[i]
    if (!c.id) { setCats(cs => cs.filter((_, j) => j !== i)); return }
    if (!confirm('Delete this category? Its assignments become uncategorized and stop counting toward the weighted final.')) return
    setBusy(i)
    const { error } = await supabase.from('grade_categories').delete().eq('id', c.id)
    setBusy(null)
    if (error) return toast.error('Could not delete.')
    toast.success('Category deleted.'); onSaved(); load()
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={sheet}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t)' }}>Grade Categories &amp; Weights</h2>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 16, lineHeight: 1.6 }}>
          Each category groups assignments and carries a weight. The final grade is the weighted average of the categories
          that have graded work, re-normalised over those weights.
        </p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: 'var(--t3)' }}><Loader2 className="animate-spin" /></div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {cats.length === 0 && (
                <div style={{ padding: 18, textAlign: 'center', color: 'var(--t3)', border: '1px dashed var(--br)', borderRadius: 12, fontSize: 13 }}>
                  No categories yet. Without categories, the final grade is a simple points average across all graded assignments.
                </div>
              )}
              {cats.map((c, i) => (
                <div key={c.id || `new-${i}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={c.name}
                    onChange={e => update(i, { name: e.target.value })}
                    placeholder="e.g. Quizzes"
                    style={{ ...field, flex: 1 }}
                  />
                  <div style={{ position: 'relative', width: 96, flexShrink: 0 }}>
                    <input
                      type="number" min={0} max={100} step="0.5"
                      value={c.weight_percent}
                      onChange={e => update(i, { weight_percent: e.target.value === '' ? 0 : Number(e.target.value) })}
                      style={{ ...field, width: '100%', boxSizing: 'border-box', paddingRight: 26, textAlign: 'right' }}
                    />
                    <span style={{ position: 'absolute', right: 10, top: 9, color: 'var(--t3)', fontSize: 13 }}>%</span>
                  </div>
                  <button onClick={() => saveRow(i)} disabled={busy === i} title="Save" style={{ ...iconBtn, color: '#10b981' }}>
                    {busy === i ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
                  </button>
                  <button onClick={() => delRow(i)} disabled={busy === i} title="Delete" style={{ ...iconBtn, color: '#ef4444' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>

            <button onClick={addRow} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'var(--s3)', border: '1px solid var(--br)', color: 'var(--t)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', marginBottom: 16 }}>
              <Plus size={15} /> Add category
            </button>

            {/* Total weight */}
            {cats.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'var(--s3)', border: `1px solid ${totalOk ? 'var(--br)' : 'rgba(245,158,11,0.4)'}`, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>Total weight</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: totalOk ? '#10b981' : '#f59e0b' }}>{Number(total.toFixed(2))}%</span>
              </div>
            )}
            {cats.length > 0 && !totalOk && (
              <div style={note('#f59e0b')}>
                <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Weights don’t add up to 100%. That’s allowed — the final is re-normalised over the categories that have grades — but 100% keeps the math intuitive.</span>
              </div>
            )}

            {/* Uncategorized warning */}
            {cats.length > 0 && uncategorized > 0 && (
              <div style={note('#ef4444')}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span><strong>{uncategorized}</strong> published assignment{uncategorized > 1 ? 's have' : ' has'} no category — {uncategorized > 1 ? 'they' : 'it'} will <strong>not</strong> count toward the weighted final. Assign a category on each assignment to include {uncategorized > 1 ? 'them' : 'it'}.</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '8vh 16px 16px', zIndex: 1000, overflowY: 'auto' }
const sheet: React.CSSProperties = { width: '100%', maxWidth: 540, background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 18, padding: 22 }
const iconBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--br)', color: 'var(--t2)', cursor: 'pointer', flexShrink: 0 }
const field: React.CSSProperties = { padding: '9px 12px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--br)', color: 'var(--t)', fontSize: 13.5, fontFamily: 'var(--font)', outline: 'none' }
const note = (color: string): React.CSSProperties => ({ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 13px', borderRadius: 10, background: `${color}14`, border: `1px solid ${color}40`, color: 'var(--t2)', fontSize: 12.5, lineHeight: 1.55, marginBottom: 8 })
