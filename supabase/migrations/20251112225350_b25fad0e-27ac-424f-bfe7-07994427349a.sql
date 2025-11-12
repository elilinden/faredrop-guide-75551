-- Add fields needed for Amadeus pricing directly on trips table
ALTER TABLE public.trips 
  ADD COLUMN IF NOT EXISTS origin_iata TEXT,
  ADD COLUMN IF NOT EXISTS destination_iata TEXT,
  ADD COLUMN IF NOT EXISTS departure_date DATE,
  ADD COLUMN IF NOT EXISTS flight_numbers TEXT[],
  ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cabin TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trips_departure_date ON public.trips(departure_date);
CREATE INDEX IF NOT EXISTS idx_trips_route ON public.trips(origin_iata, destination_iata);

COMMENT ON COLUMN public.trips.origin_iata IS 'Origin airport IATA code (e.g., LGA)';
COMMENT ON COLUMN public.trips.destination_iata IS 'Destination airport IATA code (e.g., TQO)';
COMMENT ON COLUMN public.trips.departure_date IS 'Departure date in ISO format for Amadeus pricing';
COMMENT ON COLUMN public.trips.flight_numbers IS 'Array of flight numbers (e.g., ["DL342", "DL1773"])';
COMMENT ON COLUMN public.trips.adults IS 'Number of adult passengers';
COMMENT ON COLUMN public.trips.cabin IS 'Cabin class: ECONOMY, PREMIUM_ECONOMY, BUSINESS, or FIRST';