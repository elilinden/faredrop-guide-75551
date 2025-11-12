-- User preferences for monitoring settings
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_alerts_enabled boolean default true,
  min_drop_threshold numeric(10,2) default 10.00,
  monitor_mode text default 'auto' check (monitor_mode in ('auto', 'fixed')),
  monitor_frequency_minutes integer default 180,
  digest_cadence text default 'monthly' check (digest_cadence in ('off', 'weekly', 'monthly')),
  timezone text default 'America/New_York',
  created_at timestamptz default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can manage their own preferences"
on public.user_preferences for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Add next_check_at for smarter scheduling
alter table public.trips
  add column if not exists next_check_at timestamptz;