'use client'
// src/components/ui/ErrorOverlay.tsx
// ───────────────────────────────────────────────────────────
// Defensive, ON-SCREEN error surface (diagnostic instrumentation).
// React error boundaries only catch errors thrown DURING RENDER. They do NOT catch
// errors thrown in event handlers (e.g. a click handler), in async code, or unhandled
// promise rejections — which are the most likely cause of "the UI renders but clicks
// do nothing". This component listens for window 'error' + 'unhandledrejection' and
// paints a loud red banner WITH the full message + stack, so a real failure on the live
// preview is visible immediately without opening DevTools.
//
// Purely additive: renders null unless something actually throws. No app logic touched.
// ───────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'

interface Caught { kind: string; message: string; stack?: string; source?: string }

export function ErrorOverlay() {
  const [errors, setErrors] = useState<Caught[]>([])

  useEffect(() => {
    const push = (c: Caught) => setErrors(prev => (prev.length >= 8 ? prev : [...prev, c]))

    const onError = (e: ErrorEvent) => {
      push({
        kind: 'Runtime error',
        message: e.message || String(e.error?.message || e.error || 'Unknown error'),
        stack: e.error?.stack,
        source: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined,
      })
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      const r: any = e.reason
      let message: string
      try { message = typeof r === 'string' ? r : (r?.message ?? JSON.stringify(r)) }
      catch { message = String(r) }
      push({ kind: 'Unhandled promise rejection', message, stack: r?.stack })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  if (errors.length === 0) return null

  return (
    <div
      role="alert"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2147483647,
        maxHeight: '55vh', overflowY: 'auto',
        background: '#b3091f', color: '#fff',
        borderBottom: '3px solid #ff5a72',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        padding: '12px 16px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <strong style={{ fontSize: 13, letterSpacing: '0.04em' }}>
          ⚠ App error detected ({errors.length}) — please screenshot this
        </strong>
        <button
          onClick={() => setErrors([])}
          style={{ background: 'rgba(0,0,0,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 7, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', flexShrink: 0 }}
        >Dismiss</button>
      </div>

      {errors.map((e, i) => (
        <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < errors.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
          <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 3 }}>{e.kind}{e.source ? ` · ${e.source}` : ''}</div>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e.message}</div>
          {e.stack && (
            <pre style={{ marginTop: 6, fontSize: 11, lineHeight: 1.5, opacity: 0.9, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 180, overflowY: 'auto' }}>{e.stack}</pre>
          )}
        </div>
      ))}
    </div>
  )
}
