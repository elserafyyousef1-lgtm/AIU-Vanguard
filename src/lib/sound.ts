// src/lib/sound.ts
// ───────────────────────────────────────────────────────────
// Tiny reusable sound helper — three tiers:
//   • 'ding'    — soft synthesized two-tone chime (WebAudio, no file) for REGULAR
//                 notifications: likes, comments, replies, messages… like any site.
//   • 'notify'  — /audio/notify.mp3 (the "Attention survivor…" voice) — IMPORTANT
//                 events only: new course content drops & promotions.
//   • 'welcome' — /audio/welcome.mp3 — once, on a user's first sign-in.
// Respects the user's `sound` preference and browser autoplay rules (audio only after
// the first user gesture; a pending 'welcome' is queued until then).
// ───────────────────────────────────────────────────────────
import { useUserStore } from '@/lib/store'

type SoundName = 'ding' | 'notify' | 'welcome'

const SRC: Record<Exclude<SoundName, 'ding'>, string> = {
  notify: '/audio/notify.mp3',   // "Attention survivor…" — important events only
  welcome: '/audio/welcome.mp3', // fanfare — first sign-in / registration
}

let unlocked = false
let pendingWelcome = false
const cache: Partial<Record<Exclude<SoundName, 'ding'>, HTMLAudioElement>> = {}
let audioCtx: AudioContext | null = null

function soundOn(): boolean {
  try { return useUserStore.getState().settings.sound !== false } catch { return true }
}

function el(name: Exclude<SoundName, 'ding'>): HTMLAudioElement {
  let a = cache[name]
  if (!a) {
    a = new Audio(SRC[name])
    a.preload = 'auto'
    a.volume = name === 'welcome' ? 0.7 : 0.6
    cache[name] = a
  }
  return a
}

// Soft two-tone "dun-ding" chime — synthesized, so no audio file is needed.
function ding() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)()
    const ctx = audioCtx
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime
    ;[[880, 0], [1174.66, 0.09]].forEach(([freq, dt]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq as number
      gain.gain.setValueAtTime(0.0001, t0 + (dt as number))
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + (dt as number) + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (dt as number) + 0.45)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0 + (dt as number))
      osc.stop(t0 + (dt as number) + 0.5)
    })
  } catch { /* ignore */ }
}

function fire(name: SoundName) {
  try {
    if (name === 'ding') { ding(); return }
    const a = el(name)
    a.currentTime = 0
    void a.play().catch(() => { /* autoplay blocked / no source */ })
  } catch { /* ignore */ }
}

/**
 * Play a named sound. Dropped silently if the user muted sound.
 * Before the first user gesture a 'welcome' is queued (fires on unlock);
 * a transient 'ding'/'notify' is simply skipped.
 */
export function playSound(name: SoundName) {
  if (typeof window === 'undefined' || !soundOn()) return
  if (!unlocked) {
    if (name === 'welcome') pendingWelcome = true
    return
  }
  fire(name)
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    if (unlocked) return
    unlocked = true
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    if (pendingWelcome) { pendingWelcome = false; if (soundOn()) fire('welcome') }
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}
