'use client'
// src/components/ai/answers/DeriveEquationInput.tsx
// The student types a Boolean equation for Y; graded by truth-table EQUIVALENCE
// (lib/ai/grading gradeDeriveEquation), so any algebraically-equivalent form is
// accepted. Review shows correct/not + one reference form.

interface Props {
  payload: { variables: string[]; referenceEquation: string }
  value?: string
  onChange?: (v: string) => void
  review?: boolean
  result?: { correct: boolean; reason?: string }
}

export function DeriveEquationInput({ payload, value, onChange, review, result }: Props) {
  if (review) {
    const ok = result?.correct
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: ok ? '#3fae6a' : 'var(--accent)' }}>Y = {value || '—'}</div>
        <div style={{ fontSize: 12, color: 'var(--t3)' }}>
          {ok ? '✓ equivalent to the reference' : 'not equivalent'} · one correct form: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--t2)' }}>{payload.referenceEquation}</span>
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--t2)', fontWeight: 700 }}>Y =</span>
      <input value={value ?? ''} onChange={e => onChange?.(e.target.value)} spellCheck={false} autoComplete="off"
        placeholder={`use ${payload.variables.join(', ')}  ·  ' + ( )`}
        style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '8px 11px', borderRadius: 8, border: '1px solid var(--br)', background: 'var(--s3)', color: 'var(--t)', fontFamily: 'var(--font-mono)', fontSize: 13.5 }} />
    </div>
  )
}
