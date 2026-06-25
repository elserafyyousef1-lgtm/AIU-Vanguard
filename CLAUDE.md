# AIU Vanguard — Project Instructions

## STANDING RULE — Before/After feature audit on any real page/component change

Before sending any "done" / completion report for a step that touches a **real page or
component** (anything users actually see or use — not internal dev/preview pages), you MUST
include a **before → after table of every user-visible element and feature**, not a diff
line-count summary.

- List each visible element / feature / control that existed **before**, and its state **after**
  (kept · moved · restyled · removed · added).
- Call out **any** difference — even if minor, even if you personally consider it an improvement.
  Removals and relocations are the priority (e.g. a nav bar replaced by a shell can silently drop
  a notification bell, a theme toggle, a search button, a scroll-progress bar).
- "Visual only" / "no logic touched" claims must be backed by this table + an explicit check of
  data-fetching, auth/role gating, and any hooks removed (a removed hook can drop side effects:
  a redundant fetch, store hydration, etc. — name them).
- If anything user-visible was dropped, it is either restored in the same step or logged as
  **explicit debt with a concrete return plan** (never "I'll find it later").

This rule applies to every future step automatically, without the user re-requesting it.

## Guardrails (existing agreement)
- Do **not** touch DB schema, auth logic, RLS policies, backend architecture, or business logic
  during design/UI work — stop and ask first if a change seems to require it.
- Frontend display gating (e.g. whether to *show* an "Admin" link, computed client-side from
  `profiles.role`) is NOT authorization logic — real enforcement lives in `src/middleware.ts`
  (server) + RLS (DB). Changing a display computation is allowed; changing enforcement is not.
- After each step: `tsc --noEmit` + `next build` green, 0 console errors, verify the real page by
  the correct role, full Cleanup of any test data.
