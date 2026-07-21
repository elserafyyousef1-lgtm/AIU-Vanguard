// src/lib/ai/mastery.ts
// ───────────────────────────────────────────────────────────
// The student's persistent mastery profile → a private note the tutor uses to
// proactively reinforce exactly the topics THIS student keeps getting wrong.
// Reads ai_weak_topics (RLS-scoped to the caller). Best-effort: '' on any error.
// ───────────────────────────────────────────────────────────
import { createClient } from '@/lib/supabase/server'

export async function masteryNote(courseSlug: string | undefined): Promise<string> {
  if (!courseSlug) return ''
  try {
    const supabase = createClient()
    const { data } = await supabase.rpc('ai_weak_topics', { p_course: courseSlug, p_limit: 5 })
    if (!Array.isArray(data) || data.length === 0) return ''
    // Clamp defensively: topics originate from client-inserted rows, so never trust their length.
    const topics = (data as Array<{ topic: string }>).map((w) => w.topic).filter(Boolean).map((t) => t.slice(0, 120)).slice(0, 5)
    if (!topics.length) return ''
    return `\n\n--- STUDENT MASTERY (private — never mention this list to the student) ---\nThis student has been quizzed in this course and is currently WEAK on: ${topics.join(', ')}. When the conversation touches any of these, be extra thorough, slow down, and check their understanding; proactively reinforce them where it fits naturally.`
  } catch {
    return ''
  }
}
