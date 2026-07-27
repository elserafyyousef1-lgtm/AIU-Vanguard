'use client'
// src/components/ai/ScoreRing.tsx
// The result-screen payoff: an animated SVG score ring (green ≥70 / amber ≥40 /
// accent below), the percentage in a serif face at the centre, score/total below,
// and a pass/fail label. Respects prefers-reduced-motion.
import { useEffect, useState } from 'react'

const SERIF = '"Iowan Old Style", "Palatino Linotype", Georgia, serif'

export function ScoreRing({ pct, score, total, size = 138 }: { pct: number; score: number; total: number; size?: number }) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const col = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : 'var(--accent)'
  const target = circ * (1 - Math.max(0, Math.min(100, pct)) / 100)

  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [off, setOff] = useState(reduce ? target : circ)   // start empty, animate to target
  useEffect(() => { if (!reduce) { const t = setTimeout(() => setOff(target), 60); return () => clearTimeout(t) } else setOff(target) }, [target, reduce])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--s1)" strokeWidth={9} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={9} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={off}
            style={{ transition: reduce ? 'none' : 'stroke-dashoffset 0.95s cubic-bezier(.2,.8,.2,1)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: SERIF, fontSize: size * 0.28, fontWeight: 700, color: 'var(--t)', lineHeight: 1 }}>
            {pct}<span style={{ fontSize: size * 0.13, fontWeight: 700 }}>%</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--t3)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{score} / {total}</div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: col }}>
        {pct >= 70 ? 'ناجح · Pass' : pct >= 40 ? 'قرّبت — كمّل مذاكرة' : 'محتاج مراجعة'}
      </div>
    </div>
  )
}
