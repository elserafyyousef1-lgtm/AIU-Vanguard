'use client'
// src/components/ui/NotificationBell.tsx
// ───────────────────────────────────────────────────────────
// Bell icon + unread badge + dropdown list of notifications.
// Realtime updates, deep links to the source, mark-as-read.
// ───────────────────────────────────────────────────────────
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, Heart, MessageCircle, CornerUpLeft, Mail, Trash2, Megaphone, Award, GraduationCap, BookOpen, UserCog, ClipboardList, Sparkles } from 'lucide-react'
import { playSound } from '@/lib/sound'
import { useUserStore } from '@/lib/store'

interface Notif {
  id: string
  actor_id: string | null
  type: string  // like | comment | reply | message | post | promotion | teach_* | course_assigned | enroll_* | profile_updated
  post_id: string | null
  comment_id: string | null
  conversation_id: string | null
  read_at: string | null
  created_at: string
  meta?: string | null
  actor?: { full_name: string; avatar_url?: string } | null
  post?: { course_tag: string | null } | null
}

const typeText = (t: string, meta?: string | null) => {
  switch (t) {
    case 'like': return 'liked your post'
    case 'comment': return 'commented on your post'
    case 'reply': return 'replied to your comment'
    case 'message': return 'sent you a message'
    case 'post': return 'shared a new post'
    case 'promotion': return 'promoted you to a new role 🎉'
    case 'teach_request': return `requested to teach ${meta || 'a course'}`
    case 'teach_approved': return `approved your request to teach ${meta || ''}`.trim()
    case 'teach_rejected': return `declined your request to teach ${meta || ''}`.trim()
    case 'course_assigned': return `assigned you to ${meta || 'a course'}`
    case 'enroll_removed': return `removed you from ${meta || 'a course'}`
    case 'enroll_moved': return `moved you to ${meta || 'another course'}`
    case 'enroll_updated': return `updated your enrollment in ${meta || 'a course'}`
    case 'profile_updated': return 'updated your account details'
    case 'material': return `added new material in ${meta || 'your course'}`
    case 'grade_released': return `released your grade in ${meta || 'a course'}`
    case 'assignment': return `posted a new assignment in ${meta || 'a course'}`
    case 'welcome': return 'Welcome to AIU CS Hub! 🎉 Tap to explore your dashboard.'
    default: return 'interacted with you'
  }
}

const typeIcon = (t: string) => {
  switch (t) {
    case 'like': return <Heart size={13} fill="var(--accent-red)" color="var(--accent-red)" />
    case 'comment': return <MessageCircle size={13} color="var(--accent)" />
    case 'reply': return <CornerUpLeft size={13} color="var(--accent)" />
    case 'message': return <Mail size={13} color="#10b981" />
    case 'post': return <Megaphone size={13} color="var(--accent)" />
    case 'promotion': return <Award size={13} color="#f59e0b" />
    case 'teach_request': return <GraduationCap size={13} color="#f59e0b" />
    case 'teach_approved': return <GraduationCap size={13} color="#10b981" />
    case 'teach_rejected': return <GraduationCap size={13} color="#ef4444" />
    case 'course_assigned': return <BookOpen size={13} color="var(--accent)" />
    case 'enroll_removed': return <BookOpen size={13} color="#ef4444" />
    case 'enroll_moved': return <BookOpen size={13} color="#f59e0b" />
    case 'enroll_updated': return <BookOpen size={13} color="var(--accent)" />
    case 'profile_updated': return <UserCog size={13} color="var(--accent)" />
    case 'material': return <BookOpen size={13} color="var(--accent)" />
    case 'grade_released': return <Award size={13} color="#10b981" />
    case 'assignment': return <ClipboardList size={13} color="#8b5cf6" />
    case 'welcome': return <Sparkles size={13} color="#f59e0b" />
    default: return null
  }
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

export function NotificationBell() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [badgeSeen, setBadgeSeen] = useState(false)
  const [shake, setShake] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const prevUnread = useRef(0)
  const welcomePlayed = useRef(false)

  const unreadItems = items.filter(n => !n.read_at).length
  const badge = badgeSeen ? 0 : unreadItems

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data } = await supabase
      .from('notifications')
      .select(`*, actor:actor_id (full_name, avatar_url), post:post_id (course_tag)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setItems((data as any) || [])
  }, [])

  useEffect(() => { load() }, [load])

  // Realtime: new notification → reload + play sound
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('notif-rt')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, load])

  // Play the notification chime when the unread count increases
  useEffect(() => {
    if (unreadItems > prevUnread.current && prevUnread.current !== 0) {
      if (useUserStore.getState().settings.notifications !== false) playSound('notify')
      setBadgeSeen(false) // a new notification arrived → show badge again
      setShake(true)
      setTimeout(() => setShake(false), 600) // one shake, in sync with the chime
    }
    prevUnread.current = unreadItems
  }, [unreadItems])

  // Play the welcome fanfare once per session when an unread welcome notification exists
  useEffect(() => {
    if (welcomePlayed.current) return
    if (!items.some(n => n.type === 'welcome' && !n.read_at)) return
    welcomePlayed.current = true
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('aiu-welcome-sound')) return
      sessionStorage.setItem('aiu-welcome-sound', '1')
    } catch { /* ignore */ }
    playSound('welcome')
  }, [items])

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const openNotif = async (n: Notif) => {
    // mark this one read
    if (!n.read_at) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id)
    }
    setOpen(false)
    // deep link to the source
    if (n.type === 'teach_request') { router.push('/admin'); load(); return }
    if (['teach_approved','teach_rejected','course_assigned','enroll_removed','enroll_moved','enroll_updated','profile_updated','promotion'].includes(n.type)) {
      router.push('/dashboard'); load(); return
    }
    if (n.type === 'material') {
      const course = (n as any).meta
      router.push(course ? `/courses/${String(course).toLowerCase()}/modules` : '/dashboard')
      load(); return
    }
    if (n.type === 'grade_released' || n.type === 'assignment') {
      const course = n.meta
      router.push(course ? `/courses/${String(course).toLowerCase()}/assignments` : '/dashboard')
      load(); return
    }
    if (n.type === 'welcome') { router.push('/dashboard'); load(); return }
    if (n.type === 'message') router.push('/messages')
    else if (n.post_id) {
      const course = n.post?.course_tag
      router.push(course ? `/community/${course}#post-${n.post_id}` : `/community#post-${n.post_id}`)
    }
    else router.push('/community')
    load()
  }

  // Delete a single notification (with optimistic removal)
  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // don't trigger openNotif
    setItems(prev => prev.filter(n => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      setBadgeSeen(true) // clear the red badge, but keep items highlighted until clicked
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        className={shake ? 'bell-shake' : ''}
        style={{
          position: 'relative', width: 38, height: 38, borderRadius: 10,
          background: 'var(--s2)', border: '1px solid var(--br)', color: 'var(--t2)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Bell size={17} />
        {badge > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 5px',
            borderRadius: 9, background: 'var(--accent-red)', color: 'white',
            fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg)',
          }}>{badge > 9 ? '9+' : badge}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 46, zIndex: 100,
          width: 340, maxWidth: '90vw', maxHeight: 440, overflowY: 'auto',
          background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 14,
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          animation: 'notifIn 0.16s ease-out',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--br)', position: 'sticky', top: 0, background: 'var(--s2)' }}>
            <span style={{ fontWeight: 700, color: 'var(--t)', fontSize: 14 }}>Notifications</span>
          </div>
          {items.length === 0 ? (
            <div style={{ padding: '34px 20px', textAlign: 'center', color: 'var(--t3)', fontSize: 13.5 }}>
              <Bell size={26} style={{ opacity: 0.4, marginBottom: 8 }} />
              <div>No notifications yet.</div>
            </div>
          ) : items.map(n => (
            <div
              key={n.id}
              onClick={() => openNotif(n)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 11, width: '100%',
                padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
                background: n.read_at ? 'transparent' : 'var(--accent-bg, rgba(99,102,241,0.08))',
                borderBottom: '1px solid var(--br)',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 15,
              }}>
                {n.actor?.avatar_url
                  ? <img src={n.actor.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (n.actor?.full_name || 'U')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: 'var(--t)', lineHeight: 1.4 }}>
                  {n.type !== 'welcome' && (
                    <><span style={{ fontWeight: 700 }}>{n.actor?.full_name || 'Someone'}</span>{' '}</>
                  )}
                  <span style={{ color: n.type === 'welcome' ? 'var(--t)' : 'var(--t2)', fontWeight: n.type === 'welcome' ? 700 : 400 }}>{typeText(n.type, n.meta)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  {typeIcon(n.type)}
                  <span style={{ fontSize: 11.5, color: 'var(--t3)' }}>{relTime(n.created_at)}</span>
                </div>
              </div>
              {!n.read_at && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 6 }} />
              )}
              <button
                onClick={(e) => deleteNotif(e, n.id)}
                title="Delete notification"
                className="notif-del"
                style={{
                  background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer',
                  padding: 4, display: 'flex', flexShrink: 0, marginTop: 4,
                }}
              ><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes notifIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bellShake {
          0%, 100% { transform: rotate(0); }
          15% { transform: rotate(12deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(8deg); }
          60% { transform: rotate(-6deg); }
          75% { transform: rotate(4deg); }
          90% { transform: rotate(-2deg); }
        }
        .notif-del { opacity: 0.35; transition: opacity 0.15s; }
        .notif-del:hover { opacity: 1; color: var(--accent-red, #ef4444) !important; }
        .bell-shake {
          animation: bellShake 0.6s ease-in-out;
          transform-origin: 50% 4px;
        }
      `}</style>
    </div>
  )
}

