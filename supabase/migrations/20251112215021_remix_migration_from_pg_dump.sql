--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


SET default_table_access_method = heap;

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    threshold numeric(10,2) DEFAULT 20.00 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    trip_id uuid,
    action text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: price_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid,
    observed_price numeric(10,2),
    diff_vs_paid numeric(10,2),
    confidence text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: price_signals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_signals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid,
    observed_price numeric(10,2) NOT NULL,
    diff_vs_paid numeric(10,2) NOT NULL,
    confidence text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    full_name text,
    email text
);


--
-- Name: reprices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reprices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    preview_credit numeric(10,2) NOT NULL,
    confirmed_credit numeric(10,2),
    method text NOT NULL,
    evidence_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reprices_method_check CHECK ((method = ANY (ARRAY['self-change-preview'::text, 'self-changed'::text])))
);


--
-- Name: segments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.segments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    carrier text NOT NULL,
    flight_number text NOT NULL,
    depart_airport text NOT NULL,
    arrive_airport text NOT NULL,
    depart_datetime timestamp with time zone NOT NULL,
    arrive_datetime timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT segments_carrier_check CHECK ((carrier = ANY (ARRAY['AA'::text, 'DL'::text, 'UA'::text, 'AS'::text])))
);


--
-- Name: trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    airline text NOT NULL,
    confirmation_code text NOT NULL,
    last_name text NOT NULL,
    brand text,
    rbd text,
    paid_total numeric(10,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    ticket_number text,
    depart_date date,
    return_date date,
    notes text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    first_name text,
    monitoring_enabled boolean DEFAULT true,
    monitor_threshold numeric(10,2) DEFAULT 20.00,
    last_signal_at timestamp with time zone,
    last_signal_price numeric(10,2),
    deleted_at timestamp with time zone,
    monitor_frequency_minutes integer DEFAULT 180,
    last_checked_at timestamp with time zone,
    last_public_price numeric(10,2),
    last_confidence text,
    next_check_at timestamp with time zone,
    CONSTRAINT confirmation_code_length CHECK ((length(confirmation_code) = 6)),
    CONSTRAINT trips_airline_check CHECK ((airline = ANY (ARRAY['AA'::text, 'DL'::text, 'UA'::text, 'AS'::text])))
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    user_id uuid NOT NULL,
    email_alerts_enabled boolean DEFAULT true,
    min_drop_threshold numeric(10,2) DEFAULT 10.00,
    monitor_mode text DEFAULT 'auto'::text,
    monitor_frequency_minutes integer DEFAULT 180,
    digest_cadence text DEFAULT 'monthly'::text,
    timezone text DEFAULT 'America/New_York'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_preferences_digest_cadence_check CHECK ((digest_cadence = ANY (ARRAY['off'::text, 'weekly'::text, 'monthly'::text]))),
    CONSTRAINT user_preferences_monitor_mode_check CHECK ((monitor_mode = ANY (ARRAY['auto'::text, 'fixed'::text])))
);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: price_checks price_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_checks
    ADD CONSTRAINT price_checks_pkey PRIMARY KEY (id);


--
-- Name: price_signals price_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_signals
    ADD CONSTRAINT price_signals_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: reprices reprices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reprices
    ADD CONSTRAINT reprices_pkey PRIMARY KEY (id);


--
-- Name: segments segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segments
    ADD CONSTRAINT segments_pkey PRIMARY KEY (id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: trips_user_airline_pnr_last_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX trips_user_airline_pnr_last_uq ON public.trips USING btree (user_id, airline, confirmation_code, last_name) WHERE (deleted_at IS NULL);


--
-- Name: alerts alerts_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: price_checks price_checks_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_checks
    ADD CONSTRAINT price_checks_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: price_signals price_signals_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_signals
    ADD CONSTRAINT price_signals_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reprices reprices_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reprices
    ADD CONSTRAINT reprices_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: segments segments_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segments
    ADD CONSTRAINT segments_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: trips trips_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: alerts Users can create alerts for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create alerts for their trips" ON public.alerts FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = alerts.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: reprices Users can create reprices for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reprices for their trips" ON public.reprices FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = reprices.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: segments Users can create segments for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create segments for their trips" ON public.segments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = segments.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: trips Users can create their own trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own trips" ON public.trips FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: segments Users can delete segments of their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete segments of their trips" ON public.segments FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = segments.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: trips Users can delete their own trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own trips" ON public.trips FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: user_preferences Users can manage their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own preferences" ON public.user_preferences USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: reprices Users can update reprices of their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update reprices of their trips" ON public.reprices FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = reprices.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: segments Users can update segments of their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update segments of their trips" ON public.segments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = segments.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: trips Users can update their own trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own trips" ON public.trips FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: alerts Users can view alerts for their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view alerts for their trips" ON public.alerts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = alerts.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: reprices Users can view reprices of their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view reprices of their trips" ON public.reprices FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = reprices.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: segments Users can view segments of their trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view segments of their trips" ON public.segments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = segments.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: audit_log Users can view their own audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own audit logs" ON public.audit_log FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: trips Users can view their own trips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own trips" ON public.trips FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: price_signals owner can read signals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner can read signals" ON public.price_signals FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.trips t
  WHERE ((t.id = price_signals.trip_id) AND (t.user_id = auth.uid())))));


--
-- Name: price_checks owner can read their checks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner can read their checks" ON public.price_checks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.trips t
  WHERE ((t.id = price_checks.trip_id) AND (t.user_id = auth.uid())))));


--
-- Name: price_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: price_signals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_signals ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: reprices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reprices ENABLE ROW LEVEL SECURITY;

--
-- Name: segments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

--
-- Name: price_checks service can insert checks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service can insert checks" ON public.price_checks FOR INSERT WITH CHECK (true);


--
-- Name: price_signals service role can insert signals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service role can insert signals" ON public.price_signals FOR INSERT WITH CHECK (true);


--
-- Name: trips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


