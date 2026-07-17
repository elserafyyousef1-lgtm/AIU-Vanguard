// src/app/courses/page.tsx
// Courses hub — browse every semester (and the University Requirements track), then open
// one to see its courses. Replaces the old "Courses" nav target that jumped straight to a
// single hardcoded semester. Reuses the DB-driven SemestersGrid so it scales automatically
// as future semesters get courses.
import { SiteNav } from '@/components/layout/SiteNav'
import { SemestersGrid } from '@/components/layout/SemestersGrid'
import { SettingsPanel } from '@/components/ui/SettingsPanel'
import { ScrollProgress } from '@/components/ui/ScrollProgress'

export const metadata = { title: 'Courses — AIU Vanguard' }

export default function CoursesPage() {
  return (
    <>
      <ScrollProgress />
      <SiteNav active="/courses" />
      <main style={{ paddingTop: 28 }}>
        <SemestersGrid />
      </main>
      <SettingsPanel />
    </>
  )
}
