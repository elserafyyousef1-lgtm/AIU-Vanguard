// src/components/ui/Field.tsx — labelled input with optional leading icon + error/hint.
import type { InputHTMLAttributes, ReactNode } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: ReactNode
  error?: string
  hint?: string
}

export function Field({ label, icon, error, hint, className = '', id, ...rest }: Props) {
  return (
    <div style={{ width: '100%' }}>
      {label && <label htmlFor={id} className="field-label">{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', display: 'flex', pointerEvents: 'none' }}>
            {icon}
          </span>
        )}
        <input
          id={id}
          className={`input ${className}`.trim()}
          style={icon ? { paddingLeft: 38 } : undefined}
          aria-invalid={!!error || undefined}
          {...rest}
        />
      </div>
      {error
        ? <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{error}</p>
        : hint ? <p style={{ color: 'var(--t3)', fontSize: 12, marginTop: 6 }}>{hint}</p> : null}
    </div>
  )
}
