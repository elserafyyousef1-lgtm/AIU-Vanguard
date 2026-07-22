'use client'
// src/components/ai/RichText.tsx
// Premium renderer for the AI tutor's markdown-ish answers. Handles code fences, headings,
// ordered/unordered lists, GFM tables, blockquote callouts, **bold**, `inline code`, links,
// inline $math$ AND multi-line $$display$$ blocks (matrices, systems, \boxed answers) via KaTeX.
// No markdown dependency: it covers exactly what a tutor's answer contains, keeps all non-math
// text going through React (auto-escaped) so it stays XSS-safe, and auto-detects RTL/LTR per
// block so Arabic and English both read naturally.
import katex from 'katex'
import 'katex/dist/katex.min.css'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
))

function math(tex: string, display: boolean): string {
  // KaTeX HTML is safe. If it throws, fall back to the ESCAPED source so nothing raw ever
  // reaches dangerouslySetInnerHTML (no XSS).
  try { return katex.renderToString(tex, { displayMode: display, throwOnError: false }) }
  catch { return esc(tex) }
}

// Normalize the LaTeX delimiters some models emit (\[ \], \( \)) to $$ and $ so they render.
function normalizeMath(s: string): string {
  return s.replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$').replace(/\\\(/g, '$').replace(/\\\)/g, '$')
}

const safeHref = (u: string) => (/^(https?:\/\/|\/|mailto:)/i.test(u) ? u : null)

// One line of prose → React nodes (bold / inline code / inline math / links / plain).
function inline(text: string, k: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /(\$[^$\n]+\$|\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g
  let last = 0, m: RegExpExecArray | null, i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('$')) {
      out.push(<span key={k + i} dangerouslySetInnerHTML={{ __html: math(t.slice(1, -1), false) }} />)
    } else if (t.startsWith('**')) {
      out.push(<strong key={k + i} style={{ fontWeight: 700, color: 'var(--t)' }}>{t.slice(2, -2)}</strong>)
    } else if (t.startsWith('`')) {
      out.push(<code key={k + i} style={{ background: 'var(--s4)', padding: '1.5px 5px', borderRadius: 5, fontFamily: 'var(--font-mono)', fontSize: '0.86em' }}>{t.slice(1, -1)}</code>)
    } else {
      const mm = t.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)!
      const href = safeHref(mm[2])
      out.push(href
        ? <a key={k + i} href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-2)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{mm[1]}</a>
        : mm[1])
    }
    last = m.index + t.length; i++
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const isTableSep = (s: string) => /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(s) && s.includes('-')
const cells = (row: string) => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())

// Prose (no code fences, no display math) → block nodes: headings, lists, tables, quotes, paragraphs.
function renderProse(text: string, key: string): React.ReactNode[] {
  const blocks: React.ReactNode[] = []
  const lines = text.split('\n')
  let list: React.ReactNode[] = []
  let listType: 'ul' | 'ol' = 'ul'
  const flushList = () => {
    if (!list.length) return
    const items = list; list = []
    // NOTE: set listStyleType explicitly — the app's global CSS reset strips list markers, and
    // display:flex would also remove them. Keep it a plain block list with real bullets/numbers.
    const base: React.CSSProperties = { margin: '7px 0', paddingInlineStart: 22, listStylePosition: 'outside' }
    blocks.push(listType === 'ol'
      ? <ol key={key + 'o' + blocks.length} dir="auto" style={{ ...base, listStyleType: 'decimal' }}>{items}</ol>
      : <ul key={key + 'u' + blocks.length} dir="auto" style={{ ...base, listStyleType: 'disc' }}>{items}</ul>)
  }

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    const t = line.trim()
    if (!t) { flushList(); continue }

    // Table: a row with '|' immediately followed by a separator row.
    if (t.includes('|') && li + 1 < lines.length && isTableSep(lines[li + 1])) {
      flushList()
      const header = cells(t)
      const rows: string[][] = []
      let j = li + 2
      while (j < lines.length && lines[j].includes('|') && lines[j].trim()) { rows.push(cells(lines[j])); j++ }
      li = j - 1
      blocks.push(
        <div key={key + 't' + li} style={{ overflowX: 'auto', margin: '8px 0', border: '1px solid var(--br)', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92em' }}>
            <thead><tr>{header.map((h, x) => (
              <th key={x} dir="auto" style={{ textAlign: 'start', padding: '7px 11px', background: 'var(--s2)', color: 'var(--t2)', fontWeight: 700, borderBottom: '1px solid var(--br2)', whiteSpace: 'nowrap' }}>{inline(h, key + 'th' + x)}</th>
            ))}</tr></thead>
            <tbody>{rows.map((r, y) => (
              <tr key={y}>{r.map((c, x) => (
                <td key={x} dir="auto" style={{ padding: '7px 11px', color: 'var(--t2)', borderBottom: y < rows.length - 1 ? '1px solid var(--br)' : 'none', verticalAlign: 'top' }}>{inline(c, key + 'td' + y + '-' + x)}</td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>
      )
      continue
    }

    // Blockquote → callout
    if (t.startsWith('>')) {
      flushList()
      const quote: string[] = []
      let j = li
      while (j < lines.length && lines[j].trim().startsWith('>')) { quote.push(lines[j].trim().replace(/^>\s?/, '')); j++ }
      li = j - 1
      blocks.push(
        <div key={key + 'q' + li} dir="auto" style={{ margin: '8px 0', padding: '9px 13px', background: 'var(--s2)', borderInlineStart: '3px solid var(--accent)', borderRadius: '0 8px 8px 0', color: 'var(--t2)', fontSize: '0.96em', lineHeight: 1.6 }}>
          {quote.map((q, x) => <div key={x}>{inline(q, key + 'qi' + x)}</div>)}
        </div>
      )
      continue
    }

    // Lists (ordered vs unordered)
    const ul = t.match(/^[-*]\s+(.*)/)
    const ol = t.match(/^\d+\.\s+(.*)/)
    if (ul || ol) {
      const wanted: 'ul' | 'ol' = ol ? 'ol' : 'ul'
      if (list.length && wanted !== listType) flushList()
      listType = wanted
      list.push(<li key={key + 'li' + li} dir="auto" style={{ lineHeight: 1.55, marginBottom: 4, paddingInlineStart: 3 }}>{inline((ul || ol)![1], key + li + '-')}</li>)
      continue
    }
    flushList()

    // Headings
    const h = t.match(/^(#{1,3})\s+(.*)/)
    if (h) {
      const lvl = h[1].length
      const hStyle: React.CSSProperties = lvl === 1
        ? { fontWeight: 800, fontSize: '1.12em', margin: '12px 0 5px', letterSpacing: '-0.01em', color: 'var(--t)' }
        : lvl === 2
          ? { fontWeight: 800, fontSize: '1.04em', margin: '13px 0 5px', letterSpacing: '-0.01em', color: 'var(--t)' }
          : { fontWeight: 700, fontSize: '0.98em', margin: '9px 0 3px', color: 'var(--t2)' }
      blocks.push(<div key={key + 'h' + li} dir="auto" style={hStyle}>{inline(h[2], key + li + '-')}</div>)
      continue
    }

    // Horizontal rule
    if (/^([-*_])\1{2,}$/.test(t)) { blocks.push(<div key={key + 'hr' + li} style={{ height: 1, background: 'var(--br)', margin: '10px 0' }} />); continue }

    // Paragraph
    blocks.push(<div key={key + 'p' + li} dir="auto" style={{ margin: '0 0 6px', lineHeight: 1.62 }}>{inline(line, key + li + '-')}</div>)
  }
  flushList()
  return blocks
}

export function RichText({ content }: { content: string }) {
  const blocks: React.ReactNode[] = []
  normalizeMath(content).split(/```/).forEach((part, pi) => {
    // Odd segments are fenced code blocks.
    if (pi % 2 === 1) {
      const code = part.replace(/^[a-zA-Z0-9]*\n/, '').replace(/\n$/, '')
      blocks.push(
        <pre key={'c' + pi} dir="ltr" style={{ background: 'var(--s1)', border: '1px solid var(--br2)', borderRadius: 10, padding: '11px 13px', overflowX: 'auto', fontSize: '0.84em', fontFamily: 'var(--font-mono)', margin: '8px 0', lineHeight: 1.55, color: 'var(--t2)' }}>
          <code>{code}</code>
        </pre>
      )
      return
    }
    // Within prose, split on $$ so DISPLAY math (matrices, systems, \boxed answers, which may
    // span many lines) becomes its own centered "card" — the equation feels like a first-class object.
    part.split(/\$\$/).forEach((seg, si) => {
      if (si % 2 === 1) {
        const tex = seg.trim()
        if (!tex) return
        blocks.push(
          <div key={'m' + pi + '-' + si} style={{ margin: '10px 0', padding: '10px 14px', background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 10, overflowX: 'auto', textAlign: 'center' }}
               dangerouslySetInnerHTML={{ __html: math(tex, true) }} />
        )
        return
      }
      if (seg) blocks.push(...renderProse(seg, pi + '-' + si + '-'))
    })
  })
  return <>{blocks}</>
}
