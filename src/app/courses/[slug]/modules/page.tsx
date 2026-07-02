'use client'
// src/app/courses/[slug]/modules/page.tsx
// ───────────────────────────────────────────────────────────
// Canvas-style course modules: weeks → items (lecture/file/video/…).
// Staff (owner/admin or assigned doctor/master/guider) can add weeks,
// upload PDFs (auto-indexed for the AI tutor via RAG), and add links.
// Students get read-only access. Functional layout only — visual
// polish is a later phase.
// ───────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { SiteNav } from '@/components/layout/SiteNav'
import { COURSES } from '@/lib/data/courses'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, FileText, Video, Link as LinkIcon, BookOpen,
  ChevronDown, ChevronRight, Loader2, Upload, GraduationCap, GripVertical,
} from 'lucide-react'

const ICON: Record<string, any> = {
  lecture: FileText, section: BookOpen, slide: FileText, file: FileText,
  video: Video, lab: BookOpen, quiz: GraduationCap, assignment: GraduationCap,
  page: FileText, link: LinkIcon, discussion: FileText,
}

export default function CourseModulesPage() {
  const params = useParams()
  const slug = String(params?.slug || '').toUpperCase()
  const supabase = createClient()
  const { isAdmin, myCourses, userId, loading: authLoading } = useAuth()

  const [course, setCourse] = useState<{ id: string; code: string; title: string } | null>(null)
  const [weeks, setWeeks] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const canManage = isAdmin || myCourses.includes(slug)
  const meta = COURSES[slug]

  const load = useCallback(async () => {
    const { data: c } = await supabase.from('courses').select('id, code, title').eq('code', slug).single()
    if (!c) { setLoading(false); return }
    setCourse(c as any)
    const { data: w } = await supabase.from('weeks').select('*').eq('course_id', (c as any).id).order('order_index')
    let m: any[] = []
    const ids = (w || []).map((x: any) => x.id)
    if (ids.length) {
      const { data: md } = await supabase.from('modules').select('*').in('week_id', ids).order('order_index')
      m = md || []
    }
    setWeeks(w || [])
    setModules(m)
    const o: Record<string, boolean> = {}
    ;(w || []).forEach((x: any) => { o[x.id] = true })
    setOpen(o)
    setLoading(false)
  }, [slug])

  useEffect(() => { load() }, [load])

  const addWeek = async () => {
    if (!course) return
    const title = prompt('Week title (e.g. "Week 1: Introduction"):')
    if (!title?.trim()) return
    const { error } = await supabase.from('weeks').insert({ course_id: course.id, title: title.trim(), order_index: weeks.length })
    if (error) return toast.error('Could not add the week (check your permissions).')
    toast.success('Week added.'); load()
  }

  const delWeek = async (id: string) => {
    if (!confirm('Delete this week and everything inside it?')) return
    const { error } = await supabase.from('weeks').delete().eq('id', id)
    if (error) return toast.error('Could not delete.')
    load()
  }

  const delModule = async (id: string) => {
    if (!confirm('Delete this item?')) return
    const { error } = await supabase.from('modules').delete().eq('id', id)
    if (error) return toast.error('Could not delete.')
    load()
  }

  const uploadPdf = async (weekId: string, file: File | null) => {
    if (!file || !course) return
    if (file.type !== 'application/pdf') return toast.error('PDF files only for now.')
    if (file.size > 20 * 1024 * 1024) return toast.error('Max 20 MB.')
    setBusy(true)
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${course.id}/${Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage.from('course-materials').upload(path, file)
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('course-materials').getPublicUrl(path)
      const count = modules.filter(m => m.week_id === weekId).length
      const title = file.name.replace(/\.pdf$/i, '')
      const { data: mod, error } = await supabase.from('modules')
        .insert({ week_id: weekId, title, type: 'file', file_url: pub.publicUrl, order_index: count, created_by: userId })
        .select().single()
      if (error) throw error
      toast.success('Uploaded. Indexing for the AI tutor…')
      // Fire-and-forget: index the PDF so the tutor can answer from it (RAG).
      fetch('/api/documents/ingest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course: slug, title, fileUrl: pub.publicUrl, moduleId: (mod as any).id }),
      }).then(r => r.json()).then(j => { if (j?.ok) toast.success(`AI indexed ${j.chunksStored} sections`) }).catch(() => {})
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const addLink = async (weekId: string) => {
    const title = prompt('Item title:')
    if (!title?.trim()) return
    const url = prompt('Link URL (https://...):')
    if (!url?.trim()) return
    const count = modules.filter(m => m.week_id === weekId).length
    const { error } = await supabase.from('modules')
      .insert({ week_id: weekId, title: title.trim(), type: 'link', file_url: url.trim(), order_index: count, created_by: userId })
    if (error) return toast.error('Could not add.')
    toast.success('Added.'); load()
  }

  // Generic insert + type-specific helpers (video / quiz / assignment)
  const addModule = async (weekId: string, fields: Record<string, any>) => {
    const count = modules.filter(m => m.week_id === weekId).length
    const { error } = await supabase.from('modules')
      .insert({ week_id: weekId, order_index: count, created_by: userId, ...fields })
    if (error) return toast.error('Could not add (check your permissions).')
    toast.success('Added.'); load()
  }
  const addVideo = async (weekId: string) => {
    const title = prompt('Video title:'); if (!title?.trim()) return
    const url = prompt('Video URL (YouTube or Vimeo):'); if (!url?.trim()) return
    addModule(weekId, { title: title.trim(), type: 'video', file_url: url.trim() })
  }
  const addQuiz = async (weekId: string) => {
    const title = prompt('Quiz title:'); if (!title?.trim()) return
    const url = prompt('Quiz link (optional — leave empty to skip):')
    addModule(weekId, { title: title.trim(), type: 'quiz', file_url: url?.trim() || null })
  }
  const addAssignment = async (weekId: string) => {
    const title = prompt('Assignment title:'); if (!title?.trim()) return
    const body = prompt('Instructions / description (optional):')
    addModule(weekId, { title: title.trim(), type: 'assignment', body: body?.trim() || null })
  }
  const videoEmbedUrl = (url?: string | null): string | null => {
    if (!url) return null
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`
    const vm = url.match(/vimeo\.com\/(\d+)/)
    if (vm) return `https://player.vimeo.com/video/${vm[1]}`
    return null
  }

  // ── Drag & drop reordering (staff only) — native HTML5, persists order_index ──
  const [dragWeek, setDragWeek] = useState<string | null>(null)
  const [dragModule, setDragModule] = useState<{ weekId: string; id: string } | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const reorder = (arr: any[], fromId: string, toId: string) => {
    const from = arr.findIndex(x => x.id === fromId)
    const to = arr.findIndex(x => x.id === toId)
    if (from < 0 || to < 0 || from === to) return null
    const copy = arr.slice()
    const [moved] = copy.splice(from, 1)
    copy.splice(to, 0, moved)
    return copy
  }
  const persistOrder = async (table: 'weeks' | 'modules', ordered: any[]) => {
    await Promise.all(ordered.map((it, i) => supabase.from(table).update({ order_index: i }).eq('id', it.id)))
  }
  const dropWeek = async (targetId: string) => {
    const src = dragWeek; setDragWeek(null); setDragOver(null)
    if (!src || src === targetId) return
    const next = reorder(weeks, src, targetId)
    if (!next) return
    setWeeks(next)                                       // optimistic
    await persistOrder('weeks', next)
  }
  const dropModule = async (weekId: string, targetId: string) => {
    const src = dragModule; setDragModule(null); setDragOver(null)
    if (!src || src.weekId !== weekId || src.id === targetId) return
    const weekMods = modules.filter(m => m.week_id === weekId)
    const next = reorder(weekMods, src.id, targetId)
    if (!next) return
    setModules([...modules.filter(m => m.week_id !== weekId), ...next])   // optimistic
    await persistOrder('modules', next)
  }

  if (loading || authLoading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
        <SiteNav />
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80, color: 'var(--t3)' }}><Loader2 className="animate-spin" /></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
        <SiteNav />
        <main style={{ maxWidth: 760, margin: '0 auto', padding: 40, color: 'var(--t2)' }}>This course isn’t set up yet.</main>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <SiteNav />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: meta?.color || 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{course.code} · Modules</div>
          <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 800, color: 'var(--t)' }}>{course.title}</h1>
          <p style={{ color: 'var(--t2)', marginTop: 6, fontSize: 14 }}>
            {canManage
              ? 'Add weeks and upload materials. PDFs are auto-indexed so the AI tutor can answer from them.'
              : 'Course materials, organised by week.'}
          </p>
        </div>

        {canManage && <button onClick={addWeek} style={btnPrimary}><Plus size={15} /> Add week</button>}

        {weeks.length === 0 ? (
          <div style={{ marginTop: 20, padding: 40, textAlign: 'center', color: 'var(--t3)', border: '1px dashed var(--br)', borderRadius: 14 }}>
            No weeks yet.{canManage ? ' Add the first one above.' : ''}
          </div>
        ) : (
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {weeks.map(w => {
              const items = modules.filter(m => m.week_id === w.id)
              const isOpen = open[w.id]
              return (
                <div key={w.id}
                  onDragOver={(e) => { if (dragWeek && dragWeek !== w.id) { e.preventDefault(); setDragOver(w.id) } }}
                  onDrop={(e) => { if (dragWeek) { e.preventDefault(); dropWeek(w.id) } }}
                  style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 14, overflow: 'hidden',
                    outline: dragOver === w.id && dragWeek ? '2px solid var(--accent)' : 'none', outlineOffset: -1,
                    opacity: dragWeek === w.id ? 0.5 : 1, transition: 'opacity .15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', cursor: 'pointer' }} onClick={() => setOpen(o => ({ ...o, [w.id]: !o[w.id] }))}>
                    {canManage && (
                      <span
                        draggable
                        onClick={(e) => e.stopPropagation()}
                        onDragStart={(e) => { setDragWeek(w.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', w.id) }}
                        onDragEnd={() => { setDragWeek(null); setDragOver(null) }}
                        style={{ cursor: 'grab', color: 'var(--t3)', display: 'flex' }}
                        title="Drag to reorder week"
                      ><GripVertical size={15} /></span>
                    )}
                    {isOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                    <span style={{ fontWeight: 700, color: 'var(--t)', flex: 1 }}>{w.title}</span>
                    <span style={{ fontSize: 12, color: 'var(--t3)' }}>{items.length} items</span>
                    {canManage && <button onClick={(e) => { e.stopPropagation(); delWeek(w.id) }} style={iconBtn} title="Delete week"><Trash2 size={14} /></button>}
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--br)', padding: '8px 8px 12px' }}>
                      {items.length === 0 && <div style={{ padding: '10px 12px', color: 'var(--t3)', fontSize: 13 }}>No items yet.</div>}
                      {items.map(m => {
                        const Icon = ICON[m.type] || FileText
                        const embed = m.type === 'video' ? videoEmbedUrl(m.file_url) : null
                        return (
                          <div key={m.id}>
                          <div
                            onDragOver={(e) => { if (dragModule && dragModule.weekId === w.id && dragModule.id !== m.id) { e.preventDefault(); e.stopPropagation(); setDragOver(m.id) } }}
                            onDrop={(e) => { if (dragModule?.weekId === w.id) { e.preventDefault(); e.stopPropagation(); dropModule(w.id, m.id) } }}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '10px 12px', borderRadius: 10,
                              opacity: dragModule?.id === m.id ? 0.4 : 1,
                              boxShadow: dragOver === m.id && dragModule ? 'inset 0 2px 0 var(--accent)' : 'none' }}>
                            {canManage && (
                              <span
                                draggable
                                onDragStart={(e) => { setDragModule({ weekId: w.id, id: m.id }); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', m.id) }}
                                onDragEnd={() => { setDragModule(null); setDragOver(null) }}
                                style={{ cursor: 'grab', color: 'var(--t3)', display: 'flex', flexShrink: 0, marginTop: 2 }}
                                title="Drag to reorder"
                              ><GripVertical size={14} /></span>
                            )}
                            <Icon size={16} style={{ color: meta?.color || 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {m.file_url && m.type !== 'video'
                                ? <a href={m.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--t)', textDecoration: 'none', fontSize: 14 }}>{m.title}</a>
                                : <span style={{ color: 'var(--t)', fontSize: 14 }}>{m.title}</span>}
                              {m.body && <p style={{ fontSize: 12.5, color: 'var(--t3)', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.body}</p>}
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', flexShrink: 0, marginTop: 2 }}>{m.type}</span>
                            {canManage && <button onClick={() => delModule(m.id)} style={iconBtn} title="Delete"><Trash2 size={13} /></button>}
                          </div>
                          {embed && (
                            <div style={{ padding: '2px 12px 10px 42px' }}>
                              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--br)' }}>
                                <iframe src={embed} title={m.title} allowFullScreen
                                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} />
                              </div>
                            </div>
                          )}
                          </div>
                        )
                      })}
                      {canManage && (
                        <div style={{ display: 'flex', gap: 8, padding: '8px 12px 4px', flexWrap: 'wrap' }}>
                          <label style={{ ...btnGhost, cursor: busy ? 'wait' : 'pointer' }}>
                            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload PDF
                            <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={busy}
                              onChange={e => { uploadPdf(w.id, e.target.files?.[0] || null); e.target.value = '' }} />
                          </label>
                          <button onClick={() => addLink(w.id)} style={btnGhost}><LinkIcon size={14} /> Link</button>
                          <button onClick={() => addVideo(w.id)} style={btnGhost}><Video size={14} /> Video</button>
                          <button onClick={() => addQuiz(w.id)} style={btnGhost}><GraduationCap size={14} /> Quiz</button>
                          <button onClick={() => addAssignment(w.id)} style={btnGhost}><FileText size={14} /> Assignment</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }
const btnGhost: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, background: 'var(--s3)', color: 'var(--t2)', border: '1px solid var(--br)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)' }
const iconBtn: React.CSSProperties = { display: 'inline-flex', padding: 5, borderRadius: 7, background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer' }
