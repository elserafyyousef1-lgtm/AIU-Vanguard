// src/lib/navigation.ts
// ───────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for site navigation. One definition, consumed by SiteNav.
// No page should hardcode its own nav array.
//
// Order (agreed): Dashboard · Courses · Community · Messages · (Admin) — then Profile ·
// Settings · Log out in the avatar menu (logically after Admin). Guests: Home · Courses ·
// Community + Sign in / Get started.
// ───────────────────────────────────────────────────────────

export interface NavLink { href: string; label: string }

// "Courses" → /semesters/4 keeps the current hardcoded-semester pattern (to be made
// dynamic later). Kept here so every consumer agrees on the target.
export const COURSES_HREF = '/semesters/4'

const AUTHED_MAIN: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: COURSES_HREF, label: 'Courses' },
  { href: '/community', label: 'Community' },
  { href: '/messages', label: 'Messages' },
]
const ADMIN_LINK: NavLink = { href: '/admin', label: 'Admin' }

const GUEST_MAIN: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: COURSES_HREF, label: 'Courses' },
  { href: '/community', label: 'Community' },
]

// Main (top-bar) links — role-aware.
export function mainNavLinks(authed: boolean, isAdmin: boolean): NavLink[] {
  if (!authed) return GUEST_MAIN
  return isAdmin ? [...AUTHED_MAIN, ADMIN_LINK] : AUTHED_MAIN
}

// Account links (avatar dropdown / drawer footer), in order. Log out is rendered
// separately (it's an action, not an href).
export function accountLinks(userId?: string): NavLink[] {
  return [
    { href: `/profile/${userId ?? ''}`, label: 'Profile' },
    { href: '/settings', label: 'Settings' },
  ]
}

// ───────────────────────────────────────────────────────────
// Nav auth DISPLAY snapshot — display-only, NOT auth enforcement.
// Each page renders its own SiteNav and revalidates the session on mount; during that
// ~window the page has no user yet, which would make the role-aware nav flicker to the
// GUEST links ("most links disappear, only Home/Courses"). This remembers the last known
// signed-in identity for the tab so the nav stays stable across client navigations.
// Cleared on logout. Does NOT touch session/cookies/middleware — purely what links to show.
// (Becomes unnecessary once SiteNav is hoisted into the root layout after all pages migrate.)
// ───────────────────────────────────────────────────────────
export interface NavUser { id?: string; name: string; role?: string; avatarUrl?: string | null }

let snapshot: { user: NavUser; isAdmin: boolean } | null = null

export function setNavAuthSnapshot(user: NavUser | null | undefined, isAdmin: boolean) {
  if (user) snapshot = { user, isAdmin }
}
export function getNavAuthSnapshot() {
  return snapshot
}
export function clearNavAuthSnapshot() {
  snapshot = null
}
