-- migration: 019_disable_trigger_really.sql
-- Actually drop the trigger leads_status_validation

DROP TRIGGER IF EXISTS leads_status_validation ON leads;
