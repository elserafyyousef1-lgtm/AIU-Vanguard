// src/lib/ai/worked.ts
// ───────────────────────────────────────────────────────────
// Deterministic answer-key builders for worked-problem exam questions.
// The model only proposes the PROBLEM (a Boolean expression, or a dividend/
// divisor pair); THESE functions compute the correct table. That way the
// auto-grader never grades a student against a model-invented — and, as live
// testing showed, sometimes WRONG — answer key. Correctness is guaranteed by
// our own code, which is what makes the feature trustworthy.
// ───────────────────────────────────────────────────────────
import { truthColumn, type FillTablePayload, type CellFormat, type ComputeValuePayload, type DeriveEquationPayload } from './grading'

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

export interface WorkedCompute extends ComputeValuePayload { question: string; topic: string; explanation: string }
export interface WorkedDerive extends DeriveEquationPayload { question: string; topic: string; explanation: string }

// ── IEEE-754 single precision (exact — via the hardware float32 conversion) ──
// Pass only exactly-representable values (integers / integer + .25/.5/.75) so the
// "textbook" answer and the hardware bits agree.
export function buildIeee754(value: number): WorkedCompute | null {
  if (!Number.isFinite(value) || value === 0) return null
  const dv = new DataView(new ArrayBuffer(4))
  dv.setFloat32(0, value)                 // big-endian by default
  const bits = dv.getUint32(0) >>> 0
  const sign = (bits >>> 31) & 1
  const exp = (bits >>> 23) & 0xff
  const hex = '0x' + bits.toString(16).toUpperCase().padStart(8, '0')
  return {
    question: `Represent ${value} in 32-bit IEEE-754 single precision (1 sign · 8 exponent, bias 127 · 23 fraction). Give the sign bit, the 8-bit biased exponent, and the final hexadecimal.`,
    topic: 'Floating Point',
    explanation: `Convert to binary, write as 1.f × 2^E, then: sign = ${sign}; biased exponent = 127 + E = ${exp} = ${exp.toString(2).padStart(8, '0')}; assemble sign|exp|fraction and read as hex → ${hex}.`,
    fields: [
      { key: 'sign', label: 'Sign bit', format: 'bin', answer: String(sign) },
      { key: 'exp', label: 'Biased exponent (8 bits)', format: 'bin', answer: exp.toString(2).padStart(8, '0') },
      { key: 'hex', label: 'IEEE-754 (hex, 0x…)', format: 'hex32', answer: hex },
    ],
  }
}

// ── SLT on a 32-bit ALU — the professor's subtract-then-read-the-sign-bit method ──
export function buildSlt(a: number, b: number): WorkedCompute {
  const diff = a - b
  return {
    question: `On a 32-bit ALU, compute SLT for A = ${a}, B = ${b}. Give A − B, the sign bit S₃₁ of that result, and the SLT output Y.`,
    topic: 'ALU · SLT',
    explanation: `SLT subtracts: A − B = ${diff}. Its sign bit S₃₁ = ${diff < 0 ? 1 : 0} (1 means negative → A < B). So Y = ${a < b ? 1 : 0}.`,
    fields: [
      { key: 'diff', label: 'A − B', format: 'int', answer: String(diff) },
      { key: 's31', label: 'Sign bit S₃₁', format: 'int', answer: String(diff < 0 ? 1 : 0) },
      { key: 'y', label: 'Y (SLT output)', format: 'int', answer: String(a < b ? 1 : 0) },
    ],
  }
}

// ── Derive the Boolean equation from a truth table (graded by equivalence) ──
export function buildDerive(expr: string, vars: string[]): WorkedDerive | null {
  const t = buildTruthTable(expr, vars)
  if (!t) return null
  const md = '| ' + t.columns.join(' | ') + ' |\n|' + t.columns.map(() => '---').join('|') + '|\n' +
    t.solution.map(r => '| ' + r.join(' | ') + ' |').join('\n')
  return {
    question: `Write the Boolean equation for **Y** given this truth table:\n\n${md}\n\nAny algebraically-equivalent expression is accepted.`,
    topic: 'Boolean Equations',
    explanation: `A correct sum-of-products reads the rows where Y = 1. One correct form is Y = ${expr}. (Any equivalent expression is accepted.)`,
    variables: vars,
    referenceEquation: expr,
  }
}
