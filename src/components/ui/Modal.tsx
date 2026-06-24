'use client'
// src/components/ui/Modal.tsx — Vanguard modal: dimmed overlay + surface sheet,
// ESC-to-close, click-outside-close, body scroll lock, optional header/footer.
import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { ReactNode, CSSProperties } from 'react'

type Size = 'sm' | 'md' | 'lg'
const MAXW: Record<Size, number> = { sm: 440, md: 560, lg: 780 }

interface Props {
  open?: boolean
  title?: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: Size
}

export function Modal({ open = true, title, subtitle, onClose, children, footer, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  if (!open) return null
  const hasHeader = !!(title || subtitle)
  return (
    <div role="dialog" aria-modal="true" aria-label={title || 'Dialog'}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }} style={overlay}>
      <div style={{ ...sheet, maxWidth: MAXW[size] }} onMouseDown={(e) => e.stopPropagation()}>
        {hasHeader && (
          <div style={header}>
            <div style={{ minWidth: 0 }}>
              {title && <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{title}</h2>}
              {subtitle && <p style={{ fontSize: 12.5, color: 'var(--t3)', marginTop: 4 }}>{subtitle}</p>}
            </div>
            <button onClick={onClose} aria-label="Close" style={closeBtn}><X size={18} /></button>
          </div>
        )}
        <div style={{ padding: hasHeader ? '18px 22px 22px' : 22, overflowY: 'auto' }}>{children}</div>
        {footer && <div style={footerRow}>{footer}</div>}
      </div>
    </div>
  )
}

const overlay: CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '7vh 16px 24px', overflowY: 'auto' }
const sheet: CSSProperties = { width: '100%', background: 'var(--s2)', border: '1px solid var(--br2)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)', maxHeight: '86vh', display: 'flex', flexDirection: 'column', animation: 'menuIn .18s var(--ease-premium)' }
const header: CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '20px 22px 16px', borderBottom: '1px solid var(--br)' }
const closeBtn: CSSProperties = { width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--s3)', border: '1px solid var(--br)', color: 'var(--t2)', cursor: 'pointer', flexShrink: 0 }
const footerRow: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--br)' }
