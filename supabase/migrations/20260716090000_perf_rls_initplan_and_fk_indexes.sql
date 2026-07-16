-- ═══════════════════════════════════════════════════════════════════════════
-- Performance hardening (behavior-preserving):
--  H1) Wrap per-row auth.uid()/current_user_role() calls in RLS policies with
--      scalar subselects so Postgres evaluates them ONCE per statement
--      (fixes the auth_rls_initplan advisor class — 37 policies).
--      ALTER POLICY only: no drop/recreate, semantics identical, reversible by
--      removing the (SELECT …) wrappers.
--  H2) Covering indexes for all 25 unindexed foreign keys (advisor list,
--      re-derived from pg_constraint). Reversible via DROP INDEX.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── H1: initplan-wrap every public policy that calls the functions per row ──
DO $$
DECLARE
  r record;
  new_qual text;
  new_check text;
  stmt text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual IS NOT NULL AND (qual LIKE '%auth.uid()%' OR qual LIKE '%current_user_role()%')
         AND qual NOT LIKE '%SELECT auth.uid()%' AND qual NOT LIKE '%SELECT current_user_role()%')
        OR
        (with_check IS NOT NULL AND (with_check LIKE '%auth.uid()%' OR with_check LIKE '%current_user_role()%')
         AND with_check NOT LIKE '%SELECT auth.uid()%' AND with_check NOT LIKE '%SELECT current_user_role()%')
      )
  LOOP
    new_qual  := replace(replace(r.qual,
                   'auth.uid()', '(SELECT auth.uid())'),
                   'current_user_role()', '(SELECT current_user_role())');
    new_check := replace(replace(r.with_check,
                   'auth.uid()', '(SELECT auth.uid())'),
                   'current_user_role()', '(SELECT current_user_role())');
    stmt := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    IF r.qual IS NOT NULL THEN
      stmt := stmt || format(' USING (%s)', new_qual);
    END IF;
    IF r.with_check IS NOT NULL THEN
      stmt := stmt || format(' WITH CHECK (%s)', new_check);
    END IF;
    EXECUTE stmt;
  END LOOP;
END $$;

-- ── H2: covering indexes for the 25 unindexed foreign keys ──
CREATE INDEX IF NOT EXISTS idx_assignments_category_id        ON public.assignments (category_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by         ON public.assignments (created_by);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id          ON public.comment_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_reply_to              ON public.comments (reply_to);
CREATE INDEX IF NOT EXISTS idx_comments_user_id               ON public.comments (user_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_assigned_by ON public.course_assignments (assigned_by);
CREATE INDEX IF NOT EXISTS idx_course_documents_uploaded_by   ON public.course_documents (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_courses_semester_id            ON public.courses (semester_id);
CREATE INDEX IF NOT EXISTS idx_grade_history_assignment_id    ON public.grade_history (assignment_id);
CREATE INDEX IF NOT EXISTS idx_grade_history_changed_by       ON public.grade_history (changed_by);
CREATE INDEX IF NOT EXISTS idx_grade_history_student_id       ON public.grade_history (student_id);
CREATE INDEX IF NOT EXISTS idx_grades_graded_by               ON public.grades (graded_by);
CREATE INDEX IF NOT EXISTS idx_grades_submission_id           ON public.grades (submission_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id             ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_modules_created_by             ON public.modules (created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id         ON public.notifications (actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_comment_id       ON public.notifications (comment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_conversation_id  ON public.notifications (conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_post_id          ON public.notifications (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id             ON public.post_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id                  ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS idx_submission_versions_assignment_id ON public.submission_versions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_submission_versions_student_id ON public.submission_versions (student_id);
CREATE INDEX IF NOT EXISTS idx_teach_requests_course_id       ON public.teach_requests (course_id);
CREATE INDEX IF NOT EXISTS idx_teach_requests_decided_by      ON public.teach_requests (decided_by);
