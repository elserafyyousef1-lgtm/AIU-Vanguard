// src/components/ui/Card.tsx — Vanguard glass card.
// `hover` (default true) lifts + reveals the crimson spotlight (driven by AmbientBackdrop).
import type { ReactNode, CSSProperties } from 'react'

interface Props {
  children: ReactNode
  padding?: number | string
  hover?: boolean
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

export function Card({ children, padding = 22, hover = true, className = '', style, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`glass ${hover ? '' : 'glass-flat'} ${className}`.trim()}
      style={{ padding, ...(onClick ? { cursor: 'pointer' } : null), ...style }}
    >
      {children}
    </div>
  )
}
