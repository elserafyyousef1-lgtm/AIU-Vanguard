'use client'
// src/components/ui/OnlineCounter.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Shared channel name so all counters report the SAME presence room,
// but each mount joins with a unique key.
const PRESENCE_ROOM = 'online-presence'

export function OnlineCounter() {
  const [count, setCount] = useState(1)

  useEffect(() => {
    const supabase = createClient()
    const myKey = crypto.randomUUID()

    const channel = supabase.channel(PRESENCE_ROOM, {
      config: { presence: { key: myKey } },
    })

    // Register the presence listener BEFORE subscribing
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      setCount(Math.max(1, Object.keys(state).length))
    })

    // Subscribe, then track this visitor once connected
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({ online_at: new Date().toISOString() })
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'inherit' }}>
      {count} online
    </span>
  )
}