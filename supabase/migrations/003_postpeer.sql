-- Adds PostPeer as a second provider. Run once in the Supabase SQL editor.
alter table public.pages
  add column if not exists provider text not null default 'bundle'
  check (provider in ('bundle', 'postpeer'));
alter table public.pages add column if not exists postpeer_api_key_enc text;

alter table public.connections
  add column if not exists provider text not null default 'bundle'
  check (provider in ('bundle', 'postpeer'));

alter table public.settings add column if not exists postpeer_api_key_enc text;
