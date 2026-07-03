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

// "Courses" targets the STUDENT'S OWN semester when known; 4 is the fallback for guests
// and profiles without a semester set.
export const DEFAULT_SEMESTER = 4
export const COURSES_HREF = `/semesters/${DEFAULT_SEMESTER}`
export function coursesHref(semester?: number | null): string {
  return `/semesters/${semester || DEFAULT_SEMESTER}`
}

const ADMIN_LINK: NavLink = { href: '/admin', label: 'Admin' }

// Main (top-bar) links — role-aware + semester-aware.
export function mainNavLinks(authed: boolean, isAdmin: boolean, semester?: number | null): NavLink[] {
  if (!authed) {
    return [
      { href: '/', label: 'Home' },
      { href: COURSES_HREF, label: 'Courses' },
      { href: '/community', label: 'Community' },
    ]
  }
  const main: NavLink[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: coursesHref(semester), label: 'Courses' },
    { href: '/community', label: 'Community' },
    { href: '/messages', label: 'Messages' },
  ]
  return isAdmin ? [...main, ADMIN_LINK] : main
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
// Cleared on logout AND when a page resolves with no user (loading===false && !user).
// Does NOT touch session/cookies/middleware — purely what links to show.
//
// ⚠️ TECH DEBT — ARCHITECTURAL ASSUMPTION:
//   This is only safe because EVERY page that currently renders SiteNav is middleware-
//   protected, so a session-less user can never reach a page that would display a stale
//   snapshot. If ANY PUBLIC page (e.g. the landing page) adopts SiteNav BEFORE the
//   root-layout migration, this assumption is INVALID and the snapshot must be revisited.
//   Removal trigger: once SiteNav is a single root-layout instance it no longer re-mounts
//   per navigation → no guest-flicker → DELETE the snapshot (and the per-page wiring).
// ───────────────────────────────────────────────────────────
export interface NavUser { id?: string; name: string; role?: string; avatarUrl?: string | null; semester?: number | null }

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
