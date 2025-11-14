-- Add comprehensive flight tracking fields to trips table
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS trip_type text,
ADD COLUMN IF NOT EXISTS ticket_expiration timestamp with time zone,
ADD COLUMN IF NOT EXISTS full_route text,
ADD COLUMN IF NOT EXISTS total_duration_minutes integer,
ADD COLUMN IF NOT EXISTS loyalty_status text,
ADD COLUMN IF NOT EXISTS fare_class text,
ADD COLUMN IF NOT EXISTS eticket_number text,
ADD COLUMN IF NOT EXISTS is_refundable boolean DEFAULT false;

-- Add comprehensive segment tracking fields
ALTER TABLE segments
ADD COLUMN IF NOT EXISTS aircraft text,
ADD COLUMN IF NOT EXISTS depart_terminal text,
ADD COLUMN IF NOT EXISTS depart_gate text,
ADD COLUMN IF NOT EXISTS arrive_terminal text,
ADD COLUMN IF NOT EXISTS arrive_gate text,
ADD COLUMN IF NOT EXISTS status text,
ADD COLUMN IF NOT EXISTS layover_duration_minutes integer,
ADD COLUMN IF NOT EXISTS is_change_of_plane boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS segment_index integer;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_segments_trip_id_segment_index ON segments(trip_id, segment_index);