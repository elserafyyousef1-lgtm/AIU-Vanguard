// src/components/ui/Select.tsx — styled native select (form control) with chevron.
import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes, ReactNode } from 'react'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: ReactNode
}

export function Select({ label, children, className = '', id, ...rest }: Props) {
  return (
    <div style={{ width: '100%' }}>
      {label && <label htmlFor={id} className="field-label">{label}</label>}
      <div style={{ position: 'relative' }}>
        <select
          id={id}
          className={`input ${className}`.trim()}
          style={{ appearance: 'none', WebkitAppearance: 'none', paddingRight: 36, cursor: 'pointer' }}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', pointerEvents: 'none' }} />
      </div>
    </div>
  )
}
