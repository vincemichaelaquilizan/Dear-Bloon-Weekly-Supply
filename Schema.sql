-- ─────────────────────────────────────────────
-- Dear Bloom — Supabase Schema + RLS Policies
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────
-- NOTE: These policies require the user to be
-- logged in via Supabase Auth before any data
-- can be read or written.
-- ─────────────────────────────────────────────

-- ── Sessions ──────────────────────────────────
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Unnamed Session',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table sessions enable row level security;

-- Drop old public policies if they exist
drop policy if exists "Public read sessions"   on sessions;
drop policy if exists "Public insert sessions" on sessions;
drop policy if exists "Public update sessions" on sessions;
drop policy if exists "Public delete sessions" on sessions;

-- New auth-gated policies
create policy "Auth read sessions"
  on sessions for select
  using (auth.uid() is not null);

create policy "Auth insert sessions"
  on sessions for insert
  with check (auth.uid() is not null);

create policy "Auth update sessions"
  on sessions for update
  using (auth.uid() is not null);

create policy "Auth delete sessions"
  on sessions for delete
  using (auth.uid() is not null);

-- ── Orders ────────────────────────────────────
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references sessions(id) on delete cascade,
  client_name      text not null default 'Unnamed Client',
  flower_items     jsonb not null default '[]',
  has_card         boolean default null,
  payment_mode     text not null default '',
  delivery_mode    text not null default '',
  client_platform  text not null default '',
  order_notes      text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table orders enable row level security;

drop policy if exists "Public read orders"   on orders;
drop policy if exists "Public insert orders" on orders;
drop policy if exists "Public update orders" on orders;
drop policy if exists "Public delete orders" on orders;

create policy "Auth read orders"
  on orders for select
  using (auth.uid() is not null);

create policy "Auth insert orders"
  on orders for insert
  with check (auth.uid() is not null);

create policy "Auth update orders"
  on orders for update
  using (auth.uid() is not null);

create policy "Auth delete orders"
  on orders for delete
  using (auth.uid() is not null);

-- ── Flowers ───────────────────────────────────
create table if not exists flowers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  emoji       text,
  created_at  timestamptz not null default now()
);

alter table flowers enable row level security;

drop policy if exists "Public read flowers"   on flowers;
drop policy if exists "Public insert flowers" on flowers;
drop policy if exists "Public update flowers" on flowers;
drop policy if exists "Public delete flowers" on flowers;

create policy "Auth read flowers"
  on flowers for select
  using (auth.uid() is not null);

create policy "Auth insert flowers"
  on flowers for insert
  with check (auth.uid() is not null);

create policy "Auth update flowers"
  on flowers for update
  using (auth.uid() is not null);

create policy "Auth delete flowers"
  on flowers for delete
  using (auth.uid() is not null);
