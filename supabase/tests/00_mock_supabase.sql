-- DEVELOPER TEST FILE. Do NOT run this in your Supabase project.
-- It is for an empty LOCAL Postgres only: it fakes Supabase's auth and storage
-- schemas so the security rules in ../migrations can be tested offline.
-- Usage: createdb hub; psql -d hub -f 00_mock_supabase.sql; run migrations 0001-0004; psql -d hub -f 01_policy_checks.sql

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $f$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid $f$;
create function auth.role() returns text language sql stable as $f$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'role','') $f$;
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
grant all on storage.objects to anon, authenticated, service_role;
