'use client'
// src/components/ai/answers/ComputeValueInput.tsx
// Scalar sub-answer widget (IEEE-754 fields, SLT result, …). One labeled input
// per field; per-field green/red + correct value in review. Deterministic grading
// lives in lib/ai/grading (gradeComputeValue).

interface Field { key: string; label: string; format: string; answer?: string }
interface Props {
  payload: { fields: Field[] }
  value?: Record<string, string>
  onChange?: (v: Record<string, string>) => void
  review?: boolean
  fieldResults?: { key: string; ok: boolean }[]
}

export function ComputeValueInput({ payload, value, onChange, review, fieldResults }: Props) {
  const okOf = (k: string) => fieldResults?.find(f => f.key === k)?.ok
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {payload.fields.map(f => {
        const ok = okOf(f.key)
        const mine = value?.[f.key] ?? ''
        return (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: '0 0 44%', fontSize: 12.5, color: 'var(--t2)' }}>{f.label}</span>
            {review ? (
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: ok ? '#3fae6a' : 'var(--accent)' }}>{mine || '—'}</span>
                {!ok && f.answer !== undefined && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: '#3fae6a' }}>✓ {f.answer}</span>}
              </span>
            ) : (
              <input value={mine} onChange={e => onChange?.({ ...(value || {}), [f.key]: e.target.value })}
                spellCheck={false} autoComplete="off" placeholder={f.format === 'hex32' ? '0x…' : ''}
                style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--br)', background: 'var(--s3)', color: 'var(--t)', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
