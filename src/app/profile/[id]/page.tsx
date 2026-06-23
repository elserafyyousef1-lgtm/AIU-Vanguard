'use client'
// src/app/profile/[id]/page.tsx
// ───────────────────────────────────────────────────────────
// Public profile page. Shows avatar, name, role, bio.
// - Owner of the profile can edit their bio.
// - A student viewing a staff profile sees a "Message" button.
// ───────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import toast from 'react-hot-toast'
import { Loader2, MessageSquare, Pencil, Check, Linkedin, Camera, ImagePlus, X, Github, Award } from 'lucide-react'

const roleMeta = (r?: string) => {
  switch (r) {
    case 'owner':  return { label: 'Owner', color: '#f59e0b' }
    case 'admin':  return { label: 'Admin', color: '#6366f1' }
    case 'doctor': return { label: 'Doctor', color: '#10b981' }
    case 'master': return { label: 'Master', color: '#8b5cf6' }
    case 'guider': return { label: 'Guider', color: '#06b6d4' }
    default:       return { label: 'Student', color: 'var(--t3)' }
  }
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const profileId = params?.id as string
  const { userId, isStudent } = useAuth()
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [bioText, setBioText] = useState('')
  const [linkedinText, setLinkedinText] = useState('')
  const [githubText, setGithubText] = useState('')
  const [certName, setCertName] = useState('')
  const [certUrl, setCertUrl] = useState('')
  const [savingCert, setSavingCert] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    if (!profileId) return
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, nickname, role, avatar_url, bio, linkedin, github, certificates, bio_images')
        .eq('id', profileId)
        .single()
      setProfile(data)
      setBioText(data?.bio || '')
      setLinkedinText(data?.linkedin || '')
      setGithubText(data?.github || '')
      setLoading(false)
    }
    load()
  }, [profileId])

  const isSelf = userId === profileId
  const targetIsStaff = ['owner', 'admin', 'doctor'].includes(profile?.role)

  const saveBio = async () => {
    // Light validation: LinkedIn must be empty or a linkedin.com URL
    let link = linkedinText.trim()
    if (link && !link.startsWith('http')) link = 'https://' + link
    if (link && !/^https:\/\/(www\.)?linkedin\.com\//i.test(link)) {
      toast.error('Please enter a valid LinkedIn URL.')
      return
    }
    let gh = githubText.trim()
    if (gh && !gh.startsWith('http')) gh = 'https://' + gh
    if (gh && !/^https:\/\/(www\.)?github\.com\//i.test(gh)) {
      toast.error('Please enter a valid GitHub URL.')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ bio: bioText.trim(), linkedin: link || null, github: gh || null })
      .eq('id', userId)
    setSaving(false)
    if (error) { toast.error('Could not save. Please try again.'); return }
    setProfile((p: any) => ({ ...p, bio: bioText.trim(), linkedin: link || null, github: gh || null }))
    setGithubText(gh)
    setLinkedinText(link)
    setEditing(false)
    toast.success('Profile updated.')
  }

  // Change profile photo (only on your own profile)
  const uploadAvatar = async (file: File | null) => {
    if (!file || !userId) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB.'); return }
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${pub.publicUrl}?t=${Date.now()}`
      const { error: updErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      if (updErr) throw updErr
      setProfile((p: any) => ({ ...p, avatar_url: url }))
      toast.success('Photo updated.')
    } catch {
      toast.error('Could not upload the photo. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // ── Bio gallery (up to 6 photos) ──
  const MAX_GALLERY = 6
  const addGalleryPhotos = async (files: FileList | null) => {
    if (!files || !userId) return
    const current: string[] = profile?.bio_images || []
    const room = MAX_GALLERY - current.length
    if (room <= 0) { toast.error(`Maximum ${MAX_GALLERY} photos.`); return }
    const picked = Array.from(files).slice(0, room)
    for (const f of picked) {
      if (!f.type.startsWith('image/')) { toast.error(`"${f.name}" is not an image.`); return }
      if (f.size > 5 * 1024 * 1024) { toast.error(`"${f.name}" is over 5 MB.`); return }
    }
    setUploadingGallery(true)
    try {
      const urls: string[] = []
      for (const f of picked) {
        const ext = f.name.split('.').pop()
        const path = `${userId}/gallery-${Date.now()}-${Math.random().toString(36).slice(2,7)}.${ext}`
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, f)
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
        urls.push(pub.publicUrl)
      }
      const next = [...current, ...urls]
      const { error } = await supabase.from('profiles').update({ bio_images: next }).eq('id', userId)
      if (error) throw error
      setProfile((p: any) => ({ ...p, bio_images: next }))
      toast.success('Photos added.')
    } catch {
      toast.error('Could not upload. Please try again.')
    } finally {
      setUploadingGallery(false)
    }
  }

  const removeGalleryPhoto = async (url: string) => {
    if (!userId) return
    const next = (profile?.bio_images || []).filter((u: string) => u !== url)
    const { error } = await supabase.from('profiles').update({ bio_images: next }).eq('id', userId)
    if (error) { toast.error('Could not remove the photo.'); return }
    setProfile((p: any) => ({ ...p, bio_images: next }))
  }

  // ── Certificates (name + verify link, e.g. Coursera) ──
  const MAX_CERTS = 8
  const addCertificate = async () => {
    if (!userId) return
    const name = certName.trim()
    let url = certUrl.trim()
    if (!name || !url) { toast.error('Please fill the certificate name and link.'); return }
    if (!url.startsWith('http')) url = 'https://' + url
    const current: { name: string; url: string }[] = profile?.certificates || []
    if (current.length >= MAX_CERTS) { toast.error(`Maximum ${MAX_CERTS} certificates.`); return }
    setSavingCert(true)
    const next = [...current, { name, url }]
    const { error } = await supabase.from('profiles').update({ certificates: next }).eq('id', userId)
    setSavingCert(false)
    if (error) { toast.error('Could not save. Please try again.'); return }
    setProfile((p: any) => ({ ...p, certificates: next }))
    setCertName(''); setCertUrl('')
    toast.success('Certificate added.')
  }

  const removeCertificate = async (url: string) => {
    if (!userId) return
    const next = (profile?.certificates || []).filter((c: any) => c.url !== url)
    const { error } = await supabase.from('profiles').update({ certificates: next }).eq('id', userId)
    if (error) { toast.error('Could not remove.'); return }
    setProfile((p: any) => ({ ...p, certificates: next }))
  }

  // Open (or create) a conversation with this staff member
  const messageThem = async () => {
    if (!userId) { router.push('/login?redirect=/profile/' + profileId); return }
    // Try to find existing conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('student_id', userId)
      .eq('staff_id', profileId)
      .maybeSingle()
    if (existing) { router.push('/messages'); return }
    const { error } = await supabase
      .from('conversations')
      .insert({ student_id: userId, staff_id: profileId })
    if (error) { toast.error('Could not start the conversation.'); return }
    router.push('/messages')
  }

  if (loading) {
    return (
      <div style={{ minHeight:'100dvh', background:'var(--bg)' }}>
        <Navbar />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'var(--t3)' }}>
          <Loader2 size={20} className="animate-spin" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ minHeight:'100dvh', background:'var(--bg)' }}>
        <Navbar />
        <div style={{ textAlign:'center', padding:'80px 20px', color:'var(--t3)' }}>
          This profile doesn’t exist.
        </div>
      </div>
    )
  }

  const meta = roleMeta(profile.role)

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth:680, margin:'0 auto', padding:'40px 20px' }}>
        <div style={{
          background:'var(--s2)', border:'1px solid var(--br)',
          borderRadius:20, padding:28,
        }}>
          {/* Avatar + name */}
          <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:20 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{
                width:88, height:88, borderRadius:'50%', overflow:'hidden',
                background:'linear-gradient(135deg, var(--accent), var(--accent-2))',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'white', fontWeight:800, fontSize:34,
              }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : (profile.full_name || 'U')[0].toUpperCase()}
              </div>
              {isSelf && (
                <label title="Change photo" style={{
                  position:'absolute', bottom:-2, right:-2, width:30, height:30, borderRadius:'50%',
                  background:'var(--accent)', border:'2px solid var(--s2)', color:'white',
                  display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
                }}>
                  {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  <input type="file" accept="image/*" onChange={e => uploadAvatar(e.target.files?.[0] || null)} style={{ display:'none' }} />
                </label>
              )}
            </div>
            <div style={{ minWidth:0 }}>
              <h1 style={{ fontSize:24, fontWeight:800, color:'var(--t)', letterSpacing:'-0.02em' }}>
                {profile.full_name}
              </h1>
              {profile.nickname && (
                <div style={{ fontSize:13, color:'var(--t3)', marginTop:2, fontStyle:'italic' }}>
                  {profile.nickname}
                </div>
              )}
              <span style={{
                display:'inline-block', marginTop:6, padding:'3px 10px', borderRadius:20,
                fontSize:12, fontWeight:700, background:`${meta.color}1a`,
                color:meta.color, border:`1px solid ${meta.color}40`,
              }}>{meta.label}</span>
            </div>
          </div>

          {/* Bio */}
          <div style={{ marginBottom:20 }}>
            {editing ? (
              <div>
                <textarea
                  value={bioText}
                  onChange={e => setBioText(e.target.value)}
                  rows={4}
                  placeholder="Write a short bio..."
                  maxLength={300}
                  style={{
                    width:'100%', background:'var(--s3)', border:'1px solid var(--accent)',
                    borderRadius:12, padding:'12px 14px', color:'var(--t)',
                    fontSize:14, fontFamily:'var(--font)', resize:'none', outline:'none', boxSizing:'border-box',
                  }}
                />
                <input
                  value={linkedinText}
                  onChange={e => setLinkedinText(e.target.value)}
                  placeholder="LinkedIn URL (optional) — e.g. linkedin.com/in/your-name"
                  style={{
                    width:'100%', marginTop:8, background:'var(--s3)', border:'1px solid var(--br)',
                    borderRadius:12, padding:'10px 14px', color:'var(--t)',
                    fontSize:13.5, fontFamily:'var(--font)', outline:'none', boxSizing:'border-box',
                  }}
                />
                <input
                  value={githubText}
                  onChange={e => setGithubText(e.target.value)}
                  placeholder="GitHub URL (optional) — e.g. github.com/your-username"
                  style={{
                    width:'100%', marginTop:8, background:'var(--s3)', border:'1px solid var(--br)',
                    borderRadius:12, padding:'10px 14px', color:'var(--t)',
                    fontSize:13.5, fontFamily:'var(--font)', outline:'none', boxSizing:'border-box',
                  }}
                />
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <button
                    onClick={saveBio}
                    disabled={saving}
                    style={{
                      display:'flex', alignItems:'center', gap:6, padding:'8px 16px',
                      borderRadius:10, background:'var(--accent)', color:'white',
                      border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)',
                    }}
                  >{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save</button>
                  <button
                    onClick={() => { setEditing(false); setBioText(profile.bio || '') }}
                    style={{
                      padding:'8px 16px', borderRadius:10, background:'var(--s3)',
                      color:'var(--t2)', border:'1px solid var(--br)', fontSize:13,
                      cursor:'pointer', fontFamily:'var(--font)',
                    }}
                  >Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize:14.5, color: profile.bio ? 'var(--t2)' : 'var(--t3)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>
                  {profile.bio || (isSelf ? 'No bio yet. Add one so people know who you are.' : 'No bio yet.')}
                </p>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {profile.linkedin && (
                    <a
                      href={profile.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display:'inline-flex', alignItems:'center', gap:7, marginTop:10,
                        padding:'7px 14px', borderRadius:10, textDecoration:'none',
                        background:'rgba(10,102,194,0.12)', border:'1px solid rgba(10,102,194,0.4)',
                        color:'#0a66c2', fontSize:13, fontWeight:600,
                      }}
                    >
                      <Linkedin size={14} /> LinkedIn
                    </a>
                  )}
                  {profile.github && (
                    <a
                      href={profile.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display:'inline-flex', alignItems:'center', gap:7, marginTop:10,
                        padding:'7px 14px', borderRadius:10, textDecoration:'none',
                        background:'var(--s3)', border:'1px solid var(--br)',
                        color:'var(--t)', fontSize:13, fontWeight:600,
                      }}
                    >
                      <Github size={14} /> GitHub
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Photo gallery ── */}
          {((profile.bio_images?.length || 0) > 0 || isSelf) && (
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:12.5, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--t3)' }}>
                  Photos
                </span>
                {isSelf && (profile.bio_images?.length || 0) < 6 && (
                  <label style={{
                    display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
                    borderRadius:9, background:'var(--s3)', border:'1px solid var(--br)',
                    color:'var(--t2)', fontSize:12.5, fontWeight:600, cursor:'pointer',
                  }}>
                    {uploadingGallery ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                    Add photos
                    <input type="file" accept="image/*" multiple onChange={e => addGalleryPhotos(e.target.files)} style={{ display:'none' }} />
                  </label>
                )}
              </div>
              {(profile.bio_images?.length || 0) === 0 ? (
                <p style={{ fontSize:13, color:'var(--t3)' }}>Add up to 6 photos — certificates, projects, moments you're proud of.</p>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
                  {profile.bio_images.map((url: string) => (
                    <div key={url} style={{ position:'relative', aspectRatio:'1', borderRadius:12, overflow:'hidden', border:'1px solid var(--br)', cursor:'pointer' }}>
                      <img
                        src={url} alt=""
                        onClick={() => setLightbox(url)}
                        style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                      />
                      {isSelf && (
                        <button
                          onClick={() => removeGalleryPhoto(url)}
                          title="Remove"
                          style={{
                            position:'absolute', top:6, right:6, width:24, height:24, borderRadius:7,
                            background:'rgba(0,0,0,0.55)', border:'none', color:'white', cursor:'pointer',
                            display:'flex', alignItems:'center', justifyContent:'center',
                          }}
                        ><X size={13} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Certificates ── */}
          {((profile.certificates?.length || 0) > 0 || isSelf) && (
            <div style={{ marginBottom:20 }}>
              <span style={{ fontSize:12.5, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--t3)', display:'block', marginBottom:10 }}>
                Certificates
              </span>
              {(profile.certificates?.length || 0) === 0 ? (
                <p style={{ fontSize:13, color:'var(--t3)' }}>Add certificates with their verify links (Coursera, Udemy, edX...).</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {profile.certificates.map((c: any) => (
                    <div key={c.url} style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'10px 14px', borderRadius:12,
                      background:'var(--s3)', border:'1px solid var(--br)',
                    }}>
                      <Award size={16} style={{ color:'var(--accent)', flexShrink:0 }} />
                      <a href={c.url} target="_blank" rel="noopener noreferrer" style={{
                        flex:1, minWidth:0, color:'var(--t)', textDecoration:'none',
                        fontSize:13.5, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                      }}>{c.name}</a>
                      <span style={{ fontSize:11, color:'var(--t3)', flexShrink:0 }}>Verify ↗</span>
                      {isSelf && (
                        <button onClick={() => removeCertificate(c.url)} title="Remove" style={{
                          background:'none', border:'none', color:'var(--t3)', cursor:'pointer', padding:2, display:'flex', flexShrink:0,
                        }}><X size={13} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {isSelf && (profile.certificates?.length || 0) < 8 && (
                <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                  <input
                    value={certName}
                    onChange={e => setCertName(e.target.value)}
                    placeholder="Certificate name (e.g. Machine Learning — Coursera)"
                    style={{
                      flex:'2 1 200px', background:'var(--s3)', border:'1px solid var(--br)',
                      borderRadius:10, padding:'9px 12px', color:'var(--t)',
                      fontSize:13, fontFamily:'var(--font)', outline:'none',
                    }}
                  />
                  <input
                    value={certUrl}
                    onChange={e => setCertUrl(e.target.value)}
                    placeholder="Verify link"
                    style={{
                      flex:'2 1 160px', background:'var(--s3)', border:'1px solid var(--br)',
                      borderRadius:10, padding:'9px 12px', color:'var(--t)',
                      fontSize:13, fontFamily:'var(--font)', outline:'none',
                    }}
                  />
                  <button
                    onClick={addCertificate}
                    disabled={savingCert}
                    style={{
                      padding:'9px 16px', borderRadius:10, background:'var(--accent)',
                      color:'white', border:'none', fontSize:13, fontWeight:600,
                      cursor:'pointer', fontFamily:'var(--font)', flexShrink:0,
                    }}
                  >{savingCert ? '...' : 'Add'}</button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:10 }}>
            {isSelf && !editing && (
              <button
                onClick={() => setEditing(true)}
                style={{
                  display:'flex', alignItems:'center', gap:7, padding:'10px 18px',
                  borderRadius:11, background:'var(--s3)', color:'var(--t)',
                  border:'1px solid var(--br)', fontSize:13.5, fontWeight:600,
                  cursor:'pointer', fontFamily:'var(--font)',
                }}
              ><Pencil size={15} /> Edit bio</button>
            )}
            {/* A student can message a staff member */}
            {!isSelf && targetIsStaff && isStudent && (
              <button
                onClick={messageThem}
                style={{
                  display:'flex', alignItems:'center', gap:7, padding:'10px 18px',
                  borderRadius:11, background:'linear-gradient(135deg, var(--accent), var(--accent-2))',
                  color:'white', border:'none', fontSize:13.5, fontWeight:700,
                  cursor:'pointer', fontFamily:'var(--font)',
                }}
              ><MessageSquare size={15} /> Message</button>
            )}
          </div>
        </div>
      </main>
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:24, cursor:'zoom-out' }}
        >
          <img src={lightbox} alt="" style={{ maxWidth:'100%', maxHeight:'100%', borderRadius:14 }} />
        </div>
      )}
    </div>
  )
}
