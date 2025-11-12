-- Add monitoring columns to trips
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS monitor_frequency_minutes integer DEFAULT 180,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_public_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS last_confidence text;

-- Create price_checks table for history
CREATE TABLE IF NOT EXISTS public.price_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  observed_price numeric(10,2),
  diff_vs_paid numeric(10,2),
  confidence text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.price_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can read their checks" ON public.price_checks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.trips t 
    WHERE t.id = price_checks.trip_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY "service can insert checks" ON public.price_checks 
FOR INSERT WITH CHECK (true);