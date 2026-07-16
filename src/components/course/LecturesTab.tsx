'use client'
// src/components/course/LecturesTab.tsx
import { useState } from 'react'
import type { Lecture, Course } from '@/types'
import { AIE121_HTML } from '@/lib/data/aie121_sheets'
import { CSE221_HTML } from '@/lib/data/cse221_sheets'
import { MAT312_HTML } from '@/lib/data/mat312_sheets'
import 'katex/dist/katex.min.css'  // styles the pre-rendered KaTeX HTML in the study sheets

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  lectures: Lecture[]
  course: { slug: string; color: string }
}

const LECTURE_NAMES: Record<string, Record<number, string>> = {
  CSE221: {
    1:'Intro to DBs', 2:'ER Diagrams', 3:'Keys',
    4:'ER-to-Relational', 5:'Normalization', 6:'Relational Algebra',
    7:'Indexes & SQL', 8:'Join Algorithms', 9:'Aggregation',
  },
  MAT312: {
    1:'Separable Equations', 2:'Linear 1st-Order & Bernoulli',
    3:'Exact Equations', 4:'Homogeneous DEs',
    5:'2nd-Order Const. Coeff.', 6:'Cauchy-Euler & Reduction',
    7:'Laplace Transforms', 8:'Inverse Laplace & Fourier',
    9:'Power Series',
  },
  AIE121: {
    1:'Accuracy Metrics', 2:'Linear Regression', 3:'Decision Trees (ID3)',
    4:'AdaBoost', 5:'Naïve Bayes', 6:'Logistic Regression',
    7:'Support Vector Machine', 8:'K-Nearest Neighbors', 9:'K-Means Clustering',
  },
}

export function LecturesTab({ lectures, course }: Props) {
  const [active, setActive] = useState(1)
  const htmlMap = course.slug === 'CSE221' ? CSE221_HTML
    : course.slug === 'AIE121' ? AIE121_HTML
    : MAT312_HTML
  const nameMap = LECTURE_NAMES[course.slug] || {}

  return (
    <div>
      {/* Tab strip */}
      <div style={{
        display:'flex', gap:6, flexWrap:'wrap', marginBottom:24,
      }}>
        {lectures.map(lec => (
          <button
            key={lec.number}
            onClick={() => setActive(lec.number)}
            style={{
              padding:'7px 14px', borderRadius:9, fontSize:12.5, fontWeight:500,
              background: active === lec.number ? course.color : 'var(--s3)',
              color: active === lec.number ? 'white' : 'var(--t2)',
              border: `1px solid ${active === lec.number ? course.color : 'var(--br)'}`,
              cursor:'pointer', transition:'all 0.15s', fontFamily:'var(--font)',
              boxShadow: active === lec.number ? `0 2px 10px ${course.color}40` : 'none',
            }}
          >
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, opacity:0.75 }}>
              {course.slug === 'CSE221' ? `L${lec.number}` : `S${lec.number}`}
            </span>
            {' '}
            {nameMap[lec.number] || lec.title}
          </button>
        ))}
      </div>

      {/* Lecture title */}
      <div style={{ marginBottom:20 }}>
        <span style={{
          fontFamily:'var(--font-mono)', fontSize:10,
          color:course.color, textTransform:'uppercase', letterSpacing:'0.08em',
        }}>
          {course.slug === 'CSE221' ? `Lecture ${active}` : `Sheet ${active}`}
        </span>
        <h2 style={{
          fontSize:'clamp(18px,2.5vw,24px)', fontWeight:700,
          color:'var(--t)', letterSpacing:'-0.02em', marginTop:4,
        }}>{nameMap[active]}</h2>
      </div>

      {/* Content */}
      <div
        className="lec-content"
        dangerouslySetInnerHTML={{ __html: htmlMap[active] || '<p style="color:var(--t2)">Content loading...</p>' }}
      />

      {/* Inline styles for lecture content */}
      <style>{`
        .lec-content { display:flex; flex-direction:column; gap:16px; }
        .lec-content .card {
          background:var(--s2); border:1px solid var(--br); border-radius:14px; padding:20px;
        }
        .lec-content h3 { font-size:15px; font-weight:700; color:var(--t); margin-bottom:12px; letter-spacing:-0.01em; }
        .lec-content p { font-size:13.5px; color:var(--t2); line-height:1.6; }
        .lec-content ul { padding-left:16px; display:flex; flex-direction:column; gap:6px; }
        .lec-content li { font-size:13.5px; color:var(--t2); line-height:1.55; }
        .lec-content strong { color:var(--t); font-weight:600; }
        .lec-content em { color:var(--accent); font-style:italic; }
        .lec-content code { font-family:var(--font-mono); font-size:12px; background:var(--s4); padding:2px 6px; border-radius:5px; color:var(--t2); }
        .lec-tbl-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; margin-top:4px; max-width:100%; }
        .lec-tbl { width:100%; border-collapse:collapse; font-size:12.5px; }
        .lec-tbl-wrap .lec-tbl { margin-top:0; }
        .lec-tbl th { text-align:left; padding:7px 10px; border-bottom:1px solid var(--br2); color:var(--t3); font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.04em; }
        .lec-tbl td { padding:7px 10px; border-bottom:1px solid var(--br); color:var(--t2); vertical-align:top; }
        .lec-tbl tr:last-child td { border-bottom:none; }
        .lec-grid2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:12px; }
        .lec-step { display:flex; gap:12px; align-items:flex-start; margin-bottom:10px; }
        .lec-step-n { width:24px; height:24px; border-radius:7px; background:var(--accent); color:white; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
        .lec-step-t { font-size:13.5px; color:var(--t2); line-height:1.55; }
        .lec-tip { background:rgba(224,38,75,.07); border:1px solid rgba(224,38,75,.2); border-radius:10px; padding:10px 14px; font-size:12.5px; color:var(--t2); margin-top:12px; }
        .lec-tip strong { color:var(--accent); }
        .lec-rule { background:var(--s3); border-left:3px solid var(--accent); padding:10px 14px; border-radius:0 8px 8px 0; font-size:13px; color:var(--t2); margin:10px 0; line-height:1.55; }
        .lec-sub-label { font-family:var(--font-mono); font-size:10px; color:var(--accent); text-transform:uppercase; letter-spacing:.1em; margin-bottom:8px; }
        .lec-fbox { background:var(--s3); border:1px solid var(--br2); border-radius:10px; padding:12px 14px; margin:10px 0; overflow-x:auto; }
        .lec-flbl { font-family:var(--font-mono); font-size:10px; color:var(--accent-2); text-transform:uppercase; letter-spacing:.1em; margin-bottom:8px; }
        .lec-content .ok { background:rgba(61,214,140,.08); border:1px solid rgba(61,214,140,.25); border-radius:10px; padding:10px 14px; margin:10px 0; color:var(--t2); overflow-x:auto; }
        .lec-content .ok strong { color:#3dd68c; }
        .lec-content .warn { background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.25); border-radius:10px; padding:10px 14px; margin:10px 0; color:var(--t2); overflow-x:auto; }
        .lec-content .warn strong { color:#f59e0b; }
        .lec-content .mono { font-family:var(--font-mono); font-size:12px; color:var(--t2); }
        .lec-content .katex { font-size:1.02em; }
        .lec-content .katex-display { margin:.7rem 0; overflow-x:auto; overflow-y:hidden; padding:2px 0; }
        .lec-code { font-family:var(--font-mono); font-size:14px; background:var(--s3); border:1px solid var(--br); border-radius:8px; padding:10px 14px; color:var(--t2); }
        .lec-pre { background:var(--s3); border:1px solid var(--br); border-radius:8px; padding:12px 14px; font-family:var(--font-mono); font-size:12px; color:var(--t2); overflow-x:auto; line-height:1.7; white-space:pre; }
      `}</style>
    </div>
  )
}
