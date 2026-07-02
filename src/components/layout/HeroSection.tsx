'use client'
// src/components/layout/HeroSection.tsx — the AIU Vanguard platform hero.
// Copy follows the design reference ("The elite rise here."): this is the university
// platform's front door, not a single-course study package. Stats are DB-driven.
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stats, setStats] = useState<{ semesters: number; courses: number } | null>(null)

  // Real numbers from the DB (same anon-readable tables the semesters grid uses).
  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const [{ data: sems }, { count: courses }] = await Promise.all([
        supabase.from('courses').select('semester_id'),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
      ])
      const activeSems = new Set((sems || []).map((c: any) => c.semester_id)).size
      setStats({ semesters: activeSems || 1, courses: courses || 0 })
    }
    load()
  }, [])

  // Particle background — subtle crimson embers
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const particles: Array<{x:number;y:number;vx:number;vy:number;r:number;o:number}> = []
    let animId: number

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        o: Math.random() * 0.4 + 0.1,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(224,38,75,${p.o})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <section style={{ position:'relative', overflow:'hidden', padding:'88px 20px 76px', textAlign:'center' }}>
      {/* Canvas bg */}
      <canvas ref={canvasRef} style={{
        position:'absolute', inset:0, width:'100%', height:'100%',
        opacity:0.6, pointerEvents:'none',
      }} />

      {/* Gradient glow */}
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%,-60%)',
        width:'min(600px,90vw)', height:300,
        background:'radial-gradient(ellipse, rgba(224,38,75,0.12) 0%, transparent 70%)',
        pointerEvents:'none',
      }} />

      <div style={{ position:'relative', maxWidth:720, margin:'0 auto' }}>
        {/* Kicker */}
        <div className="anim-1" style={{
          display:'inline-flex', alignItems:'center', gap:9,
          padding:'6px 15px', borderRadius:20,
          background:'var(--crimson-dim)', border:'1px solid var(--crimson-line)',
          marginBottom:26,
        }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', boxShadow:'0 0 9px var(--crimson-glow)', flexShrink:0 }} />
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--accent-2)', letterSpacing:'0.18em', textTransform:'uppercase' }}>
            Alamein International University · CS Department
          </span>
        </div>

        {/* Headline — from the Vanguard design reference */}
        <h1 className="anim-2" style={{
          fontFamily:'var(--font-display)',
          fontSize:'clamp(40px,7.5vw,76px)',
          fontWeight:800, letterSpacing:'-0.04em',
          color:'var(--t)', lineHeight:1.02,
          marginBottom:24,
        }}>
          The elite<br />
          <span style={{
            background:'linear-gradient(135deg, var(--accent), var(--accent-2))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>rise here.</span>
        </h1>

        {/* Sub */}
        <p className="anim-3" style={{
          fontSize:'clamp(14.5px,2vw,17px)', color:'var(--t2)',
          lineHeight:1.75, maxWidth:480, margin:'0 auto 34px',
        }}>
          An elite digital academy. Every lecture, every exam trap, every formula —
          engineered into one platform, with an AI tutor trained on your exact syllabus.
        </p>

        {/* Credit */}
        <div className="anim-3" style={{
          fontFamily:'var(--font-mono)', fontSize:11,
          color:'var(--t3)', marginBottom:32,
        }}>✦ Made by Yousef Elserafy ✦</div>

        {/* CTAs */}
        <div className="anim-4" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <Link href="/dashboard" style={{
            padding:'13px 30px', borderRadius:12,
            background:'linear-gradient(135deg, var(--accent), var(--accent-2))',
            color:'white', textDecoration:'none', fontWeight:700, fontSize:14.5,
            letterSpacing:'-0.01em',
            boxShadow:'inset 0 1px 0 rgba(255,255,255,0.25), var(--shadow-crimson)',
            transition:'all 0.2s',
          }}>
            Get started →
          </Link>
          <a href="#semesters" style={{
            padding:'13px 28px', borderRadius:12,
            background:'var(--glass)', border:'1px solid var(--br2)',
            color:'var(--t)', textDecoration:'none', fontWeight:600, fontSize:14.5,
            backdropFilter:'blur(10px)',
            transition:'all 0.2s',
          }}>
            Browse semesters
          </a>
        </div>

        {/* Stats row — real platform numbers, not stale course trivia */}
        <div className="anim-4" style={{
          display:'flex', justifyContent:'center', gap:'clamp(20px,4vw,48px)',
          marginTop:52, paddingTop:32,
          borderTop:'1px solid var(--br)',
          flexWrap:'wrap',
        }}>
          {[
            { v: stats ? String(stats.semesters) : '—', l:'Active Semesters', sub:'8-semester program' },
            { v: stats ? String(stats.courses) : '—', l:'Live Courses', sub:'Materials & grades' },
            { v:'AI', l:'Vanguard Tutor', sub:'Trained on your syllabus' },
            { v:'24/7', l:'Community', sub:'Your squad, always on' },
          ].map(({ v, l, sub }) => (
            <div key={l} style={{ textAlign:'center' }}>
              <div style={{
                fontFamily:'var(--font-mono)', fontWeight:800,
                fontSize:'clamp(22px,3vw,32px)',
                color:'var(--t)', letterSpacing:'-0.03em', lineHeight:1,
              }}>{v}</div>
              <div style={{ fontWeight:600, fontSize:13, color:'var(--t2)', marginTop:4 }}>{l}</div>
              <div style={{ fontSize:11, color:'var(--t3)' }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
