'use client'
// src/components/course/CourseClient.tsx
// Tabs are now DYNAMIC. Modules (DB) is the primary content for every course.
// CSE221 / MAT312 keep their static lecture/exam/flashcard content as a TEMPORARY
// adapter (lib/data); every other course renders an overview + Modules + AI.
import { useState } from 'react'
import type { Course } from '@/types'
import { CSE221_LECTURES, CSE221_QUESTIONS, CSE221_QUICK_CHIPS } from '@/lib/data/cse221'
import { MAT312_LECTURES, MAT312_QUESTIONS, MAT312_FLASHCARDS, MAT312_QUICK_CHIPS } from '@/lib/data/mat312'
import { AIE121_LECTURES, AIE121_QUESTIONS, AIE121_FLASHCARDS, AIE121_QUICK_CHIPS } from '@/lib/data/aie121'
import { LecturesTab } from './LecturesTab'
import { ExamTab } from './ExamTab'
import { FlashcardsTab } from './FlashcardsTab'
import { AIPanel } from '@/components/ai/AIPanel'
import { BookOpen, FileQuestion, CreditCard, Sparkles, Calculator, Layers, ArrowRight, ClipboardList, BarChart3 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

interface Props { course: Course }
type Tab = { id: string; label: string; icon: any }

// TEMPORARY adapter: the only two courses whose academic content still lives in lib/data.
const LEGACY_TABS: Record<string, Tab[]> = {
  CSE221: [
    { id: 'lectures', label: 'Study Sheets', icon: BookOpen },
    { id: 'exam', label: 'Final Exam (60Q)', icon: FileQuestion },
  ],
  MAT312: [
    { id: 'lectures', label: 'Study Sheets', icon: BookOpen },
    { id: 'exam', label: 'Final Exam (40Q)', icon: FileQuestion },
    { id: 'flashcards', label: 'Flashcards', icon: CreditCard },
    { id: 'formulas', label: 'Formula Sheet', icon: Calculator },
  ],
  AIE121: [
    { id: 'lectures', label: 'Study Sheets', icon: BookOpen },
    { id: 'exam', label: 'Final Exam (102Q)', icon: FileQuestion },
    { id: 'flashcards', label: 'Flashcards', icon: CreditCard },
  ],
}

export function CourseClient({ course }: Props) {
  const { isAdmin, myCourses } = useAuth()
  const canManage = isAdmin || myCourses.includes(course.slug)
  const legacyTabs = LEGACY_TABS[course.slug] || []
  const tabs: Tab[] = [
    ...legacyTabs,
    ...(course.hasAI ? [{ id: 'ai', label: 'AI Tutor ✦', icon: Sparkles }] : []),
  ]
  const [activeTab, setActiveTab] = useState(legacyTabs[0]?.id || '')
  const [aiOpen, setAiOpen] = useState(false)

  const isCSE221 = course.slug === 'CSE221'
  const isMAT312 = course.slug === 'MAT312'
  const isAIE121 = course.slug === 'AIE121'
  const lectures = isCSE221 ? CSE221_LECTURES : isAIE121 ? AIE121_LECTURES : MAT312_LECTURES
  const questions = isCSE221 ? CSE221_QUESTIONS : isAIE121 ? AIE121_QUESTIONS : MAT312_QUESTIONS

  // Stats: real counts for legacy courses; AI/formula badges for the rest.
  const legacyCounts = isCSE221
    ? [{ v: CSE221_LECTURES.length, l: 'Lectures' }, { v: CSE221_QUESTIONS.length, l: "Exam Q's" }]
    : isMAT312
    ? [{ v: MAT312_LECTURES.length, l: 'Lectures' }, { v: MAT312_QUESTIONS.length, l: "Exam Q's" }, { v: MAT312_FLASHCARDS.length, l: 'Flashcards' }]
    : isAIE121
    ? [{ v: AIE121_LECTURES.length, l: 'Lectures' }, { v: AIE121_QUESTIONS.length, l: "Exam Q's" }, { v: AIE121_FLASHCARDS.length, l: 'Flashcards' }]
    : []
  const stats = [
    ...legacyCounts,
    ...(course.hasAI ? [{ v: '✦', l: 'AI Tutor' }] : []),
    ...(course.hasFormulas ? [{ v: '∑', l: 'Formulas' }] : []),
  ].filter(s => s.v)

  return (
    <>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* Course header */}
        <div className="anim-1" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: course.colorBg, border: `1px solid ${course.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}>{course.icon}</div>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: course.color,
                letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3,
              }}>
                {course.code} · Semester {course.semester}
                {course.instructor && ` · ${course.instructor}`}
                {course.creditHours ? ` · ${course.creditHours} cr` : ''}
              </div>
              <h1 style={{ fontSize: 'clamp(20px,3vw,30px)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--t)' }}>
                {course.title}
              </h1>
              {course.subtitle && <p style={{ color: 'var(--t2)', fontSize: 14, marginTop: 6, maxWidth: 620 }}>{course.subtitle}</p>}
            </div>
          </div>

          {stats.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
              {stats.map(({ v, l }) => (
                <div key={l}>
                  <div style={{ fontWeight: 800, fontSize: 20, color: course.color, fontFamily: 'var(--font-mono)' }}>{v}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tab nav — Modules link is always present */}
        <div className="anim-2" style={{
          display: 'flex', gap: 4, background: 'var(--s2)', border: '1px solid var(--br)',
          borderRadius: 14, padding: 5, marginBottom: 28, overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => id === 'ai' ? setAiOpen(true) : setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10, flexShrink: 0,
                background: activeTab === id && id !== 'ai' ? 'var(--s4)' : 'transparent',
                border: activeTab === id && id !== 'ai' ? '1px solid var(--br2)' : '1px solid transparent',
                color: activeTab === id && id !== 'ai' ? 'var(--t)' : 'var(--t2)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font)',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
          <Link
            href={`/courses/${course.slug.toLowerCase()}/modules`}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10, flexShrink: 0,
              background: 'transparent', border: '1px solid transparent', color: 'var(--t2)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', textDecoration: 'none', fontFamily: 'var(--font)',
            }}
          >
            <Layers size={14} /> Modules
          </Link>
          <Link
            href={`/courses/${course.slug.toLowerCase()}/assignments`}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10, flexShrink: 0,
              background: 'transparent', border: '1px solid transparent', color: 'var(--t2)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', textDecoration: 'none', fontFamily: 'var(--font)',
            }}
          >
            <ClipboardList size={14} /> Assignments
          </Link>
          {canManage && (
            <Link
              href={`/courses/${course.slug.toLowerCase()}/gradebook`}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10, flexShrink: 0,
                background: 'transparent', border: '1px solid transparent', color: 'var(--t2)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', textDecoration: 'none', fontFamily: 'var(--font)',
              }}
            >
              <BarChart3 size={14} /> Gradebook
            </Link>
          )}
        </div>

        {/* Tab content */}
        <div className="anim-3">
          {(isCSE221 || isMAT312 || isAIE121) && activeTab === 'lectures' && <LecturesTab lectures={lectures} course={course} />}
          {(isCSE221 || isMAT312 || isAIE121) && activeTab === 'exam' && <ExamTab questions={questions} course={course} />}
          {(isMAT312 || isAIE121) && activeTab === 'flashcards' && <FlashcardsTab cards={isAIE121 ? AIE121_FLASHCARDS : MAT312_FLASHCARDS} />}
          {isMAT312 && activeTab === 'formulas' && <FormulaSheetPlaceholder />}
          {legacyTabs.length === 0 && <CourseOverview course={course} />}
        </div>
      </main>

      {/* AI Panel */}
      {aiOpen && (
        <AIPanel
          courseSlug={course.slug}
          onClose={() => setAiOpen(false)}
          quickChips={isCSE221 ? CSE221_QUICK_CHIPS : isAIE121 ? AIE121_QUICK_CHIPS : isMAT312 ? MAT312_QUICK_CHIPS : []}
        />
      )}
    </>
  )
}

// Default landing for any DB course without legacy static content — points to Modules.
function CourseOverview({ course }: { course: Course }) {
  const card: React.CSSProperties = { background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 16, padding: 22 }
  const h3: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: 'var(--t)', marginBottom: 10 }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {course.description && (
        <div style={card}>
          <h3 style={h3}>About this course</h3>
          <p style={{ color: 'var(--t2)', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{course.description}</p>
        </div>
      )}
      {course.requirements && (
        <div style={card}>
          <h3 style={h3}>Requirements</h3>
          <p style={{ color: 'var(--t2)', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{course.requirements}</p>
        </div>
      )}
      <Link href={`/courses/${course.slug.toLowerCase()}/modules`}
        style={{ ...card, display: 'flex', alignItems: 'center', gap: 13, textDecoration: 'none', borderColor: 'var(--accent-br)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--accent-bg, rgba(224,38,75,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
          <Layers size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: 'var(--t)', fontSize: 15 }}>Course Modules</div>
          <div style={{ fontSize: 13, color: 'var(--t2)' }}>All lectures, files, videos and assignments — organised by week.</div>
        </div>
        <ArrowRight size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
      </Link>
    </div>
  )
}

function FormulaSheetPlaceholder() {
  return (
    <div style={{ padding: 40, textAlign: 'center', background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 16 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>∑</div>
      <h3 style={{ fontWeight: 700, color: 'var(--t)', marginBottom: 8 }}>Formula Sheet</h3>
      <p style={{ color: 'var(--t2)', fontSize: 14 }}>All MAT312 formulas organized by topic — coming in next update.</p>
    </div>
  )
}
