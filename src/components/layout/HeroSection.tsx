'use client'
// src/components/layout/HeroSection.tsx
import Link from 'next/link'
import { useEffect, useRef } from 'react'

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Particle background — subtle dots like original site
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

    // Create 60 particles
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
    <section style={{ position:'relative', overflow:'hidden', padding:'80px 20px 72px', textAlign:'center' }}>
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

      <div style={{ position:'relative', maxWidth:680, margin:'0 auto' }}>
        {/* Eyebrow */}
        <div className="anim-1" style={{
          display:'inline-flex', alignItems:'center', gap:8,
          padding:'5px 14px', borderRadius:20,
          background:'rgba(224,38,75,0.1)', border:'1px solid rgba(224,38,75,0.25)',
          marginBottom:24,
        }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', boxShadow:'0 0 6px var(--accent)', flexShrink:0 }} />
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--accent)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
            Alamein International University · CS Department
          </span>
        </div>

        {/* Headline */}
        <h1 className="anim-2" style={{
          fontSize:'clamp(32px,6vw,64px)',
          fontWeight:800, letterSpacing:'-0.035em',
          color:'var(--t)', lineHeight:1.05,
          marginBottom:20,
        }}>
          Database Systems<br />
          <span style={{
            background:'linear-gradient(135deg, var(--accent), var(--accent-2))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>Study Package</span>
        </h1>

        {/* Sub */}
        <p className="anim-3" style={{
          fontSize:'clamp(14px,2vw,17px)', color:'var(--t2)',
          lineHeight:1.65, maxWidth:520, margin:'0 auto 36px',
        }}>
          Everything you need to ace the final. Complete study sheets for all 9 lectures, 60-question practice exam, AI Tutor, and flashcards — for all Semester 4 courses.
        </p>

        {/* Credit */}
        <div className="anim-3" style={{
          fontFamily:'var(--font-mono)', fontSize:11,
          color:'var(--t3)', marginBottom:32,
        }}>✦ Made by Yousef Elserafy ✦</div>

        {/* CTAs */}
        <div className="anim-4" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <Link href="/semesters/4" style={{
            padding:'13px 28px', borderRadius:12,
            background:'linear-gradient(135deg, var(--accent), var(--accent-2))',
            color:'white', textDecoration:'none', fontWeight:700, fontSize:14.5,
            letterSpacing:'-0.01em',
            boxShadow:'0 4px 20px rgba(224,38,75,0.35)',
            transition:'all 0.2s',
          }}>
            Start Studying →
          </Link>
          <Link href="/courses/cse221" style={{
            padding:'13px 28px', borderRadius:12,
            background:'var(--s2)', border:'1px solid var(--br2)',
            color:'var(--t)', textDecoration:'none', fontWeight:600, fontSize:14.5,
            transition:'all 0.2s',
          }}>
            CSE221 — Databases
          </Link>
          <Link href="/courses/mat312" style={{
            padding:'13px 28px', borderRadius:12,
            background:'var(--s2)', border:'1px solid rgba(16,185,129,0.3)',
            color:'var(--t)', textDecoration:'none', fontWeight:600, fontSize:14.5,
            transition:'all 0.2s',
          }}>
            MAT312 — Diff. Equations
          </Link>
        </div>

        {/* Stats row */}
        <div className="anim-4" style={{
          display:'flex', justifyContent:'center', gap:'clamp(20px,4vw,48px)',
          marginTop:52, paddingTop:32,
          borderTop:'1px solid var(--br)',
          flexWrap:'wrap',
        }}>
          {[
            { v:'4', l:'Courses', sub:'Semester 4' },
            { v:'9', l:'Lectures', sub:'Per course' },
            { v:'133+', l:'Practice Q\'s', sub:'MCQ + T/F' },
            { v:'43', l:'Flashcards', sub:'MAT312' },
            { v:'AI', l:'Tutor', sub:'CSE221' },
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
