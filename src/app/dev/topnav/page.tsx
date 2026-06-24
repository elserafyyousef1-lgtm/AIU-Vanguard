'use client'
// src/app/dev/topnav/page.tsx — internal preview for the landing TopNav. Not linked in nav.
import { TopNav } from '@/components/layout/TopNav'

export default function TopNavPreview() {
  return (
    <>
      <TopNav active="/" />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 20px 200px' }}>
        <div className="sec-kicker">Dev · Landing TopNav</div>
        <h1 className="sec-title" style={{ fontSize: 'clamp(40px,7vw,72px)' }}>AIU <span style={{ color: 'var(--accent-2)' }}>Vanguard</span></h1>
        <p style={{ color: 'var(--t2)', marginTop: 14, maxWidth: 460, fontSize: 16, lineHeight: 1.7 }}>
          Sticky nav with the crimson logo-mark, an active-link underline, a live status pill and CTAs.
          Scroll — it stays pinned. On mobile the links collapse.
        </p>
      </main>
    </>
  )
}
