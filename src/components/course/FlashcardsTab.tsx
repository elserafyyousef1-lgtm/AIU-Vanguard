'use client'
// src/components/course/FlashcardsTab.tsx
import { useState } from 'react'
import type { FlashCard } from '@/types'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'

interface Props { cards: FlashCard[] }

export function FlashcardsTab({ cards }: Props) {
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState<Set<number>>(new Set())

  const card = cards[current]
  const progress = (reviewed.size / cards.length) * 100

  const goNext = () => {
    setReviewed(prev => new Set(Array.from(prev).concat(current)))
    setFlipped(false)
    setTimeout(() => setCurrent(c => Math.min(c + 1, cards.length - 1)), 50)
  }

  const goPrev = () => {
    setFlipped(false)
    setTimeout(() => setCurrent(c => Math.max(c - 1, 0)), 50)
  }

  const reset = () => {
    setCurrent(0)
    setFlipped(false)
    setReviewed(new Set())
  }

  return (
    <div>
      {/* Progress */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:13, color:'var(--t2)', fontWeight:500 }}>
            Card {current + 1} of {cards.length}
          </span>
          <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--t3)' }}>
            {reviewed.size} reviewed
          </span>
        </div>
        <div style={{ height:3, background:'var(--s3)', borderRadius:2, overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:2,
            background:'linear-gradient(90deg, var(--accent-green), var(--accent))',
            width:`${progress}%`, transition:'width 0.3s var(--ease-out)',
          }} />
        </div>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped(!flipped)}
        style={{
          position:'relative', height:280, cursor:'pointer',
          perspective:1000, marginBottom:24,
        }}
      >
        <div style={{
          position:'absolute', inset:0,
          transformStyle:'preserve-3d',
          transition:'transform 0.4s var(--ease-out)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>
          {/* Front */}
          <div style={{
            position:'absolute', inset:0,
            backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
            background:'var(--s2)', border:'1px solid var(--br)',
            borderRadius:20, padding:32,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          }}>
            <div style={{
              fontFamily:'var(--font-mono)', fontSize:10, color:'var(--accent)',
              letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:16,
            }}>Tap to reveal</div>
            <h3 style={{
              fontSize:'clamp(18px,3vw,24px)', fontWeight:700, color:'var(--t)',
              textAlign:'center', letterSpacing:'-0.02em',
            }}>{card.t}</h3>
          </div>

          {/* Back */}
          <div style={{
            position:'absolute', inset:0,
            backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
            transform:'rotateY(180deg)',
            background:'var(--s2)',
            border:'1px solid var(--accent-br)',
            borderRadius:20, padding:24,
            display:'flex', flexDirection:'column', justifyContent:'center',
            overflow:'auto',
          }}>
            <h4 style={{ fontSize:13, fontWeight:700, color:'var(--accent)', marginBottom:14 }}>{card.t}</h4>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {card.i.map(({ k, v }) => (
                <div key={k} style={{ display:'flex', gap:10 }}>
                  <span style={{
                    fontFamily:'var(--font-mono)', fontSize:10, fontWeight:600,
                    color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.05em',
                    flexShrink:0, minWidth:60, paddingTop:1,
                  }}>{k}</span>
                  <span style={{ fontSize:13, color:'var(--t)', fontFamily:'var(--font-mono)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
        <button
          onClick={goPrev}
          disabled={current === 0}
          style={{
            width:44, height:44, borderRadius:12,
            background:'var(--s2)', border:'1px solid var(--br)',
            color: current === 0 ? 'var(--t3)' : 'var(--t2)',
            cursor: current === 0 ? 'not-allowed' : 'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--font)',
          }}
        ><ChevronLeft size={18} /></button>

        <button
          onClick={reset}
          style={{
            padding:'10px 20px', borderRadius:12,
            background:'var(--s3)', border:'1px solid var(--br)',
            color:'var(--t2)', fontSize:13, cursor:'pointer',
            display:'flex', alignItems:'center', gap:6,
            fontFamily:'var(--font)',
          }}
        ><RotateCcw size={13} /> Reset</button>

        <button
          onClick={goNext}
          disabled={current === cards.length - 1}
          style={{
            width:44, height:44, borderRadius:12,
            background: current < cards.length - 1 ? 'var(--accent)' : 'var(--s2)',
            border:'1px solid var(--br)',
            color: current < cards.length - 1 ? 'white' : 'var(--t3)',
            cursor: current === cards.length - 1 ? 'not-allowed' : 'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--font)',
          }}
        ><ChevronRight size={18} /></button>
      </div>

      {/* All cards grid */}
      <div style={{ marginTop:40 }}>
        <h3 style={{ fontWeight:700, color:'var(--t)', fontSize:15, marginBottom:16 }}>
          All {cards.length} Flashcards
        </h3>
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',
          gap:10,
        }}>
          {cards.map((c, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setFlipped(false); window.scrollTo({top:0, behavior:'smooth'}) }}
              style={{
                padding:'12px 16px', borderRadius:10, textAlign:'left',
                background: i === current ? 'rgba(99,102,241,0.1)' :
                             reviewed.has(i) ? 'rgba(16,185,129,0.05)' : 'var(--s2)',
                border:`1px solid ${i === current ? 'rgba(99,102,241,0.4)' :
                                    reviewed.has(i) ? 'rgba(16,185,129,0.2)' : 'var(--br)'}`,
                cursor:'pointer', fontFamily:'var(--font)',
                transition:'all 0.12s',
              }}
            >
              <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--t3)', marginBottom:4 }}>
                #{i+1} {reviewed.has(i) ? '✓' : ''}
              </div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--t)', lineHeight:1.4 }}>{c.t}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
