-- migration: 017_public_raw_uploads.sql
-- Make raw_uploads public to fix frontend display issues reliably.

UPDATE storage.buckets
SET public = true
WHERE id = 'raw_uploads';

-- Ensure public policy exists
create policy "Public Select Raw"
  on storage.objects for select
  to public
  using ( bucket_id = 'raw_uploads' );
