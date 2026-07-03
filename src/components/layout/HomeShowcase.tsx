// src/components/layout/HomeShowcase.tsx — landing sections ported from the design
// reference: the two-row tech-stack marquee (opposite directions, pause on hover) and
// the "First Survivor" cinematic portrait. Pure CSS animation — no JS, mobile-cheap.
import Link from 'next/link'
import {
  Atom, Boxes, Braces, Database, Zap, GitBranch, Cloud, Lock,
  LayoutGrid, Eye, Flame, Package, Webhook, Server, MessageSquare,
} from 'lucide-react'
import type { ReactNode } from 'react'

const ROW_A: Array<[string, ReactNode]> = [
  ['Next.js', <Server size={18} key="i" />],
  ['React', <Atom size={18} key="i" />],
  ['TypeScript', <Braces size={18} key="i" />],
  ['Tailwind', <Zap size={18} key="i" />],
  ['Supabase', <Database size={18} key="i" />],
  ['PostgreSQL', <Database size={18} key="i" />],
  ['Node.js', <Server size={18} key="i" />],
  ['Zustand', <Boxes size={18} key="i" />],
  ['Git', <GitBranch size={18} key="i" />],
  ['Vercel', <Cloud size={18} key="i" />],
]
const ROW_B: Array<[string, ReactNode]> = [
  ['Claude AI', <Atom size={18} key="i" />],
  ['Gemini', <Flame size={18} key="i" />],
  ['Framer Motion', <LayoutGrid size={18} key="i" />],
  ['react-hot-toast', <Webhook size={18} key="i" />],
  ['KaTeX', <Braces size={18} key="i" />],
  ['Auth / RLS', <Lock size={18} key="i" />],
  ['Realtime', <Webhook size={18} key="i" />],
  ['Web Audio', <Zap size={18} key="i" />],
  ['Lucide', <Eye size={18} key="i" />],
  ['date-fns', <Package size={18} key="i" />],
]

function Track({ row }: { row: Array<[string, ReactNode]> }) {
  // duplicated once → the -50% keyframe loops seamlessly
  const items = [...row, ...row]
  return (
    <div className="marquee-track">
      {items.map(([name, icon], i) => (
        <span className="tool" key={`${name}-${i}`}><span className="ic">{icon}</span>{name}</span>
      ))}
    </div>
  )
}

export function HomeShowcase() {
  return (
    <>
      {/* ── Tech stack marquee ── */}
      <section style={{ padding: '0 0 72px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', textAlign: 'center', marginBottom: 34 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Tech Stack
          </div>
          <h2 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--t)' }}>
            Built with serious tools.
          </h2>
        </div>
        <div className="marquee-wrap">
          <div className="marquee"><Track row={ROW_A} /></div>
          <div className="marquee rev"><Track row={ROW_B} /></div>
        </div>
      </section>

      {/* ── First Survivor ── */}
      <section style={{ padding: '0 20px 90px' }}>
        <div className="about-grid" style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="portrait" aria-hidden="true">
            <img src="/images/first-survivor.jpg" alt="" loading="lazy" />
            <div className="engrave">
              <div className="name">ELSERAFY</div>
              <div className="arise">ARISE</div>
            </div>
          </div>
          <div>
            <div className="about-title">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-2)', boxShadow: '0 0 9px var(--crimson-glow)' }} />
              The First Survivor
            </div>
            <h2 className="about-name" style={{ marginTop: 18 }}>
              YOUSEF<br /><span className="red">ELSERAFY</span>
            </h2>
            <div className="about-creed">
              <p className="strong">Every journey begins with a single step.</p>
              <p>
                Not every path is clear. Not every challenge is fair. Yet some choose to move
                forward anyway — to learn, to grow, to become more than they were yesterday.
              </p>
              <p>This platform was built for those people. For the curious. For the ambitious. For the survivors.</p>
              <p className="finale">The Elite Rise Here.</p>
            </div>
            <div style={{ marginTop: 30 }}>
              <Link href="/messages" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: 'white',
                textDecoration: 'none', fontWeight: 700, fontSize: 14.5, letterSpacing: '-0.01em',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), var(--shadow-crimson)',
              }}>
                Talk to me <MessageSquare size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
