'use client'
// src/app/dev/shell/page.tsx — internal preview for the AppShell (sidebar/rail/drawer).
// Not linked in nav. Placeholder data only — no real auth/routing wiring here.
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { LayoutDashboard, BookOpen, Users, MessageSquare, Settings, Shield } from 'lucide-react'

// NOTE: "Courses" → /semesters/4 is a placeholder (matches the current hardcoded-semester-4
// pattern). When wired to real pages this should point at the user's profiles.semester.
const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, section: 'Menu' },
  { href: '/semesters/4', label: 'Courses', icon: <BookOpen size={18} />, section: 'Menu' },
  { href: '/community', label: 'Community', icon: <Users size={18} />, section: 'Menu' },
  { href: '/messages', label: 'Messages', icon: <MessageSquare size={18} />, section: 'Menu' },
  { href: '/settings', label: 'Settings', icon: <Settings size={18} />, section: 'Account' },
  { href: '/admin', label: 'Admin', icon: <Shield size={18} />, section: 'Account' },
]

export default function ShellPreview() {
  return (
    <AppShell items={NAV} active="/dashboard" user={{ name: 'Yousef Elserafy', role: 'Owner' }} onLogout={() => {}}>
      <main style={{ padding: 'clamp(20px,4vw,40px)', maxWidth: 1100 }}>
        <div className="sec-kicker">Dev · Shell preview</div>
        <h1 className="sec-title" style={{ marginBottom: 6 }}>App Shell</h1>
        <p style={{ color: 'var(--t2)', marginBottom: 26 }}>Resize: full sidebar (≥1024) · icon rail (768–1023) · drawer (&lt;768).</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 14 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t)', marginBottom: 6 }}>Card {i}</h3>
              <p style={{ color: 'var(--t2)', fontSize: 13.5, lineHeight: 1.6 }}>Sample content inside the shell content area.</p>
            </Card>
          ))}
        </div>
      </main>
    </AppShell>
  )
}
