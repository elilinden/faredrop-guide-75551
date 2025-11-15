alter table public.trips
  add column if not exists last_live_price numeric(10,2),
  add column if not exists last_live_price_currency text default 'USD',
  add column if not exists last_live_checked_at timestamptz,
  add column if not exists last_live_source text,
  add column if not exists live_price_confidence text;

-- Ensure default is set even if column already existed without default
alter table public.trips
  alter column last_live_price_currency set default 'USD';
