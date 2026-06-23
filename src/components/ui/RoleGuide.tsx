'use client'
// src/components/ui/RoleGuide.tsx — "S" button: what your role can & can't do
import { useState } from 'react'
import { X, Check, Ban } from 'lucide-react'

type Role = 'owner' | 'admin' | 'doctor' | 'master' | 'guider' | 'student'

const GUIDE: Record<Role, { color: string; can: string[]; cant: string[] }> = {
  owner: {
    color: '#f59e0b',
    can: [
      'Full control over the entire platform',
      'Assign any role (admin, doctor, master, guider)',
      'Post & moderate everywhere (general + all courses)',
      'Manage all course enrollments at any time',
      'Message anyone',
    ],
    cant: ['Nothing is restricted for the Owner'],
  },
  admin: {
    color: '#6366f1',
    can: [
      'Assign roles: doctor, master, guider, student',
      'Post & moderate everywhere',
      'Manage all course enrollments',
      'Message anyone',
    ],
    cant: ['Create or remove Admins', 'Change the Owner'],
  },
  doctor: {
    color: '#10b981',
    can: [
      'Post in the general community',
      'Post & moderate in your assigned courses',
      'Assign masters & guiders in your courses',
      'Message anyone',
    ],
    cant: [
      'Post in courses not assigned to you',
      'Manage roles above you (admin / owner)',
      'Change platform-wide settings',
    ],
  },
  master: {
    color: '#8b5cf6',
    can: [
      'Post in the general community',
      'Post & moderate in your assigned courses',
      'Assign guiders in your courses',
      'Manage course enrollments (after the 24h lock)',
      'Message anyone',
    ],
    cant: [
      'Post in courses not assigned to you',
      'Manage doctors, admins or the owner',
    ],
  },
  guider: {
    color: '#06b6d4',
    can: [
      'Post in your assigned course community',
      'Like, comment and reply everywhere',
      'Message anyone',
    ],
    cant: [
      'Post in the general community',
      'Post in other courses',
      'Manage any roles or enrollments',
    ],
  },
  student: {
    color: '#9ca3af',
    can: [
      'Read, like, comment and reply in all communities',
      'Enroll in courses (editable for 24 hours)',
      'Message doctors, masters, guiders and admins',
      'Customize your profile (photos, bio, links, certificates)',
    ],
    cant: [
      'Post in any community',
      'Message other students',
      'Cancel an enrollment after 24 hours (ask the course master)',
    ],
  },
}

export function RoleGuide({ role }: { role: string }) {
  const [open, setOpen] = useState(false)
  const g = GUIDE[(role as Role)] || GUIDE.student
  const label = role.charAt(0).toUpperCase() + role.slice(1)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="What can I do?"
        style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: `color-mix(in srgb, ${g.color} 16%, transparent)`,
          border: `1.5px solid ${g.color}`, color: g.color,
          fontSize: 13.5, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font)',
        }}
      >S</button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 150,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 420, maxHeight: '78vh', overflowY: 'auto',
              background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 18,
              padding: 22,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--t)' }}>
                Your role: <span style={{ color: g.color }}>{label}</span>
              </h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', padding: 4, display: 'flex' }}><X size={17} /></button>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 16 }}>What you can and can't do on AIU Vanguard.</p>

            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#10b981', marginBottom: 8 }}>You can</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
              {g.can.map(item => (
                <div key={item} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '9px 12px', borderRadius: 10, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <Check size={14} style={{ color: '#10b981', flexShrink: 0, marginTop: 1.5 }} />
                  <span style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.45 }}>{item}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#ef4444', marginBottom: 8 }}>You can't</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {g.cant.map(item => (
                <div key={item} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '9px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)' }}>
                  <Ban size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1.5 }} />
                  <span style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.45 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
