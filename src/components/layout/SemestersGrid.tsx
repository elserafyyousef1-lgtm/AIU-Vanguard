'use client'
// src/components/layout/SemestersGrid.tsx
// DB-driven: a semester with courses lights up; an empty one is dimmed & locked.
// Adding courses to a semester in the DB activates it automatically — zero code changes.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Lock, ChevronRight, BookOpen } from 'lucide-react'

interface Sem { id: number; title: string; count: number; codes: string[] }

export function SemestersGrid() {
  const supabase = createClient()
  const [sems, setSems] = useState<Sem[]>([])

  useEffect(() => {
    const load = async () => {
      const [{ data: semesters }, { data: courses }] = await Promise.all([
        supabase.from('semesters').select('id, title').order('id'),
        supabase.from('courses').select('code, semester_id'),
      ])
      const list: Sem[] = (semesters || []).map((s: any) => {
        const mine = (courses || []).filter((c: any) => c.semester_id === s.id)
        return { id: s.id, title: s.title, count: mine.length, codes: mine.map((c: any) => c.code).slice(0, 4) }
      })
      setSems(list)
    }
    load()
  }, [])

  return (
    <section style={{ maxWidth:1100, margin:'0 auto', padding:'0 20px 80px' }}>
      <div className="anim-3" style={{ textAlign:'center', marginBottom:48 }}>
        <div style={{
          display:'inline-block', fontFamily:'var(--font-mono)', fontSize:11,
          color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase',
          marginBottom:12,
        }}>All Semesters</div>
        <h2 style={{ fontSize:'clamp(24px,4vw,36px)', fontWeight:800, letterSpacing:'-0.03em', color:'var(--t)' }}>
          Complete CS Program
        </h2>
        <p style={{ color:'var(--t2)', marginTop:10, maxWidth:480, margin:'10px auto 0' }}>
          8 semesters. Active ones are open — the rest unlock when their courses arrive.
        </p>
      </div>

      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))',
        gap:16,
      }}>
        {sems.map((sem, i) => {
          const isActive = sem.count > 0
          return (
            <div
              key={sem.id}
              className={`anim-${Math.min(i + 1, 4)}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {isActive ? (
                <Link href={`/semesters/${sem.id}`} style={{ textDecoration:'none' }}>
                  <SemesterCard sem={sem} isActive />
                </Link>
              ) : (
                <SemesterCard sem={sem} isActive={false} />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SemesterCard({ sem, isActive }: { sem: Sem; isActive: boolean }) {
  return (
    <div style={{
      background: isActive ? 'var(--s2)' : 'var(--s1)',
      border: isActive ? '1px solid var(--accent-br)' : '1px solid var(--br)',
      borderRadius: 16,
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
      opacity: isActive ? 1 : 0.55,
      transition: 'all 0.18s var(--ease-out)',
      cursor: isActive ? 'pointer' : 'default',
      minHeight: 140,
    }}>
      {isActive && (
        <div style={{
          position:'absolute', top:-40, right:-40,
          width:120, height:120, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(224,38,75,0.15) 0%, transparent 70%)',
          pointerEvents:'none',
        }} />
      )}

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <div style={{
            fontFamily:'var(--font-mono)', fontSize:10, color: isActive ? 'var(--accent)' : 'var(--t3)',
            letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4,
          }}>
            Semester {sem.id}
          </div>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--t)', letterSpacing:'-0.01em' }}>
            {sem.title}
          </div>
        </div>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:28, height:28, borderRadius:8,
          background: isActive ? 'rgba(224,38,75,0.12)' : 'var(--s3)',
          color: isActive ? 'var(--accent)' : 'var(--t3)',
        }}>
          {isActive ? <ChevronRight size={14} /> : <Lock size={12} />}
        </div>
      </div>

      {isActive ? (
        <>
          <p style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--t3)', marginBottom:10 }}>
            <BookOpen size={12} /> {sem.count} {sem.count === 1 ? 'course' : 'courses'} available
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {sem.codes.map(code => (
              <span key={code} style={{
                padding:'3px 9px', borderRadius:6,
                background:'rgba(224,38,75,0.1)', border:'1px solid rgba(224,38,75,0.3)',
                fontSize:11, fontWeight:700, color:'var(--accent)', fontFamily:'var(--font-mono)',
              }}>
                {code}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div style={{
          display:'inline-flex', alignItems:'center', gap:5,
          padding:'3px 10px', borderRadius:6,
          background:'var(--s3)', border:'1px solid var(--br)',
          fontSize:11, fontFamily:'var(--font-mono)', color:'var(--t3)',
        }}>
          <Lock size={10} /> No courses yet
        </div>
      )}
    </div>
  )
}
