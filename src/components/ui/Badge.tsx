// src/components/ui/Badge.tsx — role pills + generic badge (Vanguard pill style).
import type { ReactNode } from 'react'

const ROLE_CLASS: Record<string, string> = {
  owner: 'pill-owner', admin: 'pill-admin', doctor: 'pill-doctor',
  master: 'pill-admin', guider: 'pill-doctor', rep: 'pill-student', student: 'pill-student',
}

export function RolePill({ role }: { role: string }) {
  return <span className={`pill ${ROLE_CLASS[role] || 'pill-student'}`}>{role}</span>
}

export function Badge({ children, color, className = '' }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={`pill ${className}`.trim()}
      style={color ? { color, background: `color-mix(in srgb, ${color} 12%, transparent)`, boxShadow: `inset 0 0 0 1px ${color}` } : undefined}
    >
      {children}
    </span>
  )
}
