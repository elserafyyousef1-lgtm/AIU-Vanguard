# AIU CS Hub v2.0 — Next.js 14 + Supabase

Complete study platform for Alamein International University — CS Semester 4.

## 🚀 Quick Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create Supabase project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your `Project URL` and `anon key`

### 3. Run database migration
In Supabase Dashboard → SQL Editor, paste and run:
```
supabase/migrations/001_schema.sql
```

### 4. Set environment variables
```bash
cp .env.example .env.local
# Fill in your Supabase URL and anon key
```

### 5. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              ← Homepage
│   ├── login/page.tsx        ← Auth page
│   ├── semesters/[id]/       ← All 8 semesters
│   ├── courses/[slug]/       ← CSE221, MAT312, CSE301, CSE311
│   ├── community/            ← Social feed (Supabase Realtime)
│   └── dashboard/            ← User progress
│
├── components/
│   ├── layout/               ← Navbar, HeroSection, SemestersGrid
│   ├── course/               ← CourseClient, LecturesTab, ExamTab, FlashcardsTab
│   ├── ai/                   ← AIPanel (calls Anthropic API)
│   └── ui/                   ← WelcomeModal, CommandPalette, SettingsPanel, etc.
│
└── lib/
    ├── data/
    │   ├── courses.ts         ← Course + semester registry
    │   ├── cse221.ts          ← 60 exam questions + AI prompt
    │   └── mat312.ts          ← 40 exam questions + 43 flashcards
    ├── supabase/              ← Client, server, middleware
    └── store.ts               ← Zustand (user, UI, exam state)
```

---

## 🎯 Features

| Feature | Status |
|---------|--------|
| Semester routing (8 semesters) | ✅ |
| CSE221 — 9 lectures + 60 exam Q's + AI Tutor | ✅ |
| MAT312 — 9 sheets + 40 exam Q's + 43 flashcards | ✅ |
| CSE301, CSE311 — structure (content coming) | ✅ |
| Supabase auth (student ID login) | ✅ |
| Community feed (Realtime) | ✅ |
| Dashboard + progress tracking | ✅ |
| Command palette (Ctrl+K) | ✅ |
| Dark/light theme | ✅ |
| Online user counter | ✅ |

---

## 🔑 Course Slugs

| Course | URL |
|--------|-----|
| Database Systems | `/courses/cse221` |
| Differential Equations | `/courses/mat312` |
| Machine Learning | `/courses/cse301` |
| Computer Architecture | `/courses/cse311` |

---

Built for AIU CS students · Made by Yousef Elserafy
