'use client'
// src/components/layout/SiteNav.tsx — self-sufficient wrapper around SiteNavView.
// For pages that don't already manage auth state for the nav: it feeds SiteNavView from
// useAuth() and provides the standard logout. Pages that already call useAuth() for their
// own data may keep feeding SiteNavView directly (no duplicate fetch) — both are fine.
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { SiteNavView } from './SiteNavView'

export function SiteNav({ active }: { active?: string }) {
  const { loading, userId, role, profile, isAdmin } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out')
    router.push('/'); router.refresh()
  }

  const navUser = (!loading && userId)
    ? {
        id: userId,
        name: (profile as any)?.full_name || 'User',
        role: role ? role[0].toUpperCase() + role.slice(1) : undefined,
        avatarUrl: (profile as any)?.avatar_url ?? null,
        semester: (profile as any)?.semester ?? null,
      }
    : null

  return <SiteNavView active={active} user={navUser} isAdmin={isAdmin} loading={loading} onLogout={handleLogout} />
}
