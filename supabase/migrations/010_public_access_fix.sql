-- Fix blocking issues for public lead submission

-- 1. Make idempotency_key auto-generated if not provided
-- This prevents the INSERT from failing when the frontend doesn't send this key
ALTER TABLE leads ALTER COLUMN idempotency_key SET DEFAULT gen_random_uuid()::text;

-- 2. Allow 'anon' to SELECT the lead they just inserted (Time-Limited)
-- Drop existing policy if any to avoid errors on re-run
DROP POLICY IF EXISTS "leads_anon_select_recent" ON leads;
CREATE POLICY "leads_anon_select_recent" ON leads
    FOR SELECT
    TO anon
    USING (created_at > (now() - interval '10 minutes'));

-- 3. Allow 'anon' to SELECT from raw_uploads (Time-Limited)
-- Drop existing policy if any to avoid errors on re-run
DROP POLICY IF EXISTS "raw_uploads_anon_select" ON storage.objects;
CREATE POLICY "raw_uploads_anon_select"
    ON storage.objects FOR SELECT
    TO anon
    USING (bucket_id = 'raw_uploads' AND created_at > (now() - interval '10 minutes'));
