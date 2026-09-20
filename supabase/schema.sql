-- Bundle Connect Pages — Supabase schema
-- Run this once in the Supabase SQL editor (Database -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- pages: one row per public connect page (/<slug>)
-- ---------------------------------------------------------------------------
create table if not exists public.pages (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  passcode_hash text,                       -- null = no passcode required
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pages_slug_idx on public.pages (slug);

-- ---------------------------------------------------------------------------
-- connections: one row per "Connect Instagram" attempt on a page.
-- Each attempt creates its own bundle.social team, which is renamed to the
-- Instagram username once the account is connected.
-- ---------------------------------------------------------------------------
create table if not exists public.connections (
  id                 uuid primary key default gen_random_uuid(),
  page_id            uuid not null references public.pages (id) on delete cascade,
  team_id            text not null,
  team_name          text,
  instagram_username text,
  social_account_id  text,
  status             text not null default 'pending'
                     check (status in ('pending', 'needs_channel', 'connected', 'failed')),
  error_code         text,
  channels           jsonb,                 -- candidate Instagram accounts when a channel must be picked
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists connections_page_id_idx on public.connections (page_id);
create index if not exists connections_team_id_idx on public.connections (team_id);

-- ---------------------------------------------------------------------------
-- settings: single-row table (id = 'default') for app-wide configuration.
-- The bundle.social API key is stored AES-256-GCM encrypted by the app.
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id                          text primary key,
  bundle_api_key_enc          text,
  instagram_connection_method text not null default 'INSTAGRAM'
                              check (instagram_connection_method in ('INSTAGRAM', 'FACEBOOK')),
  disable_auto_login          boolean not null default true,
  with_business_scope         boolean not null default false,
  updated_at                  timestamptz not null default now()
);

insert into public.settings (id) values ('default') on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Security: the app talks to Supabase exclusively with the service-role key
-- from the server. Enabling RLS with no policies locks the anon/public key
-- out of every table entirely.
-- ---------------------------------------------------------------------------
alter table public.pages       enable row level security;
alter table public.connections enable row level security;
alter table public.settings    enable row level security;
