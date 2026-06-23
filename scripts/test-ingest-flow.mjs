// Real end-to-end test of the ingestion FLOW (no browser):
// generate a PDF -> extract text with unpdf (same lib as the route) -> embed via Gemini.
import { readFileSync } from 'fs'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { extractText, getDocumentProxy } from 'unpdf'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

// 1) Build a PDF with real text
const pdf = await PDFDocument.create()
const page = pdf.addPage([600, 800])
const font = await pdf.embedFont(StandardFonts.Helvetica)
const lines = [
  'Database Indexing',
  'An index is a data structure that improves the speed of data retrieval on a table.',
  'A B-tree index keeps keys sorted, enabling logarithmic lookups, range scans and ordering.',
  'A hash index supports fast equality lookups but not range queries.',
  'Indexes add write overhead and storage cost, so they must be chosen carefully.',
]
lines.forEach((l, i) => page.drawText(l, { x: 50, y: 740 - i * 24, size: 12, font }))
const bytes = await pdf.save()
console.log('1) PDF generated:', bytes.length, 'bytes')

// 2) Extract with unpdf (exactly what the ingest route does)
const doc = await getDocumentProxy(new Uint8Array(bytes))
const { text } = await extractText(doc, { mergePages: true })
const full = Array.isArray(text) ? text.join('\n') : text
console.log('2) unpdf extracted:', full.length, 'chars')
console.log('   preview:', JSON.stringify(full.slice(0, 100)))

// 3) Embed the extracted text via Gemini (network + key + dims)
const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
  body: JSON.stringify({ model: 'models/gemini-embedding-001', content: { parts: [{ text: full.slice(0, 1000) }] }, taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: 768 })
})
const j = await r.json()
const dims = j.embedding?.values?.length || 0
console.log('3) Gemini embedding:', r.status, 'dims=', dims)
console.log('\nRESULT:', (full.length > 60 && dims === 768) ? 'FLOW_OK ✅' : 'FLOW_FAIL ❌')
