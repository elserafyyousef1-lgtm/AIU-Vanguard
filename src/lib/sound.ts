// src/lib/sound.ts
// ───────────────────────────────────────────────────────────
// Tiny reusable sound helper. Plays short MP3 cues from /public/audio.
//   • respects the user's `sound` preference (useUserStore)
//   • respects browser autoplay rules — audio only plays after the
//     first user gesture; a pending 'welcome' is queued until then.
// ───────────────────────────────────────────────────────────
import { useUserStore } from '@/lib/store'

type SoundName = 'notify' | 'welcome'

const SRC: Record<SoundName, string> = {
  notify: '/audio/notify.mp3',   // short chime — new notification
  welcome: '/audio/welcome.mp3', // fanfare — first sign-in / registration
}

let unlocked = false
let pendingWelcome = false
const cache: Partial<Record<SoundName, HTMLAudioElement>> = {}

function soundOn(): boolean {
  try { return useUserStore.getState().settings.sound !== false } catch { return true }
}

function el(name: SoundName): HTMLAudioElement {
  let a = cache[name]
  if (!a) {
    a = new Audio(SRC[name])
    a.preload = 'auto'
    a.volume = name === 'welcome' ? 0.7 : 0.45
    cache[name] = a
  }
  return a
}

function fire(name: SoundName) {
  try {
    const a = el(name)
    a.currentTime = 0
    void a.play().catch(() => { /* autoplay blocked / no source */ })
  } catch { /* ignore */ }
}

/**
 * Play a named sound. Dropped silently if the user muted sound.
 * Before the first user gesture a 'welcome' is queued (fires on unlock);
 * a transient 'notify' is simply skipped.
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
