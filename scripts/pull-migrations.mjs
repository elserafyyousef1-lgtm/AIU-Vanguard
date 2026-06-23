// Pulls the real remote migration history into local supabase/migrations/
// via a temporary SECURITY DEFINER RPC (no CLI / DB password needed).
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data, error } = await supabase.rpc('_export_migrations')
if (error) { console.error('RPC error:', error.message); process.exit(1) }

mkdirSync('supabase/migrations', { recursive: true })
let n = 0
for (const row of data) {
  writeFileSync(`supabase/migrations/${row.f}.sql`, (row.s || '').replace(/\r\n/g, '\n').trim() + '\n')
  n++
}
console.log('Wrote', n, 'migration files to supabase/migrations/')
