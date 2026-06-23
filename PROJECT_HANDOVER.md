# AIU CS Hub — Project Handover & Context Document

> **Purpose of this file:** a complete, self-contained context transfer so any new AI assistant (Claude / ChatGPT / other) or engineer can continue the project without losing context. Written by analysis of the actual codebase at `D:\AIU-Hub` plus the shared files. Nothing here is invented — items that could not be verified from the repo are explicitly marked **[UNVERIFIED]** or listed under "Missing Information".

---

# Project Overview

- **Name:** AIU CS Hub (package name `aiu-cs-hub`, version `2.0.0`).
- **Internal product/AI brand:** "Vanguard AI" (the in-app tutor), platform sometimes referred to as "AIU Vanguard".
- **Live URL:** https://aiu-cs-hub.vercel.app/ (deployed on **Vercel** — inferred from the domain; `NEXT_PUBLIC_APP_URL` confirms an env-based app URL).
- **Institution:** Alamein International University (AIU), Egypt — Computer Science, **Semester 4**.
- **Made by:** Yousef Elserafy (primary author — in README + `app/layout.tsx` metadata). The standalone Machine Learning study lab credits **Yousef Elserafy & Abdulrahman**.
- **User's email (owner):** elserafyyousef4@gmail.com

### Short description
A premium, bilingual (Arabic / English) study platform for AIU CS students. It organizes courses by semester, gives each course rich study material (study sheets, flashcards, formula sheets, auto-graded exams), and provides an AI tutor ("Vanguard AI") that answers in the student's language (Egyptian Arabic, MSA, or English) grounded in real course knowledge. It also has a social layer (community feed, direct messaging, notifications) and a full role-based hierarchy (students, teaching staff, admins) with enrollment and "teach request" workflows.

### Goal & vision
- Be the single place AIU CS students study from and excel in exams.
- Exam-first content: everything is framed around what is actually tested ("the standard the elite are measured against").
- Bilingual by design — understand and reply in Egyptian Arabic, keeping technical terms in English the way Egyptian professors teach.
- Grow course-by-course and eventually cover all 8 semesters (currently only Semester 4 is active).

---

# Current Project State

### What is built and working
- **Next.js 14 (App Router) app**, deployed live on Vercel.
- **Authentication** via Supabase Auth using AIU **student ID (8 digits)** → mapped to email `{studentId}@aiu.edu.eg` + password. Login & register on `/login`.
- **Role-based system** with 6 roles: `owner`, `admin`, `doctor`, `master`, `guider`, `student` (see `src/hooks/useAuth.ts`, `src/types/index.ts`).
- **Route protection** via root `middleware.ts` → `src/lib/supabase/middleware.ts` (protected paths + `/admin` role gate).
- **Homepage** (`/`): hero + semesters grid (8 semesters; only Semester 4 active, rest `coming_soon`).
- **Semester pages** (`/semesters/[id]`): DB-driven course lists, enrollment, teach requests.
- **Course pages** (`/courses/[slug]`): tabbed study UI. Slugs: `cse221`, `mat312`, `cse301`, `cse311`.
  - **CSE221 — Database Systems:** 9 study sheets + 60-question final exam + **AI Tutor**. Fully built.
  - **MAT312 — Differential Equations:** 9 study sheets + 40-question final exam + 43 flashcards + (placeholder) formula sheet. Built (no AI tab; formula sheet is a "coming soon" placeholder).
  - **CSE301 — Machine Learning** and **CSE311 — Computer Architecture:** registered but `lectureCount: 0` → render a "Content is being prepared" placeholder.
- **AI Tutor ("Vanguard AI")** — two-tier, server-proxied (keys never exposed to the browser):
  - **Free tier:** Google **Gemini** (`gemini-flash-latest`) via `POST /api/ai-tutor`.
  - **Pro tier:** Anthropic **Claude** (`claude-sonnet-4-6`) via `POST /api/ai-tutor-pro`.
  - When the free tier hits its limit (429), the UI offers an in-place upgrade to Pro (resends the last question). When Pro hits its limit, it falls back to free and notifies the owner via a `notifications` row.
  - Per-session chat history persisted in `sessionStorage` (max 20 messages kept).
- **Community** (`/community`, `/community/[course]`): posts feed with images/files, likes, comments, comment likes — Supabase Realtime.
- **Direct Messaging** (`/messages`): 1:1 conversations with images, message likes (double-click), read receipts, unread counts, Realtime. Rule: students cannot message other students (staff/admin only).
- **Notifications** (`NotificationBell` component, `notifications` table).
- **Dashboard** (`/dashboard`): role-aware — `StudentHub` (students), `StaffHub` (doctor/master), `AdminHub` (owner/admin). Avatar upload, time-aware greeting, role badge.
- **Profiles** (`/profile/[id]`): bio, avatar, nickname, links (LinkedIn/GitHub), certificates, bio images.
- **Admin** (`/admin`, `/admin/people`): user/role management, course assignments.
- **Settings** (`/settings` + `SettingsPanel` overlay): theme (dark/light), sound, animations, language, notifications.
- **UX polish:** Command Palette (Ctrl/Cmd+K), scroll progress bar, welcome modal, online counter component, KaTeX/MathJax math rendering, dark/light theme, custom fonts (Geist, Geist Mono, Noto Kufi Arabic).

### What needs development / is incomplete
- **CSE301 (Machine Learning)** and **CSE311 (Computer Architecture)** have **no content** in the app (placeholders). A **complete, standalone Machine Learning study lab exists as a separate HTML file** ("AIE121 — Machine Learning · Study Lab") that is **not yet integrated** into the Next.js app. (Note the course-code mismatch: app calls it `CSE301`; the standalone lab is titled `AIE121` — see Issues.)
- **MAT312 formula sheet** is a placeholder ("coming in next update").
- **MAT312 AI Tutor** is technically wired in `AIPanel` (with a fallback prompt) but is **not surfaced** in the UI (no AI tab for MAT312; `hasAI: false`).
- **`aiPersona.ts` upgrade not fully wired:** the new richer per-course knowledge bases (`CSE221_KNOWLEDGE`, `MAT312_KNOWLEDGE`, `getCourseKnowledge()`) exist but `AIPanel` still feeds the older `CSE221_AI_PROMPT` (from `cse221.ts`) + a short hardcoded MAT312 string.
- **Database migrations are stale** — see Technical Architecture & Issues (the single biggest risk for a new contributor).

---

# Technical Architecture

### Stack & tooling
| Layer | Technology |
|---|---|
| Framework | **Next.js 14.2.5** (App Router), React 18.3 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4 + heavy inline styles + CSS variables in `src/styles/globals.css` |
| State | **Zustand** 4.5 (`src/lib/store.ts`) with `persist` middleware |
| Backend / DB / Auth / Realtime / Storage | **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) |
| Animation | framer-motion 11 |
| Icons | lucide-react |
| Math rendering | KaTeX + react-katex (in app); MathJax (in standalone HTML labs) |
| Notifications/UI | react-hot-toast |
| Misc | clsx, tailwind-merge, date-fns, sharp |
| AI (free) | Google Gemini `gemini-flash-latest` (server proxy) |
| AI (pro) | Anthropic Claude `claude-sonnet-4-6` (server proxy) |
| Hosting | Vercel |

Scripts (`package.json`): `dev`, `build`, `start`, `lint`, plus Supabase helpers `db:push`, `db:reset`, `db:types`.

### Repository layout (actual)
```
D:\AIU-Hub\
├── package.json, next.config.js, tsconfig.json, tailwind.config.ts, postcss.config.js
├── middleware.ts                         ← root middleware → updateSession()
├── .env.example                          ← OUTDATED re: AI keys (see Issues)
├── README.md                             ← describes v2.0 (partially outdated)
├── supabase/migrations/001_schema.sql    ← STALE — only the original tables
├── AIU-CS-Hub.html, CSE221.html, MAT312.html   ← standalone single-file prototypes (origin of the platform)
└── src/
    ├── app/
    │   ├── layout.tsx                     ← root layout, fonts, Toaster
    │   ├── page.tsx                       ← Homepage
    │   ├── login/page.tsx                 ← Auth (student-ID login/register)
    │   ├── dashboard/page.tsx             ← role-aware dashboard router
    │   ├── semesters/[id]/page.tsx
    │   ├── courses/[slug]/page.tsx        ← static params: cse221/mat312/cse301/cse311
    │   ├── community/page.tsx
    │   ├── community/[course]/page.tsx
    │   ├── messages/page.tsx              ← DM system
    │   ├── profile/[id]/page.tsx
    │   ├── settings/page.tsx
    │   ├── admin/page.tsx
    │   ├── admin/people/page.tsx
    │   ├── community/page.tsx.msi         ← ANOMALY: stray non-route file (see Issues)
    │   └── api/
    │       ├── ai-tutor/route.ts          ← Gemini proxy (free)
    │       └── ai-tutor-pro/route.ts      ← Claude proxy (pro)
    ├── components/
    │   ├── layout/      Navbar, HeroSection, SemestersGrid
    │   ├── course/      CourseClient, LecturesTab, ExamTab, FlashcardsTab, EnrollmentSection, TeachRequests
    │   ├── community/   CommunityView
    │   ├── dashboard/   StudentHub, StaffHub, AdminHub, StudentCenter
    │   ├── ai/          AIPanel
    │   └── ui/          WelcomeModal, CommandPalette, SettingsPanel, ScrollProgress, OnlineCounter, RoleGuide, NotificationBell
    ├── hooks/useAuth.ts                   ← central auth/role hook
    ├── lib/
    │   ├── data/        courses.ts, cse221.ts, mat312.ts, aiPersona.ts
    │   ├── supabase/     client.ts, server.ts, middleware.ts
    │   └── store.ts                       ← Zustand stores
    ├── styles/globals.css
    ├── types/index.ts                     ← core domain types
    └── page.tsx                           ← ANOMALY: stray duplicate of messages page (see Issues)
```

### Data model — two coexisting sources of truth ⚠️
1. **Hardcoded TypeScript registry** in `src/lib/data/courses.ts`: `COURSES` (4 courses) and `SEMESTERS` (8 semesters). Used by the **course pages** (`/courses/[slug]`) and `CourseClient`.
2. **Supabase DB tables** `courses` and `semesters`. Used by the **dashboard, semesters pages, enrollment, and admin** flows.
> These can diverge. A new contributor must know that "the course list" lives in **two** places.

Course content (lectures, exam questions, flashcards, AI prompts) lives **entirely in TypeScript** data files (`cse221.ts`, `mat312.ts`), not in the DB. Key exports:
- `cse221.ts`: `CSE221_LECTURES`, `CSE221_QUESTIONS` (60), `CSE221_QUICK_CHIPS`, `CSE221_AI_PROMPT`.
- `mat312.ts`: `MAT312_LECTURES`, `MAT312_QUESTIONS` (40), `MAT312_FLASHCARDS` (43).
- `aiPersona.ts`: `VANGUARD_AI_PERSONA`, `CSE221_KNOWLEDGE`, `MAT312_KNOWLEDGE`, `COURSE_KNOWLEDGE` registry, `getCourseKnowledge()`, `buildSystemPrompt(courseKnowledge, context?)`.

### Supabase surface actually used by the code
Derived by scanning `.from(...)`, `.rpc(...)`, `.storage.from(...)` across `src/`.

**Tables referenced in code:**
- `profiles` (extended far beyond migration: `role`, `bio`, `nickname`, `rep_course`, `linkedin`, `github`, `certificates`, `bio_images`, `settings`, `semester`, `avatar_url`, `full_name`)
- `posts`, `post_likes`, `comments`, `comment_likes`
- `conversations`, `messages` (DM system)
- `notifications`
- `teach_requests`
- `enrollments`
- `courses`, `semesters` (DB versions)
- `course_assignments` (staff ↔ course mapping)
- `user_private` (holds sensitive `student_id`; referenced indirectly via RPCs — see `types/index.ts` deprecation note)

**RPCs (Postgres functions):** `my_contact()`, `admin_student_ids()`, `my_student_rank()`.

**Storage buckets:** `avatars`, `post-images`, `post-files`.

**Tables in migration `001_schema.sql` but NOT referenced by current code** (likely legacy/superseded): `course_progress`, `exam_scores`, `online_users`. The current model uses `enrollments` + the `my_student_rank()` RPC instead.

### Auth & roles
- Roles: `owner` > `admin` > `doctor` / `master` / `guider` > `student`.
- `useAuth()` exposes `isOwner`, `isAdmin` (owner|admin), `isStaff` (owner|admin|doctor), `isStudent`, `isMaster`, `isGuider`, and `myCourses` (from `course_assignments` for doctor/master/guider).
- `middleware.ts` protects: `/dashboard`, `/community`, `/settings`, `/admin`, `/semesters`, `/courses`, `/messages`, `/profile`; `/admin` additionally requires owner|admin (RLS is the second defense layer).
- Sensitive `student_id` moved out of `profiles` into `user_private`, read via `my_contact()` / `admin_student_ids()` RPCs.

### AI request flow
```
Browser (AIPanel)
  → builds systemPrompt = buildSystemPrompt(courseKnowledge, {courseCode, courseName, instructor})
  → POST /api/ai-tutor       (free, Gemini)   OR   /api/ai-tutor-pro (pro, Claude)
       • per-IP in-memory rate limit: 20 req / 60s
       • validates: ≤30 messages, each ≤4000 chars
       • injects server-side API key, calls upstream
  → returns { reply } | { error }
```
Both routes return the **same shape** so the client can switch tiers transparently.

### Environment variables
**Used by code (server-side):**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` (free AI) — *not present in `.env.example`*
- `ANTHROPIC_API_KEY` (pro AI) — *`.env.example` wrongly lists `NEXT_PUBLIC_ANTHROPIC_KEY` (client-side)*
- `NEXT_PUBLIC_APP_URL`

---

# Features & Requirements

### Existing features
- Bilingual AI tutor (Vanguard AI) with rich persona + per-course knowledge; two-tier (Gemini free → Claude pro) with graceful fallback and owner notification.
- Per-course study UI: study sheets (lectures), auto-graded final exam (MCQ/TF), flashcards, formula sheet (placeholder), quick-chip prompts.
- Auth via AIU student ID; auto-profile creation on signup (DB trigger).
- 6-role hierarchy with role-aware dashboards and admin tools.
- Enrollment system + teaching-staff "teach requests" + course assignments.
- Community feed (posts, images, files, likes, comments, comment likes) over Realtime.
- Direct messaging (1:1, images, message likes, read receipts, unread counts) over Realtime; student↔student messaging blocked.
- Notifications with a bell UI.
- Profiles (bio, avatar, nickname, links, certificates).
- Settings (theme, sound, animations, language, notifications), persisted via Zustand + DB `profiles.settings`.
- Command palette, scroll progress, welcome modal, online counter, dark/light theme.

### Planned / required next (derived from placeholders, TODO comments, and stated intent)
- **Add CSE301 (Machine Learning) content** — integrate the existing standalone AIE121 ML study lab (reconcile the CSE301 vs AIE121 code mismatch first).
- **Add CSE311 (Computer Architecture) content.**
- **Build the MAT312 formula sheet** (replace `FormulaSheetPlaceholder`).
- **Wire `AIPanel` to the new `aiPersona.ts` knowledge registry** (`getCourseKnowledge()` + `buildSystemPrompt`) and enable the AI tutor for MAT312 (and future courses).
- **Capture the live DB schema into migrations** (critical — see Issues).
- Expand beyond Semester 4 (the other 7 semesters are `coming_soon`).

### Priorities (suggested, not yet confirmed by user)
1. **P0 — Reconcile DB migrations with the live schema** (de-risks everything else).
2. **P1 — Ship CSE301/ML content** (most-requested gap; content already exists as HTML).
3. **P1 — Fix the two stray files** (`src/page.tsx`, `community/page.tsx.msi`) and `.env.example`.
4. **P2 — MAT312 formula sheet + MAT312 AI tutor; wire `aiPersona.ts` upgrade.**
5. **P3 — CSE311 content; future semesters.**

---

# Previous Decisions

- **Single source of truth for the AI persona/knowledge is `src/lib/data/aiPersona.ts`** — edit only that file to evolve the tutor; the platform picks it up via `buildSystemPrompt()`. The function signature is intentionally **backwards-compatible** (`buildSystemPrompt(courseKnowledge, context?)`); new context fields are all optional.
- **AI keys must stay server-side.** The browser only talks to `/api/ai-tutor*`; keys are injected on the server. (The old client-side `NEXT_PUBLIC_ANTHROPIC_KEY` approach in `.env.example` is explicitly called out as something to replace.)
- **Two-tier AI with transparent fallback:** free Gemini by default; offer Claude Pro on free-limit; fall back to free on Pro-limit and notify the owner. Both endpoints return an identical `{reply}|{error}` shape.
- **Bilingual rule (do not change):** detect the student's language and reply in it; understand Egyptian Arabic and reply in natural Egyptian Arabic; **always keep technical/scientific terms in English** even inside Arabic answers (the way AIU exams and professors present them).
- **Strict AI output formatting (do not change):** plain text only — no markdown symbols (`#`, `*`, backticks), no emojis, no internal labels/method names; use simple numbered points or short natural labels; write formulas as they appear on the sheets.
- **Course content lives in TypeScript data files**, not the DB. The DB holds users, social, enrollment, and operational data.
- **Sensitive `student_id` was deliberately moved** out of the public `profiles` table into `user_private`, exposed only through `my_contact()` / `admin_student_ids()` RPCs. Do not move it back to `profiles`.
- **Student↔student direct messaging is intentionally disallowed** (enforced in UI and, per comments, in the DB).
- **RLS is treated as the real security layer**; middleware role checks are "defense layer 1."
- **Auth identity = AIU student ID** (8 digits) mapped to `{id}@aiu.edu.eg`. Keep this convention.

### Things that should NOT be changed casually
- The `buildSystemPrompt` signature and the AI persona rules (language + plain-text formatting).
- Server-side-only AI keys.
- `student_id` privacy model (RPC-based access).
- The student↔student messaging restriction.
- The identical response shape across the two AI routes.

---

# Issues & Improvements

### Confirmed issues / inconsistencies (found in the repo)
1. **Stale DB migrations (highest risk).** `supabase/migrations/001_schema.sql` only defines `profiles, course_progress, exam_scores, posts, post_likes, comments, online_users`. The live app additionally relies on: `courses, semesters, enrollments, course_assignments, teach_requests, conversations, messages, notifications, comment_likes, user_private`, the RPCs `my_contact / admin_student_ids / my_student_rank`, the storage buckets `avatars / post-images / post-files`, and **many extra `profiles` columns** (`role, bio, nickname, rep_course, linkedin, github, certificates, bio_images`). A fresh `db:reset` would NOT reproduce the live database. **Action: dump the live schema from Supabase into new migration files.**
2. **Stray file `src/page.tsx`.** It is a duplicate of the Messages page (header says `// src/app/messages/page.tsx — premium rewrite`) sitting in an invalid App-Router location. Likely an accidental copy. **Action: delete after confirming `src/app/messages/page.tsx` is canonical.**
3. **Anomalous file `src/app/community/page.tsx.msi`.** A `.msi`-suffixed file next to the real `community/page.tsx`; not a valid route. Likely a backup/rename accident. **Action: review and remove.**
4. **`.env.example` is outdated/insecure.** It lists `NEXT_PUBLIC_ANTHROPIC_KEY` (client-side) and omits the actually-used `GEMINI_API_KEY` and `ANTHROPIC_API_KEY`. **Action: update it to match the secure server-side keys.**
5. **Course-code mismatch for Machine Learning.** App registry uses **`CSE301`** (placeholder, 0 lectures); the standalone study lab is titled **`AIE121 — Machine Learning`**. **Action: decide the canonical code and align before integrating content.**
6. **Dual source of truth for courses/semesters** (hardcoded `courses.ts` vs DB `courses`/`semesters`). Risk of divergence. **Action: pick one as authoritative or add a sync step.**
7. **`guider` role has no dashboard hub.** `dashboard/page.tsx` routes `student→StudentHub`, `doctor|master→StaffHub`, `owner|admin→AdminHub`; a `guider` falls through and sees no hub. **Action: confirm intended behavior / add a hub.**
8. **`aiPersona.ts` knowledge registry not wired in.** `AIPanel` still uses `CSE221_AI_PROMPT` + a hardcoded MAT312 string instead of `getCourseKnowledge()`. **Action: migrate `AIPanel` to the registry; enables easy per-course AI.**
9. **README partially outdated.** It predates the role hierarchy, messaging, notifications, enrollment, and the dual-AI design; it also lists routes (`/login`, `/dashboard`) as if all are documented but omits messaging/admin/profile and the AI architecture.

### Suggested improvements
- Add a `database.ts` types file via `npm run db:types` (script exists; `src/types/database.ts` not present) for type-safe Supabase queries.
- Centralize the many inline styles into the existing CSS-variable system / Tailwind for maintainability.
- Add tests around the AI route validation/rate-limiting and the auth/role gates.
- Consider per-user (not just per-IP) AI rate limiting, since the limiter is in-memory and resets on serverless cold starts.

### Missing information (could not be verified from the repo — confirm before relying on it)
- **Exact live DDL** for the newer tables/RPCs/policies (only the live Supabase project has it).
- Whether `course_progress`, `exam_scores`, `online_users` still exist in the live DB or were dropped.
- **Git history is unavailable** locally (`D:\AIU-Hub` is not a git repo), so prior decisions can't be mined from commits.
- Vercel project settings and which env vars are actually set in production.
- Full contents of `cse221.ts` / `mat312.ts` data (only their exported shapes were confirmed).
- The intended relationship between the root standalone HTML prototypes (`AIU-CS-Hub.html`, `CSE221.html`, `MAT312.html`) and the Next.js app (they appear to be the origin/v1 single-file versions).

---

# Instructions For The Next AI Assistant

**How to approach this project**
1. **Read before you write.** Start with `src/types/index.ts`, `src/lib/data/courses.ts`, `src/hooks/useAuth.ts`, `middleware.ts`, `src/lib/data/aiPersona.ts`, and the two API routes. They define the whole mental model.
2. **Treat the live Supabase DB as the source of truth for schema, NOT `001_schema.sql`.** Before any DB work, pull the real schema from the Supabase dashboard. Do not run `db:reset` against anything you care about — it will not reproduce production.
3. **Remember courses/semesters exist in two places** (hardcoded TS + DB). Decide which one your change should touch and keep them consistent.
4. **Keep AI keys server-side.** Never expose `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` to the client. Route everything through `/api/ai-tutor*`.
5. **To change the tutor's behavior or knowledge, edit `src/lib/data/aiPersona.ts` only** — it is the single source of truth and is wired through `buildSystemPrompt()`. Preserve the existing signature and the language + plain-text formatting rules.

**What you must know before editing**
- Roles and gates: `owner, admin, doctor, master, guider, student`; `useAuth()` + `middleware.ts` + RLS.
- `student_id` is private (in `user_private`, via RPCs) — don't surface it publicly.
- Student↔student messaging is intentionally blocked.
- Course content is in TS data files; user/social/operational data is in Supabase.
- The free→pro AI fallback contract and the identical `{reply}|{error}` response shape.

**What to avoid**
- Don't reintroduce client-side AI keys.
- Don't move `student_id` back into `profiles`.
- Don't break the `buildSystemPrompt` signature or the AI persona's language/formatting rules.
- Don't assume the migration file reflects the DB.
- Don't add markdown/emojis to AI tutor *output* (the app renders plain text).
- Don't silently delete the stray files (`src/page.tsx`, `community/page.tsx.msi`) without confirming they're truly orphaned — but they are strong candidates for removal.

**Required mindset**
- Exam-first, student-first, bilingual (Arabic/English) — match the existing premium, polished UX.
- Be precise and verify against the live codebase/DB rather than assumptions.
- Make small, consistent changes that respect the two-sources-of-truth reality until it's intentionally unified.

---

# Complete Project Context

AIU CS Hub is a Next.js 14 (App Router) + Supabase study platform for Alamein International University Computer Science students, live at https://aiu-cs-hub.vercel.app/ and deployed on Vercel. It is built by Yousef Elserafy (with Abdulrahman on the Machine Learning lab). The product's flagship feature is **"Vanguard AI"**, a bilingual (Egyptian Arabic / MSA / English) exam-focused tutor whose entire personality and per-course knowledge live in one file, `src/lib/data/aiPersona.ts`, surfaced through `buildSystemPrompt(courseKnowledge, context?)`. The tutor runs two tiers behind server-side proxy routes so API keys never reach the browser: a free tier on Google Gemini (`gemini-flash-latest`, `/api/ai-tutor`) and a pro tier on Anthropic Claude (`claude-sonnet-4-6`, `/api/ai-tutor-pro`); both share an identical `{reply}|{error}` contract, and the UI transparently offers Claude when the free limit is hit and falls back to free (notifying the owner) when Claude's limit is hit.

Students authenticate with their 8-digit AIU student ID (mapped to `{id}@aiu.edu.eg`) via Supabase Auth. The app has a 6-role hierarchy — `owner, admin, doctor, master, guider, student` — exposed through `useAuth()` and enforced by `middleware.ts` (route + `/admin` gates) plus Supabase RLS. Beyond studying, there is a full social/operational layer: a community feed (posts, images, files, likes, comments, comment-likes over Realtime), 1:1 direct messaging (with images, message likes, read receipts, unread counts; student↔student blocked), notifications, profiles, role-aware dashboards (StudentHub / StaffHub / AdminHub), an enrollment system, teaching "teach requests", and course assignments, plus an admin people-management area.

Content is organized by semester (8 total; only **Semester 4** is active) and by course. **Two courses are fully built — CSE221 (Database Systems: 9 study sheets, 60-question exam, AI tutor) and MAT312 (Differential Equations: 9 sheets, 40-question exam, 43 flashcards)** — with content stored entirely in TypeScript data files (`cse221.ts`, `mat312.ts`). **CSE301 (Machine Learning) and CSE311 (Computer Architecture) are registered placeholders with no content**, though a complete standalone Machine Learning study lab already exists as an HTML file (titled "AIE121 — Machine Learning", which mismatches the app's `CSE301` code and must be reconciled before integration).

The most important caveat for any successor: **the database has evolved well past the only committed migration.** `supabase/migrations/001_schema.sql` defines just `profiles, course_progress, exam_scores, posts, post_likes, comments, online_users`, but the live app depends on many more tables (`courses, semesters, enrollments, course_assignments, teach_requests, conversations, messages, notifications, comment_likes, user_private`), several RPCs (`my_contact, admin_student_ids, my_student_rank`), storage buckets (`avatars, post-images, post-files`), and a much wider `profiles` table (with `role, bio, nickname, links, certificates`, etc.). The live Supabase project — not the migration file — is the source of truth for schema. There are also two minor file anomalies to clean up (`src/page.tsx`, a misplaced duplicate of the Messages page; and `src/app/community/page.tsx.msi`, a stray non-route file), an outdated/insecure `.env.example` (lists a client-side Anthropic key, omits the real server-side `GEMINI_API_KEY`/`ANTHROPIC_API_KEY`), a partially outdated README, a dual source of truth for the course/semester lists (hardcoded TS vs DB tables), and a not-yet-wired upgrade in `aiPersona.ts` (richer `getCourseKnowledge()` not yet used by `AIPanel`). The natural next work, in priority order, is: reconcile DB migrations with production, ship the Machine Learning content (resolving the CSE301/AIE121 naming), clean up the stray files and `.env.example`, build the MAT312 formula sheet and wire the `aiPersona.ts` knowledge registry (enabling MAT312's AI tutor), then add CSE311 and future semesters. Throughout, preserve the non-negotiables: server-side-only AI keys, the bilingual + plain-text AI persona rules, the private `student_id` (RPC-only) model, the student↔student messaging block, and the `buildSystemPrompt` signature.
