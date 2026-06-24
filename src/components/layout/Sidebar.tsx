'use client'
// src/components/layout/Sidebar.tsx — app sidebar contents (brand + nav + user).
// Shared by the desktop/tablet <aside> and the mobile drawer. Pure UI (data via props).
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import type { ReactNode } from 'react'

export interface NavItem { href: string; label: string; icon: ReactNode; section?: string }
export interface SidebarUser { name: string; role?: string; avatarUrl?: string | null }

export function Sidebar({ items, active, user, onNavigate, onLogout }: {
  items: NavItem[]
  active?: string
  user?: SidebarUser
  onNavigate?: () => void
  onLogout?: () => void
}) {
  let lastSection: string | undefined
  return (
    <nav aria-label="Main" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 12px' }}>
      {/* Brand */}
      <Link href="/" onClick={onNavigate} className="side-link" style={{ marginBottom: 12, gap: 11 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12.5, flexShrink: 0, boxShadow: '0 0 0 1px var(--crimson-line), var(--shadow-crimson)' }}>AIU</span>
        <span className="side-brand-text">
          <strong style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t)' }}>AIU <span style={{ color: 'var(--accent-2)' }}>Vanguard</span></strong>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.22em', color: 'var(--t3)', textTransform: 'uppercase', marginTop: 2 }}>CS Hub</span>
        </span>
      </Link>

      {/* Links */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((it) => {
          const showSection = it.section && it.section !== lastSection
          lastSection = it.section || lastSection
          const on = active === it.href
          return (
            <div key={it.href}>
              {showSection && <div className="side-section">{it.section}</div>}
              <Link href={it.href} onClick={onNavigate} className={`side-link ${on ? 'on' : ''}`} aria-current={on ? 'page' : undefined} title={it.label}>
                <span className="ic">{it.icon}</span>
                <span className="nav-label">{it.label}</span>
              </Link>
            </div>
          )
        })}
      </div>

      {/* User */}
      {user && (
        <div className="side-user">
          <span style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, overflow: 'hidden' }}>
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user.name || 'U')[0].toUpperCase()}
          </span>
          <span className="side-user-text">
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
            {user.role && <span style={{ display: 'block', fontSize: 11, color: 'var(--t3)' }}>{user.role}</span>}
          </span>
          {onLogout && (
            <button onClick={onLogout} aria-label="Log out" className="side-logout"><LogOut size={16} /></button>
          )}
        </div>
      )}
    </nav>
  )
}
