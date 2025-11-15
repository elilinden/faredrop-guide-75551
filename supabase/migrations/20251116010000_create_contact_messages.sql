create extension if not exists pgcrypto;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name  text not null,
  email      text not null check (position('@' in email) > 1),
  message    text not null,
  created_at timestamptz not null default now(),
  ip         text,
  user_agent text,
  status     text default 'received',
  error      text
);

alter table public.contact_messages enable row level security;

-- No client-side inserts; only Edge Function (service role) inserts.
-- (Add admin read policies later if needed.)
