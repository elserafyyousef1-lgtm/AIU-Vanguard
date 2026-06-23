'use client'
// src/components/layout/Navbar.tsx
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Command, Settings, Sun, Moon, Menu, X, Users } from 'lucide-react'
import { useUIStore, useUserStore } from '@/lib/store'
import { OnlineCounter } from '@/components/ui/OnlineCounter'
import { NotificationBell } from '@/components/ui/NotificationBell'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobOpen, setMobOpen] = useState(false)
  const { setCmdOpen, setSettingsOpen, onlineCount } = useUIStore()
  const { settings, updateSettings } = useUserStore()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Keyboard shortcut: Ctrl/Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCmdOpen])

  return (
    <>
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
          height: 'var(--nav-h)',
          background: scrolled ? 'var(--nav-bg)' : 'transparent',
          backdropFilter: scrolled ? 'blur(24px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--br)' : '1px solid transparent',
          transition: 'all 0.3s var(--ease-out)',
          display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: '12px',
        }}
      >
        {/* Brand */}
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none', flexShrink:0 }}>
          <div style={{
            width:32, height:32, borderRadius:9, background:'var(--accent)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:800, fontSize:12, color:'white', letterSpacing:'-0.03em'
          }}>AIU</div>
          <span style={{ fontWeight:700, fontSize:15, color:'var(--t)', letterSpacing:'-0.02em' }}>CS Hub</span>
          <span style={{
            fontFamily:'var(--font-mono)', fontSize:10, color:'var(--t3)',
            letterSpacing:'0.05em', textTransform:'uppercase'
          }}>Semester 4</span>
        </Link>

        {/* Center nav links */}
        <div style={{ display:'flex', gap:2, margin:'0 auto' }}>
          {[
            { href:'/', label:'Home' },
            { href:'/semesters/4', label:'Courses' },
            { href:'/community', label:'Community' },
            { href:'/messages', label:'Messages' },
            { href:'/dashboard', label:'Dashboard' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{
              padding:'6px 14px', borderRadius:9,
              fontSize:13, fontWeight:500, color:'var(--t2)',
              textDecoration:'none', transition:'all 0.15s',
              border:'1px solid transparent',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.color = 'var(--t)'
              el.style.background = 'var(--s3)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.color = 'var(--t2)'
              el.style.background = 'transparent'
            }}
            >{label}</Link>
          ))}
        </div>

        {/* Right controls */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          {/* Online counter */}
          <div style={{
            display:'flex', alignItems:'center', gap:5,
            padding:'4px 10px', borderRadius:8,
            background:'var(--s3)', border:'1px solid var(--br)',
            fontSize:11, fontFamily:'var(--font-mono)', color:'var(--t3)',
          }}>
            <span style={{
              width:6, height:6, borderRadius:'50%',
              background:'var(--accent-green)', flexShrink:0,
              boxShadow:'0 0 6px var(--accent-green)',
            }} />
            <OnlineCounter />
          </div>

          {/* Notifications */}
          <NotificationBell />

          {/* Cmd palette */}
          <button
            onClick={() => setCmdOpen(true)}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'5px 11px', borderRadius:8,
              background:'var(--s3)', border:'1px solid var(--br)',
              color:'var(--t2)', fontSize:12, fontFamily:'var(--font)',
              cursor:'pointer', transition:'all 0.15s',
            }}
          >
            <Command size={13} />
            <span>Search</span>
            <kbd style={{
              fontFamily:'var(--font-mono)', fontSize:10,
              background:'var(--s4)', border:'1px solid var(--br2)',
              padding:'1px 5px', borderRadius:4, color:'var(--t3)',
            }}>K</kbd>
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
            style={{
              width:34, height:34, borderRadius:10,
              background:'var(--s3)', border:'1px solid var(--br)',
              color:'var(--t2)', display:'flex', alignItems:'center',
              justifyContent:'center', cursor:'pointer', transition:'all 0.15s',
            }}
            title="Toggle theme"
          >
            {settings.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            style={{
              width:34, height:34, borderRadius:10,
              background:'var(--s3)', border:'1px solid var(--br)',
              color:'var(--t2)', display:'flex', alignItems:'center',
              justifyContent:'center', cursor:'pointer', transition:'all 0.15s',
            }}
            title="Settings"
          >
            <Settings size={15} />
          </button>

          {/* Mobile menu */}
          <button
            onClick={() => setMobOpen(!mobOpen)}
            style={{
              width:34, height:34, borderRadius:10,
              background:'var(--s3)', border:'1px solid var(--br)',
              color:'var(--t2)', display:'none', alignItems:'center',
              justifyContent:'center', cursor:'pointer',
            }}
            className="ham"
          >
            {mobOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobOpen && (
        <div style={{
          position:'fixed', top:'var(--nav-h)', left:0, right:0, zIndex:299,
          padding:'10px 16px 16px',
          background:'var(--nav-bg)',
          backdropFilter:'blur(24px)',
          borderBottom:'1px solid var(--br)',
          animation:'slideDown 0.2s var(--ease-out)',
          display:'flex', flexDirection:'column', gap:3,
        }}>
          {[
            { href:'/', label:'🏠 Home' },
            { href:'/semesters/4', label:'📚 Semester 4 Courses' },
            { href:'/community', label:'💬 Community' },
            { href:'/messages', label:'✉️ Messages' },
            { href:'/dashboard', label:'📊 Dashboard' },
            { href:'/login', label:'🔐 Login / Register' },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              onClick={() => setMobOpen(false)}
              style={{
                padding:'10px 14px', borderRadius:10, fontSize:13.5,
                fontWeight:500, color:'var(--t2)', textDecoration:'none',
                transition:'all 0.15s',
              }}
            >{label}</Link>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div style={{ height:'var(--nav-h)' }} />
    </>
  )
}
