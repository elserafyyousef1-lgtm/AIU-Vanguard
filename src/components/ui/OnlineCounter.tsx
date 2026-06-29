'use client'
// src/components/ui/OnlineCounter.tsx
// ───────────────────────────────────────────────────────────
// SINGLETON-SAFE online presence counter.
//
// Why a singleton: `supabase.channel(topic)` returns the SAME channel object for a given
// topic, and a channel's `.on('presence')` callback can only be registered ONCE. So mounting
// two <OnlineCounter/> instances on the same topic (nav + drawer, or two pages overlapping
// during a route transition) made the second mount throw "cannot add `presence` callback"
// and crash the tree. Per-mount channels would each create a duplicate subscription / leak.
//
// Fix: ONE shared channel + one presence callback for the whole app, created on the first
// mount and removed on the last (ref-counted). Every instance just registers a lightweight
// listener and reads the shared count. Safe to mount any number of times; cleans up on unmount.
// ───────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PRESENCE_ROOM = 'online-presence'

// Module-level shared state (one per browser tab).
let sharedClient: ReturnType<typeof createClient> | null = null
let channel: any = null
let refCount = 0
let lastCount = 1
const listeners = new Set<(n: number) => void>()

function ensureChannel() {
  if (channel) return
  sharedClient = createClient()
  const ch = sharedClient.channel(PRESENCE_ROOM, { config: { presence: { key: crypto.randomUUID() } } })
  ch.on('presence', { event: 'sync' }, () => {
    lastCount = Math.max(1, Object.keys(ch.presenceState()).length)
    listeners.forEach((fn) => fn(lastCount))
  })
  ch.subscribe((status: string) => {
    if (status === 'SUBSCRIBED') ch.track({ online_at: new Date().toISOString() })
  })
  channel = ch
}

export function OnlineCounter() {
  const [count, setCount] = useState(lastCount)

  useEffect(() => {
    refCount++
    ensureChannel()
    listeners.add(setCount)
    setCount(lastCount) // sync to the latest known value on mount

    return () => {
      listeners.delete(setCount)
      refCount--
      // Tear the shared channel down only when the LAST instance unmounts.
      if (refCount <= 0 && channel && sharedClient) {
        sharedClient.removeChannel(channel)
        channel = null
        refCount = 0
      }
    }
  }, [])

  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'inherit' }}>
      {count} online
    </span>
  )
}
