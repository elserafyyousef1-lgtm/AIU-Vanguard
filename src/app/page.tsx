// src/app/page.tsx
import { SiteNav } from '@/components/layout/SiteNav'
import { HeroSection } from '@/components/layout/HeroSection'
import { SemestersGrid } from '@/components/layout/SemestersGrid'
import { HomeShowcase } from '@/components/layout/HomeShowcase'
import { WelcomeModal } from '@/components/ui/WelcomeModal'
import { SettingsPanel } from '@/components/ui/SettingsPanel'
import { ScrollProgress } from '@/components/ui/ScrollProgress'

export default function HomePage() {
  return (
    <>
      <ScrollProgress />
      <SiteNav active="/" />
      <main>
        <HeroSection />
        {/* anchor target for the hero's "Browse semesters" CTA */}
        <div id="semesters" style={{ scrollMarginTop: 80 }}>
          <SemestersGrid />
        </div>
        {/* tech-stack marquees + the First Survivor portrait (from the design reference) */}
        <HomeShowcase />
      </main>
      <footer className="text-center py-12 text-[var(--t3)] text-sm border-t border-[var(--br)] mt-24">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-[var(--accent)] font-semibold">AIU Vanguard</span>
          <span>·</span>
          <span>Alamein International University · CS Department</span>
        </div>
        <div className="text-xs text-[var(--t3)]">
          Built for Alamein International University students ✦ Made by Yousef Elserafy
        </div>
      </footer>

      {/* Global overlays */}
      <WelcomeModal />
      <SettingsPanel />
    </>
  )
}
