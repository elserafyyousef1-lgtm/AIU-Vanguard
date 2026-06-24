'use client'
// src/components/layout/TopNav.tsx — landing / marketing top nav (Vanguard reference).
// logo-mark with crimson glow · active link crimson underline (aria-current) · status pill · CTAs.
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import type { ReactNode } from 'react'

interface NavLink { href: string; label: string }

const DEFAULT_LINKS: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/semesters/4', label: 'Courses' },
  { href: '/community', label: 'Community' },
  { href: '/dashboard', label: 'Dashboard' },
]

export function TopNav({ links = DEFAULT_LINKS, active, right }: { links?: NavLink[]; active?: string; right?: ReactNode }) {
  return (
    <nav className="topnav" aria-label="Primary">
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', flexShrink: 0 }}>
        <span style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--void)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, boxShadow: '0 0 0 1px var(--crimson-line), var(--shadow-crimson)' }}>AIU</span>
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
          <strong style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em', color: 'var(--t)' }}>AIU <span style={{ color: 'var(--accent-2)' }}>Vanguard</span></strong>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.3em', color: 'var(--t3)', textTransform: 'uppercase', marginTop: 2 }}>CS Department</span>
        </span>
      </Link>

      <div className="topnav-links">
        {links.map(it => (
          <Link key={it.href} href={it.href} className={`topnav-link ${active === it.href ? 'on' : ''}`} aria-current={active === it.href ? 'page' : undefined}>
            {it.label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {right || (
          <>
            <span className="topnav-status" style={{ gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--t2)', border: '1px solid var(--br)', borderRadius: 999, padding: '7px 13px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 9px var(--accent-green)' }} /> LIVE
            </span>
            <Button href="/login" variant="ghost" size="sm" className="hide-mobile">Sign in</Button>
            <Button href="/login" size="sm" className="hide-mobile">Get started</Button>
            {/* mobile: single clear login path (→ /login also hosts the Register tab) */}
            <Button href="/login" size="sm" className="show-mobile">Sign in</Button>
          </>
        )}
      </div>
    </nav>
  )
}
