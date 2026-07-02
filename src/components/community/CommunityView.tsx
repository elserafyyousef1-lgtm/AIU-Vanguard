'use client'
// src/components/community/CommunityView.tsx
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteNavView } from '@/components/layout/SiteNavView'
import { ScrollProgress } from '@/components/ui/ScrollProgress'
import { createClient } from '@/lib/supabase/client'
import { Heart, MessageCircle, Send, Loader2, Image as ImageIcon, X, MoreHorizontal, Trash2, Pencil, Check, FileText, Video } from 'lucide-react'
import { COURSES } from '@/lib/data/courses'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import type { Post } from '@/types'

export function CommunityView({ courseFilter }: { courseFilter: string | null }) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState('')
  const [courseTag, setCourseTag] = useState(courseFilter || '')
  const [posting, setPosting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [pdfFiles, setPdfFiles] = useState<File[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [showVideoInput, setShowVideoInput] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [replyTo, setReplyTo] = useState<Record<string, { id: string; name: string } | null>>({})
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({})
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const { role, isStaff, isMaster, myCourses, userId, profile: myProfile, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  // Hierarchy: general feed → owner/admin/doctor/master.
  // Course pages → owner/admin anywhere; doctor/master/guider only in their assigned courses.
  const canPost = courseFilter
    ? (role === 'owner' || role === 'admin' || myCourses.includes(courseFilter))
    : (isStaff || isMaster)
  const supabase = createClient()
  const [courseCodes, setCourseCodes] = useState<string[]>([])

  // Current user (local session read — RLS still guards every query) + the REAL course list
  // for the filter chips (was a hardcoded 4-course array from the study-package era).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    supabase.from('courses').select('code').order('code')
      .then(({ data }) => setCourseCodes((data || []).map((c: any) => c.code)))
  }, [])

  // Load posts
  const loadPosts = useCallback(async () => {
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (full_name, avatar_url, role),
        post_likes (user_id),
        comments (id, content, created_at, user_id, reply_to, profiles:user_id (full_name, role, avatar_url), comment_likes (user_id))
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    // Per-course community: show only this course's posts.
    // General community: show only general posts (no course tag).
    if (courseFilter) {
      query = query.eq('course_tag', courseFilter)
    } else {
      query = query.is('course_tag', null)
    }

    const { data, error } = await query

    if (!error && data) setPosts(data)
    setLoading(false)
  }, [courseFilter])

  useEffect(() => { loadPosts() }, [loadPosts])

  // Deep link: if URL has #post-xxx, scroll to it and highlight briefly
  useEffect(() => {
    if (loading) return
    const hash = window.location.hash
    if (!hash.startsWith('#post-')) return
    const el = document.getElementById(hash.slice(1))
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.style.transition = 'box-shadow 0.3s'
    el.style.boxShadow = '0 0 0 2px var(--accent)'
    const t = setTimeout(() => { el.style.boxShadow = '' }, 2000)
    return () => clearTimeout(t)
  }, [loading, posts])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('community')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, loadPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, loadPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, loadPosts)
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [loadPosts])

  // Handle picking an image (with basic validation)
  const handleImagePick = (file: File | null) => {
    if (!file) { setImageFile(null); setImagePreview(null); return }
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handlePdfPick = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const picked: File[] = []
    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') {
        toast.error(`"${file.name}" is not a PDF.`)
        continue
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`"${file.name}" is over 15 MB.`)
        continue
      }
      picked.push(file)
    }
    if (picked.length) setPdfFiles(prev => [...prev, ...picked])
  }

  const removePdf = (index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Validate + normalize a YouTube link. Returns null if invalid.
  const normalizeVideoUrl = (raw: string): string | null => {
    const url = raw.trim()
    if (!url) return null
    const ok = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i.test(url)
    if (!ok) return null
    return url.startsWith('http') ? url : `https://${url}`
  }

  const submitPost = async () => {
    const hasContent = newPost.trim() || imageFile || pdfFiles.length > 0 || videoUrl.trim()
    if (!hasContent) return
    if (!user) { toast.error('Please login to post'); return }

    // Validate video link early (before any upload)
    let finalVideoUrl: string | null = null
    if (videoUrl.trim()) {
      finalVideoUrl = normalizeVideoUrl(videoUrl)
      if (!finalVideoUrl) {
        toast.error('Please enter a valid YouTube link.')
        return
      }
    }

    setPosting(true)
    try {
      let imageUrl: string | null = null
      const fileItems: { name: string; url: string }[] = []

      // Upload image (if any)
      if (imageFile) {
        setUploading(true)
        const ext = imageFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase
          .storage.from('post-images')
          .upload(path, imageFile)
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('post-images').getPublicUrl(path)
        imageUrl = pub.publicUrl
      }

      // Upload each PDF (if any)
      if (pdfFiles.length > 0) {
        setUploading(true)
        for (const pdf of pdfFiles) {
          const safeName = pdf.name.replace(/[^a-zA-Z0-9._-]/g, '_')
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2,7)}-${safeName}`
          const { error: fErr } = await supabase
            .storage.from('post-files')
            .upload(path, pdf)
          if (fErr) throw fErr
          const { data: pub } = supabase.storage.from('post-files').getPublicUrl(path)
          fileItems.push({ name: pdf.name, url: pub.publicUrl })
        }
      }
      setUploading(false)

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: newPost.trim(),
        course_tag: courseFilter || courseTag || null,
        image_url: imageUrl,
        file_urls: fileItems,
        video_url: finalVideoUrl,
      })
      if (error) throw error

      setNewPost('')
      setCourseTag(courseFilter || '')
      setImageFile(null)
      setImagePreview(null)
      setPdfFiles([])
      setVideoUrl('')
      setShowVideoInput(false)
      toast.success('Posted!')
    } catch (err: any) {
      toast.error(err.message || 'Could not post. Please try again.')
    } finally {
      setPosting(false)
      setUploading(false)
    }
  }

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!user) { toast.error('Please login'); return }
    if (liked) {
      await supabase.from('post_likes').delete().match({ post_id: postId, user_id: user.id })
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
    }
    loadPosts()
  }

  const submitComment = async (postId: string) => {
    const text = (commentText[postId] || '').trim()
    if (!text) return
    if (!user) { toast.error('Please login to comment'); return }
    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content: text,
      reply_to: replyTo[postId]?.id || null,
    })
    if (error) { toast.error('Could not post comment.'); return }
    const parentId = replyTo[postId]?.id
    if (parentId) setExpandedReplies(s => ({ ...s, [parentId]: true }))
    setCommentText(c => ({ ...c, [postId]: '' }))
    setReplyTo(r => ({ ...r, [postId]: null }))
    loadPosts()
  }

  const deletePost = async (postId: string) => {
    setMenuOpen(null)
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) { toast.error('Could not delete the post.'); return }
    toast.success('Post deleted.')
    loadPosts()
  }

  const startEdit = (postId: string, current: string) => {
    setMenuOpen(null)
    setEditingPost(postId)
    setEditText(current)
  }

  const saveEdit = async (postId: string) => {
    const { error } = await supabase
      .from('posts')
      .update({ content: editText.trim() })
      .eq('id', postId)
    if (error) { toast.error('Could not save changes.'); return }
    setEditingPost(null)
    setEditText('')
    toast.success('Post updated.')
    loadPosts()
  }

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (error) { toast.error('Could not delete the comment.'); return }
    loadPosts()
  }

  const toggleCommentLike = async (commentId: string, liked: boolean) => {
    if (!user) { toast.error('Please login'); return }
    if (liked) {
      await supabase.from('comment_likes').delete().match({ comment_id: commentId, user_id: user.id })
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id })
    }
    loadPosts()
  }

  // Friendly label + color for a user's role
  const roleBadge = (role?: string): { label: string; color: string } | null => {
    switch (role) {
      case 'owner':  return { label: 'Owner', color: '#f59e0b' }
      case 'admin':  return { label: 'Admin', color: '#6366f1' }
      case 'doctor': return { label: 'Doctor', color: '#10b981' }
      case 'master': return { label: 'Master', color: '#8b5cf6' }
      case 'guider': return { label: 'Guider', color: '#06b6d4' }
      case 'student':return { label: 'Student', color: 'var(--t3)' }
      default: return null
    }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); toast.success('Logged out'); router.push('/'); router.refresh() }
  const navUser = (!authLoading && userId)
    ? { id: userId, name: (myProfile as any)?.full_name || 'User', role: role ? role[0].toUpperCase() + role.slice(1) : undefined, avatarUrl: (myProfile as any)?.avatar_url ?? null }
    : null

  return (
    <>
      <ScrollProgress />
      <SiteNavView active="/community" user={navUser} isAdmin={isAdmin} loading={authLoading} onLogout={handleLogout} />
      <main style={{ maxWidth:680, margin:'0 auto', padding:'40px 20px 80px' }}>

        {/* Header */}
        <div className="anim-1" style={{ marginBottom:20 }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>
            {courseFilter ? `${courseFilter} Community` : 'Student Community'}
          </div>
          <h1 style={{ fontSize:'clamp(22px,4vw,34px)', fontWeight:800, letterSpacing:'-0.03em', color:'var(--t)' }}>
            {courseFilter ? (COURSES[courseFilter]?.title || courseFilter) : 'Community Feed'}
          </h1>
          <p style={{ color:'var(--t2)', marginTop:8 }}>
            {courseFilter
              ? 'Posts, resources, and discussion for this course.'
              : 'General announcements and discussion. Pick a course below for its own feed.'}
          </p>
        </div>

        {/* Course navigation */}
        <div className="anim-1" style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:28 }}>
          <Link href="/community" style={{
            padding:'7px 14px', borderRadius:9, fontSize:13, fontWeight:600, textDecoration:'none',
            background: !courseFilter ? 'var(--accent)' : 'var(--s2)',
            color: !courseFilter ? 'white' : 'var(--t2)',
            border:'1px solid var(--br)',
          }}>General</Link>
          {courseCodes.map(slug => (
            <Link key={slug} href={`/community/${slug}`} style={{
              padding:'7px 14px', borderRadius:9, fontSize:13, fontWeight:600, textDecoration:'none',
              background: courseFilter === slug ? (COURSES[slug]?.color || 'var(--accent)') : 'var(--s2)',
              color: courseFilter === slug ? 'white' : 'var(--t2)',
              border:'1px solid var(--br)',
            }}>{slug}</Link>
          ))}
        </div>

        {/* New post — only staff (owner/admin/doctor) can post */}
        {canPost ? (
        <div className="anim-2" style={{
          background:'var(--s2)', border:'1px solid var(--br)',
          borderRadius:16, padding:20, marginBottom:28,
        }}>
          <textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            placeholder={user ? "Share an announcement with your students..." : "Login to post..."}
            disabled={!user}
            rows={3}
            style={{
              width:'100%', background:'var(--s3)', border:'1px solid var(--br)',
              borderRadius:10, padding:'12px 14px', color:'var(--t)',
              fontSize:14, fontFamily:'var(--font)', resize:'none', outline:'none',
              boxSizing:'border-box',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--br)'}
          />

          {/* Image preview */}
          {imagePreview && (
            <div style={{ position:'relative', marginTop:12, display:'inline-block' }}>
              <img
                src={imagePreview}
                alt="preview"
                style={{ maxHeight:200, maxWidth:'100%', borderRadius:10, border:'1px solid var(--br)' }}
              />
              <button
                onClick={() => handleImagePick(null)}
                style={{
                  position:'absolute', top:8, right:8,
                  width:28, height:28, borderRadius:8,
                  background:'rgba(0,0,0,0.6)', border:'none', color:'white',
                  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                }}
              ><X size={15} /></button>
            </div>
          )}

          {/* PDF chips */}
          {pdfFiles.map((pdf, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:8, marginTop:12,
              padding:'8px 12px', borderRadius:10, background:'var(--s3)',
              border:'1px solid var(--br)', maxWidth:'100%',
            }}>
              <FileText size={16} style={{ color:'var(--accent)', flexShrink:0 }} />
              <span style={{ fontSize:13, color:'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {pdf.name}
              </span>
              <button onClick={() => removePdf(i)} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--t3)', cursor:'pointer', display:'flex' }}>
                <X size={15} />
              </button>
            </div>
          ))}

          {/* Video link input */}
          {showVideoInput && (
            <input
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="Paste a YouTube link..."
              style={{
                width:'100%', marginTop:12, background:'var(--s3)', border:'1px solid var(--br)',
                borderRadius:10, padding:'10px 14px', color:'var(--t)', fontSize:13.5,
                fontFamily:'var(--font)', outline:'none', boxSizing:'border-box',
              }}
            />
          )}

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12, gap:10, flexWrap:'wrap' }}>
            {/* Course tag selector */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
              {/* Upload image button */}
              <label style={{
                display:'flex', alignItems:'center', justifyContent:'center',
                width:32, height:30, borderRadius:6, cursor:'pointer',
                background:'var(--s3)', border:'1px solid var(--br)', color:'var(--t2)',
              }} title="Add image">
                <ImageIcon size={15} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleImagePick(e.target.files?.[0] || null)}
                  style={{ display:'none' }}
                />
              </label>
              {/* Upload PDF button */}
              <label style={{
                display:'flex', alignItems:'center', justifyContent:'center',
                width:32, height:30, borderRadius:6, cursor:'pointer',
                background: pdfFiles.length ? 'var(--accent)' : 'var(--s3)',
                border:'1px solid var(--br)', color: pdfFiles.length ? 'white' : 'var(--t2)',
              }} title="Attach PDF(s)">
                <FileText size={15} />
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={e => handlePdfPick(e.target.files)}
                  style={{ display:'none' }}
                />
              </label>
              {/* Video link button */}
              <button
                type="button"
                onClick={() => setShowVideoInput(v => !v)}
                style={{
                  display:'flex', alignItems:'center', justifyContent:'center',
                  width:32, height:30, borderRadius:6, cursor:'pointer',
                  background: (videoUrl || showVideoInput) ? 'var(--accent)' : 'var(--s3)',
                  border:'1px solid var(--br)', color: (videoUrl || showVideoInput) ? 'white' : 'var(--t2)',
                }} title="Add YouTube link"
              >
                <Video size={15} />
              </button>
              {!courseFilter && ['', ...courseCodes].map(slug => (
                <button
                  key={slug}
                  onClick={() => setCourseTag(slug)}
                  style={{
                    padding:'4px 10px', borderRadius:6, fontSize:11.5, fontWeight:600,
                    background: courseTag === slug
                      ? slug ? COURSES[slug]?.colorBg : 'var(--s4)'
                      : 'var(--s3)',
                    color: courseTag === slug
                      ? slug ? COURSES[slug]?.color : 'var(--t)'
                      : 'var(--t3)',
                    border:`1px solid ${courseTag === slug && slug ? COURSES[slug]?.color + '44' : 'var(--br)'}`,
                    cursor:'pointer', fontFamily:'var(--font)',
                  }}
                >{slug || 'General'}</button>
              ))}
            </div>

            <button
              onClick={submitPost}
              disabled={(!newPost.trim() && !imageFile && pdfFiles.length === 0 && !videoUrl.trim()) || posting || !user}
              style={{
                display:'flex', alignItems:'center', gap:7,
                padding:'8px 18px', borderRadius:10,
                background: (newPost.trim() || imageFile || pdfFiles.length || videoUrl.trim()) && user ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--s3)',
                color: (newPost.trim() || imageFile || pdfFiles.length || videoUrl.trim()) && user ? 'white' : 'var(--t3)',
                border:'none', fontSize:13, fontWeight:700,
                cursor: (newPost.trim() || imageFile || pdfFiles.length || videoUrl.trim()) && user ? 'pointer' : 'not-allowed',
                fontFamily:'var(--font)',
              }}
            >
              {posting ? <Loader2 size={14} /> : <Send size={14} />}
              {uploading ? 'Uploading...' : posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
        ) : (
          <div className="anim-2" style={{
            background:'var(--s2)', border:'1px solid var(--br)',
            borderRadius:16, padding:'16px 20px', marginBottom:28,
            color:'var(--t3)', fontSize:13.5, textAlign:'center',
          }}>
            {myCourses.length > 0
              ? `You can post in your course community (${myCourses.join(', ')}). Open it from the tabs above.`
              : 'Only instructors can post here. You can read, like, and comment on posts below.'}
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--t3)' }}>
            <Loader2 size={24} style={{ animation:'spin 1s linear infinite', margin:'0 auto 12px' }} />
            Loading posts...
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--t3)' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>💬</div>
            <p>No posts yet — be the first to share something!</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {posts.map(post => {
              const liked = post.post_likes?.some((l: any) => l.user_id === user?.id)
              const likeCount = post.post_likes?.length || 0
              const course = post.course_tag ? COURSES[post.course_tag] : null
              const relTime = new Date(post.created_at).toLocaleDateString('en-EG', { month:'short', day:'numeric' })

              return (
                <div key={post.id} id={`post-${post.id}`} style={{
                  background:'var(--s2)', border:'1px solid var(--br)',
                  borderRadius:16, padding:20,
                  animation:'fadeUp 0.3s var(--ease-out) both',
                }}>
                  {/* Author */}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
                    <Link href={`/profile/${post.user_id}`} style={{ flexShrink:0 }}>
                    <div style={{
                      width:44, height:44, borderRadius:'50%', overflow:'hidden',
                      background:'linear-gradient(135deg, var(--accent), var(--accent-2))',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight:700, fontSize:16, color:'white', flexShrink:0, cursor:'pointer',
                    }}>
                      {post.profiles?.avatar_url
                        ? <img src={post.profiles.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : (post.profiles?.full_name || 'U')[0].toUpperCase()
                      }
                    </div>
                    </Link>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <Link
                          href={`/profile/${post.user_id}`}
                          style={{ fontWeight:700, fontSize:15, color:'var(--t)', textDecoration:'none' }}
                        >
                          {post.profiles?.full_name || 'User'}
                        </Link>
                        {(() => {
                          const b = roleBadge(post.profiles?.role)
                          return b ? (
                            <span style={{
                              padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700,
                              background:`${b.color}1a`, color:b.color, border:`1px solid ${b.color}40`,
                            }}>{b.label}</span>
                          ) : null
                        })()}
                      </div>
                      <div style={{ fontSize:12.5, color:'var(--t3)', marginTop:2 }}>
                        {relTime}
                        {course && <span style={{ color:course.color, marginLeft:6 }}>· {course.code}</span>}
                      </div>
                    </div>

                    {/* Controls menu (owner of post can edit+delete; staff can delete any) */}
                    {(post.user_id === user?.id || isStaff) && (
                      <div style={{ position:'relative', flexShrink:0 }}>
                        <button
                          onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)}
                          style={{
                            width:32, height:32, borderRadius:8, background:'none',
                            border:'none', color:'var(--t3)', cursor:'pointer',
                            display:'flex', alignItems:'center', justifyContent:'center',
                          }}
                        ><MoreHorizontal size={18} /></button>
                        {menuOpen === post.id && (
                          <div style={{
                            position:'absolute', right:0, top:36, zIndex:10,
                            background:'var(--s3)', border:'1px solid var(--br)',
                            borderRadius:10, padding:6, minWidth:130,
                            boxShadow:'0 8px 24px rgba(0,0,0,0.3)',
                          }}>
                            {post.user_id === user?.id && (
                              <button
                                onClick={() => startEdit(post.id, post.content || '')}
                                style={{
                                  display:'flex', alignItems:'center', gap:8, width:'100%',
                                  padding:'8px 10px', borderRadius:7, background:'none',
                                  border:'none', color:'var(--t)', cursor:'pointer',
                                  fontSize:13, fontFamily:'var(--font)', textAlign:'left',
                                }}
                              ><Pencil size={14} /> Edit</button>
                            )}
                            <button
                              onClick={() => deletePost(post.id)}
                              style={{
                                display:'flex', alignItems:'center', gap:8, width:'100%',
                                padding:'8px 10px', borderRadius:7, background:'none',
                                border:'none', color:'var(--accent-red)', cursor:'pointer',
                                fontSize:13, fontFamily:'var(--font)', textAlign:'left',
                              }}
                            ><Trash2 size={14} /> Delete</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content (or edit box) */}
                  {editingPost === post.id ? (
                    <div style={{ marginBottom:14 }}>
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        rows={3}
                        style={{
                          width:'100%', background:'var(--s3)', border:'1px solid var(--accent)',
                          borderRadius:10, padding:'10px 14px', color:'var(--t)',
                          fontSize:15, fontFamily:'var(--font)', resize:'none', outline:'none',
                          boxSizing:'border-box',
                        }}
                      />
                      <div style={{ display:'flex', gap:8, marginTop:8 }}>
                        <button
                          onClick={() => saveEdit(post.id)}
                          style={{
                            display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
                            borderRadius:9, background:'var(--accent)', color:'white',
                            border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)',
                          }}
                        ><Check size={14} /> Save</button>
                        <button
                          onClick={() => { setEditingPost(null); setEditText('') }}
                          style={{
                            padding:'7px 14px', borderRadius:9, background:'var(--s3)',
                            color:'var(--t2)', border:'1px solid var(--br)', fontSize:13,
                            cursor:'pointer', fontFamily:'var(--font)',
                          }}
                        >Cancel</button>
                      </div>
                    </div>
                  ) : (
                    post.content && (
                      <p style={{ fontSize:15, color:'var(--t)', lineHeight:1.6, marginBottom:14, whiteSpace:'pre-wrap' }}>
                        {post.content}
                      </p>
                    )
                  )}

                  {/* Image (if any) */}
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="post"
                      style={{
                        width:'100%', borderRadius:14, marginBottom:14,
                        border:'1px solid var(--br)', maxHeight:480, objectFit:'cover',
                      }}
                    />
                  )}

                  {/* PDF attachments */}
                  {(() => {
                    const files: { name: string; url: string }[] =
                      Array.isArray(post.file_urls) && post.file_urls.length
                        ? post.file_urls
                        : post.file_url ? [{ name: 'PDF attachment', url: post.file_url }] : []
                    return files.map((f, i) => (
                      <a
                        key={i}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display:'flex', alignItems:'center', gap:10, marginBottom:10,
                          padding:'12px 14px', borderRadius:12, background:'var(--s3)',
                          border:'1px solid var(--br)', textDecoration:'none', color:'var(--t)',
                        }}
                      >
                        <FileText size={20} style={{ color:'var(--accent)', flexShrink:0 }} />
                        <span style={{ fontSize:13.5, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {f.name}
                        </span>
                      </a>
                    ))
                  })()}

                  {/* YouTube embed */}
                  {post.video_url && (() => {
                    // Extract the video id for an embed
                    const m = post.video_url.match(/(?:youtu\.be\/|v=)([\w-]{11})/)
                    const id = m ? m[1] : null
                    return id ? (
                      <div style={{ position:'relative', paddingBottom:'56.25%', height:0, marginBottom:14, borderRadius:14, overflow:'hidden', border:'1px solid var(--br)' }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${id}`}
                          title="video"
                          allowFullScreen
                          style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }}
                        />
                      </div>
                    ) : (
                      <a href={post.video_url} target="_blank" rel="noopener noreferrer"
                         style={{ display:'inline-block', marginBottom:14, color:'var(--accent)', fontSize:13.5 }}>
                        Watch video
                      </a>
                    )
                  })()}

                  {/* Actions */}
                  <div style={{ display:'flex', gap:24, alignItems:'center', paddingTop:8, borderTop:'1px solid var(--br)' }}>
                    <button
                      onClick={() => toggleLike(post.id, liked)}
                      style={{
                        display:'flex', alignItems:'center', gap:6,
                        background:'none', border:'none',
                        color: liked ? 'var(--accent-red)' : 'var(--t3)',
                        cursor:'pointer', fontSize:14, fontFamily:'var(--font)',
                        transition:'color 0.15s', padding:'6px 0',
                      }}
                    >
                      <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
                      {likeCount}
                    </button>
                    <button
                      onClick={() => setOpenComments(o => ({ ...o, [post.id]: !o[post.id] }))}
                      style={{
                        display:'flex', alignItems:'center', gap:6,
                        background:'none', border:'none', color:'var(--t3)',
                        cursor:'pointer', fontSize:14, fontFamily:'var(--font)', padding:'6px 0',
                      }}
                    >
                      <MessageCircle size={17} />
                      {post.comments?.length || 0}
                    </button>
                  </div>

                  {/* Comments section */}
                  {openComments[post.id] && (
                    <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--br)' }}>
                      {/* Existing comments — replies nested under their parent */}
                      {(() => {
                        const all = (post.comments || []).slice()
                          .sort((a:any,b:any)=> new Date(a.created_at).getTime()-new Date(b.created_at).getTime())
                        const tops = all.filter((c:any) => !c.reply_to)
                        const ordered: any[] = []
                        tops.forEach((top:any) => {
                          const replies = all.filter((r:any) => r.reply_to === top.id)
                          ordered.push({ ...top, _depth: 0, _replyCount: replies.length })
                          if (expandedReplies[top.id]) {
                            replies.forEach((r:any) => ordered.push({ ...r, _depth: 1 }))
                          }
                        })
                        // Orphan replies (parent deleted): show at top level
                        all.filter((c:any) => c.reply_to && !tops.find((t:any)=>t.id===c.reply_to))
                           .forEach((c:any) => ordered.push({ ...c, _depth: 0 }))
                        return ordered
                      })()
                        .map((c:any) => {
                          const cb = roleBadge(c.profiles?.role)
                          return (
                            <div key={c.id} style={{ marginBottom:12, marginLeft: c._depth ? 38 : 0 }}>
                            <div style={{ display:'flex', gap:10 }}>
                              {/* comment author avatar + name → their profile */}
                              <Link href={`/profile/${c.user_id}`} style={{ flexShrink:0 }}>
                                <div style={{
                                  width:32, height:32, borderRadius:'50%', overflow:'hidden',
                                  background:'var(--s4)', display:'flex', alignItems:'center',
                                  justifyContent:'center', fontWeight:700, fontSize:12, color:'var(--t2)',
                                }}>
                                  {c.profiles?.avatar_url
                                    ? <img src={c.profiles.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                    : (c.profiles?.full_name || 'U')[0].toUpperCase()
                                  }
                                </div>
                              </Link>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                                  <Link href={`/profile/${c.user_id}`} style={{ fontWeight:700, fontSize:13, color:'var(--t)', textDecoration:'none' }}>
                                    {c.profiles?.full_name || 'User'}
                                  </Link>
                                  {cb && (
                                    <span style={{ fontSize:10, fontWeight:700, color:cb.color }}>{cb.label}</span>
                                  )}
                                  {(c.user_id === user?.id || isStaff) && (
                                    <button
                                      onClick={() => deleteComment(c.id)}
                                      title="Delete comment"
                                      style={{
                                        marginLeft:'auto', background:'none', border:'none',
                                        color:'var(--t3)', cursor:'pointer', padding:2,
                                        display:'flex', alignItems:'center',
                                      }}
                                    ><Trash2 size={13} /></button>
                                  )}
                                </div>
                                {c.reply_to && (() => {
                                  const parent = (post.comments || []).find((x:any) => x.id === c.reply_to)
                                  const pname = parent?.profiles?.full_name || 'a comment'
                                  return (
                                    <div style={{ fontSize:11.5, color:'var(--accent)', marginTop:2 }}>
                                      Replying to {pname}
                                    </div>
                                  )
                                })()}
                                <p style={{ fontSize:13.5, color:'var(--t2)', lineHeight:1.5, marginTop:2, whiteSpace:'pre-wrap' }}>
                                  {c.content}
                                </p>
                                <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:5 }}>
                                {(() => {
                                  const cLiked = c.comment_likes?.some((l: any) => l.user_id === user?.id)
                                  const cCount = c.comment_likes?.length || 0
                                  return (
                                    <button
                                      onClick={() => toggleCommentLike(c.id, cLiked)}
                                      style={{
                                        display:'flex', alignItems:'center', gap:5,
                                        background:'none', border:'none', cursor:'pointer',
                                        color: cLiked ? 'var(--accent-red)' : 'var(--t3)',
                                        fontSize:12, fontFamily:'var(--font)', padding:0,
                                      }}
                                    >
                                      <Heart size={13} fill={cLiked ? 'currentColor' : 'none'} />
                                      {cCount > 0 && cCount}
                                    </button>
                                  )
                                })()}
                                  <button
                                    onClick={() => {
                                      setReplyTo(r => ({ ...r, [post.id]: { id: c.id, name: c.profiles?.full_name || 'User' } }))
                                      setOpenComments(o => ({ ...o, [post.id]: true }))
                                    }}
                                    style={{
                                      display:'flex', alignItems:'center', gap:5,
                                      background:'none', border:'none', cursor:'pointer',
                                      color:'var(--t3)', fontSize:12, fontFamily:'var(--font)', padding:0,
                                    }}
                                  >
                                    <MessageCircle size={13} /> Reply
                                  </button>
                                </div>
                              </div>
                            </div>
                            {c._replyCount > 0 && (
                              <button
                                onClick={() => setExpandedReplies(s => ({ ...s, [c.id]: !s[c.id] }))}
                                style={{
                                  marginLeft:42, marginTop:2, background:'none', border:'none',
                                  color:'var(--t3)', cursor:'pointer', fontSize:12.5, fontWeight:600,
                                  fontFamily:'var(--font)', padding:0,
                                }}
                              >
                                {expandedReplies[c.id]
                                  ? 'Hide replies'
                                  : `View ${c._replyCount} ${c._replyCount === 1 ? 'reply' : 'replies'}`}
                              </button>
                            )}
                            </div>
                          )
                        })}

                      {/* Add a comment — everyone can comment */}
                      {user && (
                        <div style={{ marginTop:4 }}>
                          {replyTo[post.id] && (
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, fontSize:12, color:'var(--accent)' }}>
                              <span>Replying to {replyTo[post.id]!.name}</span>
                              <button
                                onClick={() => setReplyTo(r => ({ ...r, [post.id]: null }))}
                                style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', display:'flex', padding:0 }}
                              ><X size={13} /></button>
                            </div>
                          )}
                          <div style={{ display:'flex', gap:8 }}>
                          <input
                            value={commentText[post.id] || ''}
                            onChange={e => setCommentText(c => ({ ...c, [post.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') submitComment(post.id) }}
                            placeholder="Write a comment..."
                            style={{
                              flex:1, background:'var(--s3)', border:'1px solid var(--br)',
                              borderRadius:20, padding:'8px 14px', color:'var(--t)',
                              fontSize:13.5, fontFamily:'var(--font)', outline:'none',
                            }}
                          />
                          <button
                            onClick={() => submitComment(post.id)}
                            disabled={!(commentText[post.id] || '').trim()}
                            style={{
                              display:'flex', alignItems:'center', justifyContent:'center',
                              width:38, height:38, borderRadius:'50%', flexShrink:0,
                              background:(commentText[post.id] || '').trim() ? 'var(--accent)' : 'var(--s3)',
                              color:(commentText[post.id] || '').trim() ? 'white' : 'var(--t3)',
                              border:'none', cursor:(commentText[post.id] || '').trim() ? 'pointer' : 'not-allowed',
                            }}
                          ><Send size={15} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
      {/* CommandPalette is rendered by SiteNav */}
    </>
  )
}
