'use client'
// src/components/ui/WelcomeModal.tsx — first-visit welcome (home page).
// Vanguard identity (crimson + Sora) and copy that matches the live feature set.
import { useEffect, useState } from 'react'
import { useUIStore } from '@/lib/store'
import { X, BookOpen, Users, Sparkles, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { Z } from '@/lib/z'

const FEATURES = [
  { icon: BookOpen, color: 'var(--accent)', title: 'Courses & Modules', desc: 'Lectures, files, videos & assignments — organised by week' },
  { icon: Sparkles, color: 'var(--accent-2)', title: 'AI Tutor ✦', desc: 'Bilingual AI trained on your own course materials' },
  { icon: Users, color: 'var(--accent-green)', title: 'Student Community', desc: 'Post, share & connect with your batch' },
  { icon: BarChart3, color: 'var(--accent-yellow)', title: 'Grades & Progress', desc: 'Track assignments, grades & where you stand' },
]

export function WelcomeModal() {
  const { hasSeenWelcome, setHasSeenWelcome } = useUIStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!hasSeenWelcome) {
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [hasSeenWelcome])

  const close = () => { setVisible(false); setHasSeenWelcome() }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: Z.modal,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, animation: 'fadeIn 0.3s var(--ease-out)',
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div style={{
        width: 'min(480px, 100%)', background: 'var(--s2)', border: '1px solid var(--accent-br)',
        borderRadius: 24, padding: '36px 32px', position: 'relative',
        animation: 'scaleIn 0.3s var(--ease-spring)', boxShadow: 'var(--shadow-lg)',
      }}>
        <button onClick={close} aria-label="Close" style={{
          position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 9,
          background: 'var(--s3)', border: 'none', color: 'var(--t2)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><X size={14} /></button>

        {/* Crimson glow */}
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 220, height: 130, background: 'radial-gradient(circle, var(--crimson-glow), transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 24, boxShadow: 'var(--shadow-crimson)',
          }}>🎓</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent-2)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>Welcome to</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--t)', lineHeight: 1.15 }}>
            AIU <span style={{ color: 'var(--accent-2)' }}>Vanguard</span>
          </h2>
          <p style={{ color: 'var(--t2)', fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>
            Your elite study platform for Alamein International University — Computer Science.
          </p>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: 'var(--s3)', border: '1px solid var(--br)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: `color-mix(in srgb, ${color} 14%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                <Icon size={15} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, color: 'var(--t)' }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/semesters/4" onClick={close} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            Start exploring →
          </Link>
          <button onClick={close} className="btn-subtle">Maybe later</button>
        </div>
      </div>
    </div>
  )
}
