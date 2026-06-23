import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(
  readFileSync('.env.local','utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
async function embed(text) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent', {
    method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
    body: JSON.stringify({ model:'models/gemini-embedding-001', content:{parts:[{text}]}, taskType:'RETRIEVAL_QUERY', outputDimensionality:768 })
  })
  const j = await r.json(); return j.embedding.values
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const emb = await embed('what is database normalization')
const asString = await supabase.rpc('match_course_chunks', { query_embedding: JSON.stringify(emb), p_course:'CSE221', match_count:3 })
console.log('STRING format ->', asString.error ? ('ERR: '+asString.error.message.slice(0,90)) : ('OK rows='+(asString.data?.length??0)))
const asArray = await supabase.rpc('match_course_chunks', { query_embedding: emb, p_course:'CSE221', match_count:3 })
console.log('ARRAY  format ->', asArray.error ? ('ERR: '+asArray.error.message.slice(0,90)) : ('OK rows='+(asArray.data?.length??0)))
