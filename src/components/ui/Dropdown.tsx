'use client'
// src/components/ui/Dropdown.tsx — accessible action menu.
// `trigger` is CONTENT (icon/text) — the component renders its own <button> around it
// (default styled as a subtle button; override via triggerClassName).
// A11y: aria-haspopup/expanded, opens with Enter/Space/ArrowDown, roving focus with
// Arrow/Home/End, Esc closes + restores focus to the trigger, outside-click closes.
import { useState, useRef, useEffect, useCallback } from 'react'
import { Z } from '@/lib/z'
import type { ReactNode } from 'react'

export interface DropdownItem { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean }

interface Props {
  trigger: ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  triggerClassName?: string
  ariaLabel?: string
}

export function Dropdown({ trigger, items, align = 'right', triggerClassName = 'btn-subtle btn-sm', ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Focus the first item when the menu opens.
  useEffect(() => { if (open) requestAnimationFrame(() => itemRefs.current[0]?.focus()) }, [open])

  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) }
  }

  const onMenuKey = (e: React.KeyboardEvent) => {
    const n = items.length
    const idx = itemRefs.current.findIndex(el => el === document.activeElement)
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); itemRefs.current[(idx + 1 + n) % n]?.focus(); break
      case 'ArrowUp': e.preventDefault(); itemRefs.current[(idx - 1 + n) % n]?.focus(); break
      case 'Home': e.preventDefault(); itemRefs.current[0]?.focus(); break
      case 'End': e.preventDefault(); itemRefs.current[n - 1]?.focus(); break
      case 'Escape': e.preventDefault(); close(); break
      case 'Tab': setOpen(false); break
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={triggerRef} type="button" className={triggerClassName}
        aria-haspopup="menu" aria-expanded={open} aria-label={ariaLabel}
        onClick={() => setOpen(o => !o)} onKeyDown={onTriggerKey}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu" onKeyDown={onMenuKey}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', ...(align === 'right' ? { right: 0 } : { left: 0 }),
            zIndex: Z.dropdown, minWidth: 184, background: 'var(--s2)', border: '1px solid var(--br)',
            borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-md)', padding: 5, animation: 'menuIn .14s var(--ease-premium)',
          }}
        >
          {items.map((it, i) => (
            <button
              key={i} ref={el => { itemRefs.current[i] = el }} role="menuitem" type="button" tabIndex={-1}
              onClick={() => { it.onClick(); close() }}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 11px', borderRadius: 8,
                background: 'none', border: 'none', color: it.danger ? '#ef4444' : 'var(--t2)', fontSize: 13,
                fontFamily: 'var(--font)', cursor: 'pointer', textAlign: 'left' }}
              onFocus={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = it.danger ? '#ef4444' : 'var(--t)' }}
              onBlur={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = it.danger ? '#ef4444' : 'var(--t2)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = it.danger ? '#ef4444' : 'var(--t)' }}
              onMouseLeave={e => { if (document.activeElement !== e.currentTarget) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = it.danger ? '#ef4444' : 'var(--t2)' } }}
            >
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
