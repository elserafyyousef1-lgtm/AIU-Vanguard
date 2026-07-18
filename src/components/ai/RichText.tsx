'use client'
// src/components/ai/RichText.tsx
// Lightweight renderer for the AI tutor's markdown-ish answers — code fences, headings,
// bullet/numbered lists, **bold**, `inline code`, and $inline$/$$display$$ math (KaTeX).
// No markdown dependency: it covers exactly what a tutor's answer contains, and keeps all
// non-math text going through React (auto-escaped) so it stays XSS-safe.
import katex from 'katex'
import 'katex/dist/katex.min.css'  // so the tutor's math is styled wherever the panel opens

function math(tex: string, display: boolean): string {
  try { return katex.renderToString(tex, { displayMode: display, throwOnError: false }) }
  catch { return tex }
}

// One line of prose → React nodes (bold / inline code / inline+display math / plain).
function inline(text: string, k: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /(\$\$[^$]+\$\$|\$[^$\n]+\$|\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0, m: RegExpExecArray | null, i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('$$')) out.push(<span key={k + i} dangerouslySetInnerHTML={{ __html: math(t.slice(2, -2), true) }} />)
    else if (t.startsWith('$')) out.push(<span key={k + i} dangerouslySetInnerHTML={{ __html: math(t.slice(1, -1), false) }} />)
    else if (t.startsWith('**')) out.push(<strong key={k + i}>{t.slice(2, -2)}</strong>)
    else out.push(<code key={k + i} style={{ background: 'var(--s4)', padding: '1px 5px', borderRadius: 5, fontFamily: 'var(--font-mono)', fontSize: '0.88em' }}>{t.slice(1, -1)}</code>)
    last = m.index + t.length; i++
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function RichText({ content }: { content: string }) {
  const blocks: React.ReactNode[] = []
  content.split(/```/).forEach((part, pi) => {
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
    const lines = part.split('\n')
    let list: React.ReactNode[] = []
    const flush = () => { if (list.length) { blocks.push(<ul key={'u' + pi + '-' + blocks.length} style={{ margin: '4px 0', paddingLeft: 20 }}>{list}</ul>); list = [] } }
    lines.forEach((line, li) => {
      const t = line.trim()
      if (!t) { flush(); return }
      const b = t.match(/^[-*]\s+(.*)/) || t.match(/^\d+\.\s+(.*)/)
      if (b) { list.push(<li key={pi + '-' + li} style={{ marginBottom: 3 }}>{inline(b[1], pi + '-' + li + '-')}</li>); return }
      flush()
      const h = t.match(/^#{1,3}\s+(.*)/)
      if (h) { blocks.push(<div key={pi + '-' + li} style={{ fontWeight: 800, margin: '7px 0 2px' }}>{inline(h[1], pi + '-' + li + '-')}</div>); return }
      blocks.push(<div key={pi + '-' + li} style={{ marginBottom: 3 }}>{inline(line, pi + '-' + li + '-')}</div>)
    })
    flush()
  })
  return <>{blocks}</>
}
