-- Make non-essential columns nullable on trips table
ALTER TABLE public.trips ALTER COLUMN brand DROP NOT NULL;
ALTER TABLE public.trips ALTER COLUMN rbd DROP NOT NULL;
ALTER TABLE public.trips ALTER COLUMN ticket_number DROP NOT NULL;
ALTER TABLE public.trips ALTER COLUMN depart_date DROP NOT NULL;
ALTER TABLE public.trips ALTER COLUMN return_date DROP NOT NULL;