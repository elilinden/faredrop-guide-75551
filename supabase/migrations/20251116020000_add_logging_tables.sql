-- logs for server-side scraping & parsing (service role writes)
create table if not exists public.scrape_logs (
  id uuid primary key default gen_random_uuid(),
  trace_id uuid not null,
  trip_id uuid,
  stage text not null,
  ok boolean,
  message text,
  data_snippet text,
  ms integer,
  created_at timestamptz default now()
);

create index if not exists idx_scrape_logs_trace on public.scrape_logs(trace_id);
create index if not exists idx_scrape_logs_trip on public.scrape_logs(trip_id);
create index if not exists idx_scrape_logs_created on public.scrape_logs(created_at);

-- optional client-side logs (users can write their own events; RLS enforced)
create table if not exists public.client_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  trace_id uuid,
  level text default 'info',
  message text,
  context jsonb,
  created_at timestamptz default now()
);

alter table public.client_logs enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'client_logs' and policyname = 'client_logs_insert_own'
  ) then
    create policy client_logs_insert_own on public.client_logs
      for insert with check (auth.uid() = user_id);
  end if;
end $$;
