-- Add soft delete column
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add unique index to prevent duplicates (excluding soft-deleted)
CREATE UNIQUE INDEX IF NOT EXISTS trips_user_airline_pnr_last_uq
ON public.trips (user_id, airline, confirmation_code, last_name)
WHERE deleted_at IS NULL;