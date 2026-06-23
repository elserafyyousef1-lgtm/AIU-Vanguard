import { readFileSync } from 'fs'
const env = Object.fromEntries(
  readFileSync('.env.local','utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
const key = env.GEMINI_API_KEY
const lr = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': key } })
const lj = await lr.json()
const emb = (lj.models||[]).filter(m => (m.supportedGenerationMethods||[]).includes('embedContent')).map(m => m.name)
console.log('EMBED_MODELS', JSON.stringify(emb))
for (const model of emb) {
  for (const dim of [768, null]) {
    const payload = { model, content: { parts: [{ text: 'database normalization' }] } }
    if (dim) payload.outputDimensionality = dim
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:embedContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(payload)
    })
    const j = await r.json()
    console.log(model, 'req='+(dim||'default'), '->', r.status, 'dims=', j.embedding?.values?.length || ('ERR:'+(j.error?.message||'').slice(0,60)))
    if (dim === null) break
  }
}
