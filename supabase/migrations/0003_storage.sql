-- =====================================================================
-- Rain Bird Service Hub  |  Migration 0003: photo storage
-- Run AFTER 0002. Safe to run more than once.
--
-- Creates a PRIVATE bucket called "request-photos".
--   * Images only (JPEG, PNG, WebP), max 5 MB each. Storage itself
--     rejects anything else, even if someone skips our website.
--   * Files must be saved as  <request id>/<file name>.<jpg|jpeg|png|webp>
--   * The public can upload, max 3 files, only to a service request
--     created in the last 30 minutes. They can never view or list files.
--   * Only staff can view the photos (through short-lived signed links).
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-photos',
  'request-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public             = false,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Checks an upload path like "3f1c...-uuid/9a7b...jpg" before it is accepted.
create or replace function public.can_attach_photo_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_folder text := split_part(coalesce(p_name, ''), '/', 1);
  v_file   text := split_part(coalesce(p_name, ''), '/', 2);
  v_id     uuid;
begin
  -- exactly "<uuid>/<name>.<ext>", nothing deeper
  if p_name is null
     or p_name like '%/%/%'
     or v_folder !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     or v_file !~ '^[A-Za-z0-9_-]{1,80}\.(jpg|jpeg|png|webp)$' then
    return false;
  end if;

  v_id := v_folder::uuid;

  return exists (
      select 1 from public.requests r
      where r.id = v_id
        and r.type = 'service'
        and r.created_at > now() - interval '30 minutes'
    )
    and (
      select count(*) from storage.objects o
      where o.bucket_id = 'request-photos'
        and o.name like v_folder || '/%'
    ) < 3;
end;
$$;

revoke execute on function public.can_attach_photo_path(text) from public;
grant execute on function public.can_attach_photo_path(text) to anon, authenticated, service_role;

drop policy if exists "Public can upload request photos" on storage.objects;
create policy "Public can upload request photos"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'request-photos'
    and public.can_attach_photo_path(name)
  );

drop policy if exists "Staff can view request photos" on storage.objects;
create policy "Staff can view request photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'request-photos'
    and public.is_staff()
  );
