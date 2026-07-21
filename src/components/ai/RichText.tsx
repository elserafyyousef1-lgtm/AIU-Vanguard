'use client'
// src/components/ai/RichText.tsx
// Lightweight renderer for the AI tutor's markdown-ish answers — code fences, headings,
// bullet/numbered lists, **bold**, `inline code`, inline $math$ AND multi-line $$display$$
// blocks (matrices, systems of equations, \boxed answers) via KaTeX.
// No markdown dependency: it covers exactly what a tutor's answer contains, and keeps all
// non-math text going through React (auto-escaped) so it stays XSS-safe.
import katex from 'katex'
import 'katex/dist/katex.min.css'  // so the tutor's math is styled wherever the panel opens

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
))

function math(tex: string, display: boolean): string {
  // KaTeX HTML is safe. If it throws (rare, throwOnError:false usually handles bad input), fall
  // back to the ESCAPED source so nothing raw ever reaches dangerouslySetInnerHTML (no XSS).
  try { return katex.renderToString(tex, { displayMode: display, throwOnError: false }) }
  catch { return esc(tex) }
}

// Normalize the LaTeX delimiters some models emit (\[ \], \( \)) to $$ and $ so they render.
function normalizeMath(s: string): string {
  return s
    .replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$')
    .replace(/\\\(/g, '$').replace(/\\\)/g, '$')
}

// One line of prose → React nodes (bold / inline code / inline math / plain).
function inline(text: string, k: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /(\$[^$\n]+\$|\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0, m: RegExpExecArray | null, i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('$')) out.push(<span key={k + i} dangerouslySetInnerHTML={{ __html: math(t.slice(1, -1), false) }} />)
    else if (t.startsWith('**')) out.push(<strong key={k + i}>{t.slice(2, -2)}</strong>)
    else out.push(<code key={k + i} style={{ background: 'var(--s4)', padding: '1px 5px', borderRadius: 5, fontFamily: 'var(--font-mono)', fontSize: '0.88em' }}>{t.slice(1, -1)}</code>)
    last = m.index + t.length; i++
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

// Prose (no code fences, no display math) → block nodes: headings, lists, paragraphs.
function renderProse(text: string, key: string): React.ReactNode[] {
  const blocks: React.ReactNode[] = []
  const lines = text.split('\n')
  let list: React.ReactNode[] = []
  const flush = () => { if (list.length) { blocks.push(<ul key={key + 'u' + blocks.length} style={{ margin: '4px 0', paddingLeft: 20 }}>{list}</ul>); list = [] } }
  lines.forEach((line, li) => {
    const t = line.trim()
    if (!t) { flush(); return }
    const b = t.match(/^[-*]\s+(.*)/) || t.match(/^\d+\.\s+(.*)/)
    if (b) { list.push(<li key={key + 'l' + li} style={{ marginBottom: 3 }}>{inline(b[1], key + li + '-')}</li>); return }
    flush()
    const h = t.match(/^(#{1,3})\s+(.*)/)
    if (h) { blocks.push(<div key={key + 'h' + li} style={{ fontWeight: 800, margin: '8px 0 3px', fontSize: h[1].length === 1 ? '1.05em' : '1em' }}>{inline(h[2], key + li + '-')}</div>); return }
    blocks.push(<div key={key + 'p' + li} style={{ marginBottom: 3 }}>{inline(line, key + li + '-')}</div>)
  })
  flush()
  return blocks
}

export function RichText({ content }: { content: string }) {
  const blocks: React.ReactNode[] = []
  normalizeMath(content).split(/```/).forEach((part, pi) => {
    // Odd segments are fenced code blocks.
    if (pi % 2 === 1) {
      const code = part.replace(/^[a-zA-Z0-9]*\n/, '').replace(/\n$/, '')
      blocks.push(
        <pre key={'c' + pi} style={{ background: 'var(--s1)', border: '1px solid var(--br)', borderRadius: 10, padding: '10px 12px', overflowX: 'auto', fontSize: '0.85em', fontFamily: 'var(--font-mono)', margin: '6px 0', lineHeight: 1.5 }}>
          <code>{code}</code>
        </pre>
      )
      return
    }
    // Within prose, split on $$ so DISPLAY math (which may span many lines — matrices,
    // systems, \boxed answers) is rendered as its own centered block. Odd = display math.
    part.split(/\$\$/).forEach((seg, si) => {
      if (si % 2 === 1) {
        const tex = seg.trim()
        if (!tex) return
        blocks.push(
          <div key={'m' + pi + '-' + si} style={{ overflowX: 'auto', margin: '8px 0', textAlign: 'center' }}
               dangerouslySetInnerHTML={{ __html: math(tex, true) }} />
        )
        return
      }
      if (seg) blocks.push(...renderProse(seg, pi + '-' + si + '-'))
    })
  })
  return <>{blocks}</>
}
