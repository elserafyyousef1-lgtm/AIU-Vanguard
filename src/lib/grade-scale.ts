// src/lib/grade-scale.ts
// Letter-grade mapping. Default scale is overridable per course via courses.grade_scale (jsonb).
export interface ScaleRow { min: number; letter: string }

export const DEFAULT_SCALE: ScaleRow[] = [
  { min: 90, letter: 'A' },
  { min: 85, letter: 'A-' },
  { min: 80, letter: 'B+' },
  { min: 75, letter: 'B' },
  { min: 70, letter: 'B-' },
  { min: 65, letter: 'C+' },
  { min: 60, letter: 'C' },
  { min: 55, letter: 'C-' },
  { min: 50, letter: 'D' },
  { min: 0, letter: 'F' },
]

export function letterGrade(percent: number | null | undefined, scale?: ScaleRow[] | null): string {
  if (percent == null || isNaN(percent as number)) return '—'
  const s = (Array.isArray(scale) && scale.length ? scale : DEFAULT_SCALE).slice().sort((a, b) => b.min - a.min)
  for (const r of s) if (percent >= r.min) return r.letter
  return s[s.length - 1]?.letter ?? 'F'
}

// Colour cue for a letter (UI only).
export function letterColor(letter: string): string {
  if (letter.startsWith('A')) return '#10b981'
  if (letter.startsWith('B')) return '#06b6d4'
  if (letter.startsWith('C')) return '#f59e0b'
  if (letter.startsWith('D')) return '#f97316'
  if (letter.startsWith('F')) return '#ef4444'
  return 'var(--t3)'
}
