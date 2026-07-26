// src/lib/ai/pptx.ts
// ───────────────────────────────────────────────────────────
// Dependency-free .pptx (PowerPoint / Office Open XML) text extractor.
//
// A .pptx is a ZIP archive; the slide text lives in ppt/slides/slideN.xml
// inside <a:t>…</a:t> runs. We read the ZIP's central directory (always
// carries correct sizes/offsets, even for streamed zips), inflate each
// slide entry with Node's built-in zlib, and pull the text runs out in
// slide order. No third-party package — runs in the Node.js runtime.
// ───────────────────────────────────────────────────────────
import { inflateRawSync } from 'node:zlib'

const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8)
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0

const decoder = new TextDecoder('utf-8')

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&')   // last, so "&amp;lt;" doesn't double-decode
}

// Pull visible text from one slide's XML. Paragraph breaks (</a:p>) become
// newlines so bullet structure survives; each <a:t> run is a piece of text.
function slideText(xml: string): string {
  const paras = xml.split(/<\/a:p>/)
  const lines: string[] = []
  for (const p of paras) {
    // <a:t> is a plain text element (never has attributes, never nested markup),
    // so match the exact tag with text-only content — matching <a:t[^>]*> would
    // also catch siblings like <a:tailEnd/> / <a:tabLst> and swallow markup.
    const runs = [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => decodeEntities(m[1]))
    const line = runs.join('').replace(/\s+/g, ' ').trim()
    if (line) lines.push(line)
  }
  return lines.join('\n')
}

/**
 * Extract all slide text from a .pptx byte buffer, in slide order.
 * Returns '' if the archive has no readable slides.
 */
export function extractPptxText(bytes: Uint8Array): string {
  const n = bytes.length
  if (n < 22) return ''

  // 1) Locate the End Of Central Directory record (signature PK\x05\x06),
  //    scanning back from the end past any trailing comment.
  let eocd = -1
  const minStart = Math.max(0, n - 22 - 65557)
  for (let i = n - 22; i >= minStart; i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) { eocd = i; break }
  }
  if (eocd < 0) return ''

  const total = u16(bytes, eocd + 10)
  let ptr = u32(bytes, eocd + 16)   // offset of first central-directory header

  type Entry = { name: string; method: number; compSize: number; localOff: number }
  const slides: Entry[] = []

  // 2) Walk the central directory, keeping only slide XML entries.
  for (let i = 0; i < total; i++) {
    if (ptr + 46 > n || u32(bytes, ptr) !== 0x02014b50) break
    const method = u16(bytes, ptr + 10)
    const compSize = u32(bytes, ptr + 20)
    const nameLen = u16(bytes, ptr + 28)
    const extraLen = u16(bytes, ptr + 30)
    const commentLen = u16(bytes, ptr + 32)
    const localOff = u32(bytes, ptr + 42)
    const name = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen))
    if (/^ppt\/slides\/slide\d+\.xml$/.test(name)) slides.push({ name, method, compSize, localOff })
    ptr += 46 + nameLen + extraLen + commentLen
  }

  // 3) Sort by slide number so text comes out in presentation order.
  slides.sort((a, b) => {
    const na = parseInt(a.name.match(/slide(\d+)\.xml$/)![1], 10)
    const nb = parseInt(b.name.match(/slide(\d+)\.xml$/)![1], 10)
    return na - nb
  })

  // 4) Inflate each slide and pull its text.
  const out: string[] = []
  for (const s of slides) {
    // Local file header: data begins after 30 + nameLen + extraLen bytes.
    if (u32(bytes, s.localOff) !== 0x04034b50) continue
    const lNameLen = u16(bytes, s.localOff + 26)
    const lExtraLen = u16(bytes, s.localOff + 28)
    const dataStart = s.localOff + 30 + lNameLen + lExtraLen
    const raw = bytes.subarray(dataStart, dataStart + s.compSize)
    let xml: string
    try {
      const buf = s.method === 0 ? Buffer.from(raw) : inflateRawSync(Buffer.from(raw))
      xml = decoder.decode(buf)
    } catch { continue }
    const t = slideText(xml)
    if (t) out.push(t)
  }

  return out.join('\n\n')
}
