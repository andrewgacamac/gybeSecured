-- Trigger to sync auth.users to admin_users on signup
CREATE OR REPLACE FUNCTION sync_auth_user_to_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert if this is a new user and not already in admin_users
    INSERT INTO admin_users (id, email, role)
    VALUES (NEW.id, NEW.email, 'reviewer')
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_auth_user_to_admin();

-- Update last_login on sign in
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE admin_users
    SET last_login = now()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger fires on auth.sessions, which tracks logins
-- May need adjustment based on Supabase version
