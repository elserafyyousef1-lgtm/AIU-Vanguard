'use client'
// src/components/ai/answers/FillTableInput.tsx
// A fill-in-the-table answer widget (truth tables, restoring-division traces, …).
// Given (scaffold) cells are read-only; the student types the rest. In `review`
// mode each editable cell is coloured by `cellResults` and shows the correct
// value for any it got wrong. Grading itself is deterministic in lib/ai/grading.

interface Payload {
  columns: string[]
  solution: string[][]
  givens?: { r: number; c: number; value: string }[]
  colFormats?: string[]
  cellFormat?: string
}
interface Props {
  payload: Payload
  value?: string[][]
  onChange?: (grid: string[][]) => void
  review?: boolean
  cellResults?: boolean[][]
}

export function FillTableInput({ payload, value, onChange, review, cellResults }: Props) {
  const { columns, solution } = payload
  const cols = columns.length
  const givenSet = new Set((payload.givens || []).map(g => g.r + ',' + g.c))

  const setCell = (r: number, c: number, v: string) => {
    if (!onChange) return
    onChange(solution.map((row, ri) => row.map((_, ci) => (ri === r && ci === c ? v : (value?.[ri]?.[ci] ?? '')))))
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--br)', borderRadius: 10 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
        <thead><tr>{columns.map((h, c) => (
          <th key={c} style={{ padding: '7px 9px', background: 'var(--s2)', color: 'var(--t)', fontWeight: 700, borderBottom: '1px solid var(--br2)', whiteSpace: 'nowrap', textAlign: 'center' }}>{h}</th>
        ))}</tr></thead>
        <tbody>{solution.map((row, r) => (
          <tr key={r} style={{ background: r % 2 ? 'rgba(127,127,127,0.05)' : 'transparent' }}>
            {row.map((sol, c) => {
              const rb = c < cols - 1 ? '1px solid var(--br)' : 'none'
              const bb = '1px solid var(--br)'
              if (givenSet.has(r + ',' + c)) {
                return <td key={c} style={{ padding: '6px 9px', color: 'var(--t3)', borderRight: rb, borderBottom: bb, textAlign: 'center', whiteSpace: 'nowrap' }}>{sol}</td>
              }
              if (review) {
                const ok = cellResults?.[r]?.[c]
                const mine = value?.[r]?.[c] ?? ''
                return (
                  <td key={c} style={{ padding: '5px 8px', borderRight: rb, borderBottom: bb, textAlign: 'center', background: ok ? 'rgba(63,174,106,0.14)' : 'rgba(224,38,75,0.12)', whiteSpace: 'nowrap' }}>
                    <span style={{ color: ok ? '#3fae6a' : 'var(--accent)', fontWeight: 700 }}>{mine || '—'}</span>
                    {!ok && <span style={{ color: '#3fae6a', display: 'block', fontSize: 11 }}>✓ {sol}</span>}
                  </td>
                )
              }
              return (
                <td key={c} style={{ padding: '3px 4px', borderRight: rb, borderBottom: bb }}>
                  <input
                    value={value?.[r]?.[c] ?? ''} onChange={e => setCell(r, c, e.target.value)}
                    spellCheck={false} autoComplete="off"
                    style={{ width: '100%', minWidth: 44, boxSizing: 'border-box', textAlign: 'center', padding: '5px 4px', borderRadius: 6, border: '1px solid var(--br)', background: 'var(--s3)', color: 'var(--t)', fontFamily: 'var(--font-mono)', fontSize: 13 }}
                  />
                </td>
              )
            })}
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}
