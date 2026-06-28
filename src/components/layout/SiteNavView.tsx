'use client'
// src/components/layout/SiteNavView.tsx — the UNIFIED site nav (presentational).
// One nav for the whole site (guest + signed-in, all roles). Desktop ≥1024: brand + main
// links inline + util cluster + avatar menu. Tablet/mobile <1024: brand + bell + theme +
// hamburger → MobileDrawer with every link + the util cluster + account actions.
//
// Pure UI: takes auth state as props (the smart wrapper will feed it from useAuth). The util
// cluster (Search/CommandPalette, OnlineCounter, NotificationBell, theme) lives HERE so nothing
// is lost vs the old Navbar / AppShell header.
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, Command, Sun, Moon, ChevronDown, UserCircle, Settings, LogOut } from 'lucide-react'
import { useUIStore, useUserStore } from '@/lib/store'
import { OnlineCounter } from '@/components/ui/OnlineCounter'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { Dropdown } from '@/components/ui/Dropdown'
import { Button } from '@/components/ui/Button'
import { MobileDrawer } from './MobileDrawer'

export interface SiteNavUser { id?: string; name: string; role?: string; avatarUrl?: string | null }

const GUEST_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/semesters/4', label: 'Courses' },
  { href: '/community', label: 'Community' },
]

function authedLinks(isAdmin: boolean) {
  return [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/semesters/4', label: 'Courses' },
    { href: '/community', label: 'Community' },
    { href: '/messages', label: 'Messages' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]
}

export function SiteNavView({ active, user, isAdmin = false, onLogout }: {
  active?: string
  user?: SiteNavUser | null
  isAdmin?: boolean
  onLogout?: () => void
}) {
  const router = useRouter()
  const [drawer, setDrawer] = useState(false)
  const { setCmdOpen } = useUIStore()
  const { settings, updateSettings } = useUserStore()
  const authed = !!user
  const links = authed ? authedLinks(isAdmin) : GUEST_LINKS
  const initial = (user?.name || 'U').trim()[0]?.toUpperCase() || 'U'

  // Ctrl/Cmd+K opens the command palette.
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [setCmdOpen])

  const toggleTheme = () => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })

  const Avatar = ({ size = 28 }: { size?: number }) => (
    <span className="sitenav-avatar" style={{ width: size, height: size, fontSize: size * 0.43 }}>
      {user?.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
    </span>
  )

  return (
    <>
      <nav className="sitenav" aria-label="Primary">
        {/* Brand */}
        <Link href={authed ? '/dashboard' : '/'} className="sitenav-brand">
          <span style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', background: 'var(--void, var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, boxShadow: '0 0 0 1px var(--crimson-line), var(--shadow-crimson)' }}>AIU</span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
            <strong style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em', color: 'var(--t)' }}>AIU <span style={{ color: 'var(--accent-2)' }}>Vanguard</span></strong>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.28em', color: 'var(--t3)', textTransform: 'uppercase', marginTop: 2 }}>CS Department</span>
          </span>
        </Link>

        {/* Main links (desktop inline) */}
        <div className="sitenav-links">
          {links.map(l => (
            <Link key={l.href} href={l.href} prefetch={false} className={`topnav-link ${active === l.href ? 'on' : ''}`} aria-current={active === l.href ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right utils */}
        <div className="sitenav-utils">
          {authed && (
            <button className="sitenav-search" onClick={() => setCmdOpen(true)} aria-label="Search">
              <Command size={13} /><span>Search</span><kbd>K</kbd>
            </button>
          )}
          <div className="sitenav-online"><span className="dot" /><OnlineCounter /></div>
          {authed && <NotificationBell />}
          <button className="sitenav-icon" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
            {settings.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {authed ? (
            <Dropdown
              align="right"
              ariaLabel="Account menu"
              triggerClassName="sitenav-avatar-btn"
              trigger={<><Avatar /><span className="sitenav-avatar-name">{(user!.name || 'Account').split(/\s+/)[0]}</span><ChevronDown size={14} style={{ color: 'var(--t3)' }} /></>}
              items={[
                { label: 'Profile', icon: <UserCircle size={15} />, onClick: () => router.push(`/profile/${user!.id ?? ''}`) },
                { label: 'Settings', icon: <Settings size={15} />, onClick: () => router.push('/settings') },
                { label: 'Log out', icon: <LogOut size={15} />, onClick: () => onLogout?.(), danger: true },
              ]}
            />
          ) : (
            <span className="sitenav-auth-desktop" style={{ display: 'flex', gap: 8 }}>
              <Button href="/login" variant="ghost" size="sm">Sign in</Button>
              <Button href="/login" size="sm">Get started</Button>
            </span>
          )}

          {/* Hamburger (tablet + mobile) */}
          <button className="sitenav-ham" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer}>
            <Menu size={18} />
          </button>
        </div>
      </nav>

      {/* Tablet + mobile drawer */}
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} ariaLabel="Navigation">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 12px' }}>
          <div style={{ padding: '0 10px 14px' }}>
            <strong style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t)' }}>AIU <span style={{ color: 'var(--accent-2)' }}>Vanguard</span></strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {links.map(l => (
              <Link key={l.href} href={l.href} prefetch={false} onClick={() => setDrawer(false)} className={`side-link ${active === l.href ? 'on' : ''}`}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* NOTE: no OnlineCounter here — it is already mounted in the top bar. OnlineCounter
              shares one presence topic and is not safe to mount twice, so the drawer reuses
              the single instance rather than rendering a second one. */}
          {authed && (
            <div style={{ marginTop: 14 }}>
              <button onClick={() => { setCmdOpen(true); setDrawer(false) }} className="side-link" style={{ background: 'var(--s3)' }}>
                <Command size={16} /> Search
              </button>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {authed ? (
            <div style={{ borderTop: '1px solid var(--br)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 10px' }}>
                <Avatar size={34} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user!.name}</span>
                  {user!.role && <span style={{ display: 'block', fontSize: 11, color: 'var(--t3)' }}>{user!.role}</span>}
                </span>
              </div>
              <Link href={`/profile/${user!.id ?? ''}`} prefetch={false} onClick={() => setDrawer(false)} className="side-link"><UserCircle size={16} /> Profile</Link>
              <Link href="/settings" prefetch={false} onClick={() => setDrawer(false)} className="side-link"><Settings size={16} /> Settings</Link>
              <button onClick={() => { setDrawer(false); onLogout?.() }} className="side-link" style={{ color: '#ef4444' }}><LogOut size={16} /> Log out</button>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--br)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button href="/login" variant="ghost" onClick={() => setDrawer(false)} style={{ justifyContent: 'center' }}>Sign in</Button>
              <Button href="/login" onClick={() => setDrawer(false)} style={{ justifyContent: 'center' }}>Get started</Button>
            </div>
          )}
        </div>
      </MobileDrawer>

      <CommandPalette />
    </>
  )
}
