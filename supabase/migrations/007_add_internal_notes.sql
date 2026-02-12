-- Add 'internal_notes' column to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS internal_notes text;

-- Comment
COMMENT ON COLUMN leads.internal_notes IS 'Private notes for admins, not visible to the customer';
