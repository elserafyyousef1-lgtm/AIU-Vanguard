import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(
  readFileSync('.env.local','utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
async function embed(text, task) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent', {
    method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
    body: JSON.stringify({ model:'models/gemini-embedding-001', content:{parts:[{text}]}, taskType:task, outputDimensionality:768 })
  })
  const j = await r.json()
  if (!j.embedding) throw new Error('embed failed: ' + JSON.stringify(j).slice(0,160))
  return j.embedding.values
}
const lit = a => '[' + a.join(',') + ']'
const COURSE = '__ragtest__'
const docId = randomUUID()
const docs = [
  'Database normalization is the process of structuring a relational database to reduce data redundancy and improve data integrity, using normal forms such as 1NF, 2NF, 3NF and BCNF.',
  'A SQL JOIN clause combines rows from two or more tables based on a related column. Common types are INNER JOIN, LEFT JOIN, RIGHT JOIN and FULL OUTER JOIN.',
  'An ER diagram (entity relationship diagram) shows entities, their attributes and the relationships between them, and is used during conceptual database design.'
]
await supabase.from('course_documents').insert({ id: docId, course: COURSE, title: 'RAG E2E Test', status: 'ready' })
for (let i = 0; i < docs.length; i++) {
  const e = await embed(docs[i], 'RETRIEVAL_DOCUMENT')
  const { error } = await supabase.from('document_chunks').insert({ document_id: docId, course: COURSE, content: docs[i], embedding: lit(e), chunk_index: i })
  if (error) { console.log('INSERT ERR', error.message); process.exit(1) }
}
console.log('Seeded 3 chunks. Now querying...')
const queries = ['what technique reduces redundant data in a database?', 'إزاي بجمع بيانات من جدولين مختلفين؟']
for (const q of queries) {
  const qe = await embed(q, 'RETRIEVAL_QUERY')
  const { data, error } = await supabase.rpc('match_course_chunks', { query_embedding: qe, p_course: COURSE, match_count: 3 })
  console.log('\nQ:', q)
  if (error) { console.log('  RPC ERR', error.message); continue }
  ;(data||[]).forEach(d => console.log('  sim=' + Number(d.similarity).toFixed(3), '| ' + d.content.slice(0, 60)))
}
