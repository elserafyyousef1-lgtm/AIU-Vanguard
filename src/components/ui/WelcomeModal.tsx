'use client'
// src/components/ui/WelcomeModal.tsx
import { useEffect, useState } from 'react'
import { useUIStore } from '@/lib/store'
import { X, BookOpen, Users, Sparkles, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export function WelcomeModal() {
  const { hasSeenWelcome, setHasSeenWelcome } = useUIStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!hasSeenWelcome) {
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [hasSeenWelcome])

  const close = () => {
    setVisible(false)
    setHasSeenWelcome()
  }

  if (!visible) return null

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:600,
      background:'rgba(0,0,0,0.7)',
      backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:20,
      animation:'fadeIn 0.3s var(--ease-out)',
    }}
    onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div style={{
        width:'min(480px, 100%)',
        background:'var(--s2)',
        border:'1px solid var(--accent-br)',
        borderRadius:24,
        padding:'36px 32px',
        position:'relative',
        animation:'scaleIn 0.3s var(--ease-spring)',
        boxShadow:'0 30px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Close */}
        <button
          onClick={close}
          style={{
            position:'absolute', top:16, right:16,
            width:32, height:32, borderRadius:9,
            background:'var(--s3)', border:'none',
            color:'var(--t2)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
        ><X size={14} /></button>

        {/* Glow */}
        <div style={{
          position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)',
          width:200, height:120,
          background:'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
          pointerEvents:'none',
        }} />

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            width:56, height:56, borderRadius:16,
            background:'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 16px', fontSize:24,
          }}>🎓</div>
          <div style={{
            fontFamily:'var(--font-mono)', fontSize:10, color:'var(--accent)',
            letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8,
          }}>Welcome to</div>
          <h2 style={{
            fontSize:26, fontWeight:800, letterSpacing:'-0.03em',
            color:'var(--t)', lineHeight:1.2,
          }}>AIU CS Hub</h2>
          <p style={{ color:'var(--t2)', fontSize:14, marginTop:10, lineHeight:1.6 }}>
            Your complete study platform for Alamein International University — Computer Science, Semester 4.
          </p>
        </div>

        {/* Features */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:28 }}>
          {[
            { icon: BookOpen, color:'var(--accent)', title:'Study Sheets + Practice Exams', desc:'9 lectures per course with 60–133 practice questions' },
            { icon: Sparkles, color:'var(--accent-2)', title:'AI Tutor (CSE221)', desc:'Bilingual AI — ask anything in Arabic or English' },
            { icon: Users, color:'var(--accent-green)', title:'Student Community', desc:'Post, share, like — connect with your batch' },
            { icon: BarChart3, color:'var(--accent-yellow)', title:'Progress Dashboard', desc:'Track your scores and lecture completion' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} style={{
              display:'flex', gap:12, alignItems:'flex-start',
              padding:'12px 14px', borderRadius:12,
              background:'var(--s3)', border:'1px solid var(--br)',
            }}>
              <div style={{
                width:32, height:32, borderRadius:9, flexShrink:0,
                background:`${color}15`,
                display:'flex', alignItems:'center', justifyContent:'center',
                color,
              }}>
                <Icon size={15} />
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:13, color:'var(--t)' }}>{title}</div>
                <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display:'flex', gap:10 }}>
          <Link
            href="/semesters/4"
            onClick={close}
            style={{
              flex:1, padding:'12px 20px', borderRadius:12, textAlign:'center',
              background:'linear-gradient(135deg, var(--accent), var(--accent-2))',
              color:'white', textDecoration:'none', fontWeight:700, fontSize:14,
              boxShadow:'0 4px 20px rgba(99,102,241,0.3)',
            }}
          >Start Studying →</Link>
          <button
            onClick={close}
            style={{
              padding:'12px 20px', borderRadius:12,
              background:'var(--s3)', border:'1px solid var(--br)',
              color:'var(--t2)', fontSize:14, cursor:'pointer',
              fontFamily:'var(--font)', fontWeight:500,
            }}
          >Explore</button>
        </div>
      </div>
    </div>
  )
}
