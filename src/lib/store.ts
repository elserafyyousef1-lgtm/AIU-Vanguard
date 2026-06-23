// src/lib/store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, UserSettings } from '@/types'
import { createClient } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────
// USER STORE
// ─────────────────────────────────────────────────────────
interface UserState {
  profile: UserProfile | null
  settings: UserSettings
  setProfile: (p: UserProfile | null) => void
  updateSettings: (s: Partial<UserSettings>) => void   // user action → also persists to DB
  hydrateSettings: (s: Partial<UserSettings>) => void  // DB → store on login (no write-back)
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: null,
      settings: {
        theme: 'dark',
        sound: true,
        animations: true,
        language: 'both',
        notifications: true,
      },
      setProfile: (profile) => set({ profile }),
      updateSettings: (s) => {
        set((state) => ({ settings: { ...state.settings, ...s } }))
        // persist to profiles.settings (fire-and-forget; ignores logged-out / network errors)
        try {
          void createClient().rpc('update_my_settings', { p_settings: s }).then(() => {}, () => {})
        } catch { /* ignore */ }
      },
      hydrateSettings: (s) =>
        set((state) => ({ settings: { ...state.settings, ...s } })),
    }),
    { name: 'aiu-user' }
  )
)

// ─────────────────────────────────────────────────────────
// UI STORE (non-persisted — resets on page load)
// ─────────────────────────────────────────────────────────
interface UIState {
  // Welcome modal
  hasSeenWelcome: boolean
  showWelcome: boolean
  setHasSeenWelcome: () => void
  setShowWelcome: (v: boolean) => void

  // Command palette
  cmdOpen: boolean
  setCmdOpen: (v: boolean) => void

  // Settings panel
  settingsOpen: boolean
  setSettingsOpen: (v: boolean) => void

  // Online count (from Supabase Realtime)
  onlineCount: number
  setOnlineCount: (n: number) => void

  // AI panel
  aiOpen: boolean
  aiCourse: string | null
  openAI: (course: string) => void
  closeAI: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      hasSeenWelcome: false,
      showWelcome: false,
      setHasSeenWelcome: () => set({ hasSeenWelcome: true, showWelcome: false }),
      setShowWelcome: (v) => set({ showWelcome: v }),

      cmdOpen: false,
      setCmdOpen: (v) => set({ cmdOpen: v }),

      settingsOpen: false,
      setSettingsOpen: (v) => set({ settingsOpen: v }),

      onlineCount: 0,
      setOnlineCount: (n) => set({ onlineCount: n }),

      aiOpen: false,
      aiCourse: null,
      openAI: (course) => set({ aiOpen: true, aiCourse: course }),
      closeAI: () => set({ aiOpen: false, aiCourse: null }),
    }),
    {
      name: 'aiu-ui',
      // Only persist welcome state
      partialize: (state) => ({ hasSeenWelcome: state.hasSeenWelcome }),
    }
  )
)

// ─────────────────────────────────────────────────────────
// EXAM STORE (in-session only)
// ─────────────────────────────────────────────────────────
interface ExamState {
  answers: Record<number, string | boolean>
  submitted: boolean
  score: number | null
  setAnswer: (qNum: number, answer: string | boolean) => void
  submitExam: (correct: number, total: number) => void
  resetExam: () => void
}

export const useExamStore = create<ExamState>()((set) => ({
  answers: {},
  submitted: false,
  score: null,
  setAnswer: (qNum, answer) =>
    set((s) => ({ answers: { ...s.answers, [qNum]: answer } })),
  submitExam: (correct, total) =>
    set({ submitted: true, score: Math.round((correct / total) * 100) }),
  resetExam: () => set({ answers: {}, submitted: false, score: null }),
}))
