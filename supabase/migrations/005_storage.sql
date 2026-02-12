-- Storage bucket creation (if not using Dashboard)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
    ('raw_uploads', 'raw_uploads', false, 10485760),
    ('processed_images', 'processed_images', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for raw_uploads

-- Anyone can upload to raw_uploads (for anonymous lead submission)
CREATE POLICY "raw_uploads_anon_insert"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
    bucket_id = 'raw_uploads' AND
    (storage.foldername(name))[1] IS NOT NULL
);

-- Authenticated users can read raw_uploads
CREATE POLICY "raw_uploads_authenticated_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'raw_uploads');

-- Admins can delete from raw_uploads
CREATE POLICY "raw_uploads_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'raw_uploads' AND
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
);

-- Storage Policies for processed_images

-- Service role handles inserts (via Edge Functions)
-- Authenticated users can read
CREATE POLICY "processed_images_authenticated_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'processed_images');

-- Admins can delete
CREATE POLICY "processed_images_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'processed_images' AND
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
);
