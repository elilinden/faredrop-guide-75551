-- Add price_mode column to trips table
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS price_mode text DEFAULT 'similar';

COMMENT ON COLUMN trips.price_mode IS 'Price check mode: exact (same flights only) or similar (same route/dates, any carrier)';