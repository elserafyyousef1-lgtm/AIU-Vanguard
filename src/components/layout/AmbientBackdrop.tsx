'use client'
// src/components/layout/AmbientBackdrop.tsx
// AIU Vanguard ambient layer: crimson aurora + carbon grid + film grain,
// plus the global reveal-on-scroll observer and the glass-card hover spotlight.
// Mounted once in the root layout; sits behind page content (z-index 0).
import { useEffect } from 'react'

export function AmbientBackdrop() {
  useEffect(() => {
    // Reveal-on-scroll: any element with class `rv` fades/slides in when it enters view.
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }),
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    const scan = () => document.querySelectorAll('.rv:not(.in)').forEach((el) => io.observe(el))
    scan()
    // Re-scan when client-rendered routes inject new content.
    const mo = new MutationObserver(() => scan())
    mo.observe(document.body, { childList: true, subtree: true })

    // Glass spotlight: track the pointer over `.glass` cards.
    const onMove = (ev: MouseEvent) => {
      const card = (ev.target as HTMLElement | null)?.closest?.('.glass') as HTMLElement | null
      if (!card) return
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${ev.clientX - r.left}px`)
      card.style.setProperty('--my', `${ev.clientY - r.top}px`)
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    return () => { io.disconnect(); mo.disconnect(); window.removeEventListener('mousemove', onMove) }
  }, [])

  return (
    <>
      <div className="aurora" aria-hidden />
      <div className="grid-bg" aria-hidden />
      <div className="grain" aria-hidden />
    </>
  )
}
