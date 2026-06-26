'use client'
// src/app/global-error.tsx — root-level React error boundary (App Router).
// Catches errors thrown in the ROOT LAYOUT itself (the last-resort boundary). It replaces
// the whole document, so it must render its own <html>/<body>. Shows the same loud red
// banner. Defensive only — no app logic changed.
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[AIU global error boundary]', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0d0d11', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px' }}>
          <div role="alert" style={{
            width: 'min(760px, 100%)', marginTop: 40,
            background: '#b3091f', color: '#fff', border: '3px solid #ff5a72', borderRadius: 14,
            fontFamily: "ui-monospace, 'JetBrains Mono', monospace", padding: '18px 20px',
            boxShadow: '0 18px 50px rgba(0,0,0,0.5)',
          }}>
            <strong style={{ fontSize: 14, display: 'block', marginBottom: 10 }}>⚠ A fatal error crashed the app — please screenshot this</strong>
            <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{error?.message || 'Unknown error'}</div>
            {error?.digest && <div style={{ fontSize: 11, opacity: 0.85, marginTop: 6 }}>digest: {error.digest}</div>}
            {error?.stack && (
              <pre style={{ marginTop: 10, fontSize: 11, lineHeight: 1.5, opacity: 0.9, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 260, overflowY: 'auto' }}>{error.stack}</pre>
            )}
            <button
              onClick={() => reset()}
              style={{ marginTop: 14, background: 'rgba(0,0,0,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13 }}
            >Try again</button>
          </div>
        </div>
      </body>
    </html>
  )
}
