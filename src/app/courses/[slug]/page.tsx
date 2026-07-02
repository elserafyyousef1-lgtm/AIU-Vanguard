// src/app/courses/[slug]/page.tsx — DATABASE-DRIVEN course detail.
// Any course that exists in the `courses` table renders end-to-end (no static gate).
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SiteNav } from '@/components/layout/SiteNav'
import { CourseClient } from '@/components/course/CourseClient'
import { SettingsPanel } from '@/components/ui/SettingsPanel'
import { ScrollProgress } from '@/components/ui/ScrollProgress'
import type { Course } from '@/types'

async function fetchCourse(slug: string): Promise<Course | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('courses')
    .select('code, title, subtitle, description, requirements, instructor, credit_hours, color, icon, tags, has_ai, has_formulas, semester_id')
    .eq('code', slug.toUpperCase())
    .single()
  if (!data) return null

  const color = data.color || '#e0264b'
  return {
    slug: data.code,
    code: data.code,
    title: data.title,
    subtitle: data.subtitle || '',
    semester: (data.semester_id || 0) as Course['semester'],
    color,
    colorBg: color + '14',
    icon: data.icon || '📘',
    lectureCount: 0,
    examQCount: 0,
    practiceQCount: 0,
    hasAI: data.has_ai ?? true,
    hasFormulas: data.has_formulas ?? false,
    tags: data.tags || [],
    instructor: data.instructor || undefined,
    description: data.description || undefined,
    requirements: data.requirements || undefined,
    creditHours: data.credit_hours ?? undefined,
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const course = await fetchCourse(params.slug)
  if (!course) return {}
  return { title: `${course.code} — ${course.title}`, description: course.subtitle }
}

export default async function CoursePage({ params }: { params: { slug: string } }) {
  const course = await fetchCourse(params.slug)
  if (!course) notFound()

  return (
    <>
      <ScrollProgress />
      <SiteNav />
      <CourseClient course={course} />
      {/* CommandPalette is rendered by SiteNav */}
      <SettingsPanel />
    </>
  )
}
