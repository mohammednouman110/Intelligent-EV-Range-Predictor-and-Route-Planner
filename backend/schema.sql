-- =========================================================================
-- EV Range Predictor — Supabase schema
-- Run this in the Supabase SQL editor (https://app.supabase.com → SQL).
-- Idempotent: safe to re-run.
-- =========================================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------
-- drivers: 1:1 with auth.users
-- ------------------------------------------------------------------------
create table if not exists public.drivers (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  name           text not null default '',
  phone_number   text,
  vehicle_number text,
  vehicle_mode   text not null default 'car'
                   check (vehicle_mode in ('scooter','car','truck','bus')),
  language       text not null default 'en-IN',
  battery_percent int not null default 80
                   check (battery_percent between 0 and 100),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists drivers_touch on public.drivers;
create trigger drivers_touch
  before update on public.drivers
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------------
-- route_history: cached plan responses
-- ------------------------------------------------------------------------
create table if not exists public.route_history (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  start           text,
  destination     text,
  vehicle_mode    text,
  battery_percent int,
  response        jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists route_history_user_created
  on public.route_history (user_id, created_at desc);

-- ------------------------------------------------------------------------
-- Row Level Security
-- Each user can only read/write their own rows.
-- ------------------------------------------------------------------------
alter table public.drivers       enable row level security;
alter table public.route_history  enable row level security;

drop policy if exists "drivers: self read"    on public.drivers;
drop policy if exists "drivers: self write"   on public.drivers;
drop policy if exists "history: self read"    on public.route_history;
drop policy if exists "history: self insert"  on public.route_history;

create policy "drivers: self read"  on public.drivers
  for select using (auth.uid() = user_id);
create policy "drivers: self write" on public.drivers
  for all    using (auth.uid() = user_id)
              with check (auth.uid() = user_id);

create policy "history: self read"   on public.route_history
  for select using (auth.uid() = user_id);
create policy "history: self insert" on public.route_history
  for insert with check (auth.uid() = user_id);

-- ------------------------------------------------------------------------
-- Optional: a private storage bucket for vehicle photos / profile avatars.
-- ------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('driver-assets', 'driver-assets', false)
on conflict (id) do nothing;

drop policy if exists "driver-assets: self read"   on storage.objects;
drop policy if exists "driver-assets: self write"  on storage.objects;

create policy "driver-assets: self read"  on storage.objects
  for select using (
    bucket_id = 'driver-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "driver-assets: self write" on storage.objects
  for insert with check (
    bucket_id = 'driver-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
