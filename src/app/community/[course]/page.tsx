'use client'
// src/app/community/[course]/page.tsx
// Per-course community. Reuses the exact same CommunityView
// component as the general feed, just filtered to this course.
import { useParams } from 'next/navigation'
import { CommunityView } from '@/components/community/CommunityView'

const VALID = ['CSE221', 'MAT312', 'CSE301', 'CSE311']

export default function CourseCommunityPage() {
  const params = useParams()
  const raw = (params?.course as string || '').toUpperCase()
  const course = VALID.includes(raw) ? raw : null

  if (!course) {
    return (
      <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t3)' }}>
        This course community doesn’t exist.
      </div>
    )
  }

  return <CommunityView courseFilter={course} />
}