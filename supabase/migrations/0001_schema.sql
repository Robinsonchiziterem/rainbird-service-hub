-- =====================================================================
-- Rain Bird Service Hub  |  Migration 0001: schema
-- Paste into Supabase > SQL Editor > New query, then click "Run".
-- Safe to run more than once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extensions
-- pg_trgm makes "search by name or company" fast, even with typos.
-- ---------------------------------------------------------------------
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- 2. Enums (fixed lists of allowed values)
-- The ORDER of request_urgency matters: sorting ascending gives
-- critical -> high -> normal -> low, which is the dashboard priority.
-- ---------------------------------------------------------------------
do $$ begin
  create type public.request_type as enum ('quote', 'service');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.request_status as enum ('received', 'assigned', 'scheduled', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.request_urgency as enum ('critical', 'high', 'normal', 'low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.site_type as enum (
    'farm', 'factory', 'hotel_real_estate', 'construction', 'government', 'oil_gas', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_area as enum (
    'submersible_pumps', 'centrifugal_pumps', 'chemical_dosing', 'firefighting_systems',
    'water_treatment', 'pressure_booster', 'solar_pumps', 'sanitary_pumps', 'not_sure'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.water_source as enum ('borehole', 'river_well', 'municipal', 'tank', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.water_need_band as enum (
    'under_5k', 'from_5k_to_20k', 'from_20k_to_100k', 'over_100k', 'not_sure'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quote_timeline as enum (
    'asap', 'within_1_month', 'one_to_3_months', 'over_3_months', 'just_exploring'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.issue_type as enum (
    'emergency_repair', 'scheduled_maintenance', 'spare_parts', 'technical_advice'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.note_visibility as enum ('public', 'internal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_channel as enum ('email', 'whatsapp');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_event as enum ('received', 'status_change', 'note_added');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 3. Reference number sequences (QT-1001, SV-1001 ...)
-- ---------------------------------------------------------------------
create sequence if not exists public.quote_ref_seq start with 1001;
create sequence if not exists public.service_ref_seq start with 1001;

-- ---------------------------------------------------------------------
-- 4. Helper functions used by tables and triggers
-- ---------------------------------------------------------------------

-- Turns any Nigerian phone format into one standard form: +234XXXXXXXXXX
-- Accepts: 08031234567, 0803 123 4567, +2348031234567, 2348031234567, 8031234567
-- Returns null if the number is not a valid Nigerian number.
create or replace function public.normalize_ng_phone(p_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  d text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if d ~ '^234[1-9][0-9]{9}$' then
    return '+' || d;
  elsif d ~ '^0[1-9][0-9]{9}$' then
    return '+234' || substr(d, 2);
  elsif d ~ '^[1-9][0-9]{9}$' then
    return '+234' || d;
  end if;
  return null;
end;
$$;

-- Generates the next reference number for a request type.
create or replace function public.next_reference(p_type public.request_type)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_type = 'quote' then
    return 'QT-' || nextval('public.quote_ref_seq')::text;
  end if;
  return 'SV-' || nextval('public.service_ref_seq')::text;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Tables
-- ---------------------------------------------------------------------

-- Engineers who can be assigned to requests (4 demo engineers seeded in 0004).
create table if not exists public.engineers (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null check (char_length(full_name) between 2 and 100),
  specialty   text not null check (char_length(specialty) between 2 and 100),
  phone       text not null check (char_length(phone) <= 20),
  email       text not null check (char_length(email) <= 254),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint engineers_full_name_key unique (full_name)
);

-- Which logged-in users count as staff. Being logged in is not enough:
-- a user must ALSO have a row here to see or change anything.
create table if not exists public.staff_members (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 2 and 100),
  created_at  timestamptz not null default now()
);

-- Every quote and service request lives in this one table.
create table if not exists public.requests (
  id                    uuid primary key default gen_random_uuid(),
  reference             text not null unique,
  type                  public.request_type not null,
  status                public.request_status not null default 'received',
  urgency               public.request_urgency not null default 'normal',

  -- contact details (both types)
  full_name             text not null check (char_length(full_name) between 2 and 100),
  company               text check (company is null or char_length(company) <= 150),
  email                 text not null check (
                          char_length(email) <= 254
                          and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
                        ),
  phone                 text not null check (char_length(phone) <= 25),
  email_normalized      text generated always as (lower(btrim(email))) stored,
  phone_normalized      text generated always as (public.normalize_ng_phone(phone)) stored,

  -- location (required for quotes, optional for service)
  state                 text check (state is null or char_length(state) between 2 and 60),
  town                  text check (town is null or char_length(town) between 2 and 80),

  -- quote-only fields
  site_type             public.site_type,
  product_area          public.product_area,
  water_source          public.water_source,
  daily_water_need      public.water_need_band,
  preferred_timeline    public.quote_timeline,
  notes                 text check (notes is null or char_length(notes) <= 2000),

  -- service-only fields
  equipment_or_site     text check (equipment_or_site is null or char_length(equipment_or_site) between 2 and 200),
  issue_type            public.issue_type,
  description           text check (description is null or char_length(description) between 10 and 2000),

  -- staff-managed fields
  assigned_engineer_id  uuid references public.engineers (id) on delete set null,
  done_at               timestamptz,
  is_open               boolean generated always as (status <> 'done') stored,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint requests_phone_valid check (phone_normalized is not null),

  constraint requests_reference_format check (
    (type = 'quote'   and reference ~ '^QT-[0-9]+$') or
    (type = 'service' and reference ~ '^SV-[0-9]+$')
  ),

  -- Each type must have its own fields, and must not carry the other type's fields.
  constraint requests_fields_match_type check (
    (
      type = 'quote'
      and site_type is not null and product_area is not null and water_source is not null
      and daily_water_need is not null and preferred_timeline is not null
      and state is not null and town is not null
      and issue_type is null and description is null and equipment_or_site is null
    )
    or
    (
      type = 'service'
      and issue_type is not null and description is not null and equipment_or_site is not null
      and site_type is null and product_area is null and water_source is null
      and daily_water_need is null and preferred_timeline is null
    )
  )
);

-- Photo metadata. The image files themselves live in Supabase Storage.
create table if not exists public.request_photos (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.requests (id) on delete cascade,
  storage_path  text not null unique,
  mime_type     text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes    integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  created_at    timestamptz not null default now(),
  constraint request_photos_path_in_request_folder
    check (storage_path like request_id::text || '/%')
);

-- One row for every status the request has ever had, with a timestamp.
create table if not exists public.status_history (
  id           bigint generated always as identity primary key,
  request_id   uuid not null references public.requests (id) on delete cascade,
  from_status  public.request_status,
  to_status    public.request_status not null,
  changed_by   uuid references auth.users (id) on delete set null,
  note         text check (note is null or char_length(note) <= 2000),
  changed_at   timestamptz not null default now()
);

-- Notes written by staff. "public" notes show on the customer tracker,
-- "internal" notes are only ever visible to staff.
create table if not exists public.request_notes (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests (id) on delete cascade,
  visibility  public.note_visibility not null,
  body        text not null check (char_length(body) between 1 and 2000),
  author_id   uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Messages that WOULD be sent by email or WhatsApp. Nothing is really sent.
create table if not exists public.notifications_log (
  id                 bigint generated always as identity primary key,
  request_id         uuid not null references public.requests (id) on delete cascade,
  status_history_id  bigint references public.status_history (id) on delete set null,
  event              public.notification_event not null,
  channel            public.notification_channel not null,
  recipient          text not null,
  subject            text,
  message            text not null,
  delivery_status    text not null default 'simulated' check (delivery_status = 'simulated'),
  created_at         timestamptz not null default now()
);

-- Counters for rate limiting the public endpoints. Keys are hashed, so no
-- raw IP addresses are stored.
create table if not exists public.rate_limits (
  key           text not null check (char_length(key) <= 200),
  window_start  timestamptz not null,
  hits          integer not null default 1,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------
-- 6. Indexes for the staff dashboard
-- ---------------------------------------------------------------------
-- Default dashboard order: open first, then critical -> low, then oldest first.
create index if not exists requests_priority_idx
  on public.requests (is_open desc, urgency asc, created_at asc);
create index if not exists requests_type_idx      on public.requests (type);
create index if not exists requests_status_idx    on public.requests (status);
create index if not exists requests_urgency_idx   on public.requests (urgency);
create index if not exists requests_engineer_idx  on public.requests (assigned_engineer_id);
create index if not exists requests_done_at_idx   on public.requests (done_at) where done_at is not null;
-- Fuzzy search on name and company.
create index if not exists requests_full_name_trgm_idx
  on public.requests using gin (full_name extensions.gin_trgm_ops);
create index if not exists requests_company_trgm_idx
  on public.requests using gin (company extensions.gin_trgm_ops);
-- Tracking lookups.
create index if not exists requests_email_norm_idx on public.requests (email_normalized);
create index if not exists requests_phone_norm_idx on public.requests (phone_normalized);

create index if not exists request_photos_request_idx    on public.request_photos (request_id);
create index if not exists status_history_request_idx    on public.status_history (request_id, changed_at);
create index if not exists request_notes_request_idx     on public.request_notes (request_id, created_at);
create index if not exists notifications_log_request_idx on public.notifications_log (request_id, created_at);
create index if not exists rate_limits_window_idx        on public.rate_limits (window_start);

-- ---------------------------------------------------------------------
-- 7. Simulated notifications
-- Builds the email and WhatsApp messages that WOULD be sent, and logs them.
-- ---------------------------------------------------------------------
create or replace function public.queue_simulated_notifications(
  p_request_id uuid,
  p_event public.notification_event,
  p_status_history_id bigint,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r          public.requests;
  v_first    text;
  v_kind     text;
  v_engineer text;
  v_core     text;
  v_note     text := nullif(btrim(coalesce(p_note, '')), '');
  v_subject  text;
begin
  select * into r from public.requests where id = p_request_id;
  if not found then
    return;
  end if;

  v_first := split_part(btrim(r.full_name), ' ', 1);
  v_kind  := case r.type when 'quote' then 'quote request' else 'service request' end;
  select e.full_name into v_engineer from public.engineers e where e.id = r.assigned_engineer_id;

  if p_event = 'note_added' then
    v_core := format('there is a new update on your %s %s.', v_kind, r.reference);
  else
    v_core := case r.status
      when 'received' then format(
        'we have received your %s %s. Our team will review it shortly.', v_kind, r.reference)
      when 'assigned' then format(
        'your %s %s has been assigned to %s from our engineering team. They will contact you to arrange next steps.',
        v_kind, r.reference, coalesce(v_engineer, 'an engineer'))
      when 'scheduled' then format(
        'the work for your %s %s has been scheduled. %s will confirm the date and time with you.',
        v_kind, r.reference, coalesce(v_engineer, 'Our engineer'))
      when 'done' then format(
        'your %s %s has been marked as completed. Thank you for working with us.', v_kind, r.reference)
    end;
  end if;

  if v_note is not null then
    v_core := v_core || ' Note from our team: ' || v_note
              || case when v_note ~ '[.!?]$' then '' else '.' end;
  end if;

  v_subject := format('Update on your request %s', r.reference);

  insert into public.notifications_log
    (request_id, status_history_id, event, channel, recipient, subject, message)
  values
    (r.id, p_status_history_id, p_event, 'email', r.email, v_subject,
     format('Hi %s, %s You can track this request any time with your reference number and email or phone. - Rain Bird Service Hub',
            v_first, v_core)),
    (r.id, p_status_history_id, p_event, 'whatsapp', r.phone_normalized, null,
     format('Hi %s, %s Track with ref %s. - Rain Bird Service Hub', v_first, v_core, r.reference));
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Triggers
-- ---------------------------------------------------------------------

-- Before a new request is saved: give it a reference number, and make sure
-- the public cannot sneak in a status, engineer or urgency they should not set.
create or replace function public.requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.reference := public.next_reference(new.type);

  -- Anything sent through the public API by a non-staff caller is a public
  -- submission. (auth.role() reads the caller's role from their request;
  -- it is empty when you run SQL yourself in the SQL editor, e.g. seeding.)
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_staff() then
    new.status := 'received';
    new.assigned_engineer_id := null;
    new.done_at := null;
    new.created_at := now();
    new.updated_at := now();
    if new.type = 'quote' then
      new.urgency := 'normal';
    end if;
  end if;

  if new.status = 'done' and new.done_at is null then
    new.done_at := new.updated_at;
  end if;
  return new;
end;
$$;

-- After a new request is saved: first history row + "we received it" message.
create or replace function public.requests_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_history_id bigint;
begin
  insert into public.status_history (request_id, from_status, to_status, changed_by, changed_at)
  values (new.id, null, 'received', null, new.created_at)
  returning id into v_history_id;

  perform public.queue_simulated_notifications(new.id, 'received', v_history_id, null);
  return new;
end;
$$;

-- Before an update: keep updated_at and done_at accurate.
create or replace function public.requests_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'done' and old.status <> 'done' then
    new.done_at := now();
  elsif new.status <> 'done' then
    new.done_at := null;
  end if;
  -- reference and type never change after creation
  new.reference := old.reference;
  new.type := old.type;
  new.created_at := old.created_at;
  return new;
end;
$$;

-- After a status change: record it in history and log the simulated messages.
-- A public note passed in by staff_update_request() is picked up from a
-- transaction-local setting so it lands on the same history row.
create or replace function public.requests_after_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := nullif(current_setting('app.status_note', true), '');
  v_history_id bigint;
begin
  insert into public.status_history (request_id, from_status, to_status, changed_by, note)
  values (new.id, old.status, new.status, auth.uid(), v_note)
  returning id into v_history_id;

  perform public.queue_simulated_notifications(new.id, 'status_change', v_history_id, v_note);
  return new;
end;
$$;

-- is_staff() is defined here (before the triggers that call it) and used by
-- the security rules in migration 0002.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_members s where s.user_id = auth.uid()
  );
$$;

drop trigger if exists requests_before_insert on public.requests;
create trigger requests_before_insert
  before insert on public.requests
  for each row execute function public.requests_before_insert();

drop trigger if exists requests_after_insert on public.requests;
create trigger requests_after_insert
  after insert on public.requests
  for each row execute function public.requests_after_insert();

drop trigger if exists requests_before_update on public.requests;
create trigger requests_before_update
  before update on public.requests
  for each row execute function public.requests_before_update();

drop trigger if exists requests_after_status_change on public.requests;
create trigger requests_after_status_change
  after update of status on public.requests
  for each row
  when (old.status is distinct from new.status)
  execute function public.requests_after_status_change();
