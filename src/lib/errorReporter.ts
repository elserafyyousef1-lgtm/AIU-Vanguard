'use client'
// src/lib/errorReporter.ts
// ───────────────────────────────────────────────────────────
// Production error tracking (self-hosted). Captures uncaught runtime errors +
// unhandled promise rejections and files them into public.app_errors so the
// owner sees real failures instead of waiting for a student to complain.
// Design constraints:
//   • best-effort only — reporting must NEVER throw or loop
//   • signed-in users only (RLS requires user_id = auth.uid())
//   • deduped + capped so a render-loop crash can't flood the table
// Swappable later: point report() at Sentry by env without touching callers.
// ───────────────────────────────────────────────────────────
import { createClient } from '@/lib/supabase/client'

let installed = false
const seen = new Map<string, number>()   // message → last report time
const DEDUPE_MS = 60_000
const MAX_PER_SESSION = 10
let sent = 0

export async function reportError(message: string, stack?: string) {
  try {
    if (sent >= MAX_PER_SESSION) return
    const msg = String(message || 'Unknown error').slice(0, 500)
    const now = Date.now()
    const last = seen.get(msg) || 0
    if (now - last < DEDUPE_MS) return
    seen.set(msg, now)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return   // RLS: signed-in reporters only

    sent++
    await supabase.from('app_errors').insert({
      user_id: session.user.id,
      path: typeof location !== 'undefined' ? location.pathname.slice(0, 200) : '',
      message: msg,
      stack: stack ? String(stack).slice(0, 2000) : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
    })
  } catch { /* reporting must never break the app */ }
}

export function installErrorReporter() {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('error', (e) => {
    reportError(e.message || 'window.onerror', e.error?.stack)
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r: any = e.reason
    reportError(r?.message || String(r ?? 'unhandledrejection'), r?.stack)
  })
}
