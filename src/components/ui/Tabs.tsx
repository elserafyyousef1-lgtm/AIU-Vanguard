'use client'
// src/components/ui/Tabs.tsx — Vanguard pill tabs (scroll-safe on mobile).
import type { ReactNode } from 'react'

export interface TabItem { id: string; label: string; icon?: ReactNode }

export function Tabs({ tabs, active, onChange }: { tabs: TabItem[]; active: string; onChange?: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 14, padding: 5, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {tabs.map(t => {
        const on = t.id === active
        return (
          <button key={t.id} onClick={() => onChange?.(t.id)} aria-current={on || undefined}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10, flexShrink: 0,
              background: on ? 'var(--s4)' : 'transparent', border: on ? '1px solid var(--br2)' : '1px solid transparent',
              color: on ? 'var(--t)' : 'var(--t2)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font)', whiteSpace: 'nowrap', transition: 'all .15s' }}>
            {t.icon}{t.label}
          </button>
        )
      })}
    </div>
  )
}
