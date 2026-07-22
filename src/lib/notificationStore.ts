// src/lib/notificationStore.ts
// ───────────────────────────────────────────────────────────
// SINGLETON notification store — one per browser tab (Twitter/Canvas-style).
//
// Why: the bell used to refetch + resubscribe + reset its "what have I seen" memory on
// EVERY page navigation (it remounts with each page's SiteNav). Consequences: the fetch
// raced an empty first render, so old unread notifications were re-detected as "new" on
// every navigation → the sound played just from moving around the site; plus duplicate
// realtime channels during route transitions and a wasted fetch per page.
//
// Now: ONE fetch + ONE realtime subscription + ONE seen-ids memory for the whole tab.
// Sound fires ONLY when a genuinely new notification row arrives (never on mount/reload
// of the list itself). Components subscribe for re-renders; mutations (mark read/delete)
// call the exported reload.
// ───────────────────────────────────────────────────────────
import { createClient } from '@/lib/supabase/client'
import { playSound } from '@/lib/sound'
import { useUserStore } from '@/lib/store'

export interface Notif {
  id: string
  actor_id: string | null
  type: string
  post_id: string | null
  comment_id: string | null
  conversation_id: string | null
  read_at: string | null
  created_at: string
  meta?: string | null
  actor?: { full_name: string; avatar_url?: string } | null
  post?: { course_tag: string | null } | null
}

// Important events get the "Attention survivor…" voice; everything else gets the soft ding.
const IMPORTANT_TYPES = ['promotion', 'material', 'assignment', 'grade_released']

type Listener = (event: 'update' | 'fresh') => void

let items: Notif[] = []
let badgeSeen = false
let userId: string | null = null
let channel: any = null
let starting = false
let seenIds: Set<string> | null = null
const listeners = new Set<Listener>()

const emit = (event: 'update' | 'fresh') => listeners.forEach(fn => fn(event))

export function getNotifications(): Notif[] { return items }
export function isBadgeSeen(): boolean { return badgeSeen }
// True once the FIRST real fetch has resolved — lets the bell show a skeleton instead of
// flashing "No notifications yet" before data arrives.
export function notificationsLoaded(): boolean { return seenIds !== null }
export function markBadgeSeen() { badgeSeen = true; emit('update') }

export function subscribeNotifications(fn: Listener): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** Optimistic local removal (the DB delete happens in the component). */
export function removeNotificationLocal(id: string) {
  items = items.filter(n => n.id !== id)
  emit('update')
}

/** Re-fetch the list. Sound/badge/shake fire only for notifications never seen this tab. */
export async function reloadNotifications() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id ?? null
  if (!uid) return
  const { data } = await supabase
    .from('notifications')
    .select(`*, actor:actor_id (full_name, avatar_url), post:post_id (course_tag)`)
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(30)
  const next: Notif[] = (data as any) || []

  if (seenIds === null) {
    // First REAL load for this tab — remember what exists, never sound for it.
    seenIds = new Set(next.map(n => n.id))
    items = next
    emit('update')
    return
  }

  const fresh = next.filter(n => !n.read_at && n.type !== 'welcome' && !seenIds!.has(n.id))
  next.forEach(n => seenIds!.add(n.id))
  items = next
  if (fresh.length > 0) {
    if (useUserStore.getState().settings.notifications !== false) {
      playSound(fresh.some(n => IMPORTANT_TYPES.includes(n.type)) ? 'notify' : 'ding')
    }
    badgeSeen = false
    emit('fresh') // bell shakes on this
  } else {
    emit('update')
  }
}

/**
 * Idempotent start (call from any bell mount). Handles account switches: if the session
 * user changed (logout → login as someone else), the store resets and restarts cleanly.
 * Intentionally NOT torn down on unmount — it lives for the tab (Twitter-style), which
 * also removes the duplicate-channel risk during route transitions.
 */
export async function ensureNotifications() {
  if (starting) return
  starting = true
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id ?? null
    if (!uid) return

    if (userId && userId !== uid) {
      // account switch — drop the old user's state + channel
      if (channel) { supabase.removeChannel(channel); channel = null }
      items = []; seenIds = null; badgeSeen = false
    }
    userId = uid

    if (!channel) {
      channel = supabase
        .channel('notif-rt')
        .on('postgres_changes',
          // '*' (not just INSERT) so read/delete done in another tab or device sync here too.
          // reloadNotifications() only sounds for genuinely-new unseen ids, so UPDATE/DELETE
          // can never re-trigger the ding.
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
          () => { void reloadNotifications() })
        .subscribe()
      await reloadNotifications()
    }
  } finally {
    starting = false
  }
}
