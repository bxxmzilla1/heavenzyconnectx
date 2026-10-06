-- Adds a per-page bundle.social API key. Run once in the Supabase SQL editor.
alter table public.pages add column if not exists bundle_api_key_enc text;
