
-- Fix Function Search Path Mutable Warnings
-- By explicitly setting search_path, we prevent hijacking attacks.

ALTER FUNCTION public.get_user_role() SET search_path = public;
ALTER FUNCTION public.log_lead_created() SET search_path = public;
ALTER FUNCTION public.log_lead_status_change() SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;

-- Note: The audit mentioned other functions (validate_status_transition, update_last_login, check_photo_limit)
-- These might not have been created by our previous migrations, but if they exist, let's fix them too.
-- Using DO block to avoid errors if they don't exist.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_status_transition') THEN
        ALTER FUNCTION public.validate_status_transition() SET search_path = public;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_last_login') THEN
        ALTER FUNCTION public.update_last_login() SET search_path = public;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_photo_limit') THEN
        ALTER FUNCTION public.check_photo_limit() SET search_path = public;
    END IF;
END $$;
