'use client'
// src/components/layout/AppShell.tsx — the in-app frame.
// Desktop ≥1024: full sidebar. Tablet 768–1023: collapsed icon rail. Mobile <768: top bar + drawer.
//
// A sticky header carries the util cluster (search · online · notifications · theme) on EVERY page
// the shell wraps. useAuth() is called ONCE here, at the container level — it hydrates the user's
// saved settings (sound/notifications/theme) into the store for any wrapped page (dashboard now,
// Courses/Gradebook/Assignments later). The util items read the store / their own minimal state,
// so the cluster adds ZERO duplicate identity queries.
import { useState, useEffect } from 'react'
import { Menu, Command, Sun, Moon } from 'lucide-react'
import { Sidebar, type NavItem, type SidebarUser } from './Sidebar'
import { MobileDrawer } from './MobileDrawer'
import { OnlineCounter } from '@/components/ui/OnlineCounter'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { useUIStore, useUserStore } from '@/lib/store'
import { useAuth } from '@/hooks/useAuth'
import type { ReactNode } from 'react'

export function AppShell({ items, active, user, onLogout, children }: {
  items: NavItem[]
  active?: string
  user?: SidebarUser
  onLogout?: () => void
  children: ReactNode
}) {
  const [drawer, setDrawer] = useState(false)
  const { setCmdOpen } = useUIStore()
  const { settings, updateSettings } = useUserStore()

  // Single container-level identity/settings sync for the whole shell.
  useAuth()

  // Ctrl/Cmd+K opens the command palette (parity with the landing navbar).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCmdOpen])

  return (
    <div className="app-shell">
      {/* Desktop / tablet sidebar */}
      <aside className="app-sidebar">
        <Sidebar items={items} active={active} user={user} onLogout={onLogout} />
      </aside>

      <div className="app-main">
        {/* Sticky header — util cluster on every size; hamburger + brand only on mobile */}
        <header className="app-header">
          <div className="app-header-left">
            <button className="app-header-ham" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer}
              style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--s2)', border: '1px solid var(--br)', color: 'var(--t2)', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <Menu size={18} />
            </button>
            <span className="app-header-brand" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--t)' }}>
              AIU <span style={{ color: 'var(--accent-2)' }}>Vanguard</span>
            </span>
          </div>

          <div className="app-utils">
            {/* Search → command palette */}
            <button className="app-util-search hide-mobile" onClick={() => setCmdOpen(true)} aria-label="Search">
              <Command size={13} /><span>Search</span><kbd>K</kbd>
            </button>
            {/* Online counter */}
            <div className="app-util-online hide-mobile"><span className="dot" /><OnlineCounter /></div>
            {/* Notifications */}
            <NotificationBell />
            {/* Theme toggle */}
            <button className="app-util" onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })} title="Toggle theme" aria-label="Toggle theme">
              {settings.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {children}
      </div>

      {/* Mobile drawer */}
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)}>
        <Sidebar items={items} active={active} user={user} onLogout={onLogout} onNavigate={() => setDrawer(false)} />
      </MobileDrawer>

      {/* Command palette — mounted once so the search button + Ctrl/Cmd+K work on any shell page */}
      <CommandPalette />
    </div>
  )
}
