'use client'
// src/app/loading.tsx — App Router pending-navigation UI.
//
// WHY THIS EXISTS: before this file there was NO loading boundary anywhere, so during a
// pending navigation the router kept the OLD page fully visible until the next route was
// ready — which made a slow/stalled navigation look like "the URL changed but nothing
// happened". This replaces that frozen-old-page with a visible loading state.
//
// IT ALSO DOUBLES AS ON-SCREEN LATENCY INSTRUMENTATION (client-side, zero middleware
// changes): it counts the elapsed loading time and flags an unusually long (likely
// stalled) navigation, so real numbers show on the live preview without DevTools.
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function Loading() {
  const [ms, setMs] = useState(0)

  useEffect(() => {
    const t0 = performance.now()
    const id = setInterval(() => setMs(performance.now() - t0), 100)
    return () => clearInterval(id)
  }, [])

  const s = ms / 1000
  const slow = s >= 3

  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
      <Loader2 size={30} className="animate-spin" style={{ color: 'var(--accent)' }} />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: slow ? '#ff5a72' : 'var(--t3)' }}>
        Loading… {s.toFixed(1)}s
      </div>
      {slow && (
        <div style={{ maxWidth: 400, textAlign: 'center', fontSize: 12.5, lineHeight: 1.55, color: '#ff5a72', fontFamily: 'var(--font-mono)' }}>
          ⚠ This navigation is unusually slow ({s.toFixed(1)}s). If it never finishes, this is
          the stall we are diagnosing — please screenshot this number.
        </div>
      )}
    </div>
  )
}
