
-- TIGHTENED SECURITY: Remove public read access completely.
-- Anonymous users can ONLY insert. They cannot read anything.

DROP POLICY IF EXISTS "leads_anon_select_recent" ON leads;
DROP POLICY IF EXISTS "raw_uploads_anon_select" ON storage.objects;
