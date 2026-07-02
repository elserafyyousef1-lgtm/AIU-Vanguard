// src/app/page.tsx
import { SiteNav } from '@/components/layout/SiteNav'
import { HeroSection } from '@/components/layout/HeroSection'
import { SemestersGrid } from '@/components/layout/SemestersGrid'
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
        <SemestersGrid />
      </main>
      <footer className="text-center py-12 text-[var(--t3)] text-sm border-t border-[var(--br)] mt-24">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-[var(--accent)] font-semibold">AIU Vanguard</span>
          <span>·</span>
          <span>Semester 4 · Spring 2025–2026</span>
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
