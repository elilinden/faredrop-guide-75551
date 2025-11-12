-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  full_name TEXT,
  email TEXT
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  airline TEXT CHECK (airline IN ('AA', 'DL', 'UA', 'AS')) NOT NULL,
  confirmation_code TEXT NOT NULL,
  last_name TEXT NOT NULL,
  brand TEXT,
  rbd TEXT,
  paid_total NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  ticket_number TEXT,
  depart_date DATE NOT NULL,
  return_date DATE,
  notes TEXT,
  status TEXT DEFAULT 'active' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT confirmation_code_length CHECK (length(confirmation_code) = 6)
);

-- Enable RLS on trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Trips policies
CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
  ON public.trips FOR DELETE
  USING (auth.uid() = user_id);

-- Create segments table
CREATE TABLE public.segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  carrier TEXT CHECK (carrier IN ('AA', 'DL', 'UA', 'AS')) NOT NULL,
  flight_number TEXT NOT NULL,
  depart_airport TEXT NOT NULL,
  arrive_airport TEXT NOT NULL,
  depart_datetime TIMESTAMPTZ NOT NULL,
  arrive_datetime TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on segments
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

-- Segments policies (inherit from trip)
CREATE POLICY "Users can view segments of their trips"
  ON public.segments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = segments.trip_id AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can create segments for their trips"
  ON public.segments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = segments.trip_id AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can update segments of their trips"
  ON public.segments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = segments.trip_id AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete segments of their trips"
  ON public.segments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = segments.trip_id AND trips.user_id = auth.uid()
  ));

-- Create reprices table
CREATE TABLE public.reprices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  preview_credit NUMERIC(10,2) NOT NULL,
  confirmed_credit NUMERIC(10,2),
  method TEXT CHECK (method IN ('self-change-preview', 'self-changed')) NOT NULL,
  evidence_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on reprices
ALTER TABLE public.reprices ENABLE ROW LEVEL SECURITY;

-- Reprices policies (inherit from trip)
CREATE POLICY "Users can view reprices of their trips"
  ON public.reprices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = reprices.trip_id AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can create reprices for their trips"
  ON public.reprices FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = reprices.trip_id AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can update reprices of their trips"
  ON public.reprices FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = reprices.trip_id AND trips.user_id = auth.uid()
  ));

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  threshold NUMERIC(10,2) DEFAULT 20.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Alerts policies (inherit from trip)
CREATE POLICY "Users can view alerts for their trips"
  ON public.alerts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = alerts.trip_id AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can create alerts for their trips"
  ON public.alerts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = alerts.trip_id AND trips.user_id = auth.uid()
  ));

-- Create audit_log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log policies
CREATE POLICY "Users can view their own audit logs"
  ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Create storage bucket for evidence screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false);

-- Storage policies for evidence bucket
CREATE POLICY "Users can view their own evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own evidence"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own evidence"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();