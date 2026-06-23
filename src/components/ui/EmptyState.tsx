// src/components/ui/EmptyState.tsx — consistent empty state (icon + title + copy + action).
import type { ReactNode } from 'react'

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px dashed var(--br)', borderRadius: 'var(--r-lg)', background: 'var(--s1)' }}>
      {icon && <div style={{ color: 'var(--t3)', display: 'flex', justifyContent: 'center', marginBottom: 14, opacity: 0.7 }}>{icon}</div>}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t)', marginBottom: 6 }}>{title}</h3>
      {description && <p style={{ color: 'var(--t2)', fontSize: 13.5, maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>{description}</p>}
      {action && <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>{action}</div>}
    </div>
  )
}
