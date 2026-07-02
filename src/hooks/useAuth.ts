'use client'
// src/hooks/useAuth.ts
// ───────────────────────────────────────────────────────────
// Central hook to know WHO the current user is and WHAT role
// they have. Any page/component can call this to adapt the UI.
// ───────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/lib/store'
import type { UserProfile, UserRole } from '@/types'

interface AuthState {
  loading: boolean
  userId: string | null
  profile: UserProfile | null
  role: UserRole | null
  // Convenience helpers
  isOwner: boolean
  isAdmin: boolean      // owner or admin
  isStaff: boolean      // owner, admin, or doctor
  isStudent: boolean
  isMaster: boolean
  isGuider: boolean
  myCourses: string[]   // courses this user is assigned to (doctor/master/guider)
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: true,
    userId: null,
    profile: null,
    role: null,
    isOwner: false,
    isAdmin: false,
    isStaff: false,
    isStudent: false,
    isMaster: false,
    isGuider: false,
    myCourses: [],
  })

  useEffect(() => {
    const supabase = createClient()
    let active = true

    const load = async () => {
      // getSession(): reads the cookie locally (~0ms) instead of getUser()'s 240ms–1.5s
      // network validation per page mount. Display/identity only — every query below is
      // still enforced by RLS with the JWT, and the middleware gates protected routes.
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      if (!user) {
        if (active) setState(s => ({ ...s, loading: false }))
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!active) return

      // Sync the user's saved preferences (sound/notifications/…) into the local store.
      if (profile && (profile as any).settings) {
        useUserStore.getState().hydrateSettings((profile as any).settings)
      }

      const role = (profile?.role ?? 'student') as UserRole

      // Courses this user is assigned to (hierarchy system)
      let myCourses: string[] = []
      if (['doctor', 'master', 'guider'].includes(role)) {
        const { data: ca } = await supabase
          .from('course_assignments')
          .select('course')
          .eq('user_id', user.id)
        myCourses = (ca || []).map((c: any) => c.course)
      }

      if (!active) return
      setState({
        loading: false,
        userId: user.id,
        profile: profile as UserProfile | null,
        role,
        isOwner: role === 'owner',
        isAdmin: role === 'owner' || role === 'admin',
        isStaff: role === 'owner' || role === 'admin' || role === 'doctor',
        isStudent: role === 'student',
        isMaster: role === 'master',
        isGuider: role === 'guider',
        myCourses,
      })
    }

    load()
    return () => { active = false }
  }, [])

  return state
}
