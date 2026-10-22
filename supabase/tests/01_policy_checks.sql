-- DEVELOPER TEST FILE. Do NOT run this in your Supabase project.
-- It is for an empty LOCAL Postgres only: it fakes Supabase's auth and storage
-- schemas so the security rules in ../migrations can be tested offline.
-- Usage: createdb hub; psql -d hub -f 00_mock_supabase.sql; run migrations 0001-0004; psql -d hub -f 01_policy_checks.sql

\set ON_ERROR_STOP 0
\pset tuples_only on
-- ========== PUBLIC (anon) ==========
set role anon; select set_config('request.jwt.claims','{"role":"anon"}',false);
\echo T1 anon quote insert, tries to set status=done + critical + engineer-less
insert into public.requests (id,type,status,urgency,full_name,company,email,phone,state,town,site_type,product_area,water_source,daily_water_need,preferred_timeline,notes)
values ('11111111-1111-4111-8111-111111111111','quote','done','critical','Amaka Eze','Green Acres Farm','Amaka@Example.com','0803 123 4567','Lagos','Epe','farm','solar_pumps','borehole','from_5k_to_20k','within_1_month','Need irrigation');
\echo T2 reference back via id (expect QT-1001)
select public.reference_for_new_request('11111111-1111-4111-8111-111111111111');
\echo T3 anon select requests (expect permission denied)
select count(*) from public.requests;
\echo T4 anon track_request direct (expect permission denied)
select public.track_request('QT-1001','amaka@example.com');
\echo T5 anon invalid phone (expect check violation)
insert into public.requests (type,full_name,email,phone,equipment_or_site,issue_type,description) values ('service','Bad Phone','x@y.com','12345','Pump room','spare_parts','Need a spare impeller');
\echo T6 anon quote missing fields (expect check violation)
insert into public.requests (type,full_name,email,phone) values ('quote','No Fields','x@y.com','08031234567');
\echo T7 anon service insert critical (urgency kept)
insert into public.requests (id,type,urgency,full_name,email,phone,equipment_or_site,issue_type,description)
values ('22222222-2222-4222-8222-222222222222','service','critical','Bola Ade','bola@example.com','+234 802 000 1111','Hotel booster pump','emergency_repair','Booster pump not starting, no water on upper floors');
select public.reference_for_new_request('22222222-2222-4222-8222-222222222222');
\echo T8 photos: 3 ok then 4th rejected; photo on quote rejected
insert into public.request_photos (request_id,storage_path,mime_type,size_bytes) values ('22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222/a.jpg','image/jpeg',1000);
insert into public.request_photos (request_id,storage_path,mime_type,size_bytes) values ('22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222/b.jpg','image/jpeg',1000);
insert into public.request_photos (request_id,storage_path,mime_type,size_bytes) values ('22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222/c.png','image/png',1000);
\echo   4th:
insert into public.request_photos (request_id,storage_path,mime_type,size_bytes) values ('22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222/d.png','image/png',1000);
\echo   on quote:
insert into public.request_photos (request_id,storage_path,mime_type,size_bytes) values ('11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111/a.jpg','image/jpeg',1000);
\echo T9 storage: good path ok, bad paths rejected, 4th rejected
insert into storage.objects (bucket_id,name) values ('request-photos','22222222-2222-4222-8222-222222222222/a.jpg');
\echo   bad ext:
insert into storage.objects (bucket_id,name) values ('request-photos','22222222-2222-4222-8222-222222222222/x.exe');
\echo   traversal:
insert into storage.objects (bucket_id,name) values ('request-photos','22222222-2222-4222-8222-222222222222/../x.jpg');
\echo   quote folder:
insert into storage.objects (bucket_id,name) values ('request-photos','11111111-1111-4111-8111-111111111111/a.jpg');
insert into storage.objects (bucket_id,name) values ('request-photos','22222222-2222-4222-8222-222222222222/b.jpg');
insert into storage.objects (bucket_id,name) values ('request-photos','22222222-2222-4222-8222-222222222222/c.jpg');
\echo   4th:
insert into storage.objects (bucket_id,name) values ('request-photos','22222222-2222-4222-8222-222222222222/d.jpg');
\echo   anon read storage (expect 0 rows):
select count(*) from storage.objects;
reset role;

-- ========== SERVER (service_role) ==========
set role service_role; select set_config('request.jwt.claims','{"role":"service_role"}',false);
\echo T10 track: email different case (match), phone variant (match), wrong contact (null), wrong ref (null)
select public.track_request(' qt-1001 ','AMAKA@example.COM') is not null;
select public.track_request('QT-1001','+2348031234567') is not null;
select public.track_request('QT-1001','someone@else.com') is null;
select public.track_request('QT-9999','amaka@example.com') is null;
\echo   payload has no email/phone keys:
select (public.track_request('QT-1001','08031234567') ?| array['email','phone']) = false;
\echo T11 rate limit 3 per 60s: t,t,t,f
select public.check_rate_limit('ip:abc',3,60); select public.check_rate_limit('ip:abc',3,60);
select public.check_rate_limit('ip:abc',3,60); select public.check_rate_limit('ip:abc',3,60);
reset role;

-- ========== STAFF ==========
insert into auth.users (id,email) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','demo.staff@example.com'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','random@example.com');
insert into public.staff_members (user_id, full_name) select id,'Demo Staff' from auth.users where email='demo.staff@example.com';
\echo T12 non-staff logged-in user sees 0 rows and cannot update
set role authenticated; select set_config('request.jwt.claims','{"role":"authenticated","sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}',false);
select count(*) from public.requests;
select public.staff_update_request('11111111-1111-4111-8111-111111111111','done');
reset role;
\echo T13 staff reads + assigns engineer (expect auto status=assigned)
set role authenticated; select set_config('request.jwt.claims','{"role":"authenticated","sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}',false);
select count(*) from public.requests;
select public.staff_update_request('11111111-1111-4111-8111-111111111111', null, (select id from public.engineers where full_name='Tunde Adebayo'));
select reference, status, urgency from public.requests order by is_open desc, urgency, created_at;
\echo T14 staff schedules with public note + internal note
select public.staff_update_request('11111111-1111-4111-8111-111111111111','scheduled', null, false, 'Site visit on Monday 10am', 'Customer prefers mornings');
\echo T15 staff note only (no status change)
select public.staff_update_request('11111111-1111-4111-8111-111111111111', null, null, false, 'Engineer will bring a flow meter');
\echo T16 done -> done_at set; stats
select public.staff_update_request('11111111-1111-4111-8111-111111111111','done');
select status, done_at is not null from public.requests where reference='QT-1001';
select public.staff_dashboard_stats();
\echo T17 history
select from_status, to_status, changed_by is not null, note from public.status_history h join public.requests r on r.id=h.request_id where r.reference='QT-1001' order by h.id;
\echo T18 notifications
select event, channel, recipient, left(message,140) from public.notifications_log n join public.requests r on r.id=n.request_id where r.reference='QT-1001' order by n.id;
\echo T19 staff cannot change reference
update public.requests set reference='QT-1' where reference='QT-1001'; select reference from public.requests where id='11111111-1111-4111-8111-111111111111';
\echo T20 staff sees photos in storage
select count(*) from storage.objects;
reset role;
\echo T21 server tracking sees timeline + public notes only
set role service_role; select set_config('request.jwt.claims','{"role":"service_role"}',false);
select jsonb_pretty(public.track_request('QT-1001','amaka@example.com'));
