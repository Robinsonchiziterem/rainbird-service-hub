-- =====================================================================
-- Rain Bird Service Hub  |  Migration 0002: security rules + functions
-- Run AFTER 0001. Safe to run more than once.
--
-- Who can do what:
--   Public (anon)       -> can submit requests and attach photos. Cannot read anything.
--   Logged-in staff     -> can read and update everything.
--   Logged in, not staff-> can read nothing (only their own staff_members row check).
--   Server (service role, used only inside API routes) -> tracking lookups
--                          and rate limiting.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Turn on Row Level Security everywhere
-- ---------------------------------------------------------------------
alter table public.requests          enable row level security;
alter table public.request_photos    enable row level security;
alter table public.status_history    enable row level security;
alter table public.request_notes     enable row level security;
alter table public.notifications_log enable row level security;
alter table public.engineers         enable row level security;
alter table public.staff_members     enable row level security;
alter table public.rate_limits       enable row level security;

-- ---------------------------------------------------------------------
-- 2. Table permissions (the outer gate; policies below are the inner gate)
-- Supabase grants everything by default, so we take it all back first.
-- ---------------------------------------------------------------------
revoke all on public.requests, public.request_photos, public.status_history,
              public.request_notes, public.notifications_log, public.engineers,
              public.staff_members, public.rate_limits
  from anon, authenticated;

-- Public: insert only. No select, so they can never read the table back.
grant insert on public.requests       to anon, authenticated;
grant insert on public.request_photos to anon, authenticated;

-- Staff (checked by policies): read and update.
grant select, update on public.requests          to authenticated;
grant select         on public.request_photos    to authenticated;
grant select         on public.status_history    to authenticated;
grant select, insert on public.request_notes     to authenticated;
grant select         on public.notifications_log to authenticated;
grant select         on public.engineers         to authenticated;
grant select         on public.staff_members     to authenticated;
-- rate_limits: no access at all for anon or authenticated.

-- ---------------------------------------------------------------------
-- 3. Policies
-- ---------------------------------------------------------------------

-- requests -------------------------------------------------------------
drop policy if exists "Public can submit requests" on public.requests;
create policy "Public can submit requests"
  on public.requests for insert
  to anon, authenticated
  with check (
    status = 'received'
    and assigned_engineer_id is null
    and done_at is null
  );

drop policy if exists "Staff can read requests" on public.requests;
create policy "Staff can read requests"
  on public.requests for select
  to authenticated
  using (public.is_staff());

drop policy if exists "Staff can update requests" on public.requests;
create policy "Staff can update requests"
  on public.requests for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- request_photos -------------------------------------------------------
-- Only allowed for a service request created in the last 30 minutes that
-- has fewer than 3 photos. The check runs inside a secure function because
-- the public cannot read the requests table themselves.
create or replace function public.can_attach_photo(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.requests r
    where r.id = p_request_id
      and r.type = 'service'
      and r.created_at > now() - interval '30 minutes'
  )
  and (select count(*) from public.request_photos p where p.request_id = p_request_id) < 3;
$$;

drop policy if exists "Public can attach photos to new service requests" on public.request_photos;
create policy "Public can attach photos to new service requests"
  on public.request_photos for insert
  to anon, authenticated
  with check (public.can_attach_photo(request_id));

drop policy if exists "Staff can read photos" on public.request_photos;
create policy "Staff can read photos"
  on public.request_photos for select
  to authenticated
  using (public.is_staff());

-- status_history (written only by triggers) ----------------------------
drop policy if exists "Staff can read status history" on public.status_history;
create policy "Staff can read status history"
  on public.status_history for select
  to authenticated
  using (public.is_staff());

-- request_notes --------------------------------------------------------
drop policy if exists "Staff can read notes" on public.request_notes;
create policy "Staff can read notes"
  on public.request_notes for select
  to authenticated
  using (public.is_staff());

drop policy if exists "Staff can add notes" on public.request_notes;
create policy "Staff can add notes"
  on public.request_notes for insert
  to authenticated
  with check (public.is_staff() and author_id = auth.uid());

-- notifications_log (written only by triggers) -------------------------
drop policy if exists "Staff can read notification log" on public.notifications_log;
create policy "Staff can read notification log"
  on public.notifications_log for select
  to authenticated
  using (public.is_staff());

-- engineers ------------------------------------------------------------
drop policy if exists "Staff can read engineers" on public.engineers;
create policy "Staff can read engineers"
  on public.engineers for select
  to authenticated
  using (public.is_staff());

-- staff_members --------------------------------------------------------
drop policy if exists "Users can see their own staff record" on public.staff_members;
create policy "Users can see their own staff record"
  on public.staff_members for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- rate_limits: RLS on, no policies = nobody but the server can touch it.

-- ---------------------------------------------------------------------
-- 4. Functions the app calls
-- ---------------------------------------------------------------------

-- 4a. After a public submission, the API route asks for the reference number.
-- It must present the brand-new request's random ID (only the submitter
-- knows it) within 10 minutes of creating it. Returns only the reference.
create or replace function public.reference_for_new_request(p_request_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.reference
  from public.requests r
  where r.id = p_request_id
    and r.created_at > now() - interval '10 minutes';
$$;

-- 4b. Customer tracking. Only the server can call this (see grants below).
-- Returns null when the reference and contact do not BOTH match, so the
-- caller cannot tell whether the reference exists.
-- Never returns the customer's email, phone or internal notes.
create or replace function public.track_request(p_reference text, p_contact text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r       public.requests;
  v_email text := lower(btrim(coalesce(p_contact, '')));
  v_phone text := public.normalize_ng_phone(p_contact);
begin
  if p_reference is null or p_contact is null or btrim(p_contact) = '' then
    return null;
  end if;

  select * into r
  from public.requests q
  where q.reference = upper(btrim(p_reference))
    and (
      q.email_normalized = v_email
      or (v_phone is not null and q.phone_normalized = v_phone)
    );

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'reference',     r.reference,
    'type',          r.type,
    'status',        r.status,
    'submitted_at',  r.created_at,
    'updated_at',    r.updated_at,
    'summary',       case r.type when 'quote' then r.product_area::text else r.issue_type::text end,
    'engineer_first_name', (
      select split_part(e.full_name, ' ', 1)
      from public.engineers e where e.id = r.assigned_engineer_id
    ),
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object('status', h.to_status, 'at', h.changed_at)
                       order by h.changed_at, h.id)
      from public.status_history h where h.request_id = r.id
    ), '[]'::jsonb),
    'public_notes', coalesce((
      select jsonb_agg(jsonb_build_object('body', n.body, 'at', n.created_at)
                       order by n.created_at desc)
      from public.request_notes n
      where n.request_id = r.id and n.visibility = 'public'
    ), '[]'::jsonb)
  );
end;
$$;

-- 4c. Rate limiting. Returns true if the caller is still under the limit.
-- Fixed time windows, e.g. 5 hits per 600 seconds.
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits as rl (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = rl.hits + 1
  returning rl.hits into v_hits;

  -- Tidy up old counters now and then.
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

-- 4d. Staff update: change status, assign/unassign an engineer and add notes,
-- all in one safe step. Assigning an engineer to a "received" request moves
-- it to "assigned" automatically.
create or replace function public.staff_update_request(
  p_request_id     uuid,
  p_status         public.request_status default null,
  p_engineer_id    uuid default null,
  p_clear_engineer boolean default false,
  p_public_note    text default null,
  p_internal_note  text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_req           public.requests;
  v_new_status    public.request_status;
  v_public_note   text := nullif(btrim(coalesce(p_public_note, '')), '');
  v_internal_note text := nullif(btrim(coalesce(p_internal_note, '')), '');
begin
  if not public.is_staff() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  if char_length(coalesce(v_public_note, '')) > 2000
     or char_length(coalesce(v_internal_note, '')) > 2000 then
    raise exception 'Note is too long (max 2000 characters)' using errcode = '22001';
  end if;

  select * into v_req from public.requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  if p_engineer_id is not null and not exists (
    select 1 from public.engineers e where e.id = p_engineer_id and e.is_active
  ) then
    raise exception 'Engineer not found' using errcode = 'P0002';
  end if;

  v_new_status := coalesce(p_status, v_req.status);
  if p_status is null and p_engineer_id is not null and v_req.status = 'received' then
    v_new_status := 'assigned';
  end if;

  -- Hand the public note to the status-change trigger (this transaction only).
  perform set_config('app.status_note', coalesce(v_public_note, ''), true);

  update public.requests
  set status = v_new_status,
      assigned_engineer_id = case
        when p_clear_engineer then null
        else coalesce(p_engineer_id, assigned_engineer_id)
      end
  where id = p_request_id;

  if v_public_note is not null then
    insert into public.request_notes (request_id, visibility, body, author_id)
    values (p_request_id, 'public', v_public_note, auth.uid());

    -- A note with no status change still tells the customer something new.
    if v_new_status = v_req.status then
      perform public.queue_simulated_notifications(p_request_id, 'note_added', null, v_public_note);
    end if;
  end if;

  if v_internal_note is not null then
    insert into public.request_notes (request_id, visibility, body, author_id)
    values (p_request_id, 'internal', v_internal_note, auth.uid());
  end if;

  perform set_config('app.status_note', '', true);
end;
$$;

-- 4e. Dashboard counters (Lagos time for "this week", weeks start Monday).
create or replace function public.staff_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_week_start timestamptz :=
    date_trunc('week', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
begin
  if not public.is_staff() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'open',               (select count(*) from public.requests where status <> 'done'),
    'critical_open',      (select count(*) from public.requests where status <> 'done' and urgency = 'critical'),
    'completed_this_week',(select count(*) from public.requests where done_at >= v_week_start)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Who may call which function
-- Postgres lets everyone run functions by default, so lock them down.
-- ---------------------------------------------------------------------
revoke execute on function public.next_reference(public.request_type)        from public, anon, authenticated;
revoke execute on function public.queue_simulated_notifications(uuid, public.notification_event, bigint, text)
                                                                               from public, anon, authenticated;
revoke execute on function public.requests_before_insert()                     from public, anon, authenticated;
revoke execute on function public.requests_after_insert()                      from public, anon, authenticated;
revoke execute on function public.requests_after_status_change()              from public, anon, authenticated;
revoke execute on function public.track_request(text, text)                    from public, anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer)    from public, anon, authenticated;
revoke execute on function public.staff_update_request(uuid, public.request_status, uuid, boolean, text, text)
                                                                               from public, anon;
revoke execute on function public.staff_dashboard_stats()                      from public, anon;
revoke execute on function public.reference_for_new_request(uuid)             from public;
revoke execute on function public.can_attach_photo(uuid)                       from public;

-- Server-only (called from API routes with the service role key)
grant execute on function public.track_request(text, text)                 to service_role;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- Public submission flow
grant execute on function public.reference_for_new_request(uuid) to anon, authenticated, service_role;
grant execute on function public.can_attach_photo(uuid)          to anon, authenticated, service_role;
grant execute on function public.normalize_ng_phone(text)        to anon, authenticated, service_role;
grant execute on function public.is_staff()                      to anon, authenticated, service_role;

-- Staff (each function also checks is_staff() itself)
grant execute on function public.staff_update_request(uuid, public.request_status, uuid, boolean, text, text)
  to authenticated;
grant execute on function public.staff_dashboard_stats() to authenticated;
