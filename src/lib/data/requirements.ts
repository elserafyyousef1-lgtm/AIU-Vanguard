// src/lib/data/requirements.ts
// ═══════════════════════════════════════════════════════════
// UNIVERSITY REQUIREMENTS — online, general-requirement courses
// taken across the whole program (not tied to one semester).
// This is a DISPLAY-ONLY reference catalog: these courses have no
// study content / AI tutor / exams yet, so they are listed but not
// linked to course pages. Promote any of them to a full COURSES
// entry (src/lib/data/courses.ts) once real content exists.
// ═══════════════════════════════════════════════════════════

export interface RequirementCourse {
  /** Official course code. Empty string = code not yet confirmed. */
  code: string
  /** Full course name as printed by the university. */
  title: string
  /** Short department/topic label (derived from the course itself). */
  category: string
  /** Extra note shown under the title (e.g. eligibility). */
  note?: string
}

// Source: AIU online-requirements exam schedule (May 2026 sitting).
export const REQUIREMENT_COURSES: RequirementCourse[] = [
  { code: 'MGT222', title: 'Entrepreneurship and Innovation',              category: 'Management' },
  { code: 'LAN112', title: 'Critical Thinking',                            category: 'Liberal Arts' },
  { code: 'LAN211', title: 'Academic Writing',                             category: 'Liberal Arts' },
  { code: 'LIB116', title: 'Research and Analysis Skills',                 category: 'Research' },
  { code: 'PHS071', title: 'Health and Livability',                        category: 'Health' },
  { code: 'CSE013', title: 'Introduction to Information Systems & Technology', category: 'Information Systems' },
  { code: 'GEO217', title: 'Climate Change and Sustainability',            category: 'Sustainability' },
  { code: 'LAN111', title: 'English Language 2',                           category: 'Languages' },
  { code: 'MGT201', title: 'Negotiation Skills',                           category: 'Management' },
  { code: 'MGT102', title: 'Strategic Planning',                           category: 'Management', note: 'For non-Business students' },
  { code: 'ADL123', title: 'First Aid',                                    category: 'Life Skills' },
  { code: 'LAN022', title: 'English Language 1',                           category: 'Languages' },
  { code: 'PSC101', title: 'Introduction to Law and Human Rights',         category: 'Law & Society' },
  { code: 'LAN114', title: 'Artistic Appreciation',                        category: 'Liberal Arts' },
  { code: 'LAN130', title: 'French Language',                              category: 'Languages' },
  { code: 'MGT121', title: 'Introduction to Management',                   category: 'Management' },
]
