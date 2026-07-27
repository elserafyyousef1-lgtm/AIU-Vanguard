// src/lib/ai/grading.ts
// ───────────────────────────────────────────────────────────
// Deterministic, offline graders for the professor's worked-problem question
// types (no LLM call — objective, instant, partial-credit). Shared by the exam
// UI (grade as you review) and the server submit route (authoritative score).
//
//   fill_table     → truth tables, restoring-division traces, ALU F2:0 tables
//   compute_value  → IEEE-754 hex, SLT result, any set of scalar sub-answers
//   derive_equation→ CMOS → Boolean, graded by truth-table EQUIVALENCE (accepts
//                    any algebraically-equivalent expression), not string match
// ───────────────────────────────────────────────────────────

export type CellFormat = 'binary' | 'hex' | 'int' | 'text'
export type FieldFormat = CellFormat | 'hex32' | 'bin' | 'frac'

// ── shared normalizer ──────────────────────────────────────
export function normValue(raw: unknown, fmt: string): string {
  let s = (raw ?? '').toString().trim()
  if (fmt === 'hex32' || fmt === 'hex') {
    s = s.replace(/^0x/i, '').replace(/\s+/g, '').toUpperCase()
    return fmt === 'hex32' ? s.replace(/^0+/, '').padStart(8, '0') : (s.replace(/^0+(?=.)/, '') || '0')
  }
  if (fmt === 'int') {
    const n = parseInt(s.replace(/[^0-9+-]/g, ''), 10)
    return Number.isFinite(n) ? String(n) : '∅'
  }
  if (fmt === 'binary' || fmt === 'bin') {
    return s.replace(/\s+/g, '').replace(/^0+(?=.)/, '') || '0'   // strip spaces + leading zeros
  }
  if (fmt === 'frac') return s.replace(/\s+/g, '')
  // text: whitespace-collapsed, case-insensitive
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

// ── fill_table ─────────────────────────────────────────────
export interface FillTablePayload {
  columns: string[]
  givens?: { r: number; c: number; value: string }[]  // pre-filled, read-only cells
  solution: string[][]                                  // the full correct grid
  cellFormat?: CellFormat                               // default format for all cells
  colFormats?: CellFormat[]                             // per-column format; overrides cellFormat
}
export interface FillTableResult { score: number; max: number; cellResults: boolean[][] }

export function gradeFillTable(p: FillTablePayload, student: string[][]): FillTableResult {
  const given = new Set((p.givens || []).map(g => g.r + ',' + g.c))
  const cellResults: boolean[][] = []
  let score = 0, max = 0
  for (let r = 0; r < p.solution.length; r++) {
    cellResults[r] = []
    for (let c = 0; c < p.solution[r].length; c++) {
      if (given.has(r + ',' + c)) { cellResults[r][c] = true; continue }  // given → not graded
      max++
      const fmt = (p.colFormats && p.colFormats[c]) || p.cellFormat || 'text'
      const ok = normValue((student[r] || [])[c], fmt) === normValue(p.solution[r][c], fmt)
      cellResults[r][c] = ok
      if (ok) score++
    }
  }
  return { score, max, cellResults }
}

// ── compute_value ──────────────────────────────────────────
export interface ComputeField { key: string; label: string; format: FieldFormat; answer: string }
export interface ComputeValuePayload { fields: ComputeField[] }
export interface ComputeValueResult { score: number; max: number; fieldResults: { key: string; ok: boolean }[] }

export function gradeComputeValue(p: ComputeValuePayload, student: Record<string, string>): ComputeValueResult {
  const fieldResults = p.fields.map(f => ({ key: f.key, ok: normValue(student[f.key], f.format) === normValue(f.answer, f.format) }))
  return { score: fieldResults.filter(x => x.ok).length, max: p.fields.length, fieldResults }
}

// ── derive_equation: Boolean-expression evaluator + equivalence ────
// Grammar (lowest→highest precedence): OR (+ |) · XOR (^) · AND (& . * or juxtaposition) · NOT (! ~ prefix, ' postfix) · atom.
// Variables are single letters (case-insensitive), matched against the provided list.
function evalBool(expr: string, vars: string[], assign: Record<string, 0 | 1>): 0 | 1 {
  const varSet = new Set(vars.map(v => v.toUpperCase()))
  let i = 0
  const s = expr
  let steps = 0
  const guard = () => { if (++steps > 100000) throw new Error('parse loop') }
  const skip = () => { while (i < s.length && /\s/.test(s[i])) i++ }
  // atom: variable | ( expr ) | constant 0/1 | NOT atom ; supports postfix ' (NOT)
  function atom(): 0 | 1 {
    skip()
    let val: 0 | 1
    const ch = s[i]
    if (ch === '!' || ch === '~') { i++; val = atom() ? 0 : 1 }
    else if (ch === '(') {
      i++; val = orExpr(); skip()
      if (s[i] === ')') i++; else throw new Error('missing )')
    } else if (ch === '0' || ch === '1') { i++; val = ch === '1' ? 1 : 0 }
    else if (/[A-Za-z]/.test(ch)) {
      const V = ch.toUpperCase(); i++
      if (!varSet.has(V)) throw new Error('unknown var ' + ch)
      val = assign[V]
    } else throw new Error('unexpected ' + ch)
    // postfix NOT: A'  (may repeat)
    skip()
    while (s[i] === "'" || s[i] === '′') { i++; val = val ? 0 : 1; skip() }
    return val
  }
  // NOTE: always call the sub-parser into a variable BEFORE combining. Writing
  // `val && atom()` would short-circuit and skip atom() whenever val is 0, so the
  // parser wouldn't consume its operand → infinite loop / misparse.
  function andExpr(): 0 | 1 {
    let val = atom()
    for (;;) {
      guard(); skip()
      const ch = s[i]
      if (ch === '&' || ch === '.' || ch === '*') { i++; const r = atom(); val = (val && r) ? 1 : 0; continue }
      // juxtaposition (implicit AND): next atom starts a var/(/!/~/0/1
      if (ch && /[A-Za-z(!~01]/.test(ch)) { const r = atom(); val = (val && r) ? 1 : 0; continue }
      return val
    }
  }
  function xorExpr(): 0 | 1 {
    let val = andExpr()
    for (;;) { guard(); skip(); if (s[i] === '^') { i++; const r = andExpr(); val = (val ^ r) as 0 | 1 } else return val }
  }
  function orExpr(): 0 | 1 {
    let val = xorExpr()
    for (;;) { guard(); skip(); const ch = s[i]; if (ch === '+' || ch === '|') { i++; const r = xorExpr(); val = (val || r) ? 1 : 0 } else return val }
  }
  const out = orExpr(); skip()
  if (i < s.length) throw new Error('trailing ' + s.slice(i))
  return out
}

// Truth-vector of an expression over all 2^n assignments (MSB = first variable).
function truthVector(expr: string, vars: string[]): string {
  const n = vars.length
  let out = ''
  for (let m = 0; m < (1 << n); m++) {
    const assign: Record<string, 0 | 1> = {}
    for (let b = 0; b < n; b++) assign[vars[b].toUpperCase()] = ((m >> (n - 1 - b)) & 1) as 0 | 1
    out += String(evalBool(expr, vars, assign))
  }
  return out
}

// Public: the output column ('0'/'1' per row, MSB = first variable) of a Boolean
// expression over all 2^n input rows. Deterministic — used to build correct
// truth-table answer keys instead of trusting a model's key.
export function truthColumn(expr: string, vars: string[]): string[] {
  return truthVector((expr || '').replace(/^\s*[A-Za-z]\w*\s*=/, '').trim(), vars).split('')
}

export interface DeriveEquationPayload { variables: string[]; referenceEquation: string }
export interface DeriveEquationResult { correct: boolean; reason: string }

// Grade a student's Boolean equation as EQUIVALENT to the reference iff they produce
// the same output for every input combination. Any algebraic form is accepted.
export function gradeDeriveEquation(p: DeriveEquationPayload, studentEquation: string): DeriveEquationResult {
  const vars = p.variables
  const strip = (s: string) => (s || '').replace(/^\s*[A-Za-z]\w*\s*=/, '').trim()  // drop a leading "Y ="
  let ref: string
  try { ref = truthVector(strip(p.referenceEquation), vars) }
  catch (e: any) { return { correct: false, reason: 'reference parse error: ' + e.message } }
  let stu: string
  try { stu = truthVector(strip(studentEquation), vars) }
  catch (e: any) { return { correct: false, reason: "couldn't parse your equation: " + e.message } }
  return stu === ref
    ? { correct: true, reason: 'equivalent to the reference for all inputs' }
    : { correct: false, reason: 'not equivalent (differs on some input rows)' }
}
