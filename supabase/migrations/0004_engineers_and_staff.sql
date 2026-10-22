-- =====================================================================
-- Rain Bird Service Hub  |  Migration 0004: demo engineers + staff link
-- Run AFTER 0003. Safe to run more than once.
-- All names, phone numbers and emails below are FICTIONAL.
-- =====================================================================

insert into public.engineers (full_name, specialty, phone, email)
values
  ('Tunde Adebayo',   'Pumps and pressure boosters',     '+2348000000101', 'tunde.adebayo@example.com'),
  ('Ngozi Okafor',    'Water treatment and dosing',      '+2348000000102', 'ngozi.okafor@example.com'),
  ('Ibrahim Musa',    'Firefighting systems',            '+2348000000103', 'ibrahim.musa@example.com'),
  ('Funmilayo Bello', 'Solar pumps and field service',   '+2348000000104', 'funmilayo.bello@example.com')
on conflict (full_name) do update
set specialty = excluded.specialty,
    phone     = excluded.phone,
    email     = excluded.email,
    is_active = true;

-- ---------------------------------------------------------------------
-- Link the demo staff login to the staff_members table.
--
-- FIRST create the user in Supabase:
--   Authentication > Users > Add user > Create new user
--   Email:    demo.staff@example.com
--   Password: RainBird-Demo-2026
--   Tick "Auto Confirm User".
-- THEN run this file (or just the statement below).
-- If the user does not exist yet, this inserts nothing and does no harm.
-- ---------------------------------------------------------------------
insert into public.staff_members (user_id, full_name)
select u.id, 'Demo Staff'
from auth.users u
where lower(u.email) = 'demo.staff@example.com'
on conflict (user_id) do nothing;

-- Quick check: should list 4 engineers and 1 staff member.
select 'engineers' as table_name, count(*) as row_count from public.engineers
union all
select 'staff_members', count(*) from public.staff_members;
