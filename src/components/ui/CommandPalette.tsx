'use client'
// src/components/ui/CommandPalette.tsx
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/lib/store'
import { Search } from 'lucide-react'

const COMMANDS = [
  { label:'🏠 Home', path:'/', group:'Navigation' },
  { label:'📊 Dashboard', path:'/dashboard', group:'Navigation' },
  { label:'📚 Courses', path:'/semesters/4', group:'Navigation' },
  { label:'💬 Community', path:'/community', group:'Navigation' },
  { label:'✉️ Messages', path:'/messages', group:'Navigation' },
  { label:'⚙️ Settings', path:'/settings', group:'Account' },
]

export function CommandPalette() {
  const { cmdOpen, setCmdOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const filtered = query
    ? COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : COMMANDS

  useEffect(() => {
    if (cmdOpen) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [cmdOpen])

  useEffect(() => {
    if (!cmdOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCmdOpen(false)
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s+1, filtered.length-1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s-1, 0)) }
      if (e.key === 'Enter' && filtered[selected]) {
        router.push(filtered[selected].path)
        setCmdOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cmdOpen, selected, filtered, router, setCmdOpen])

  if (!cmdOpen) return null

  const groups = Array.from(new Set(filtered.map(c => c.group)))

  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:700,
        background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)',
        display:'flex', alignItems:'flex-start', justifyContent:'center',
        paddingTop:'12vh', padding:'12vh 20px 20px',
        animation:'fadeIn 0.15s',
      }}
      onClick={e => e.target === e.currentTarget && setCmdOpen(false)}
    >
      <div style={{
        width:'min(560px,100%)',
        background:'var(--s2)',
        border:'1px solid var(--br2)',
        borderRadius:18,
        boxShadow:'0 20px 60px rgba(0,0,0,0.6)',
        overflow:'hidden',
        animation:'scaleIn 0.2s var(--ease-spring)',
      }}>
        {/* Search input */}
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          padding:'14px 18px',
          borderBottom:'1px solid var(--br)',
        }}>
          <Search size={16} color="var(--t3)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            placeholder="Search topics, lectures, pages..."
            style={{
              flex:1, background:'none', border:'none', outline:'none',
              color:'var(--t)', fontSize:15, fontFamily:'var(--font)',
              caretColor:'var(--accent)',
            }}
          />
          <kbd style={{
            fontFamily:'var(--font-mono)', fontSize:10,
            background:'var(--s3)', border:'1px solid var(--br2)',
            padding:'2px 6px', borderRadius:5, color:'var(--t3)',
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight:320, overflowY:'auto', padding:'8px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding:'20px', textAlign:'center', color:'var(--t3)', fontSize:13 }}>
              No results found
            </div>
          ) : (
            groups.map(group => (
              <div key={group}>
                <div style={{
                  padding:'6px 18px 4px',
                  fontSize:10, fontFamily:'var(--font-mono)',
                  color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.08em',
                }}>{group}</div>
                {filtered.filter(c => c.group === group).map((cmd, gi) => {
                  const globalIdx = filtered.indexOf(cmd)
                  return (
                    <div
                      key={cmd.path}
                      onClick={() => { router.push(cmd.path); setCmdOpen(false) }}
                      style={{
                        padding:'10px 18px',
                        background: globalIdx === selected ? 'var(--s3)' : 'transparent',
                        cursor:'pointer', fontSize:14, color:'var(--t)',
                        transition:'background 0.1s',
                      }}
                      onMouseEnter={() => setSelected(globalIdx)}
                    >{cmd.label}</div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding:'8px 18px',
          borderTop:'1px solid var(--br)',
          display:'flex', gap:16,
          fontSize:11, color:'var(--t3)', fontFamily:'var(--font-mono)',
        }}>
          <span><kbd style={{ padding:'1px 5px', background:'var(--s3)', borderRadius:4, border:'1px solid var(--br2)' }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ padding:'1px 5px', background:'var(--s3)', borderRadius:4, border:'1px solid var(--br2)' }}>↵</kbd> open</span>
          <span><kbd style={{ padding:'1px 5px', background:'var(--s3)', borderRadius:4, border:'1px solid var(--br2)' }}>ESC</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
