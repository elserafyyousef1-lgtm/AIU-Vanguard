// src/components/ui/Table.tsx — Vanguard table: scroll-safe wrapper + styled th/td (.v-table).
// Compose with standard <thead>/<tbody>/<tr> and the Th/Td helpers (align prop).
import type { ReactNode, CSSProperties } from 'react'

export function Table({ children, minWidth = 520, style }: { children: ReactNode; minWidth?: number; style?: CSSProperties }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--br)', borderRadius: 'var(--r-lg)', background: 'var(--s2)', ...style }}>
      <table className="v-table" style={{ minWidth }}>{children}</table>
    </div>
  )
}

type Align = 'left' | 'center' | 'right'
export function Th({ children, align = 'left', style }: { children?: ReactNode; align?: Align; style?: CSSProperties }) {
  return <th style={{ textAlign: align, ...style }}>{children}</th>
}
export function Td({ children, align = 'left', style }: { children?: ReactNode; align?: Align; style?: CSSProperties }) {
  return <td style={{ textAlign: align, ...style }}>{children}</td>
}
