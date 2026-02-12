-- migration: 015_grant_storage_select.sql
-- Allow authenticated users (Admins) to read storage objects again.
-- Without this, strict security (011) blocks creating Signed URLs or viewing files.

GRANT SELECT ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;
