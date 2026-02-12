-- Add new columns to the 'leads' table to capture full quote details
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS package_interest text,
ADD COLUMN IF NOT EXISTS project_type text[], -- Stores multiple values like ['backyard', 'patio']
ADD COLUMN IF NOT EXISTS approximate_size text,
ADD COLUMN IF NOT EXISTS timeline text,
ADD COLUMN IF NOT EXISTS referral_source text,
ADD COLUMN IF NOT EXISTS message_content text,
ADD COLUMN IF NOT EXISTS street_address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS postal_code text;

-- Optional: Comment on columns for clarity
COMMENT ON COLUMN leads.package_interest IS 'The specific turf package the user selected (e.g., pet-yard)';
COMMENT ON COLUMN leads.project_type IS 'Array of areas the user wants to transform';
COMMENT ON COLUMN leads.approximate_size IS 'User-estimated square footage range';
