// src/lib/data/courses.ts
import type { Course, Semester } from '@/types'

// ═══════════════════════════════════════════════════════════
// SEMESTER 4 — 4 ACTIVE COURSES (full content)
// ═══════════════════════════════════════════════════════════
export const COURSES: Record<string, Course> = {
  CSE221: {
    slug: 'CSE221',
    code: 'CSE221',
    title: 'Database Systems',
    subtitle: 'Master relational databases, ER diagrams, normalization & SQL',
    semester: 4,
    color: '#6366f1',
    colorBg: 'rgba(99,102,241,0.08)',
    icon: '📊',
    lectureCount: 9,
    examQCount: 60,
    practiceQCount: 60,
    hasAI: true,
    hasFormulas: false,
    tags: ['ER Diagrams', 'Normalization', 'SQL', 'Join Algorithms', 'Relational Algebra'],
    instructor: 'Dr. Abdallah Hassan',
  },
  MAT312: {
    slug: 'MAT312',
    code: 'MAT312',
    title: 'Differential Equations',
    subtitle: 'Separable equations, Laplace, Fourier series & more — all 9 topics',
    semester: 4,
    color: '#10b981',
    colorBg: 'rgba(16,185,129,0.08)',
    icon: '📐',
    lectureCount: 9,
    examQCount: 40,
    practiceQCount: 133,
    flashcardCount: 43,
    hasAI: false,
    hasFormulas: true,
    tags: ['Separable', 'Laplace', 'Fourier', 'Cauchy-Euler', 'Power Series'],
  },
  CSE301: {
    slug: 'CSE301',
    code: 'CSE301',
    title: 'Machine Learning',
    subtitle: 'Supervised & unsupervised learning, neural networks & model evaluation',
    semester: 4,
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.08)',
    icon: '🤖',
    lectureCount: 0,
    examQCount: 0,
    practiceQCount: 0,
    hasAI: false,
    hasFormulas: false,
    tags: ['Regression', 'Classification', 'Neural Networks', 'Clustering'],
  },
  CSE311: {
    slug: 'CSE311',
    code: 'CSE311',
    title: 'Computer Architecture',
    subtitle: 'CPU design, memory hierarchy, pipelining & instruction sets',
    semester: 4,
    color: '#ef4444',
    colorBg: 'rgba(239,68,68,0.08)',
    icon: '⚙️',
    lectureCount: 0,
    examQCount: 0,
    practiceQCount: 0,
    hasAI: false,
    hasFormulas: false,
    tags: ['CPU', 'Memory', 'Pipelining', 'ISA', 'Cache'],
  },
}

// ═══════════════════════════════════════════════════════════
// ALL 8 SEMESTERS — routing structure
// Active: Semester 4 only. Others: coming_soon
// ═══════════════════════════════════════════════════════════
export const SEMESTERS: Semester[] = [
  {
    id: 1,
    title: 'Semester 1',
    status: 'coming_soon',
    courses: [],
    description: 'Foundation courses — Math, Programming basics, Logic',
  },
  {
    id: 2,
    title: 'Semester 2',
    status: 'coming_soon',
    courses: [],
    description: 'Data Structures, Algorithms, Calculus II',
  },
  {
    id: 3,
    title: 'Semester 3',
    status: 'coming_soon',
    courses: [],
    description: 'OOP, Discrete Math, Linear Algebra',
  },
  {
    id: 4,
    title: 'Semester 4',
    status: 'active',
    courses: ['CSE221', 'MAT312', 'CSE301', 'CSE311'],
    description: 'Database Systems, Differential Equations, Machine Learning, Computer Architecture',
  },
  {
    id: 5,
    title: 'Semester 5',
    status: 'coming_soon',
    courses: [],
    description: 'Operating Systems, Computer Networks, Software Engineering',
  },
  {
    id: 6,
    title: 'Semester 6',
    status: 'coming_soon',
    courses: [],
    description: 'Compiler Design, AI Fundamentals, Web Development',
  },
  {
    id: 7,
    title: 'Semester 7',
    status: 'coming_soon',
    courses: [],
    description: 'Distributed Systems, Computer Vision, Security',
  },
  {
    id: 8,
    title: 'Semester 8',
    status: 'coming_soon',
    courses: [],
    description: 'Graduation Project, Advanced Topics, Electives',
  },
]

export function getCourse(slug: string): Course | undefined {
  return COURSES[slug]
}

export function getSemester(id: number): Semester | undefined {
  return SEMESTERS.find(s => s.id === id)
}

export function getSemesterCourses(semesterId: number): Course[] {
  const semester = getSemester(semesterId)
  if (!semester) return []
  return semester.courses.map(slug => COURSES[slug]).filter(Boolean)
}
