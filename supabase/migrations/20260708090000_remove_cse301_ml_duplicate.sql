-- Remove the CSE301 "Machine Learning" placeholder — it duplicated AIE121 (the real ML course
-- with full content) in Semester 4. CSE301 carried only fake test data (2 enrollments,
-- 1 course_assignment, 1 approved teach_request), all confirmed disposable by the owner.
-- AIE121 is the canonical ML course going forward. Idempotent.

-- text-code references (not FKs) must be cleared explicitly
delete from public.enrollments        where course ilike 'CSE301';
delete from public.course_assignments where course ilike 'CSE301';

-- the course row — FKs on courses.id (assignments, grade_categories, teach_requests, weeks)
-- are ON DELETE CASCADE, so those clear automatically
delete from public.courses where code = 'CSE301';
