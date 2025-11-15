-- Create scrape_logs table for edge function logging
CREATE TABLE IF NOT EXISTS public.scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trace_id TEXT NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  ok BOOLEAN NOT NULL DEFAULT false,
  message TEXT,
  data_snippet TEXT,
  ms INTEGER
);

-- Enable RLS
ALTER TABLE public.scrape_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs for their trips
CREATE POLICY "Users can view logs for their trips"
ON public.scrape_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = scrape_logs.trip_id
    AND trips.user_id = auth.uid()
  )
);

-- Policy: Service role can insert logs
CREATE POLICY "Service role can insert logs"
ON public.scrape_logs
FOR INSERT
WITH CHECK (true);

-- Add index for performance
CREATE INDEX idx_scrape_logs_trip_id ON public.scrape_logs(trip_id);
CREATE INDEX idx_scrape_logs_trace_id ON public.scrape_logs(trace_id);
CREATE INDEX idx_scrape_logs_created_at ON public.scrape_logs(created_at DESC);