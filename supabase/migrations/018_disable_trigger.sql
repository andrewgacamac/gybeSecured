-- migration: 018_disable_trigger.sql
-- Disable strict status transition trigger to allow reprocessing of failed leads.

DROP TRIGGER IF EXISTS leads_status_validation ON leads;
-- Also try dropping the function
-- Usually function name matches trigger intent.
-- Looking at 002: it might be validate_lead_status_transition()
-- But let's check content of 002.
