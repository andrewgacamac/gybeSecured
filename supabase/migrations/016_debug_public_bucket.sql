-- migration: 016_debug_public_bucket.sql
-- TEMPORARILY make processed_images public to debug access issues.
-- This will allow getPublicUrl() to work on this bucket.

UPDATE storage.buckets
SET public = true
WHERE id = 'processed_images';

-- Also enable public select policy
create policy "Public Select Processed"
  on storage.objects for select
  to public
  using ( bucket_id = 'processed_images' );
