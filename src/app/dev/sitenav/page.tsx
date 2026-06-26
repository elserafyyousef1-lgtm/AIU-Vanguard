'use client'
// src/app/dev/sitenav/page.tsx — isolated preview of the unified SiteNav.
// Switch between guest / student / admin to see how the one nav adapts. Not linked in nav.
import { useState } from 'react'
import { SiteNavView, type SiteNavUser } from '@/components/layout/SiteNavView'

type Mode = 'guest' | 'student' | 'admin'

const USERS: Record<Mode, { user: SiteNavUser | null; isAdmin: boolean }> = {
  guest: { user: null, isAdmin: false },
  student: { user: { id: 'demo', name: 'Yousef Elserafy', role: 'Student' }, isAdmin: false },
  admin: { user: { id: 'demo', name: 'Yousef Elserafy', role: 'Owner' }, isAdmin: true },
}

export default function SiteNavPreview() {
  const [mode, setMode] = useState<Mode>('admin')
  const { user, isAdmin } = USERS[mode]

  return (
    <>
      <SiteNavView active="/dashboard" user={user} isAdmin={isAdmin} onLogout={() => alert('logout')} />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(20px,4vw,40px)' }}>
        <div className="sec-kicker">Dev · SiteNav preview</div>
        <h1 className="sec-title" style={{ marginBottom: 6 }}>Unified Navigation</h1>
        <p style={{ color: 'var(--t2)', marginBottom: 22 }}>
          One nav for the whole site. Desktop ≥1024 = inline links + util cluster + avatar menu ·
          tablet/mobile &lt;1024 = hamburger drawer. Resize the window to see the switch.
        </p>

        {/* State switcher */}
        <div style={{ display: 'inline-flex', gap: 4, background: 'var(--s3)', border: '1px solid var(--br)', borderRadius: 12, padding: 4, marginBottom: 28 }}>
          {(['guest', 'student', 'admin'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
              background: mode === m ? 'var(--s4)' : 'transparent', border: mode === m ? '1px solid var(--br2)' : '1px solid transparent',
              color: mode === m ? 'var(--t)' : 'var(--t2)', cursor: 'pointer', fontFamily: 'var(--font)',
            }}>{m}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 14 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 14, padding: 18 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t)', marginBottom: 6 }}>Card {i}</h3>
              <p style={{ color: 'var(--t2)', fontSize: 13.5, lineHeight: 1.6 }}>Sample page content under the unified nav.</p>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
