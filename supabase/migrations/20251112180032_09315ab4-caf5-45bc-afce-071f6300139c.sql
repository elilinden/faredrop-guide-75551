-- First/last name support
alter table public.trips add column if not exists first_name text;

-- Monitoring flags
alter table public.trips add column if not exists monitoring_enabled boolean default true;
alter table public.trips add column if not exists monitor_threshold numeric(10,2) default 20.00;
alter table public.trips add column if not exists last_signal_at timestamptz;
alter table public.trips add column if not exists last_signal_price numeric(10,2);

-- Signals table
create table if not exists public.price_signals (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  observed_price numeric(10,2) not null,
  diff_vs_paid numeric(10,2) not null,
  confidence text,
  created_at timestamptz default now()
);

-- RLS
alter table public.price_signals enable row level security;

-- Owner can read their signals
create policy "owner can read signals"
on public.price_signals for select
using (exists (
  select 1 from public.trips t
  where t.id = price_signals.trip_id
    and t.user_id = auth.uid()
));

-- Service role can insert signals
create policy "service role can insert signals"
on public.price_signals for insert
with check (true);