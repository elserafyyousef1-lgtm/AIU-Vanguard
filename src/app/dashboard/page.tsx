'use client'
// src/app/dashboard/page.tsx — role-aware dashboard under the unified SiteNav.
// Structural: AppShell/Sidebar -> SiteNav. All data loading, avatar upload, role gating
// and hub logic are unchanged.
import { useEffect, useState } from 'react'
import { SiteNavView } from '@/components/layout/SiteNavView'
import { StudentHub } from '@/components/dashboard/StudentHub'
import { DoctorHub } from '@/components/dashboard/DoctorHub'
import { MasterHub } from '@/components/dashboard/MasterHub'
import { GuiderHub } from '@/components/dashboard/GuiderHub'
import { AdminHub } from '@/components/dashboard/AdminHub'
import { Spinner } from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import { Camera, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
const twoNames = (full?: string) => (full || 'Student').trim().split(/\s+/).slice(0, 2).join(' ')

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  owner: { label: 'Owner', color: '#f59e0b' }, admin: { label: 'Admin', color: '#6366f1' },
  doctor: { label: 'Doctor', color: '#10b981' }, master: { label: 'Master', color: '#8b5cf6' },
  guider: { label: 'Guider', color: '#06b6d4' }, student: { label: 'Student', color: 'var(--t3)' },
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showGreeting, setShowGreeting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!sessionStorage.getItem('aiu_greeted')) { setShowGreeting(true); sessionStorage.setItem('aiu_greeted', '1') }
  }, [])

  useEffect(() => {
    const load = async () => {
      // getSession() (local, ~0ms) instead of getUser() (network) — identity for display only;
      // middleware gates the route and RLS guards every query below.
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      if (!user) { router.push('/login?redirect=/dashboard'); return }
      setUser(user)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url, semester, settings, created_at, updated_at, bio, rep_course, linkedin, bio_images, github, certificates, nickname')
        .eq('id', user.id).single()
      const { data: contact } = await supabase.rpc('my_contact')
      // Google signups have no university ID yet — collect it once before continuing.
      if (!contact?.[0]?.student_id) { router.push('/onboarding'); return }
      setProfile({ ...(profileData as any), ...(contact?.[0] || {}) })
      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out')
    router.push('/'); router.refresh()
  }

  const uploadAvatar = async (file: File | null) => {
    if (!file || !user) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB.'); return }
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${pub.publicUrl}?t=${Date.now()}`
      const { error: updErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      if (updErr) throw updErr
      setProfile((p: any) => ({ ...p, avatar_url: url }))
      toast.success('Profile photo updated.')
    } catch (e) { console.error('[dashboard] avatar upload failed', e); toast.error('Could not upload photo. Please try again.') }
    finally { setUploadingAvatar(false) }
  }

  const removeAvatar = async () => {
    if (!user) return
    setUploadingAvatar(true)
    try {
      const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
      if (error) throw error
      setProfile((p: any) => ({ ...p, avatar_url: null }))
      toast.success('Photo removed.')
    } catch (e) { console.error('[dashboard] avatar remove failed', e); toast.error('Could not remove photo. Please try again.') }
    finally { setUploadingAvatar(false) }
  }

  if (loading || !user) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner label="Loading dashboard…" padding={80} /></div>
    )
  }

  const role = profile?.role || 'student'
  const badge = ROLE_BADGE[role]
  const isAdmin = role === 'owner' || role === 'admin'
  const fullName = profile?.full_name || user?.user_metadata?.full_name

  return (
    <>
      <SiteNavView
        active="/dashboard"
        user={{ id: user.id, name: twoNames(fullName), role: badge.label, avatarUrl: profile?.avatar_url, semester: profile?.semester ?? null }}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(22px,4vw,40px)' }}>
        {/* Header */}
        <div className="anim-1" style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 34, flexWrap: 'wrap' }}>
          <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }} title="Change photo">
            <div style={{
              width: 76, height: 76, borderRadius: '50%', overflow: 'hidden',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 28, color: 'white', border: '2px solid var(--br)',
              boxShadow: 'var(--shadow-crimson)',
            }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (fullName || 'U')[0].toUpperCase()}
            </div>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 25, height: 25, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              {uploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
            </div>
            <input type="file" accept="image/*" onChange={e => uploadAvatar(e.target.files?.[0] || null)} style={{ display: 'none' }} />
          </label>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>Your Dashboard</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--t)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {showGreeting ? greeting() + ', ' : ''}{twoNames(fullName)}
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 8, background: `color-mix(in srgb, ${badge.color} 15%, transparent)`, border: `1px solid ${badge.color}`, color: badge.color }}>{badge.label}</span>
            </h1>
            <p style={{ color: 'var(--t3)', marginTop: 6, fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              ID {profile?.student_id || '—'}
            </p>
            {profile?.avatar_url && (
              <button onClick={removeAvatar} disabled={uploadingAvatar} style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--t3)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--font)', padding: 0, textDecoration: 'underline' }}>Remove photo</button>
            )}
          </div>
        </div>

        {/* Workflow dashboards — each role's first screen answers
            "what do I need to do now?" (queues + delegations, not static cards). */}
        {role === 'student' && <StudentHub userId={user.id} />}
        {role === 'doctor' && <DoctorHub />}
        {role === 'master' && <MasterHub />}
        {role === 'guider' && <GuiderHub />}
        {(role === 'owner' || role === 'admin') && <AdminHub />}
      </main>
    </>
  )
}
