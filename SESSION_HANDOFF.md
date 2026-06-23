# AIU Vanguard — Session Handoff (continue in new chat)

> **Read this first.** It captures the full state so you can continue without re-deriving.
> Project: **AIU Vanguard** — Next.js 14 (App Router) + Supabase, **bilingual (Egyptian Arabic + English)** student LMS for Alamein International University CS.
> Local: `D:\AIU-Hub` (Windows). Supabase project ref: **`yipecojgakuwcnlzwkne`** (Postgres 17, eu-north-1) — connected via MCP.
> Working style: owner **Yousef Elserafy** (student_id 24100476), beginner, Egyptian Arabic, one step at a time, ready-made files, **verify by real build + DB test after every change**, design phase is LAST.

---

## 1) Current Architecture State
- **Stack:** Next.js 14.2.5, React 18, TS strict, `@supabase/ssr`, Zustand, react-hot-toast, framer-motion, KaTeX. Inline styles + CSS vars in `src/styles/globals.css`.
- **Design tokens:** **Crimson `#e0264b` + Obsidian `#0d0d11`** (`.dark` default, `.light` exists). Fonts = **Geist + Noto Kufi Arabic** (kept for Arabic; do NOT swap to Sora — it breaks Arabic). Full visual fidelity (aurora/grain/glass + landing page from the HTML reference) is the **deferred final phase**. Aggressive tone + English copy are **intentional/locked**.
- **Auth:** student-ID (8-digit) → `{id}@aiu.edu.eg` synthetic email → Supabase. Roles: `owner, admin, doctor, master, guider, rep, student`. Middleware refreshes session + guards protected routes + `/admin` role gate.
- **Everything DB-driven** (homepage, semesters, courses, modules, assignments, enrollment, dashboard). Only legacy academic content of **CSE221 & MAT312** (lectures/exam/flashcards) remains static in `lib/data/cse221.ts` + `mat312.ts` as a **temporary adapter**.
- **Builds green** (typecheck + `next build`). NOT deployed (local only).

### Key SECURITY DEFINER helpers (used in RLS)
`current_user_role()`, `is_staff(uid)`, `can_manage_course_id(course_id)` (owner/admin OR assigned via `course_assignments`), `is_enrolled_in_course(course_id)`, `my_courses_as(role)`, `admin_student_ids()`, `my_contact()`, `update_my_contact()`, `role_of(uid)`.

---

## 2) Completed Phases + Key Files
**Foundational fixes:** Community feed broken query fixed (`profiles.student_id` was dropped); build blockers fixed (`CommunityView` → `src/components/community/CommunityView.tsx`; `/login` wrapped in `<Suspense>`).

**RAG AI:** `src/lib/ai/{embeddings,chunk,retrieval}.ts`, `src/app/api/documents/ingest/route.ts`, RAG injected into `src/app/api/ai-tutor/route.ts` + `ai-tutor-pro/route.ts`, `AIPanel.tsx` sends `courseSlug`. Embeddings = **Gemini `gemini-embedding-001` @ 768 dims** (NOT `text-embedding-004` — unavailable for this key).

**Canvas Modules:** `src/app/courses/[slug]/modules/page.tsx` (weeks → items, native HTML5 drag-drop reorder, video embed, all types), `course-materials` bucket.

**Security:** `.gitignore` (git init done, NO remote), PII → `user_private`, bucket listing hardened, trigger functions `REVOKE EXECUTE`.

**Course architecture → DB-driven:** `courses` extended; `src/app/courses/[slug]/page.tsx` now fetches from DB (no more 404 for new courses); `CourseClient.tsx` dynamic tabs (Modules always, AI if `has_ai`, legacy tabs only for CSE221/MAT312) + Modules/Assignments links; `Course.slug` type = `string`.

**Course Management UI:** `src/components/dashboard/CourseModal.tsx` (create/edit, code immutable on edit) + `AdminHub.tsx`.

**Phase 2 (Assignment System + Gradebook):**
- `src/components/course/AssignmentModal.tsx` (create/edit assignment)
- `src/app/courses/[slug]/assignments/page.tsx` (staff manage + student submit/view)
- `src/components/course/SubmissionModal.tsx` (student submit: file→private bucket + text, signed URLs, status)
- `src/components/course/GradingPanel.tsx` (instructor grading: list submitters, signed-URL download, score+feedback)
- `NotificationBell.tsx` (added `material` type)
- `settings/page.tsx` (uses `my_contact`/`update_my_contact`)
- `scripts/` (dev test/util scripts), `supabase/migrations/` synced + README.

---

## 3) Database Schema (all public tables)
profiles, **user_private** (student_id, phone, contact_email — RLS deny-all to clients), course_progress, exam_scores, posts, post_likes, comments, comment_likes, conversations, messages, notifications, course_assignments (staff↔course), enrollments, semesters, courses, teach_requests, weeks, modules, course_documents, document_chunks, **grade_categories, assignments, submissions, grades, submission_versions, grade_history, grade_private, submission_private**.

### My migrations (in remote history, newest last)
`rag_foundation_pgvector` · `canvas_weeks_modules` · `link_documents_to_modules` · `course_materials_bucket` · `notify_new_semester` · `move_pii_to_user_private` · `drop_pii_from_profiles` · `harden_buckets_and_trigger_functions` · `revoke_trigger_fns_from_public` · `fix_notify_new_post_course_scope` · `notify_new_material` · `extend_courses_metadata` · `assignments_gradebook_foundation` · `assignments_future_proofing` · `submission_version_archiving` · `grading_foundation_hardening`.

### courses (extended): code, title, semester_id, subtitle, description, requirements, instructor, credit_hours, color, icon, tags[], has_ai, has_formulas, **grade_scale jsonb** (configurable letter scale — null = default), order_index.

### Notification triggers (all SECURITY DEFINER, EXECUTE revoked): notify_new_post (course-scoped via enrollments), notify_new_material, notify_new_semester, notify_new_course, notify_new_assignment (on publish), **notify_grade_released** (on grade insert/score-change). Types in `notifications.type` (open text): like/comment/reply/message/post/material/assignment/grade_released/course_assigned/teach_*/enroll_*/promotion/profile_updated.

---

## 4) Assignment System Flow (current)
```
assignments  →  submissions  →  grades
(staff CRUD)    (student work)   (score+feedback, student-visible)
                    │                  │
            submission_versions   grade_history (audit: old→new, who, when, reason)
            (archived on resubmit)
   grade_private (STAFF-ONLY: ai_suggested_grade, ai_feedback_draft, ai_review_status, private_notes)
   submission_private (STAFF-ONLY: plagiarism_score/status)
```
1. Staff create assignment (draft) → **publish** → `notify_new_assignment` to enrolled students.
2. Student opens it (only `published` + enrolled, via RLS) → submits **file to PRIVATE `submissions` bucket** (path `{assignment_id}/{student_id}/file`, only the PATH stored) + text. Late auto-flagged. Resubmit → trigger archives old version to `submission_versions`, bumps `attempt`.
3. Staff `GradingPanel` → views file via **signed URL** → enters score+feedback → saves to `grades` → `notify_grade_released` → student sees score+feedback. Editing a grade logs to `grade_history`.
- RLS: `asg_read`=published+enrolled OR staff; `grd_read`=student own OR staff; `grd_write`=staff of course only; submission files = student own + staff via signed URLs.
- Verified e2e (SQL): submit→resubmit(archive)→grade(80)→edit(95, history 80→95)→grade_released×2→student sees grade. All cleaned up.

---

## 5) Remaining Phase 2 Tasks
- **2.5 Gradebook (NEXT):** instructor matrix (students × assignments, scores, **totals + letter grade** from `courses.grade_scale` or default, **CSV export**) + student "My Grades" view. Data: `enrollments` (students) × `assignments` × `grades`. Final = Σ(category avg × `grade_categories.weight_percent`); fallback simple `Σscore/Σmax`. Letter computed in app.
- **2.6 Weights:** `grade_categories` management UI + final-grade computation wiring.
- **2.7 Notification Engine + AUDIO:** render types (welcome / course_published(material) / grade_released / assignment) in `NotificationBell` (text+icon+deep-link) + **user notification preferences** (extend `profiles.settings` jsonb — no migration needed) + **AUDIO**: `STRONG WELCOME.mp3` → WelcomeModal on first registration (user gesture allows autoplay); `MONA UBDATE.mp3` → NotificationBell on new course/grade (after audio-unlock). **MP3s are at `D:\` — must move to `public/audio/`.** Respect `settings.sound` + autoplay-unlock.

---

## 6) Architectural Decisions — DO NOT CHANGE
1. **DB is the source of truth.** No hardcoded academic/semester/course data (except the CSE221/MAT312 legacy content adapter, to be migrated later).
2. **`student_id` lives ONLY in `user_private`** (deny-all RLS). Read via `my_contact()`/`admin_student_ids()`. NEVER put it back on `profiles` or select it there.
3. **PII (phone/contact_email)** in `user_private`; via `my_contact()`/`update_my_contact()`.
4. **Permissions enforced at DB (RLS) AND app** — never UI-only. Use the helpers.
5. **Assignment path is `assignments → submissions → grades`.** No separate path.
6. **Staff-only data (AI suggestions/drafts, private notes, plagiarism) MUST stay in `grade_private`/`submission_private`** (staff-only RLS) — never on student-readable `grades`/`submissions` rows (prevents leak). RLS is row-level, not column-level — that's why separate tables.
7. **`submissions` = single current submission per student** (unique `assignment_id+student_id`, latest-wins); history in `submission_versions` (archive trigger). Keep it.
8. **Submission files in PRIVATE `submissions` bucket**; store PATH, access via signed URLs. Never public.
9. **Course `code` is immutable after creation** (enrollments/modules/RAG reference it).
10. **Embeddings = `gemini-embedding-001` @ 768 dims**, `vector(768)`, cosine + hnsw. pgvector INSERT needs a `[..]` literal (string), not a JS array.
11. **Trigger functions: REVOKE EXECUTE from public/anon/authenticated.** Any new trigger function must do the same.
12. **`notifications.type` is open text + `profiles.settings` jsonb extensible** → 2.7 engine + preferences need NO migration.
13. **Design fidelity + landing = final phase.** Tone/English locked. Fonts stay Geist + Noto Kufi Arabic.

---

## 7) Pending Risks / Issues
1. **NOT DEPLOYED** (local only; git has no remote). Deploy = git remote + Vercel + env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`) + Supabase Auth site/redirect URLs.
2. **RAG ingestion is synchronous** (download + sequential embeddings, MAX_CHUNKS 80, maxDuration 60) → may **timeout on Vercel serverless** for large PDFs. Move to background/queue before scale.
3. **No real STUDENT accounts exist** (only owner/doctor/guider). Student-facing flows validated at data layer but not browser-tested with a real student. Create a test student to validate.
4. **AI rate-limit is in-memory per instance** (in `/api/ai-tutor`) — ineffective on serverless. Move to Redis/Upstash.
5. **No password reset** (synthetic `@aiu.edu.eg` emails aren't real inboxes). Operational risk.
6. **No automated tests / CI** (Playwright plan never implemented).
7. **Leaked-password protection OFF** in Supabase (manual toggle by owner).
8. **~39 hardcoded indigo color values** across 19 files (inline styles) — design-phase cleanup. `courses.ts` per-course colors are intentional.
9. **Stray `src/page.tsx`** (duplicate of messages) — dead code to remove.
10. **CSE311 DB title = "Computer Networks"** (lib/data said "Computer Architecture"); DB is authoritative — backfilled tags may mismatch (fix via CourseModal).
11. Dev scripts in `scripts/` + `pdf-lib` dev dep — clean before production.
12. A **dev server may be running on `localhost:3001`** (background from earlier).
13. Local `supabase/migrations` synced via MCP (not official `supabase db pull`); base `001_schema.sql` is legacy. For a clean baseline, run official `supabase db pull` via CLI.

---

## 8) Verification Discipline (keep doing this)
After every change: `npx tsc --noEmit && npm run build` must be green. For DB features: run an e2e SQL test against `yipecojgakuwcnlzwkne` (insert → exercise → verify → **delete test data + confirm 0 left**). Production must stay clean.

**Next action:** Step **2.5 Gradebook**.
