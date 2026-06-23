'use client'
// src/app/dashboard/page.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { StudentHub } from '@/components/dashboard/StudentHub'
import { StaffHub } from '@/components/dashboard/StaffHub'
import { AdminHub } from '@/components/dashboard/AdminHub'
import { ScrollProgress } from '@/components/ui/ScrollProgress'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { createClient } from '@/lib/supabase/client'
import { COURSES } from '@/lib/data/courses'
import { BarChart3, BookOpen, Trophy, Clock, LogOut, Shield, Camera, Loader2, UserCircle, Settings } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

// Time-aware greeting, like world-class platforms
const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// First two names (e.g. "Yousef Mahmoud")
const twoNames = (full?: string) =>
  (full || 'Student').trim().split(/\s+/).slice(0, 2).join(' ')

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  owner:   { label: 'Owner',   color: '#f59e0b' },
  admin:   { label: 'Admin',   color: '#6366f1' },
  doctor:  { label: 'Doctor',  color: '#10b981' },
  master:  { label: 'Master',  color: '#8b5cf6' },
  guider:  { label: 'Guider',  color: '#06b6d4' },
  student: { label: 'Student', color: 'var(--t3)' },
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showGreeting, setShowGreeting] = useState(false)
  const [myStudentId, setMyStudentId] = useState<string | null>(null)
  const { isAdmin } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Greeting shows once per session, then disappears (refresh = gone)
  useEffect(() => {
    if (!sessionStorage.getItem('aiu_greeted')) {
      setShowGreeting(true)
      sessionStorage.setItem('aiu_greeted', '1')
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login?redirect=/dashboard'); return }
      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url, semester, settings, created_at, updated_at, bio, rep_course, linkedin, bio_images, github, certificates, nickname')
        .eq('id', user.id)
        .single()
      // sensitive fields (student_id) come from a secure function
      const { data: contact } = await supabase.rpc('my_contact')
      setProfile({ ...(profileData as any), ...(contact?.[0] || {}) })

      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out')
    router.push('/')
    router.refresh()
  }

  const uploadAvatar = async (file: File | null) => {
    if (!file || !user) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB.'); return }

    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      // Upload (upsert so re-uploading replaces the old one)
      const { error: upErr } = await supabase
        .storage.from('avatars')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${pub.publicUrl}?t=${Date.now()}`  // cache-bust

      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id)
      if (updErr) throw updErr

      setProfile((p: any) => ({ ...p, avatar_url: url }))
      toast.success('Profile photo updated.')
    } catch {
      toast.error('Could not upload photo. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const removeAvatar = async () => {
    if (!user) return
    setUploadingAvatar(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)
      if (error) throw error
      setProfile((p: any) => ({ ...p, avatar_url: null }))
      toast.success('Photo removed.')
    } catch {
      toast.error('Could not remove photo. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'var(--t3)' }}>
          Loading dashboard...
        </div>
      </>
    )
  }

  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main style={{ maxWidth:1100, margin:'0 auto', padding:'40px 20px 80px' }}>

        {/* Header */}
        <div className="anim-1" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:40, flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:18 }}>
            {/* Avatar with upload */}
            <label style={{ position:'relative', cursor:'pointer', flexShrink:0 }} title="Change photo">
              <div style={{
                width:72, height:72, borderRadius:'50%', overflow:'hidden',
                background:'linear-gradient(135deg, var(--accent), var(--accent-2))',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:800, fontSize:26, color:'white',
                border:'2px solid var(--br)',
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : (profile?.full_name || user?.user_metadata?.full_name || 'U')[0].toUpperCase()
                }
              </div>
              <div style={{
                position:'absolute', bottom:0, right:0,
                width:24, height:24, borderRadius:'50%',
                background:'var(--accent)', border:'2px solid var(--bg)',
                display:'flex', alignItems:'center', justifyContent:'center', color:'white',
              }}>
                {uploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={e => uploadAvatar(e.target.files?.[0] || null)}
                style={{ display:'none' }}
              />
            </label>

            <div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>
                Your Dashboard
              </div>
              <h1 style={{ fontSize:'clamp(22px,4vw,34px)', fontWeight:800, letterSpacing:'-0.03em', color:'var(--t)', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                {showGreeting ? greeting() + ', ' : ''}{twoNames(profile?.full_name || user?.user_metadata?.full_name)}
                {(() => {
                  const b = ROLE_BADGE[profile?.role || 'student']
                  return (
                    <span style={{
                      fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase',
                      padding:'4px 12px', borderRadius:8,
                      background:`color-mix(in srgb, ${b.color} 15%, transparent)`,
                      border:`1px solid ${b.color}`, color:b.color,
                    }}>{b.label}</span>
                  )
                })()}
              </h1>
              <p style={{ color:'var(--t3)', marginTop:6, fontSize:13.5, fontFamily:'var(--font-mono)' }}>
                ID {myStudentId || '—'}
              </p>
              {profile?.avatar_url && (
                <button
                  onClick={removeAvatar}
                  disabled={uploadingAvatar}
                  style={{
                    marginTop:8, background:'none', border:'none',
                    color:'var(--t3)', fontSize:12.5, cursor:'pointer',
                    fontFamily:'var(--font)', padding:0, textDecoration:'underline',
                  }}
                >Remove photo</button>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Link
              href={user ? `/profile/${user.id}` : '/login'}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'8px 16px', borderRadius:10,
                background:'var(--s2)', border:'1px solid var(--br)',
                color:'var(--t)', fontSize:13, cursor:'pointer',
                fontFamily:'var(--font)', textDecoration:'none', fontWeight:600,
              }}
            ><UserCircle size={14} /> My Profile</Link>
            <Link
              href="/settings"
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'8px 16px', borderRadius:10,
                background:'var(--s2)', border:'1px solid var(--br)',
                color:'var(--t)', fontSize:13, cursor:'pointer',
                fontFamily:'var(--font)', textDecoration:'none', fontWeight:600,
              }}
            ><Settings size={14} /> Settings</Link>
            {isAdmin && (
              <Link
                href="/admin"
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'8px 16px', borderRadius:10,
                  background:'var(--s2)', border:'1px solid var(--accent)',
                  color:'var(--accent)', fontSize:13, cursor:'pointer',
                  fontFamily:'var(--font)', textDecoration:'none',
                }}
              ><Shield size={14} /> Admin Panel</Link>
            )}
            <button
              onClick={handleLogout}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'8px 16px', borderRadius:10,
                background:'var(--s2)', border:'1px solid var(--br)',
                color:'var(--t3)', fontSize:13, cursor:'pointer',
                fontFamily:'var(--font)',
              }}
            ><LogOut size={14} /> Logout</button>
          </div>
        </div>

        {profile?.role === 'student' && user && <StudentHub userId={user.id} />}
        {(profile?.role === 'doctor' || profile?.role === 'master') && <StaffHub />}
        {(profile?.role === 'owner' || profile?.role === 'admin') && <AdminHub />}

      </main>
      <CommandPalette />
    </>
  )
}
