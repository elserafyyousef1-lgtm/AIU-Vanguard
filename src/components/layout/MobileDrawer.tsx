'use client'
// src/components/layout/MobileDrawer.tsx — slide-in drawer for mobile nav.
// Same a11y model as Modal: focus moves in + is trapped, ESC closes, overlay-click closes,
// scroll-lock, focus restored on close. Sits below the Modal in the z-scale (Z.drawer < Z.modal).
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function MobileDrawer({ open, onClose, children, ariaLabel = 'Navigation' }: {
  open: boolean
  onClose: () => void
  children: ReactNode
  ariaLabel?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    const prevFocused = document.activeElement as HTMLElement | null
    const focusable = () =>
      panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null) : []
    ;(focusable()[0] || panel)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) { e.preventDefault(); panel?.focus(); return }
      const first = items[0], last = items[items.length - 1], active = document.activeElement
      if (e.shiftKey && (active === first || active === panel)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      prevFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <>
      <div className="app-drawer-overlay" onClick={onClose} aria-hidden />
      <div ref={panelRef} className="app-drawer" role="dialog" aria-modal="true" aria-label={ariaLabel} tabIndex={-1}>
        {children}
      </div>
    </>
  )
}
