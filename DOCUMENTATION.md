<!--
  AIU VANGUARD — THE PROJECT BIBLE
  Official engineering documentation. Written to be presented to FAANG interviewers,
  CTOs, investors, and senior engineers — and to onboard a team that continues the work.
-->

# 🛡️ AIU Vanguard — The Project Bible

> **The complete engineering documentation for AIU Vanguard (AIU Hub)** — an AI‑powered
> Learning Management Platform for Computer Science students at **Alamein International
> University**. This document is the single source of truth: architecture, database,
> security, flows, decisions, trade‑offs, and a from‑zero rebuild guide.

| | |
|---|---|
| **Product** | AIU Vanguard — bilingual (Egyptian Arabic + English) LMS |
| **Live** | https://aiu-hub.vercel.app |
| **Source** | github.com/elserafyyousef1-lgtm/AIU-Vanguard |
| **Author** | Yousef Mahmoud Elserafy |
| **Status** | v1.0 — live in production |
| **Stack** | Next.js 14 · TypeScript · Supabase (PostgreSQL + RLS + Storage + Realtime + Edge Functions) · Google Gemini · Brevo · Vercel |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Story](#2-project-story)
3. [Product Overview](#3-product-overview)
4. [System Architecture](#4-system-architecture)
5. [Architecture Decision Records (ADR)](#5-architecture-decision-records-adr)
6. [Folder‑by‑Folder Explanation](#6-folder-by-folder-explanation)
7. Database Documentation *(continued below in later sections)*
8. Security · 9. Authentication Flow · 10. Authorization Flow
11. AI System · 12. APIs · 13. Frontend · 14. Backend
15. Performance · 16. Deployment · 17. Challenges · 18. Features Timeline
19. Technical Debt · 20. Scalability · 21. Testing · 22. Codebase Walkthrough
23. Design Decisions · 24. Roadmap · 25. Interview Questions · 26. Knowledge Check
27. Glossary · 28. Final Evaluation · 29. Rebuild Guide · 30. Appendix

> **Note on completeness:** this file is authored in ordered passes. Sections **1–6** are
> below in full; sections **7–30** are appended in subsequent commits. Every claim is drawn
> from the actual codebase (`src/`, `supabase/migrations/`) and live database.

---

# 1. Executive Summary

## What is this project?
**AIU Vanguard** is a production **Learning Management System (LMS)** built for the Computer
Science program at **Alamein International University (AIU)**. It gives students a single,
fast, beautiful place to study their real curriculum — course materials, worked examples,
mock exams, a **bilingual AI tutor trained on the actual syllabus**, grades, a class
community, and direct messaging with staff — while giving instructors (doctors, masters,
teaching assistants) and administrators **capability‑scoped control** over the courses they
own.

## Why was it built?
University course material at AIU was scattered across chat groups, PDFs, and word of mouth.
There was no single, trustworthy, *searchable*, exam‑focused home for a course. AIU Vanguard
was built to be that home — **"every lecture, every exam trap, every formula, engineered
into one platform, with an AI tutor trained on your exact syllabus."**

## What problem does it solve?
| Pain (before) | Solution (AIU Vanguard) |
|---|---|
| Material scattered across WhatsApp/Drive | One structured platform, per‑course, per‑semester |
| No exam‑oriented practice | Mock exams, practice sets, flashcards, worked solutions |
| Generic AI answers that ignore the syllabus | An AI tutor grounded on the course's own content (RAG + curated knowledge) |
| No clear teaching hierarchy or delegation | Capability‑based roles (owner → admin → doctor → master → guider → student) |
| No safe place for class discussion | Per‑course community feeds + student↔staff messaging |
| Announcements missed | Realtime in‑app notifications **+** email fallback when offline |

## Who are the users?
- **Students** — study, enroll, practice, ask the AI tutor, discuss, message staff, track grades.
- **Doctors (course instructors)** — request to teach, manage content, publish assignments, grade — *within their delegated capabilities*.
- **Masters / Guiders (TAs)** — delegated subsets of course power (e.g. media, grading, posting).
- **Admins** — manage people, roles, and courses.
- **Owner** — the super‑admin; full control, the only one who can grant admin.

## Vision
A scalable, secure, **Canvas‑grade** academic platform where *identity → role → course
assignment → capabilities → UI* is enforced end‑to‑end, the database is the source of truth,
and the experience feels like a top‑tier product on both laptop and phone.

## Current status
**v1.0, live in production** on `aiu-hub.vercel.app`, source on GitHub, database on Supabase.
It has real users across all roles, a hardened security posture (RLS everywhere, security
headers, storage scoping, edge‑function secrets), and a working AI tutor, community,
messaging, notifications, and a University‑Requirements course track with a draft/publish
workflow.

## Future roadmap (teaser — full roadmap in §24)
Automated test suite · rate limiting · private course‑materials bucket with signed URLs ·
richer AI (streaming, multi‑turn memory) · analytics · mobile app shell · per‑track curricula.

---

# 2. Project Story

> A chronological account of how AIU Vanguard evolved — reconstructed from the codebase and
> the git history (`git log`).

## 2.1 The origin
It started as a **single‑course study package** (the "study‑package era" — traces remain in
early copy that was later removed) — essentially a rich set of notes + an AI helper for one
course. The realization: the *platform* was more valuable than the package. The project
pivoted from "a study pack" into "**the platform every CS course lives in.**"

## 2.2 From package → platform (the first big pivot)
The data model generalized from *one course* to **8 semesters → many courses → weeks →
modules**, all **DB‑driven** so that adding a course to a semester "lights it up"
automatically with zero code changes. Landing‑page copy was rewritten from study‑package
language to **platform‑level** language ("The elite rise here").

## 2.3 Identity, roles, and the Canvas moment
As instructors and TAs entered the picture, a flat "staff vs student" model wasn't enough.
The project adopted a **capability‑based authorization system** modeled on Canvas:
*Identity → Role → Course Assignment → Capabilities → UI*, with **RLS as the source of
truth** and the UI merely reflecting server‑enforced permissions. Delegation (owner assigns
a TA specific powers on a specific course), an **immutable audit log**, capability
**expiry**, and capability **presets** followed.

## 2.4 Content, correctness, and the ML duplicate
Real course content was authored (Machine Learning, Database Systems, Differential Equations,
Computer Networks) with **pre‑rendered KaTeX** math (rendered at build time, not in the
browser). A key correctness episode: a **duplicated ML course** (CSE301 vs AIE121) — seeded
partly with test data — was cleaned up "doing the right thing," collapsing to the single
real course.

## 2.5 Hardening passes (RC → security → CTO sign‑off)
The project went through disciplined release passes:
- **Release‑Candidate hardening** — search‑path locking on SECURITY DEFINER functions,
  RLS `initplan` optimization (`auth.uid()` → `(select auth.uid())`), FK covering indexes.
- **Penetration testing** — an early harness produced *false positives* (counting HTTP‑403
  error bodies as "1 row = success"); the methodology was corrected to be **status‑aware**,
  re‑run, and confirmed **0 real vulnerabilities**. Genuine issues found and fixed along the
  way: a stored‑XSS via profile social links (fixed with a DB `CHECK` constraint **and** a
  render‑time guard), an SSRF vector in the RAG ingest route (fixed with a host allow‑list),
  and an avatars‑bucket defacement vector (fixed by folder‑scoping).
- **Independent CTO review** → **v1.0 sign‑off** and launch; source pushed to GitHub.

## 2.6 The University Requirements track (a first‑class entity)
The most significant recent evolution: turning "University Requirements" (the online,
general‑education courses AIU students take across the whole program) into a **first‑class,
DB‑backed course category** — but **hidden from students by default**. This forced a proper
**draft/publish** model: a `published` flag on `courses`, RLS so students only see published
courses, and cascading hardening so a draft course's **content, AI documents, and enrollment**
can't leak either. Notifications were re‑pointed to fire **on publish, not on insert**, so
building future courses never spams students.

## 2.7 Product & design maturity
Later passes focused on **product polish**: a distinct visual identity for the Requirements
track, a tactile `card-lift` design‑system utility, motion/perf hardening
(`prefers-reduced-motion`), skeleton loaders, the **real AIU curriculum** (sourced from the
university's official study‑plan PDF) on the semester cards, a **scalable community course
selector**, a **Courses hub** that browses all semesters, and a secure **"Connect Google"**
account‑linking flow to solve the ID‑vs‑Google duplicate‑account problem.

## 2.8 Lessons that shaped the architecture
- **Never trust the client** — every gate is re‑enforced by RLS on the database.
- **Status‑aware verification** — a 403 is *blocked*, not a success; always interpret HTTP status.
- **Suppress side effects during seeding** — bulk‑inserting courses must not fire notification/email triggers.
- **Publish transitions, not inserts** — announce things when they become *visible*, not when they're *created*.
- **Defense in depth** — a DB `CHECK` constraint *and* a render guard; RLS *and* folder‑scoping.

---

# 3. Product Overview

Every feature, why it exists, and its value.

| Feature | What it does | Why it exists | User value |
|---|---|---|---|
| **Semester grid** | DB‑driven grid of the 8‑semester CS program + a University Requirements track | A structured, scalable map of the whole degree | Students see the program at a glance; active semesters open, upcoming ones preview their real subjects |
| **Courses** (e.g. CSE221, AIE121, MAT312, CSE311) | Rich course pages: lectures, materials (weeks/modules), mock exams, flashcards, AI tutor | The core study surface | Everything for a course in one place |
| **University Requirements** | Online general‑ed courses as real, owner‑managed courses, **hidden until published** | AIU students take these across the program; the owner opens them when ready | A complete, honest program view; drafts stay private |
| **AI Tutor (Vanguard AI)** | Bilingual (AR/EN) chat grounded on course knowledge + RAG over uploaded materials | Generic LLMs ignore the syllabus | Answers that match *this* course, fast (~3s) |
| **Community** | Per‑course + general feeds: posts, comments, replies, likes, images, PDFs, YouTube | A safe, on‑topic class discussion space | Announcements + peer discussion, per course |
| **Messaging** | Student ↔ staff direct messages, with **email fallback** when offline | Private questions to instructors | Reachable even offline (Brevo email) |
| **Notifications** | Realtime in‑app (bell + sound) **+** email — likes, comments, replies, messages, promotions, new material, grades, new course on publish | Users must never miss important events | World‑class awareness; email when away |
| **Role dashboards** | Workflow‑oriented hubs per role (Student/Doctor/Master/Guider/Admin/Owner) | Each role has a different job | "What do I do next" surfaced per role |
| **Capabilities & delegation** | Owner assigns a user specific powers on a specific course; audited; expirable; presets | Real teaching orgs delegate | Canvas‑style least‑privilege control |
| **Grades & GPA** | Published‑assignment grades → per‑course finals → a math GPA | Track standing | Deterministic, DB‑computed (never AI) |
| **Profiles** | Avatar, gallery, certificates, bio, social links (LinkedIn/GitHub) | Identity + portfolio | A shareable academic profile |
| **Connect Google** | Link a Google identity to the same ID account (OAuth‑verified) | ID users adding a Gmail were creating duplicate accounts | One account, one‑tap Google login |
| **Settings** | Name, nickname, private contact (phone/email), notification prefs, sign‑in methods | Account management | Control over identity + reachability |

### Educational value
The platform is itself a **teaching artifact**: it demonstrates production‑grade RLS,
capability‑based authorization, RAG, realtime, and a draft/publish content workflow — the
exact patterns a CS student should learn to build real systems.

---

# 4. System Architecture

AIU Vanguard is a **serverless, database‑centric** application: a Next.js front end talks
almost entirely to **Supabase**, and **Row‑Level Security (RLS) on PostgreSQL is the security
boundary** — not a hand‑written API tier. This is the single most important architectural
fact about the system.

```mermaid
flowchart TD
  subgraph Client["Browser (Next.js App Router)"]
    UI["React Server + Client Components"]
    Z["Zustand stores (UI/user)"]
    SB["@supabase/ssr browser client (anon key + user JWT)"]
  end

  subgraph Edge["Vercel Edge / Node"]
    MW["middleware.ts — session refresh + route gating"]
    API["Route Handlers /api/* (ai-tutor, documents/ingest)"]
    SSR["Server Components / server client"]
  end

  subgraph Supabase["Supabase (single backend)"]
    PG[("PostgreSQL + RLS")]
    AUTH["GoTrue Auth (ID + Google OAuth)"]
    STO["Storage buckets (avatars, post-*, submissions, course-materials)"]
    RT["Realtime (postgres_changes)"]
    EF["Edge Functions (notify-email, broadcast-email)"]
    VEC[("pgvector — document_chunks")]
  end

  subgraph External["Third‑party"]
    GEM["Google Gemini (chat + embeddings)"]
    BREVO["Brevo (email)"]
  end

  UI --> SB --> PG
  UI --> Z
  Client --> MW --> SSR
  MW --> AUTH
  API --> GEM
  API --> VEC
  PG -- "trigger → pg_net" --> EF --> BREVO
  SB -.subscribe.-> RT -.push.-> UI
  SSR --> PG
  AUTH --> PG
```

## 4.1 Layers

| Layer | Technology | Responsibility |
|---|---|---|
| **Frontend** | Next.js 14 App Router, TypeScript, React (server + client components) | UI, routing, rendering |
| **State** | Zustand (`src/lib/store.ts`, `notificationStore.ts`) | Client UI state, user settings, tab‑wide notification singleton |
| **Styling** | CSS variables/design tokens (`src/styles/globals.css`) + inline styles | Obsidian+Crimson theme, light/dark, responsive |
| **Auth** | Supabase GoTrue (email/ID + Google OAuth), `@supabase/ssr` | Identity, sessions (cookie‑based), OAuth, identity linking |
| **Authorization** | PostgreSQL RLS + capability functions | The real permission boundary |
| **Database** | Supabase PostgreSQL | All app data; RLS; triggers; SECURITY DEFINER functions |
| **Storage** | Supabase Storage (5 buckets) | Avatars, post images/files, submissions, course materials |
| **Realtime** | Supabase Realtime (`postgres_changes`) | Live notifications, community, messages |
| **AI** | Google Gemini + pgvector RAG | Course‑grounded tutor |
| **Email** | Brevo via Supabase Edge Functions | Notification + broadcast email |
| **Middleware** | `src/middleware.ts` | Session refresh + login gating for protected routes |
| **API routes** | `src/app/api/*` | The *few* things that need a server secret (Gemini key, PDF ingest) |
| **Deployment** | Vercel (front end + edge) + Supabase (backend) | Hosting, CDN, functions |

## 4.2 Rendering strategy (SSR vs CSR)
- **Server Components** render static/first‑paint shells (e.g. the course page fetches the
  course row server‑side via the server Supabase client, then hands off to a client component).
- **Client Components** (`'use client'`) own anything interactive or realtime — the semester
  grid, community, messages, dashboards, settings — reading via the browser Supabase client
  where **RLS still enforces every query with the user's JWT**.
- **The homepage grid and `/courses` are DB‑driven client components**: they fetch `semesters`
  + `courses` and render; adding a course in the DB updates the UI with no deploy.

## 4.3 Request & data flow (typical read)
1. A client component calls `supabase.from('table').select(...)` with the **anon key + the
   user's JWT** (from the cookie).
2. PostgREST executes the query **as the `authenticated` role**; **RLS policies** filter rows
   using `auth.uid()` and capability functions.
3. Only authorized rows return. There is **no application code** that can be tricked into
   returning unauthorized data — the DB is the gate.

## 4.4 Request flow (privileged action, e.g. AI tutor)
1. Client calls a **Route Handler** `POST /api/ai-tutor`.
2. The handler runs on the server with the **service context / server secret** (Gemini key
   from env — never shipped to the client), does RAG retrieval over `document_chunks`, calls
   Gemini, and streams/returns the answer.

## 4.5 Why "no backend"?
The "backend" is **PostgreSQL itself** — RLS policies, `SECURITY DEFINER` functions, triggers,
and a handful of Edge Functions. This collapses an entire API tier into the database, removes
a class of authorization bugs (you can't forget an auth check on an endpoint that doesn't
exist), and scales with Postgres. See ADR‑002.

---

# 5. Architecture Decision Records (ADR)

Each ADR: **Problem → Options → Decision → Trade‑offs → Future.**

### ADR‑001 — Next.js 14 App Router (over Pages Router / SPA / other frameworks)
- **Problem:** need SSR for fast first paint + SEO on public pages, plus rich client interactivity.
- **Options:** CRA/Vite SPA; Next.js Pages Router; Next.js App Router; Remix.
- **Decision:** **App Router** — server components for shells, client components for interactivity, file‑based routing, Route Handlers for the few server secrets, first‑class Vercel deploy.
- **Trade‑offs:** ✅ SSR+CSR in one model, great DX, Vercel‑native. ⚠️ App Router complexity; server/client boundary discipline required. The project leans heavily on client components + RLS, so it uses a fraction of App Router's server power (see Tech Debt §19).
- **Future:** migrate SiteNav to a single root‑layout instance (removes the nav‑auth snapshot debt).

### ADR‑002 — Supabase + RLS as the backend (over a custom Node/Express API)
- **Problem:** need auth, a relational DB, storage, realtime, and authorization — fast, by a solo builder.
- **Options:** custom Express/Nest API + Postgres + Redis + S3 + a WebSocket layer; Firebase; **Supabase**.
- **Decision:** **Supabase** with **RLS as the authorization layer**. One provider gives Postgres, GoTrue auth, Storage, Realtime, and Edge Functions; RLS enforces permissions **in the database**.
- **Trade‑offs:** ✅ Enormous surface removed; auth bugs structurally reduced ("no endpoint to forget a check on"); one mental model. ⚠️ RLS is subtle (policy‑ordering, `SECURITY DEFINER`, function‑execute grants — see the `anon`/`can_manage_course_id` regression in §17); vendor coupling.
- **Future:** if needed, Postgres is portable; the RLS + functions move with it.

### ADR‑003 — Capability‑based authorization (over role‑only checks)
- **Problem:** "doctor" vs "student" is too coarse; real teaching delegates *specific* powers on *specific* courses (grade this course, post here, manage media there).
- **Options:** hard‑coded role checks; a permissions matrix in app code; **capabilities in the DB**.
- **Decision:** `course_assignments.capabilities text[]` (delegated) layered over `role_default_caps(role)`; resolved by `course_caps()` / `has_cap()` / `has_cap_id()` and consumed by RLS. Changes are written via a `set_course_capabilities()` RPC and recorded in an **immutable `capability_audit`**.
- **Trade‑offs:** ✅ Least privilege; Canvas‑grade delegation; auditable; expirable; presets. ⚠️ More concepts to learn; capability resolution must be correct in every policy.
- **Future:** capability **groups**/templates; time‑boxed grants surfaced in UI.

### ADR‑004 — Draft/Publish visibility via a `courses.published` flag + RLS (over app‑side hiding)
- **Problem:** University‑Requirement (and future) courses must exist for the owner to build, but stay **invisible to students** until ready.
- **Options:** hide in the UI only; a separate `draft_courses` table; a `published` boolean gated by RLS.
- **Decision:** **`published boolean default true`** on `courses` + a rewritten `courses_read` policy (students/anon see only published; owner/admin/managers see all). Content tables (`weeks`, `modules`, `document_chunks`, `course_documents`) and `enrollments` were hardened to **follow course visibility**, so a draft's material/AI‑docs/enrollment can't leak.
- **Why not app‑side hiding?** The project's rule is **RLS is truth**; UI hiding is bypassable via a forged REST call.
- **Trade‑offs:** ✅ One flag = enforcement across grid, course page, `/semesters/[id]`, community, AI, search; default `true` = zero regression for existing courses. ⚠️ Every course‑reading path had to be audited for consistency.
- **Future:** scheduled publish; per‑section visibility.

### ADR‑005 — Notify on **publish transition**, not on insert
- **Problem:** the `notify_new_course` trigger fired on every `INSERT`, so seeding/building draft courses would spam every student with notifications + emails.
- **Decision:** the trigger now fires only when a course **becomes visible** — a brand‑new *published* course, or a draft flipped to published (`AFTER INSERT OR UPDATE`, guarded by `NEW.published AND (INSERT OR OLD.published=false)`).
- **Trade‑offs:** ✅ Zero spam while building; the announcement lands at the correct moment. ⚠️ Slightly more trigger logic.

### ADR‑006 — Hybrid session (fast `getSession()` for display, RLS + middleware for enforcement)
- **Problem:** calling `getUser()` (a network validation) on every page mount added 240ms–1.5s of latency.
- **Decision:** read the cookie locally with `getSession()` for **display identity only** (~0ms); **every data query is still RLS‑enforced with the JWT**, and `middleware.ts` gates protected routes. A per‑tab **nav‑auth snapshot** keeps the nav from flickering to guest links during revalidation.
- **Trade‑offs:** ✅ Instant navigation; security unchanged (RLS/middleware enforce). ⚠️ The snapshot is display‑only tech debt tied to per‑page SiteNav (§19).

### ADR‑007 — Secure account linking via `linkIdentity` (over auto‑merging by email)
- **Problem:** a student who signs up by ID, then saves a Gmail in Settings, then "Login with Google," got a **brand‑new empty account**.
- **Options:** auto‑merge accounts by the typed contact email; do nothing; **user‑initiated OAuth linking**.
- **Decision:** a **"Connect Google"** button in Settings runs `supabase.auth.linkIdentity({ provider:'google' })`; OAuth **proves ownership**, then Google login resolves to the *same* account.
- **Why not auto‑merge?** The contact email is **unverified** — auto‑linking it would let anyone hijack an account by typing a victim's email. The one‑time OAuth click is the secure proof.
- **Trade‑offs:** ✅ Secure, standard (GitHub/Notion‑style "connect account"). ⚠️ Requires Supabase **Manual Linking** enabled (an owner toggle) and one user click.

### ADR‑008 — Pre‑rendered KaTeX at build time (over client‑side math rendering)
- **Problem:** rendering hundreds of formulas in the browser is slow and janky.
- **Decision:** render `$…$` / `$$…$$` to HTML **at build time** with `katex.renderToString`, ship static HTML, and inject it via `dangerouslySetInnerHTML` (**author‑controlled static content only** — never user input).
- **Trade‑offs:** ✅ Instant math, no client KaTeX cost. ⚠️ A build step; content lives in generated data files.

### ADR‑009 — Email via Supabase Edge Functions + Brevo, triggered by DB (over an app mailer)
- **Problem:** notifications must reach users **when offline**, and must never leak secrets to the client.
- **Decision:** a DB trigger (`on_notification_email`) calls an **Edge Function** (`notify-email`) via `pg_net`; the function reads the recipient with the service role, picks a **deliverable** address (contact_email > a real non‑`@aiu.edu.eg` Google email; synthetic IDs are skipped), and sends via **Brevo**. A second function (`broadcast-email`) sends brand‑designed announcements. Both are protected by a **shared webhook secret**.
- **Trade‑offs:** ✅ Secrets stay server‑side; idempotent (`email_sent_at`); the DB is the trigger. ⚠️ Async delivery; Brevo dependency.

### ADR‑010 — Inline styles + CSS‑variable design tokens (over a CSS framework/CSS‑in‑JS lib)
- **Decision:** a rich **design‑token layer** in `globals.css` (radii, easing, shadows, fonts, an Obsidian+Crimson palette, light/dark) with **component‑level inline styles** for layout, plus a few utility classes (`card-lift`, `skeleton`, `glass`, `btn-*`).
- **Trade‑offs:** ✅ Zero runtime CSS‑in‑JS cost; tokens keep it consistent and theme‑aware. ⚠️ Inline styles can't express `:hover`/`:focus` (utilities fill the gap); more verbose than a framework (§19).

---

# 6. Folder‑by‑Folder Explanation

```mermaid
flowchart LR
  app["src/app — routes (App Router)"]
  comps["src/components — UI by domain"]
  lib["src/lib — data, supabase clients, ai, store, navigation"]
  hooks["src/hooks — useAuth, ..."]
  types["src/types — shared TS types"]
  styles["src/styles — globals.css tokens"]
  mw["src/middleware.ts"]
  sup["supabase/migrations — DB history"]

  app --> comps
  app --> hooks
  app --> lib
  comps --> lib
  comps --> hooks
  hooks --> lib
  lib --> types
  app --> styles
  mw --> lib
  app -. schema .-> sup
```

**Dependency direction:** `app` → `components` → `lib`; `hooks` and `types` are leaf‑ish
shared deps. Nothing in `lib` imports from `components`/`app` (keeps data/logic reusable).

| Path | Responsibility | Notes |
|---|---|---|
| `src/app/` | **Routes** (App Router). Each folder = a route; `page.tsx` renders it. | `/` (landing + grid), `/courses` (hub), `/courses/[slug]` (+ `/modules`, `/assignments`, `/gradebook`), `/semesters/[id]`, `/community` (+ `/[course]`), `/messages`, `/dashboard`, `/admin` (+ `/people`), `/settings`, `/profile/[id]`, `/login`, `/onboarding`, `/auth/callback`, `/api/*`, `/dev/*`. |
| `src/app/api/` | **Route Handlers** — the only server‑secret code. | `ai-tutor/route.ts` (Gemini), `documents/ingest/route.ts` (PDF → chunks → embeddings, with SSRF guard). |
| `src/app/auth/callback/` | OAuth landing — exchanges the code for a session cookie. | Used by Google sign‑in **and** `linkIdentity`. |
| `src/components/` | **UI by domain.** | `layout/` (SiteNav, SemestersGrid, Hero, Showcase), `course/` (CourseClient, LecturesTab, ExamTab, FlashcardsTab, modules/gradebook UI), `community/` (CommunityView), `dashboard/` (StudentHub, DoctorHub, MasterHub, GuiderHub, AdminHub, CourseModal, StudentCenter), `ai/` (VanguardAI, AIPanel), `ui/` (NotificationBell, CommandPalette, SettingsPanel, Card, ErrorReporterMount, WelcomeModal, RoleGuide). |
| `src/lib/` | **Data + logic (no UI).** | `data/` (static course content: `courses.ts`, `aie121*`, `cse221*`, `mat312*`), `supabase/` (browser `client.ts`, server `server.ts`, `middleware.ts` session), `ai/` (`embeddings.ts`, `chunk.ts`), `store.ts` (Zustand), `notificationStore.ts` (tab‑wide singleton), `navigation.ts` (single nav source of truth), `sound.ts`, `errorReporter.ts`, `z.ts` (z‑index scale). |
| `src/hooks/` | React hooks. | `useAuth.ts` — the central "who am I + what can I do" hook. |
| `src/types/` | Shared TypeScript types. | `Course`, `Semester`, `UserRole`, `Post`, etc. |
| `src/styles/globals.css` | **Design tokens + base + utilities.** | Palette, radii, easing, shadows, fonts, `card-lift`, `skeleton`, `glass`, `btn-*`, reduced‑motion, app shell + nav CSS. |
| `src/middleware.ts` | Session refresh + **route gating** (redirect to `/login` for protected paths). | Matcher covers everything except static assets. |
| `supabase/migrations/` | **DB history** — every schema/RLS/trigger/function change, mirrored from what was applied to production. | The database's source of truth. |
| `handover/`, `*.md` | Handover notes + this documentation. | — |

---

---

# 7. Database Documentation

PostgreSQL is the heart of the system. This section documents the schema, relationships,
policies, triggers, functions, and the reasoning behind them.

## 7.1 Entity–Relationship (core)

```mermaid
erDiagram
  profiles ||--|| user_private : "1:1 (locked PII)"
  profiles ||--o{ enrollments : enrolls
  profiles ||--o{ posts : authors
  profiles ||--o{ comments : writes
  profiles ||--o{ course_assignments : "assigned to"
  semesters ||--o{ courses : contains
  courses ||--o{ weeks : has
  weeks ||--o{ modules : has
  courses ||--o{ assignments : has
  assignments ||--o{ grades : graded_by
  assignments ||--o{ submissions : receives
  courses ||--o{ grade_categories : weights
  courses ||--o{ course_documents : rag_docs
  course_documents ||--o{ document_chunks : chunked_into
  posts ||--o{ comments : has
  posts ||--o{ post_likes : liked
  comments ||--o{ comment_likes : liked
  conversations ||--o{ messages : holds
  profiles ||--o{ conversations : "student/staff party"
  profiles ||--o{ notifications : receives
  course_assignments ||--o{ capability_audit : "changes logged"
```

## 7.2 Tables (by domain)

**Identity & access**
| Table | Key columns | Purpose |
|---|---|---|
| `profiles` | `id` (=auth.users.id), `full_name`, `nickname`, `role` (enum), `avatar_url`, `semester`, `settings` (jsonb), `bio`, `linkedin`, `github`, `certificates`, `bio_images` | Public‑ish user record; `role` drives defaults. |
| `user_private` | `user_id`, `student_id`, `phone`, `contact_email` | **Locked PII** — read only via the `my_contact` RPC; written via `update_my_contact`. |
| `course_assignments` | `user_id`, `course`, `role_in_course`, `capabilities text[]`, `expires_at`, `reason` | Delegated per‑course powers. |
| `capability_audit` | `id`, actor, target, course, before/after caps, reason, `created_at` | **Immutable** log (a trigger blocks UPDATE/DELETE). |

**Academic structure**
| Table | Key columns | Purpose |
|---|---|---|
| `semesters` | `id` (int PK), `title` | 8 CS semesters + `id=9` "University Requirements". |
| `courses` | `id`, `code` (unique), `title`, `semester_id` (FK), `subtitle`, `description`, `instructor`, `credit_hours`, `color`, `icon`, `tags[]`, `has_ai`, `has_formulas`, `order_index`, `grade_scale`, **`published`** | The course entity; `published` gates visibility. |
| `weeks` | `id`, `course_id` (FK), `title`, `order_index` | Content grouping. |
| `modules` | `id`, `week_id` (FK), `title`, `type` (enum `module_type`), `file_url`, `body`, `order_index`, `created_by` | Lecture/file/link/video/quiz/assignment items. |
| `enrollments` | `id`, `user_id`, `course` (code), `completed`, `section`, `enrolled_at` | Student ↔ course; 24h self‑cancel window. |

**Assessment**
| Table | Key columns | Purpose |
|---|---|---|
| `assignments` | `id`, `course_id`, `category_id`, `title`, `kind`, `max_points`, `submission_type`, `available_at`, `due_at`, **`published`** | Graded work; hidden until published. |
| `grade_categories` | `id`, `course_id`, `weight_percent` | Weighted grade buckets. |
| `grades` | `id`, `student_id`, `assignment_id`, `score` | Per‑assignment scores. |
| `submissions` | `id`, `student_id`, `assignment_id`, … | Student uploads (private bucket). |

**Social & messaging**
| Table | Key columns | Purpose |
|---|---|---|
| `posts` | `id`, `user_id`, `content`, `course_tag`, `image_url`, `file_urls`, `video_url` | Community posts (general or per‑course). |
| `comments` | `id`, `post_id`, `user_id`, `content`, `reply_to` | Threaded comments. |
| `post_likes` / `comment_likes` | `(post/comment)_id`, `user_id` | Likes. |
| `conversations` | `id`, `student_id`, `staff_id`, unique(student,staff) | Student↔staff DM thread. |
| `messages` | `id`, `conversation_id`, `sender_id`, `content`, `image_url`, `read_at` | DM messages. |

**Notifications & AI & ops**
| Table | Key columns | Purpose |
|---|---|---|
| `notifications` | `id`, `user_id`, `actor_id`, `type`, `post_id`, `comment_id`, `conversation_id`, `meta`, `read_at`, `email_sent_at` | In‑app + email fan‑out. |
| `course_documents` | `id`, `course`, `title`, `file_url`, `status`, `chunk_count` | Uploaded RAG source docs. |
| `document_chunks` | `id`, `document_id`, `course`, `content`, `embedding vector(768)`, `chunk_index` | RAG retrieval units. |
| `app_errors` | client error reports (deduped, capped) | Lightweight error monitoring. |

## 7.3 Enums
- `user_role`: `owner · admin · doctor · master · guider · student` (+ `rep` referenced in some notify targets).
- `module_type`: `file · link · video · quiz · assignment`.

## 7.4 Key functions
| Function | Kind | Role |
|---|---|---|
| `current_user_role()` | SECURITY DEFINER, `search_path=public` | `select role from profiles where id = auth.uid()`. |
| `role_default_caps(role)` | pure | Default capabilities per role. |
| `course_caps(course)` / `has_cap(course, cap)` / `has_cap_id(course_id, cap)` | resolver | Merge delegated + default caps; used **inside RLS**. |
| `can_manage_course_id(id)` | `= has_cap_id(id, 'structure')` | "can manage this course". |
| `set_course_capabilities(...)` | SECURITY INVOKER | Writes caps + sets `app.cap_reason`; audited by trigger. |
| `my_final_grades()` / `course_final_grades(id)` | reporting | Weighted finals from **published** assignments only. |
| `my_contact()` / `update_my_contact(...)` | RPC | Read/write locked `user_private`. |
| `handle_new_user()` | trigger fn | On signup: create profile + user_private + a one‑time `welcome` notification; owner bootstrap by student_id. |
| `notify_*()` (promotion, new_material, new_course, grade_released, message, comment, post_like, teach_*, enroll_*, new_semester, profile_edited) | trigger fns | Create notifications on events; `notify_new_course` fires on **publish**, not insert. |
| `on_notification_email()` | trigger fn | For emailable types, `pg_net` → `notify-email` Edge Function. |
| `internal_config(key)` | SECURITY DEFINER | Reads a server secret (webhook secret) for Edge Functions. |

## 7.5 Triggers (selection)
`on_role_change_notify` (profiles) · `on_new_material_notify` (modules) · `on_new_course_notify`
(courses, INSERT+UPDATE, publish‑gated) · `on_grade_released` (grades) · `on_message_notify` /
`on_new_message` (messages) · `on_comment_notify` (comments) · `on_post_like_notify` (post_likes) ·
`on_new_post_notify` (posts) · `on_notification_email` (notifications → email) ·
`on_capability_change_audit` (course_assignments → capability_audit) ·
`capability_audit_no_edit` (blocks UPDATE/DELETE on the audit) · `handle_new_user` (auth.users).

## 7.6 Normalization, naming, performance
- **Normalized** (3NF‑ish): entities separated (courses/weeks/modules; posts/comments/likes);
  PII isolated in `user_private`. Denormalized only where it pays (e.g. `notifications.meta`).
- **Naming:** snake_case tables/columns; `<verb>_<noun>` trigger functions; `on_<event>` triggers.
- **Performance:** RLS predicates wrap `auth.uid()` as `(select auth.uid())` (the **initplan**
  optimization — evaluated once per query, not per row); **FK covering indexes** added; the
  courses table is tiny so `published`‑gated reads are trivial. See §15.
- **Future:** partial index on `courses(published)`; materialized GPA; archival of old notifications.

---

# 8. Security Documentation

> Threat philosophy: **the client is hostile; the database is the wall.** Every UI gate is
> re‑enforced by RLS. UI role checks are *display only*.

## 8.1 Controls (summary)
| Area | Control |
|---|---|
| **AuthN** | Supabase GoTrue; ID (email/password over a synthetic `@aiu.edu.eg`) + Google OAuth (PKCE); cookie sessions via `@supabase/ssr`. |
| **AuthZ** | **RLS on every table** + capability functions; `middleware.ts` route gating; UI gating is cosmetic. |
| **Roles/Capabilities** | 6 roles + delegated `capabilities[]` + defaults; immutable audit; expiry. |
| **Headers** | CSP (`frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. |
| **XSS** | React/JSX auto‑escapes all user content; `dangerouslySetInnerHTML` used **only** for author‑controlled, build‑time static course HTML. |
| **SQL injection** | No string‑built SQL with user input; PostgREST parameterizes; RLS bounds every query. |
| **SSRF** | The RAG ingest route validates `fileUrl` against an **allow‑list** (must be `https`, the Supabase storage host, `/storage/` path). |
| **Stored‑data injection** | Profile social links constrained by DB `CHECK` regex (`linkedin.com` / `github.com` https‑only) **and** a render‑time `safeUrl()` guard. |
| **Storage** | `submissions` **private** + per‑user folder; `avatars` locked to the user's own folder (INSERT/UPDATE); post buckets staff‑write. |
| **Secrets** | Only `NEXT_PUBLIC_*` (anon key + URL — public by design) reach the client; service role + Gemini + Brevo + webhook secret are server‑only. |
| **Edge functions** | `notify-email` / `broadcast-email` require a shared `x-webhook-secret` (return **403** otherwise), read recipients with the service role, and are **idempotent**. |
| **Draft leakage** | Draft‑course `weeks`, `modules`, `document_chunks`, `course_documents`, and `enrollments` are RLS‑gated to follow course publishing. |
| **Audit** | Immutable `capability_audit`; `app_errors` client‑error tracking. |

## 8.2 Threat model
| Attacker | Goal | Attempt | Control | Result |
|---|---|---|---|---|
| Malicious student | Read others' PII | `GET user_private` / IDOR | RLS: `user_id = auth.uid()` only | 🔒 blocked |
| Malicious student | Escalate role | `PATCH profiles set role='admin'` | `courses_manage`/profile RLS + role‑change trigger | 🔒 blocked |
| Malicious student | Self‑grant course power | `POST course_assignments` | RLS owner/admin only | 🔒 blocked |
| Malicious student | Read a draft course + its content | `GET courses/weeks/modules/chunks` where unpublished | publish‑gated RLS | 🔒 blocked (0 rows) |
| Malicious student | Read others' DMs | `GET messages` | party‑only RLS | 🔒 blocked |
| Malicious student | Deface another avatar | upload to `{victim}/avatar` | folder‑scoped storage RLS | 🔒 blocked |
| Malicious student | Poison the AI | `INSERT document_chunks` | staff‑only RLS | 🔒 blocked |
| Anyone | Trigger mass email | `POST /functions/v1/broadcast-email` | webhook secret | 🔒 403 |
| Anyone | Clickjack | iframe embed | `frame-ancestors 'none'` | 🔒 blocked |
| Anyone | SSRF via ingest | `fileUrl=http://169.254.169.254` | host allow‑list | 🔒 blocked |
| **Any** | Brute force / cost abuse | hammer `/api/ai-tutor`, auth | **No app rate limiting yet** | ⚠️ **gap (see §19)** |

## 8.3 Known gaps / improvements
- **Rate limiting** (AI tutor, ingest, auth) — recommend Vercel Firewall / middleware / Supabase.
- **`course-materials` bucket is public** — draft file URLs are RLS‑hidden, but make it private + signed URLs for defense in depth.
- **Leaked‑password protection** — enable in Supabase Auth (a dashboard toggle).

---

# 9. Authentication Flow

```mermaid
sequenceDiagram
  participant U as User
  participant N as Next.js (client)
  participant MW as middleware.ts
  participant G as Supabase GoTrue
  participant DB as PostgreSQL

  Note over U,DB: A) Student‑ID sign‑up / login
  U->>N: enter student ID + password
  N->>G: signUp/signIn (email = {id}@aiu.edu.eg)
  G->>DB: handle_new_user() → profile + user_private + welcome notif
  G-->>N: session (cookie)

  Note over U,DB: B) Google OAuth
  U->>N: "Continue with Google"
  N->>G: signInWithOAuth(google, redirect=/auth/callback)
  G-->>U: Google consent
  U->>N: /auth/callback?code=...
  N->>G: exchangeCodeForSession(code)
  G-->>N: session (cookie) → /dashboard (or /onboarding if new)

  Note over U,DB: C) Link Google to an ID account (Settings)
  U->>N: Settings → Connect Google
  N->>G: linkIdentity(google)
  G-->>N: OAuth → /auth/callback → identity linked to SAME user
  Note over U,DB: Now Google login resolves to the existing account
```

**Details & edge cases**
- **Session:** `@supabase/ssr` stores the session in cookies; `middleware.ts` refreshes it and
  gates protected paths (`/dashboard, /community, /settings, /admin, /semesters, /courses,
  /messages, /profile`) → redirect to `/login?redirect=…` when signed out.
- **Hybrid read:** pages use `getSession()` (cookie, ~0ms) for display identity; **RLS still
  enforces** every query with the JWT (ADR‑006).
- **Onboarding:** new Google users pass through `/onboarding` (student‑id gate) via the
  dashboard.
- **Duplicate‑account edge case:** ID email (`@aiu.edu.eg`) ≠ Gmail, so auto‑linking never
  triggers; **Connect Google** (ADR‑007) is the secure fix. Requires Supabase **Manual
  Linking** enabled.

---

# 10. Authorization Flow

```mermaid
flowchart TD
  A["Identity (auth.uid)"] --> B["Role (profiles.role)"]
  B --> C["role_default_caps(role)"]
  A --> D["course_assignments (delegated capabilities[])"]
  C --> E["course_caps(course) = defaults ∪ delegated"]
  D --> E
  E --> F["has_cap / has_cap_id / can_manage_course_id"]
  F --> G1["RLS policies (DB — the real gate)"]
  F --> G2["Server route checks (/api/*)"]
  F --> G3["UI gating (display only — cosmetic)"]
```

- **Roles:** `owner > admin > doctor > master > guider > student`. Owner is the only grantor of admin.
- **Capabilities:** `structure · content · exams · grade · publish_results · enrollments · tas · post`.
- **Resolution:** a user's power on a course = `role_default_caps(role)` **∪** any
  `course_assignments.capabilities` for that (user, course). `has_cap_id(course_id, cap)` is
  the atom consumed by RLS.
- **Three enforcement layers:** **DB (RLS)** is authoritative; **server routes** re‑check for
  the few privileged endpoints; **UI** hides controls a user can't use — but hiding is never
  the security boundary.
- **Delegation & audit:** `set_course_capabilities()` writes caps with a reason; a trigger
  records an **immutable** `capability_audit` row; capabilities can **expire**.

---

> **Continued:** Sections **11 (AI) → 30 (Appendix)** are appended in the next commits.
> This file is the living, official engineering documentation of AIU Vanguard.
