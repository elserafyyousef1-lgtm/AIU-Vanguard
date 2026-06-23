# AIU Vanguard — Course Materials Integration Handover

> **For:** the AI assistant (ChatGPT / another Claude) that will actually integrate the course content into the project code.
> **Scope:** this document is ONLY about course *materials/content* (study sheets, exam questions, flashcards, formulas) and how to wire a course up. The AI tutor "brain" is delivered separately as `handover/aiPersona.ts` — do not confuse the two.
> **Project:** AIU CS Hub / "AIU Vanguard" — Next.js 14 (App Router) + Supabase. Working dir `D:\AIU-Hub`. Live on Vercel.

---

## 0) What you are integrating

| Course | Code in app | Status today | What to do |
|---|---|---|---|
| Database Systems | `CSE221` | ✅ Full content (9 sheets, 60 exam Q, AI tutor) | Reference example — copy its data pattern |
| Differential Equations | `MAT312` | ✅ Full (9 sheets, 40 exam Q, 43 flashcards) | Reference example; formula sheet still a placeholder |
| Machine Learning | `CSE301` (app) / `AIE121` (sheets) | ⚠️ Placeholder, 0 lectures. Content exists as a standalone HTML lab | **Build the data file from the ML content** |
| Computer Architecture | `CSE311` | ⚠️ Placeholder, 0 lectures, no content yet | **Author content** (use the CSE311 knowledge base in `aiPersona.ts` as the source) |

---

## 1) Where everything lives (exact files)

- Course registry (cards, counts, flags): `src/lib/data/courses.ts` → `COURSES` and `SEMESTERS`.
- Per-course content data files: `src/lib/data/cse221.ts`, `src/lib/data/mat312.ts` (these are the templates to copy).
- The tab UI that renders a course: `src/components/course/CourseClient.tsx`.
- Tab renderers: `src/components/course/LecturesTab.tsx`, `ExamTab.tsx`, `FlashcardsTab.tsx`.
- Course route + which slugs exist: `src/app/courses/[slug]/page.tsx` (`generateStaticParams`).
- Shared types (the data contract): `src/types/index.ts`.
- AI brain: `src/lib/data/aiPersona.ts` (replace with `handover/aiPersona.ts`).

---

## 2) The data contract (copy these shapes EXACTLY)

From `src/types/index.ts`:

```ts
interface Lecture {
  id: string            // e.g. "CSE301-L1"
  courseSlug: CourseSlug // must be one of the union in types/index.ts
  number: number
  title: string
  description: string
  concepts: Concept[]    // can be [] (CSE221/MAT312 currently ship empty concepts)
}

interface Concept { title: string; body: string /* HTML string, already styled */; tip?: string }

type QuestionType = 'mcq' | 'tf'
interface Question {
  n: number
  q: string
  t: QuestionType
  opts?: string[]        // MCQ only
  c: string | boolean    // answer key: 'a'|'b'|'c'|'d'  OR  true|false
  f: string              // explanation shown after answering
  tag: string            // "Lec 1", "Sheet 2", "Tutorial 3", etc.
}

interface FlashCard {
  t: string                       // front / title
  i: { k: string; v: string }[]   // key→value rows on the back
}
```

### Real authoring pattern to mirror (from `cse221.ts` / `mat312.ts`)
Each course data file exports, by convention:
- `<CODE>_LECTURES: Lecture[]`
- `<CODE>_QUESTIONS: Question[]`
- `<CODE>_FLASHCARDS: FlashCard[]` (optional, MAT312 has it)
- `<CODE>_QUICK_CHIPS: string[]` (optional, CSE221 has it — starter prompts for the AI panel)

Example lecture entry (verbatim style from `cse221.ts`):
```ts
{ id: 'CSE221-L1', courseSlug: 'CSE221', number: 1,
  title: 'Intro to DBs',
  description: 'Database concepts, DBMS benefits, redundancy vs inconsistency',
  concepts: [] },
```
Example flashcard (from `mat312.ts`):
```ts
{ t: "Linear 1st-Order", i: [
  { k: "Form", v: " y' + P(x)y = Q(x)" },
  { k: "IF",   v: " μ = e^(∫P dx)" },
  { k: "Solution", v: " y = (1/μ)(∫μQ dx + C)" },
]},
```

> Note: CSE221/MAT312 currently ship `concepts: []` — the actual lecture prose lives in the older standalone HTML files. If you want rich in-app lecture bodies, fill `concepts[].body` with styled HTML.

---

## 3) Step-by-step: wiring a placeholder course to "live"

Using **Machine Learning** as the example (same steps for Computer Architecture):

1. **Decide the canonical code.** The app uses `CSE301`; the ML study lab is titled `AIE121`. Pick ONE. Recommendation: keep `CSE301` as the platform slug (it's already in the `CourseSlug` type, the route's `generateStaticParams`, and `COURSES`), and just display "AIE121 / Machine Learning" as the title. If you instead switch to `AIE121`, you must update: `CourseSlug` union in `types/index.ts`, `COURSES` key in `courses.ts`, `generateStaticParams` in `courses/[slug]/page.tsx`, and every `course.slug === 'CSE301'` check. The brain already maps BOTH codes, so the AI works either way.

2. **Create the data file** `src/lib/data/cse301.ts` (mirror `cse221.ts`): export `CSE301_LECTURES`, `CSE301_QUESTIONS`, and optionally `CSE301_FLASHCARDS`, `CSE301_QUICK_CHIPS`. Source the content from the standalone ML lab HTML (see section 4).

3. **Update the registry** in `src/lib/data/courses.ts` for `CSE301`: set real `lectureCount`, `examQCount`, `practiceQCount`/`flashcardCount`, and `hasAI: true` (and `hasFormulas` if you add a formula sheet). The course page auto-renders the placeholder only while `lectureCount === 0`, so a non-zero count flips it live.

4. **Wire it into `CourseClient.tsx`:** add a `TABS_CSE301` array and extend the `lectures`/`questions`/tab selection logic (currently a hard `course.slug === 'CSE221' ? ... : ...` ternary — generalise it to a `switch`/map by slug so adding courses doesn't keep nesting ternaries). Add the AI tab if `hasAI`.

5. **AI tutor:** the brain already has the knowledge. Ensure `AIPanel` is opened for this course. Ideally, refactor `AIPanel` to use `getCourseKnowledge(courseSlug)` from the new `aiPersona.ts` instead of the hardcoded `CSE221_AI_PROMPT`/MAT312 string — then every registered course gets the right knowledge automatically.

6. **Verify:** `npm run dev`, open `/courses/cse301`, check the tabs render, the exam auto-grades, and the AI tutor answers grounded in ML.

---

## 4) Machine Learning (CSE301 / AIE121) — content source

A complete standalone study lab already exists as HTML ("AIE121 — Machine Learning · Study Lab"). It contains 9 tutorials, ~15 solved problems, ~32 exam questions, flashcards, and a formula sheet. **Extract its content into `cse301.ts`** in the shapes above.

**Confirmed tutorials in the lab (verified content — safe to use directly):**
1. Accuracy / Evaluation Metrics — confusion matrix (TP/FP/FN/TN), Accuracy, Precision, Recall, F1, MAE, MSE, RMSE.
2. Linear Regression — Normal Equation W=(XᵀX)⁻¹XᵀY, 2×2 inverse, least-squares derivation.
3. Decision Trees (ID3) — entropy, information gain, choosing the root, building the tree.
4. AdaBoost — decision stumps, weighted error, classifier weight α, re-weighting.

**⚠️ To confirm:** the lab states "9 tutorials" but the copy provided here was truncated after Tutorial 4. Tutorials 5–9 (likely classification, clustering, neural networks per the course tags) must be pulled from the full HTML file or the original sheets before authoring them as fact. The quiz `c` values, exam answer keys, and all numeric worked answers must be copied exactly from the HTML — do not re-derive or paraphrase them.

The exam questions in the HTML already follow a `{q, o:[...], c:index, f}` shape — map them to the project's `Question` shape: `o` → `opts`, and convert the numeric `c` index to the `'a'|'b'|'c'|'d'` letter key the project expects (check how `ExamTab.tsx` reads `c` before bulk-converting).

---

## 5) Computer Architecture (CSE311) — author from the brain

There is **no existing CSE311 content**. The authoritative starting point is the **`CSE311_KNOWLEDGE` block inside `handover/aiPersona.ts`** — it lays out the full topic structure and exam-grade formulas:
1. Data representation & number systems (two's complement, IEEE 754)
2. Digital logic foundation
3. ISA (RISC vs CISC, MIPS R/I/J formats, addressing modes)
4. CPU datapath, control & instruction cycle
5. Performance (CPU time = IC × CPI × Tc, MIPS, Amdahl's Law)
6. Pipelining (5 stages, hazards, forwarding/stalls)
7. Memory hierarchy & cache (mapping, AMAT, write-through vs write-back)
8. I/O & buses (polling, interrupts, DMA)

Turn each topic into a `Lecture` and write `Question`s + (optionally) `FlashCard`s in the same shapes.

> **Important:** the CSE311 knowledge base is built from **standard intro-Computer-Architecture fundamentals**, not from an AIU CSE311 sheet (none was provided). It is accurate at the standard level, but **align the topic order, depth, notation (e.g. MIPS vs another ISA), and emphasis to AIU's actual CSE311 syllabus** once the real material is available, before treating any specific number/trap as exam-canonical.

---

## 6) Hard rules — do not break these during integration

- **Mirror the existing data shapes exactly** (`Lecture`, `Question`, `FlashCard`) — `ExamTab`/`LecturesTab`/`FlashcardsTab` depend on them.
- **Copy answer keys verbatim** from the source material. Never invent or re-derive an exam answer.
- **Keep technical terms in English** in any displayed content (matches how AIU exams present them).
- **Course content goes in TypeScript data files**, not the database. (The DB `courses`/`semesters` tables are a separate, parallel list used by the dashboard/enrollment flow — if you add a course, keep both in sync or the dashboard and the course page will disagree.)
- **Don't overwrite `cse221.ts` / `mat312.ts`** — they are the working reference implementations.
- After flipping a course live, set its `lectureCount > 0` in `courses.ts` or the page will keep showing the "Content is being prepared" placeholder.

---

## 7) Quick checklist for the integrating assistant

- [ ] Replace `src/lib/data/aiPersona.ts` with `handover/aiPersona.ts` (the brain) — backwards compatible, no other changes required.
- [ ] Decide CSE301 vs AIE121 naming and apply consistently.
- [ ] Create `src/lib/data/cse301.ts` from the ML lab HTML (Tutorials 1–4 confirmed; pull 5–9 from the full file).
- [ ] Create `src/lib/data/cse311.ts` from the CSE311 knowledge base (then align to the real AIU syllabus).
- [ ] Update `COURSES` in `courses.ts` (counts + `hasAI`/`hasFormulas`).
- [ ] Generalise `CourseClient.tsx` to add the new courses' tabs.
- [ ] Refactor `AIPanel` to use `getCourseKnowledge(courseSlug)` so every course's AI works automatically.
- [ ] `npm run dev` and verify each new course page, exam grading, and AI tutor.
