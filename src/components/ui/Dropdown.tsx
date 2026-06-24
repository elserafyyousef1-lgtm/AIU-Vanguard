'use client'
// src/components/ui/Dropdown.tsx — action menu: a trigger that opens a list of actions.
// Closes on outside-click. For "…" row menus, edit/delete actions, etc.
import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'

export interface DropdownItem { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean }

export function Dropdown({ trigger, items, align = 'right' }: { trigger: ReactNode; items: DropdownItem[]; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <span onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', cursor: 'pointer' }}>{trigger}</span>
      {open && (
        <div role="menu" style={{
          position: 'absolute', top: 'calc(100% + 6px)', ...(align === 'right' ? { right: 0 } : { left: 0 }),
          zIndex: 200, minWidth: 184, background: 'var(--s2)', border: '1px solid var(--br)',
          borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-md)', padding: 5, animation: 'menuIn .14s var(--ease-premium)',
        }}>
          {items.map((it, i) => (
            <button key={i} role="menuitem" onClick={() => { it.onClick(); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 11px', borderRadius: 8,
                background: 'none', border: 'none', color: it.danger ? '#ef4444' : 'var(--t2)', fontSize: 13,
                fontFamily: 'var(--font)', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = it.danger ? '#ef4444' : 'var(--t)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = it.danger ? '#ef4444' : 'var(--t2)' }}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
