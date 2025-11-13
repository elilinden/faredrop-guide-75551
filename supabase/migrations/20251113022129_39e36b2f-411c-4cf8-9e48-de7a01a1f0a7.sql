-- Add missing pricing fields to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS last_public_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS last_public_provider text DEFAULT 'amadeus';