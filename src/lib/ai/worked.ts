// src/lib/ai/worked.ts
// ───────────────────────────────────────────────────────────
// Deterministic answer-key builders for worked-problem exam questions.
// The model only proposes the PROBLEM (a Boolean expression, or a dividend/
// divisor pair); THESE functions compute the correct table. That way the
// auto-grader never grades a student against a model-invented — and, as live
// testing showed, sometimes WRONG — answer key. Correctness is guaranteed by
// our own code, which is what makes the feature trustworthy.
// ───────────────────────────────────────────────────────────
import { truthColumn, type FillTablePayload, type CellFormat } from './grading'

const toBin = (n: number, bits: number) => (n & ((1 << bits) - 1)).toString(2).padStart(bits, '0')

export interface WorkedFillTable extends FillTablePayload {
  question: string
  topic: string
  explanation: string
}

// ── Truth table for a Boolean expression (Y column computed by evalBool) ──
export function buildTruthTable(expr: string, vars: string[]): WorkedFillTable | null {
  const n = vars.length
  if (n < 1 || n > 5) return null
  let col: string[]
  try { col = truthColumn(expr, vars) } catch { return null }
  if (col.length !== (1 << n)) return null
  const columns = [...vars, 'Y']
  const solution: string[][] = []
  for (let m = 0; m < (1 << n); m++) {
    const row: string[] = []
    for (let b = 0; b < n; b++) row.push(String((m >> (n - 1 - b)) & 1))
    row.push(col[m])
    solution.push(row)
  }
  const givens = solution.flatMap((_, r) => vars.map((_, c) => ({ r, c, value: solution[r][c] })))  // inputs given
  return {
    question: `Fill in the output column Y of the truth table for  Y = ${expr}.`,
    topic: 'Truth Tables',
    explanation: `Evaluate Y = ${expr} for every combination of ${vars.join(', ')}. The inputs are given; you fill the Y column.`,
    columns, solution, givens,
    colFormats: columns.map(() => 'binary' as CellFormat),
  }
}

// ── Restoring division a ÷ b — the professor's "4×4 Divider" slide algorithm ──
export function buildDivisionTable(dividend: number, divisor: number, bits: number): WorkedFillTable | null {
  if (!Number.isInteger(dividend) || !Number.isInteger(divisor) || !Number.isInteger(bits)) return null
  if (divisor <= 0 || dividend < 0 || bits < 2 || bits > 8) return null
  if (dividend >= (1 << bits) || divisor >= (1 << bits)) return null

  const columns = ['i', 'A_i', "R = {R'≪1, A_i}", 'D = R − B', 'Q_i', "R'"]
  const solution: string[][] = []
  let Rp = 0
  for (let i = bits - 1; i >= 0; i--) {
    const Ai = (dividend >> i) & 1
    const R = (Rp << 1) | Ai
    const D = R - divisor
    let Qi: number
    if (D < 0) { Qi = 0; Rp = R } else { Qi = 1; Rp = D }
    solution.push([String(i), String(Ai), toBin(R, bits), String(D), String(Qi), toBin(Rp, bits)])
  }
  const quotient = parseInt(solution.reduce((acc, row) => acc + row[4], ''), 2)  // Q bits read top→bottom
  const remainder = Rp
  const givens = solution.flatMap((_, r) => [0, 1].map(c => ({ r, c, value: solution[r][c] })))  // i, A_i given
  return {
    question: `Fill the restoring-division table for ${dividend} ÷ ${divisor} (${bits}-bit). Columns i and A_i are given — compute R, D, Q_i and R'.`,
    topic: 'Division',
    explanation: `Each step: R = {R'≪1, A_i}; D = R − B (B = ${divisor}); if D < 0 then Q_i = 0 and R' = R (restore), else Q_i = 1 and R' = D. Result: quotient ${quotient}, remainder ${remainder}.`,
    columns, solution, givens,
    colFormats: ['int', 'int', 'binary', 'int', 'int', 'binary'],
  }
}
