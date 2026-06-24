'use client'
// src/components/layout/AppShell.tsx — the in-app frame.
// Desktop ≥1024: full sidebar. Tablet 768–1023: collapsed icon rail. Mobile <768: top bar + drawer.
// Pure structure — pass nav items + the active href + (optionally) the signed-in user.
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar, type NavItem, type SidebarUser } from './Sidebar'
import { MobileDrawer } from './MobileDrawer'
import type { ReactNode } from 'react'

export function AppShell({ items, active, user, onLogout, children }: {
  items: NavItem[]
  active?: string
  user?: SidebarUser
  onLogout?: () => void
  children: ReactNode
}) {
  const [drawer, setDrawer] = useState(false)
  return (
    <div className="app-shell">
      {/* Desktop / tablet sidebar */}
      <aside className="app-sidebar">
        <Sidebar items={items} active={active} user={user} onLogout={onLogout} />
      </aside>

      <div className="app-main">
        {/* Mobile top bar */}
        <header className="app-topbar">
          <button onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer}
            style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--s2)', border: '1px solid var(--br)', color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Menu size={18} />
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t)' }}>AIU <span style={{ color: 'var(--accent-2)' }}>Vanguard</span></span>
        </header>

        {children}
      </div>

      {/* Mobile drawer */}
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)}>
        <Sidebar items={items} active={active} user={user} onLogout={onLogout} onNavigate={() => setDrawer(false)} />
      </MobileDrawer>
    </div>
  )
}
