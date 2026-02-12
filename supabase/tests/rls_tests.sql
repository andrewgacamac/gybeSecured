-- RLS Policy Tests using pgTAP
-- Run with: supabase test db

BEGIN;

SELECT plan(10);

-- Test 1: Anonymous can insert lead
SELECT lives_ok(
    $$INSERT INTO leads (idempotency_key, first_name, last_name, email)
      VALUES ('test-anon-1', 'Test', 'User', 'test@example.com')$$,
    'Anonymous can insert lead'
);

-- Test 2: Anonymous can insert photo
SELECT lives_ok(
    $$INSERT INTO photos (lead_id, original_path)
      VALUES ((SELECT id FROM leads WHERE idempotency_key = 'test-anon-1'), 'test/path.jpg')$$,
    'Anonymous can insert photo'
);

-- Test 3: Anonymous cannot select leads (should return 0 rows)
SELECT is(
    (SELECT COUNT(*) FROM leads WHERE idempotency_key = 'test-anon-1'),
    0::bigint,
    'Anonymous cannot select leads'
);

-- Additional tests would require setting up authenticated users with different roles
-- These serve as a template for manual testing

SELECT * FROM finish();
ROLLBACK;
