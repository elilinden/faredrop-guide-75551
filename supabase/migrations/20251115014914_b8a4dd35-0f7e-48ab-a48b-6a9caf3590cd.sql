-- Add route_display and travel_dates_display columns to trips table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS route_display TEXT,
ADD COLUMN IF NOT EXISTS travel_dates_display TEXT;

-- Add helpful comment
COMMENT ON COLUMN public.trips.route_display IS 'Pre-formatted route display string from airline parsing (e.g., "LGA → TQO")';
COMMENT ON COLUMN public.trips.travel_dates_display IS 'Pre-formatted travel dates display string from airline parsing (e.g., "Mar 31 2026, 7:00am – Mar 31 2026, 2:40pm")';