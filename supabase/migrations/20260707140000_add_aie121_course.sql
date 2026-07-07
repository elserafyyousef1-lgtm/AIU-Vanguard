-- Register AIE121 Machine Learning (Study Lab) as a Semester-4 course. Content lives in
-- src/lib/data/aie121.ts + aie121_sheets.ts (like CSE221/MAT312). Idempotent.
insert into public.courses (code, title, subtitle, semester_id, color, icon, tags, has_ai, has_formulas, order_index)
select 'AIE121', 'Machine Learning',
       'Metrics, regression, trees, SVM, KNN & clustering — 9 tutorials with worked examples',
       4, '#8b5cf6', '🧠',
       ARRAY['Metrics','Regression','Decision Trees','SVM','KNN','Clustering'], true, false, 5
where not exists (select 1 from public.courses where code = 'AIE121');
