-- Dedicated bucket for Canvas-style course materials.
-- Server-side limits: 20 MB, PDF only. Any course staff may upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-materials', 'course-materials', true, 20971520, array['application/pdf'])
on conflict (id) do nothing;

create policy course_mat_read on storage.objects
  for select using (bucket_id = 'course-materials' and auth.uid() is not null);

create policy course_mat_write on storage.objects
  for insert with check (
    bucket_id = 'course-materials'
    and public.current_user_role() in ('owner','admin','doctor','master','guider')
  );

create policy course_mat_delete on storage.objects
  for delete using (
    bucket_id = 'course-materials'
    and public.current_user_role() in ('owner','admin','doctor','master','guider')
  );
