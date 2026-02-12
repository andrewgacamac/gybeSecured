-- migration: 020_photo_trigger.sql
-- Create a trigger on photos table to call lead-processor edge function.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_lead_processor()
RETURNS trigger AS $$
DECLARE
  -- SECURITY: Do not hardcode secrets in migration files.
  -- Steps to manage this securely:
  -- 1. Store the key in Supabase Vault: select vault.create_secret('service_role_key', 'YOUR_ACTUAL_KEY');
  -- 2. Retrieve it dynamically: select decrypted_secret into service_key from vault.decrypted_secrets where name = 'service_role_key';
  -- For now, using a placeholder to pass git checks.
  service_key text := 'YOUR_SERVICE_ROLE_KEY_PLACEHOLDER';
  func_url text := 'https://rjwaunghmcihpmockiap.supabase.co/functions/v1/lead-processor';
BEGIN
  -- Call the Edge Function via HTTP POST
  PERFORM net.http_post(
    url := func_url,
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lead_processor ON public.photos;

CREATE TRIGGER trigger_lead_processor
AFTER INSERT ON public.photos
FOR EACH ROW
EXECUTE FUNCTION public.trigger_lead_processor();
