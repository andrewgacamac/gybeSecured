-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR AS $$
BEGIN
    RETURN (
        SELECT role FROM admin_users
        WHERE id = auth.uid() AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- LEADS POLICIES
-- =====================

-- Anonymous users can insert new leads
CREATE POLICY "leads_anon_insert" ON leads
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Admins have full access
CREATE POLICY "leads_admin_all" ON leads
    FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin')
    WITH CHECK (get_user_role() = 'admin');

-- Reviewers can only SELECT
CREATE POLICY "leads_reviewer_select" ON leads
    FOR SELECT
    TO authenticated
    USING (get_user_role() = 'reviewer');

-- =====================
-- PHOTOS POLICIES
-- =====================

-- Anonymous users can insert photos
CREATE POLICY "photos_anon_insert" ON photos
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Admins have full access
CREATE POLICY "photos_admin_all" ON photos
    FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin')
    WITH CHECK (get_user_role() = 'admin');

-- Reviewers can only SELECT
CREATE POLICY "photos_reviewer_select" ON photos
    FOR SELECT
    TO authenticated
    USING (get_user_role() = 'reviewer');

-- =====================
-- ADMIN_USERS POLICIES
-- =====================

-- All authenticated users can read admin_users (to check roles)
CREATE POLICY "admin_users_authenticated_select" ON admin_users
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can manage admin_users
CREATE POLICY "admin_users_admin_all" ON admin_users
    FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin')
    WITH CHECK (get_user_role() = 'admin');

-- =====================
-- AUDIT_LOG POLICIES
-- =====================

-- Only admins can view audit log
CREATE POLICY "audit_log_admin_select" ON audit_log
    FOR SELECT
    TO authenticated
    USING (get_user_role() = 'admin');

-- Only admins can insert to audit log
CREATE POLICY "audit_log_admin_insert" ON audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() = 'admin');

-- =====================
-- LEAD_EVENTS POLICIES
-- =====================

-- Admins can view lead events
CREATE POLICY "lead_events_admin_select" ON lead_events
    FOR SELECT
    TO authenticated
    USING (get_user_role() = 'admin');

-- Reviewers can view lead events
CREATE POLICY "lead_events_reviewer_select" ON lead_events
    FOR SELECT
    TO authenticated
    USING (get_user_role() = 'reviewer');
