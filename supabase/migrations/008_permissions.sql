-- Grant permissions for trigger execution
GRANT ALL ON public.admin_users TO postgres;
GRANT ALL ON public.admin_users TO service_role;
GRANT ALL ON public.admin_users TO dashboard_user;
GRANT ALL ON public.admin_users TO supabase_auth_admin;

-- Ensure sequence permissions if any (none for UUIDs, but good practice)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, dashboard_user, supabase_auth_admin;
