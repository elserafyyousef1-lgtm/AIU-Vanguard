// src/components/layout/RequirementsSection.tsx
// University-wide online requirement courses, shown after the 8 semesters.
// DISPLAY-ONLY reference catalog (no content pages yet) — static, public,
// no data fetching, no auth gating. Matches the SemestersGrid visual language.
import { GraduationCap, Globe } from 'lucide-react'
import { REQUIREMENT_COURSES } from '@/lib/data/requirements'

export function RequirementsSection() {
  return (
    <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 100px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          <Globe size={12} /> Online · General Requirements
        </div>
        <h2 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--t)' }}>
          University Requirements
        </h2>
        <p style={{ color: 'var(--t2)', marginTop: 10, maxWidth: 540, margin: '10px auto 0' }}>
          General-requirement courses offered university-wide and taken online across the
          program — the same catalog for every student, independent of semester.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 14,
      }}>
        {REQUIREMENT_COURSES.map((c, i) => (
          <div
            key={c.code || c.title}
            style={{
              background: 'var(--s1)',
              border: '1px solid var(--br)',
              borderRadius: 14,
              padding: 16,
              minHeight: 108,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9.5,
                color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase',
              }}>
                {c.category}
              </span>
              {c.code ? (
                <span style={{
                  padding: '2px 8px', borderRadius: 6,
                  background: 'rgba(224,38,75,0.1)', border: '1px solid rgba(224,38,75,0.3)',
                  fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
                  whiteSpace: 'nowrap',
                }}>
                  {c.code}
                </span>
              ) : (
                <span style={{
                  padding: '2px 8px', borderRadius: 6,
                  background: 'var(--s3)', border: '1px dashed var(--br)',
                  fontSize: 10.5, fontWeight: 700, color: 'var(--t3)', fontFamily: 'var(--font-mono)',
                }} title="Course code to be confirmed">
                  —
                </span>
              )}
            </div>

            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t)', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
              {c.title}
            </div>

            {c.note && (
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 'auto' }}>
                {c.note}
              </div>
            )}
          </div>
        ))}
      </div>

      <p style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        color: 'var(--t3)', fontSize: 12.5, marginTop: 24,
      }}>
        <GraduationCap size={14} />
        {REQUIREMENT_COURSES.length} requirement courses · reference list — study material coming soon.
      </p>
    </section>
  )
}
