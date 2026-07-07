// ═══════════════════════════════════════════════════════════
// AIU CS HUB — Core Types
// ═══════════════════════════════════════════════════════════

// ── Semesters ──────────────────────────────────────────────
export type SemesterNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface Semester {
  id: SemesterNum
  title: string
  status: 'active' | 'coming_soon' | 'locked'
  courses: CourseSlug[]
  description: string
}

// ── Courses ────────────────────────────────────────────────
export type CourseSlug =
  | 'CSE221'  // Database Systems
  | 'MAT312'  // Differential Equations
  | 'CSE301'  // Machine Learning
  | 'CSE311'  // Computer Architecture
  | 'AIE121'  // Machine Learning (Study Lab)

export interface Course {
  slug: string
  code: string
  title: string
  subtitle: string
  semester: SemesterNum
  color: string          // e.g. "#6366f1"
  colorBg: string        // rgba for card bg
  icon: string           // emoji
  lectureCount: number
  examQCount: number
  practiceQCount: number
  flashcardCount?: number
  hasAI: boolean
  hasFormulas: boolean
  tags: string[]
  instructor?: string
  description?: string
  requirements?: string
  creditHours?: number
}

// ── Lectures / Study Sheets ────────────────────────────────
export interface Lecture {
  id: string             // e.g. "CSE221-L1"
  courseSlug: CourseSlug
  number: number
  title: string
  description: string
  concepts: Concept[]
}

export interface Concept {
  title: string
  body: string           // HTML string (already styled)
  tip?: string
}

// ── Exam Questions ─────────────────────────────────────────
export type QuestionType = 'mcq' | 'tf'

export interface Question {
  n: number
  q: string
  t: QuestionType
  opts?: string[]        // MCQ only
  c: string | boolean    // answer key: 'a'|'b'|'c'|'d' or true|false
  f: string              // explanation
  tag: string            // "Lec 1", "Sheet 2", etc.
}

// ── Flashcards ─────────────────────────────────────────────
export interface FlashCard {
  t: string              // title/front
  i: { k: string; v: string }[]  // key-value pairs on back
}

// ── User / Auth ────────────────────────────────────────────
export type UserRole = 'owner' | 'admin' | 'doctor' | 'master' | 'guider' | 'student'

export interface UserProfile {
  id: string
  /** @deprecated moved to the private `user_private` table — read via my_contact()/admin_student_ids() RPCs */
  student_id?: string
  full_name: string
  role: UserRole
  avatar_url?: string
  bio?: string
  rep_course?: string
  semester: SemesterNum
  created_at: string
}

// ── Progress Tracking ──────────────────────────────────────
export interface CourseProgress {
  user_id: string
  course_slug: CourseSlug
  completed_lectures: string[]   // lecture IDs
  exam_scores: ExamScore[]
  flashcards_reviewed: number
  last_active: string
}

export interface ExamScore {
  date: string
  score: number
  total: number
  mode: 'practice' | 'final'
}

// ── Community ──────────────────────────────────────────────
export interface Post {
  id: string
  user_id: string
  user_name: string
  user_avatar?: string
  content: string
  image_url?: string
  course_tag?: CourseSlug
  likes: number
  liked_by: string[]
  comments: Comment[]
  created_at: string
}

export interface Comment {
  id: string
  user_id: string
  user_name: string
  content: string
  created_at: string
}

// ── AI ─────────────────────────────────────────────────────
export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ── Settings ───────────────────────────────────────────────
export interface UserSettings {
  theme: 'dark' | 'light'
  sound: boolean
  animations: boolean
  language: 'ar' | 'en' | 'both'
  notifications: boolean       // in-app: bell + sound while the site is open
  emailNotifications: boolean  // email while offline (important events only)
}
