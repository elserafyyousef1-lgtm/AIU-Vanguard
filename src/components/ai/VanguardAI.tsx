'use client'
// src/components/ai/VanguardAI.tsx — ONE Vanguard AI, opens from anywhere.
// Decision: instead of hunting for the AI inside each course page, a global ✦ launcher
// lives in the site nav (signed-in users). It reuses the existing AIPanel; the course
// context comes from a small picker (AI-enabled courses from the DB) and the last choice
// is remembered for the tab (uiStore.aiCourse). Course pages keep their own button too.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUIStore } from '@/lib/store'
import { AIPanel } from './AIPanel'
import { Z } from '@/lib/z'

interface AICourse { code: string; title: string }

export function VanguardAI() {
  const { aiOpen, aiCourse, openAI, closeAI } = useUIStore()
  const [picker, setPicker] = useState(false)
  const [courses, setCourses] = useState<AICourse[] | null>(null)
  // The launcher lives inside .sitenav, which has backdrop-filter — that makes the nav the
  // containing block for position:fixed children (the panel rendered pinned inside the 64px
  // bar: unusable). Portal the overlays to <body> so they position against the real viewport.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // AI-enabled courses (fetched once, on first use)
  const loadCourses = async (): Promise<AICourse[]> => {
    if (courses) return courses
    const supabase = createClient()
    const { data } = await supabase
      .from('courses').select('code, title').eq('has_ai', true).order('code')
    const list: AICourse[] = (data as any) || []
    setCourses(list)
    return list
  }

  const launch = async () => {
    if (aiOpen) { closeAI(); return }
    const list = await loadCourses()
    if (aiCourse) { openAI(aiCourse); return }        // remembered choice
    if (list.length === 1) { openAI(list[0].code); return }
    setPicker(true)
  }

  // ESC closes the picker
  useEffect(() => {
    if (!picker) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setPicker(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [picker])

  return (
    <>
      {/* Launcher (rendered inside the nav's util cluster) */}
      <button className="sitenav-icon" onClick={launch} title="Vanguard AI" aria-label="Vanguard AI"
        style={aiOpen ? { color: 'var(--accent-2)', borderColor: 'var(--accent-br)' } : undefined}>
        <Sparkles size={15} />
      </button>

      {/* Course picker (portaled to <body> — see note above) */}
      {mounted && picker && createPortal(
        <div
          onClick={e => e.target === e.currentTarget && setPicker(false)}
          style={{ position: 'fixed', inset: 0, zIndex: Z.modal, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div style={{ width: 'min(380px,100%)', background: 'var(--s2)', border: '1px solid var(--accent-br)', borderRadius: 'var(--r-lg)', padding: 22, animation: 'scaleIn 0.25s var(--ease-spring)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t)' }}>
                <Sparkles size={15} style={{ color: 'var(--accent-2)' }} /> Vanguard AI
              </h3>
              <button onClick={() => setPicker(false)} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--s3)', border: 'none', color: 'var(--t2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 14 }}>Which course do you want to study?</p>
            {(courses || []).length === 0 ? (
              <p style={{ color: 'var(--t3)', fontSize: 13.5, padding: '8px 0' }}>No AI-enabled courses yet.</p>
            ) : (courses || []).map(c => (
              <button key={c.code} onClick={() => { setPicker(false); openAI(c.code) }} style={{
                display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '11px 13px',
                borderRadius: 11, background: 'var(--s3)', border: '1px solid var(--br)',
                cursor: 'pointer', marginBottom: 8, textAlign: 'left', fontFamily: 'var(--font)',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>{c.code}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                <Sparkles size={13} style={{ marginLeft: 'auto', color: 'var(--accent-2)', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* The panel itself (portaled — its fixed overlay must anchor to the viewport, not the nav) */}
      {mounted && aiOpen && aiCourse && createPortal(
        <AIPanel courseSlug={aiCourse} onClose={closeAI} />,
        document.body
      )}
    </>
  )
}
