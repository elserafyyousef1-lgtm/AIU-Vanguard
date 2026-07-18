'use client'
// src/app/messages/page.tsx — premium rewrite
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { SiteNavView } from '@/components/layout/SiteNavView'
import { RoleGuide } from '@/components/ui/RoleGuide'
import toast from 'react-hot-toast'
import { Loader2, Send, Plus, ArrowLeft, MessageSquare, Trash2, Image as ImageIcon, X, Heart, CheckCheck } from 'lucide-react'

interface Party { id: string; full_name: string; role: string; avatar_url?: string }
interface Conversation {
  id: string; student_id: string; staff_id: string; topic: string | null
  updated_at: string; student: Party; staff: Party
  last_message?: string | null; last_sender_id?: string | null
}
interface Message {
  id: string; conversation_id: string; sender_id: string
  content: string; image_url?: string | null; liked_at?: string | null; created_at: string
  read_at?: string | null
}

// Compact relative time for the conversation list (Teams/WhatsApp style).
const relTime = (iso?: string): string => {
  if (!iso) return ''
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.floor(mins / 60)}h`
  if (mins < 10080) return `${Math.floor(mins / 1440)}d`
  return new Date(iso).toLocaleDateString('en-EG', { month: 'short', day: 'numeric' })
}

const roleLabel = (r?: string) =>
  r === 'owner' ? 'Owner' : r === 'admin' ? 'Admin' : r === 'doctor' ? 'Doctor' : r === 'master' ? 'Master' : r === 'guider' ? 'Guider' : 'Student'

function Avatar({ party, size = 42 }: { party: Party; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 700, fontSize: size * 0.4,
    }}>
      {party.avatar_url
        ? <img src={party.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (party.full_name || 'U')[0].toUpperCase()}
    </div>
  )
}

export default function MessagesPage() {
  const router = useRouter()
  const { loading: authLoading, userId, isStudent, role, profile, isAdmin } = useAuth()
  const supabase = createClient()

  const handleLogout = async () => { await supabase.auth.signOut(); toast.success('Logged out'); router.push('/'); router.refresh() }
  const navUser = (!authLoading && userId)
    ? { id: userId, name: (profile as any)?.full_name || 'User', role: roleLabel(role ?? undefined), avatarUrl: (profile as any)?.avatar_url ?? null, semester: (profile as any)?.semester ?? null }
    : null
  const navProps = { active: '/messages', user: navUser, isAdmin, loading: authLoading, onLogout: handleLogout }

  const [convos, setConvos] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [staffList, setStaffList] = useState<Party[]>([])
  const [taMap, setTaMap] = useState<Record<string, string[]>>({})  // user_id → assigned courses
  const [searchQ, setSearchQ] = useState('')
  const [imgFile, setImgFile] = useState<File | null>(null)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    if (!authLoading && !userId) router.push('/login?redirect=/messages')
  }, [authLoading, userId, router])

  const loadConvos = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('conversations')
      .select(`*, student:student_id (id, full_name, role, avatar_url), staff:staff_id (id, full_name, role, avatar_url)`)
      .order('updated_at', { ascending: false })
    const list = (data as any) || []

    // Count unread messages (not sent by me, no read_at) per conversation
    const { data: unreadRows } = await supabase
      .from('messages')
      .select('conversation_id, sender_id, read_at')
      .is('read_at', null)
      .neq('sender_id', userId)
    const counts: Record<string, number> = {}
    ;(unreadRows || []).forEach((m: any) => {
      counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1
    })
    list.forEach((c: any) => { c._unread = counts[c.id] || 0 })

    setConvos(list)
    setLoading(false)
  }, [userId])

  useEffect(() => { loadConvos() }, [loadConvos])

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from('messages').select('*').eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages((data as any) || [])
    // Mark incoming messages as read
    if (userId) {
      await supabase.from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', convId)
        .neq('sender_id', userId)
        .is('read_at', null)
    }
  }, [userId])

  useEffect(() => { if (activeId) { loadMessages(activeId).then(() => loadConvos()) } }, [activeId, loadMessages, loadConvos])
  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('messages-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload: any) => {
        // '*' (not just INSERT) so read receipts (read_at) and likes update live too.
        const convId = payload.new?.conversation_id || payload.old?.conversation_id
        if (activeId && convId === activeId) loadMessages(activeId)
        loadConvos()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, activeId, loadMessages, loadConvos])

  const openNew = async () => {
    // Who can a student message? Staff + anyone assigned to a course (TAs) — including
    // student-TAs whose global role is still 'student'. Mirrors the DB is_staff_like rule.
    let staffQ = supabase.from('profiles').select('id, full_name, role, avatar_url').order('role', { ascending: true })
    if (isStudent) staffQ = staffQ.neq('role', 'student')
    const [{ data: staff }, { data: assigns }] = await Promise.all([
      staffQ,
      supabase.from('course_assignments').select('user_id, course'),
    ])
    const taCourses: Record<string, string[]> = {}
    ;(assigns || []).forEach((a: any) => { (taCourses[a.user_id] = taCourses[a.user_id] || []).push(a.course) })

    let list: Party[] = ((staff as any) || [])
    if (isStudent) {
      // add student-TAs the role filter excluded
      const have = new Set(list.map(s => s.id))
      const missing = Object.keys(taCourses).filter(id => !have.has(id) && id !== userId)
      if (missing.length) {
        const { data: taProfiles } = await supabase
          .from('profiles').select('id, full_name, role, avatar_url').in('id', missing)
        list = [...list, ...(((taProfiles as any) || []))]
      }
    }
    setTaMap(taCourses)
    setStaffList(list.filter((s: Party) => s.id !== userId))
    setSearchQ('')
    setShowNew(true)
  }

  const startConversation = async (staff: Party) => {
    if (!userId) return
    const existing = convos.find(c =>
      (c.staff_id === staff.id && c.student_id === userId) ||
      (c.staff_id === userId && c.student_id === staff.id)
    )
    if (existing) { setActiveId(existing.id); setShowNew(false); return }
    const { data, error } = await supabase
      .from('conversations').insert({ student_id: userId, staff_id: staff.id }).select().single()
    if (error) { toast.error('Could not start the conversation.'); return }
    setShowNew(false); await loadConvos(); setActiveId((data as any).id)
  }

  const sendMessage = async () => {
    const body = text.trim()
    if ((!body && !imgFile) || !activeId || !userId) return
    setSending(true)
    try {
      let imageUrl: string | null = null
      if (imgFile) {
        const ext = imgFile.name.split('.').pop()
        const path = `messages/${userId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('post-images').upload(path, imgFile)
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('post-images').getPublicUrl(path)
        imageUrl = pub.publicUrl
      }
      const { error } = await supabase.from('messages').insert({
        conversation_id: activeId, sender_id: userId, content: body, image_url: imageUrl,
      })
      if (error) throw error
      setText(''); setImgFile(null); setImgPreview(null)
      await loadMessages(activeId)
    } catch { toast.error('Could not send the message.') }
    finally { setSending(false) }
  }

  const pickImage = (file: File | null) => {
    if (!file) { setImgFile(null); setImgPreview(null); return }
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image.'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB.'); return }
    setImgFile(file); setImgPreview(URL.createObjectURL(file))
  }

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', id)
    if (error) { toast.error('Could not delete the message.'); return }
    if (activeId) loadMessages(activeId)
  }

  // Like / unlike a message (double-click or heart button)
  const toggleMessageLike = async (m: Message) => {
    const newVal = m.liked_at ? null : new Date().toISOString()
    // optimistic update
    setMessages(prev => prev.map(x => x.id === m.id ? { ...x, liked_at: newVal } : x))
    const { error } = await supabase.from('messages').update({ liked_at: newVal }).eq('id', m.id)
    if (error) {
      toast.error('Could not update.')
      if (activeId) loadMessages(activeId) // revert from server
    }
  }

  const other = (c: Conversation): Party => (c.student_id === userId ? c.staff : c.student)
  const activeConvo = convos.find(c => c.id === activeId)

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
        <SiteNavView {...navProps} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--t3)' }}>
          <Loader2 size={20} className="animate-spin" />
        </div>
      </div>
    )
  }

  const showList = !activeId

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <SiteNavView {...navProps} />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px 32px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t)', marginBottom: 14, letterSpacing: '-0.02em' }}>Messages</h1>

        <div className="msg-shell" style={{
          display: 'flex', height: 'calc(100dvh - 160px)', minHeight: 420,
          borderRadius: 16, overflow: 'hidden', border: '1px solid var(--br)', background: 'var(--s2)',
        }}>
          <aside className="msg-sidebar" data-hidden={!showList} style={{
            width: 320, flexShrink: 0, borderRight: '1px solid var(--br)',
            display: 'flex', flexDirection: 'column', minWidth: 0,
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--br)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontWeight: 700, color: 'var(--t)', fontSize: 14 }}>Conversations</span>
              <RoleGuide role={role || 'student'} />
              {(
                <button onClick={openNew} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                  borderRadius: 8, background: 'var(--accent)', color: 'white',
                  border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
                }}><Plus size={14} /> New</button>
              )}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {convos.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--t3)', fontSize: 13.5 }}>
                  <MessageSquare size={28} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  {'No conversations yet. Tap “New” to start a conversation.'}
                </div>
              ) : convos.map(c => {
                const p = other(c)
                return (
                  <button key={c.id} onClick={() => setActiveId(c.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    padding: '12px 16px', background: activeId === c.id ? 'var(--s3)' : 'transparent',
                    border: 'none', borderBottom: '1px solid var(--br)', cursor: 'pointer', textAlign: 'left',
                  }}>
                    <Avatar party={p} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, fontWeight: (c as any)._unread ? 800 : 600, color: 'var(--t)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.full_name}</div>
                        <span style={{ flexShrink: 0, fontSize: 11, color: (c as any)._unread ? 'var(--accent)' : 'var(--t3)' }}>{relTime(c.updated_at)}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: (c as any)._unread ? 'var(--t)' : 'var(--t3)', fontWeight: (c as any)._unread ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.last_message ? `${c.last_sender_id === userId ? 'You: ' : ''}${c.last_message}` : roleLabel(p.role)}
                      </div>
                    </div>
                    {(c as any)._unread > 0 && (
                      <span style={{
                        minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10,
                        background: 'var(--accent)', color: 'white', fontSize: 11.5, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>{(c as any)._unread}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="msg-thread" data-hidden={showList} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {!activeConvo ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontSize: 14, padding: 20, textAlign: 'center' }}>
                Select a conversation to start chatting.
              </div>
            ) : (
              <>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--br)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: 'var(--s2)' }}>
                  <button onClick={() => setActiveId(null)} className="msg-back" style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ArrowLeft size={18} /></button>
                  {/* clicking the person opens their profile */}
                  <Link href={`/profile/${other(activeConvo).id}`} title="View profile" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', minWidth: 0 }}>
                    <Avatar party={other(activeConvo)} size={36} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--t)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{other(activeConvo).full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--t3)' }}>{roleLabel(other(activeConvo).role)}</div>
                    </div>
                  </Link>
                </div>

                <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
                  {messages.length === 0 ? (
                    <div style={{ margin: 'auto', color: 'var(--t3)', fontSize: 13.5 }}>No messages yet. Say hello 👋</div>
                  ) : messages.map(m => {
                    const mine = m.sender_id === userId
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        {mine && (
                          <button onClick={() => deleteMessage(m.id)} title="Delete" className="msg-del" style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}><Trash2 size={13} /></button>
                        )}
                        <div
                          onDoubleClick={() => toggleMessageLike(m)}
                          title="Double-click to like"
                          style={{
                          position: 'relative',
                          maxWidth: '72%', padding: m.image_url ? 4 : '10px 14px', borderRadius: 18,
                          background: mine ? 'var(--accent)' : 'var(--s3)', color: mine ? 'white' : 'var(--t)',
                          fontSize: 14.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                          borderBottomRightRadius: mine ? 5 : 18, borderBottomLeftRadius: mine ? 18 : 5,
                          cursor: 'pointer',
                          marginBottom: m.liked_at ? 8 : 0,
                        }}>
                          {m.image_url && (
                            <img src={m.image_url} alt="" onLoad={scrollToBottom} style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 14, display: 'block', marginBottom: m.content ? 6 : 0 }} />
                          )}
                          {m.content && <span style={{ padding: m.image_url ? '0 8px 4px' : 0, display: 'block' }}>{m.content}</span>}
                          {m.liked_at && (
                            <div style={{
                              position: 'absolute', bottom: -10, [mine ? 'left' : 'right']: 8,
                              background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 12,
                              padding: '1px 5px', display: 'flex', alignItems: 'center',
                            }}>
                              <Heart size={11} fill="var(--accent-red)" color="var(--accent-red)" />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {(() => {
                    // "Seen" under the last message I sent, once the other party has read it (Teams/iMessage style).
                    const lastMine = [...messages].reverse().find(m => m.sender_id === userId)
                    if (lastMine && lastMine.read_at) return (
                      <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--t3)', marginTop: 3, marginRight: 2 }}>
                        <CheckCheck size={13} /> Seen
                      </div>
                    )
                    return null
                  })()}
                </div>

                <div style={{ borderTop: '1px solid var(--br)', flexShrink: 0, background: 'var(--s2)' }}>
                  {imgPreview && (
                    <div style={{ position: 'relative', display: 'inline-block', margin: '12px 0 0 16px' }}>
                      <img src={imgPreview} alt="" style={{ maxHeight: 120, borderRadius: 10, border: '1px solid var(--br)' }} />
                      <button onClick={() => pickImage(null)} style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 7, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                    </div>
                  )}
                  <div style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <label style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', background: 'var(--s3)', border: '1px solid var(--br)', color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Send image">
                      <ImageIcon size={17} />
                      <input type="file" accept="image/*" onChange={e => pickImage(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                    </label>
                    <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendMessage() }} placeholder="Type a message..." style={{ flex: 1, minWidth: 0, background: 'var(--s3)', border: '1px solid var(--br)', borderRadius: 22, padding: '10px 16px', color: 'var(--t)', fontSize: 14, fontFamily: 'var(--font)', outline: 'none' }} />
                    <button onClick={sendMessage} disabled={(!text.trim() && !imgFile) || sending} style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, border: 'none', background: (text.trim() || imgFile) ? 'var(--accent)' : 'var(--s3)', color: (text.trim() || imgFile) ? 'white' : 'var(--t3)', cursor: (text.trim() || imgFile) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}</button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(420px,100%)', background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 18, padding: 22, maxHeight: '70vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--t)', marginBottom: 4 }}>New message</h2>
            <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 12 }}>
              You can message staff and course TAs — student ↔ student chat isn't available.
            </p>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search by name..."
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box', marginBottom: 12,
                background: 'var(--s3)', border: '1px solid var(--br)',
                borderRadius: 10, padding: '10px 14px', color: 'var(--t)',
                fontSize: 13.5, fontFamily: 'var(--font)', outline: 'none',
              }}
            />
            {staffList.filter(s => (s.full_name || '').toLowerCase().includes(searchQ.toLowerCase())).map(s => (
              <button key={s.id} onClick={() => startConversation(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px', borderRadius: 12, background: 'var(--s3)', border: '1px solid var(--br)', cursor: 'pointer', marginBottom: 8, textAlign: 'left' }}>
                <Avatar party={s} size={40} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--t)', fontSize: 14 }}>{s.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                    {s.role === 'student' && taMap[s.id]?.length
                      ? `TA — ${taMap[s.id].join(', ')}`
                      : roleLabel(s.role) + (taMap[s.id]?.length ? ` · ${taMap[s.id].join(', ')}` : '')}
                  </div>
                </div>
              </button>
            ))}
            {staffList.length === 0 && <p style={{ color: 'var(--t3)', fontSize: 13, textAlign: 'center', padding: '10px 0' }}>No one found.</p>}
          </div>
        </div>
      )}

      <style jsx>{`
        .msg-del { opacity: 0.4; transition: opacity 0.15s; }
        .msg-del:hover { opacity: 1; }
        @media (min-width: 768px) {
          .msg-sidebar[data-hidden="true"], .msg-thread[data-hidden="true"] { display: flex !important; }
          .msg-back { display: none !important; }
        }
        @media (max-width: 767px) {
          .msg-sidebar { width: 100% !important; border-right: none !important; }
          .msg-sidebar[data-hidden="true"] { display: none !important; }
          .msg-thread[data-hidden="true"] { display: none !important; }
        }
      `}</style>
    </div>
  )
}
