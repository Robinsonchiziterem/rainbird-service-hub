-- =====================================================================
-- Rain Bird Service Hub  |  Demo data (20 fictional requests)
-- Run AFTER migrations 0001 to 0004, in Supabase > SQL Editor.
--
-- EVERYTHING HERE IS MADE UP: names, companies (all marked "Demo"),
-- emails (@example.com) and phone numbers (+234 800 000 0xxx).
--
-- Safe to run again: it first deletes previous demo rows, meaning every
-- request with an @example.com email address. Real submissions using
-- other addresses are never touched.
--
-- Each request is created as "Received" in the past and then walked
-- through its statuses, so status history and simulated messages look
-- exactly as they would in real use, with realistic past dates.
-- =====================================================================

do $$
declare
  rec          jsonb;
  v_id         uuid;
  v_created    timestamptz;
  v_age        interval;
  v_gap        interval;
  v_at         timestamptz;
  v_final      public.request_status;
  v_steps      public.request_status[] := array['assigned', 'scheduled', 'done']::public.request_status[];
  v_step       public.request_status;
  v_step_no    integer;
  v_engineer   uuid;
  v_note       text;
  v_history_id bigint;
  v_last_at    timestamptz;
begin
  delete from public.requests where email_normalized like '%@example.com';

  for rec in
    select value from jsonb_array_elements($json$[
      {"type":"service","urgency":"critical","status":"assigned","hours":3,
       "name":"Chinedu Okeke","company":"Lekki Palms Apartments (Demo)","email":"chinedu.okeke@example.com","phone":"08000000101",
       "state":"Lagos","town":"Lekki Phase 1","equipment":"Pressure booster set, Block C plant room",
       "issue":"emergency_repair","description":"Booster pumps tripped this morning. No water above the 2nd floor in a 40-flat block. Panel shows overload fault.",
       "engineer":"Tunde Adebayo","public_note":"Tunde is on his way with a replacement contactor.","internal_note":"Check if the overload relay was reset by the caretaker."},

      {"type":"service","urgency":"critical","status":"received","hours":1,
       "name":"Hauwa Lawal","company":"Sabon Gari Textile Works (Demo)","email":"hauwa.lawal@example.com","phone":"+2348000000102",
       "state":"Kano","town":"Sabon Gari","equipment":"Diesel fire pump, main warehouse",
       "issue":"emergency_repair","description":"Fire pump will not start on its weekly test. Battery is charged. This is our only fire pump for the warehouse."},

      {"type":"service","urgency":"high","status":"scheduled","hours":30,
       "name":"Emeka Nwosu","company":"Maitama Heights Hotel (Demo)","email":"emeka.nwosu@example.com","phone":"0800 000 0103",
       "state":"FCT (Abuja)","town":"Maitama","equipment":"Swimming pool and guest water treatment plant",
       "issue":"scheduled_maintenance","description":"Water from the treatment plant has turned slightly cloudy. Filter media last changed about 18 months ago.",
       "engineer":"Ngozi Okafor","public_note":"Visit booked for Friday 10am. Ngozi will bring replacement filter media."},

      {"type":"quote","urgency":"normal","status":"received","hours":5,
       "name":"Aisha Bello","company":"Kano Agro Ventures (Demo)","email":"aisha.bello@example.com","phone":"08000000104",
       "state":"Kano","town":"Bichi","site":"farm","product":"solar_pumps","source":"borehole","need":"from_20k_to_100k","timeline":"within_1_month",
       "notes":"Borehole is about 80 m deep. We want to stop running the diesel generator for irrigation."},

      {"type":"quote","urgency":"normal","status":"assigned","hours":50,
       "name":"Olumide Bakare","company":"Ikeja Bottling Co. (Demo)","email":"olumide.bakare@example.com","phone":"+234 800 000 0105",
       "state":"Lagos","town":"Ikeja","site":"factory","product":"water_treatment","source":"borehole","need":"over_100k","timeline":"one_to_3_months",
       "notes":"Need treated water for our bottling line. Iron content is high.","engineer":"Ngozi Okafor"},

      {"type":"service","urgency":"high","status":"done","hours":70,
       "name":"Fatima Abubakar","company":"Wuse Medical Centre (Demo)","email":"fatima.abubakar@example.com","phone":"08000000106",
       "state":"FCT (Abuja)","town":"Wuse II","equipment":"Submersible borehole pump",
       "issue":"emergency_repair","description":"Pump running but very little water coming out. Pressure gauge reading low.",
       "engineer":"Tunde Adebayo","public_note":"Worn impeller replaced and system tested. Flow is back to normal."},

      {"type":"quote","urgency":"high","status":"scheduled","hours":120,
       "name":"Yusuf Garba","company":"Capital Works Department (Demo)","email":"yusuf.garba@example.com","phone":"08000000107",
       "state":"FCT (Abuja)","town":"Central Business District","site":"government","product":"firefighting_systems","source":"municipal","need":"from_20k_to_100k","timeline":"asap",
       "notes":"Fire safety audit requires a new hydrant pump set before the end of the quarter.","engineer":"Ibrahim Musa",
       "public_note":"Site survey booked for Tuesday 9am."},

      {"type":"service","urgency":"normal","status":"received","hours":20,
       "name":"Blessing Eze","company":null,"email":"blessing.eze@example.com","phone":"08000000108",
       "state":"Lagos","town":"Surulere","equipment":"Home water pump",
       "issue":"spare_parts","description":"I need a replacement pressure switch for a 1 HP surface pump. Model plate photo available."},

      {"type":"quote","urgency":"low","status":"done","hours":300,
       "name":"Segun Adeyemi","company":"Epe Fish Farms (Demo)","email":"segun.adeyemi@example.com","phone":"08000000109",
       "state":"Lagos","town":"Epe","site":"farm","product":"centrifugal_pumps","source":"river_well","need":"over_100k","timeline":"over_3_months",
       "notes":"Pumping from a lagoon channel into fish ponds.","engineer":"Funmilayo Bello",
       "public_note":"Quote sent by email. Thank you for your interest."},

      {"type":"service","urgency":"low","status":"scheduled","hours":200,
       "name":"Ngozi Uche","company":"Victoria Island Towers (Demo)","email":"ngozi.uche@example.com","phone":"08000000110",
       "state":"Lagos","town":"Victoria Island","equipment":"Sewage lift station, basement",
       "issue":"scheduled_maintenance","description":"Annual service due for both sanitary pumps in the basement lift station.",
       "engineer":"Tunde Adebayo","public_note":"Annual service booked for next Monday."},

      {"type":"quote","urgency":"normal","status":"received","hours":9,
       "name":"Ibrahim Danjuma","company":"Danjuma Estates (Demo)","email":"ibrahim.danjuma@example.com","phone":"08000000111",
       "state":"FCT (Abuja)","town":"Gwarinpa","site":"hotel_real_estate","product":"pressure_booster","source":"tank","need":"from_5k_to_20k","timeline":"one_to_3_months",
       "notes":"New 12-unit block. Overhead tank pressure is weak on the top floors."},

      {"type":"service","urgency":"high","status":"assigned","hours":15,
       "name":"Kemi Ogunleye","company":"Apapa Logistics Hub (Demo)","email":"kemi.ogunleye@example.com","phone":"08000000112",
       "state":"Lagos","town":"Apapa","equipment":"Chemical dosing pump, cooling tower",
       "issue":"technical_advice","description":"Dosing pump is delivering inconsistent amounts. We need advice on calibration before the inspection next week.",
       "engineer":"Ngozi Okafor","internal_note":"Customer has an inspection deadline. Prioritise a phone call today."},

      {"type":"quote","urgency":"normal","status":"done","hours":400,
       "name":"Musa Aliyu","company":"Kumbotso Rice Mill (Demo)","email":"musa.aliyu@example.com","phone":"08000000113",
       "state":"Kano","town":"Kumbotso","site":"factory","product":"submersible_pumps","source":"borehole","need":"from_20k_to_100k","timeline":"within_1_month",
       "notes":null,"engineer":"Funmilayo Bello","public_note":"Quote accepted. Installation completed."},

      {"type":"service","urgency":"critical","status":"scheduled","hours":8,
       "name":"Tolu Martins","company":"Ajah Shopping Plaza (Demo)","email":"tolu.martins@example.com","phone":"08000000114",
       "state":"Lagos","town":"Ajah","equipment":"Sprinkler jockey pump",
       "issue":"emergency_repair","description":"Jockey pump is cycling on and off every minute. Sprinkler system pressure keeps dropping. Fire officer visit due.",
       "engineer":"Ibrahim Musa","public_note":"Engineer arriving today between 2pm and 4pm."},

      {"type":"quote","urgency":"low","status":"received","hours":60,
       "name":"Grace Okon","company":null,"email":"grace.okon@example.com","phone":"08000000115",
       "state":"Lagos","town":"Ikorodu","site":"other","product":"not_sure","source":"borehole","need":"not_sure","timeline":"just_exploring",
       "notes":"Building a school. Not sure what we need for water supply yet."},

      {"type":"service","urgency":"normal","status":"done","hours":45,
       "name":"Abdullahi Sani","company":"Nassarawa GRA Residents Assoc. (Demo)","email":"abdullahi.sani@example.com","phone":"08000000116",
       "state":"Kano","town":"Nassarawa GRA","equipment":"Estate borehole and overhead tank",
       "issue":"scheduled_maintenance","description":"Quarterly maintenance visit for the estate borehole pump and float switches.",
       "engineer":"Funmilayo Bello","public_note":"Maintenance done. Next visit due in three months."},

      {"type":"quote","urgency":"normal","status":"assigned","hours":26,
       "name":"Chiamaka Obi","company":"Lekki Free Zone Construction (Demo)","email":"chiamaka.obi@example.com","phone":"08000000117",
       "state":"Lagos","town":"Ibeju-Lekki","site":"construction","product":"submersible_pumps","source":"other","need":"over_100k","timeline":"asap",
       "notes":"Dewatering for foundation works. Site floods after heavy rain.","engineer":"Tunde Adebayo"},

      {"type":"service","urgency":"low","status":"received","hours":100,
       "name":"Peter Akpan","company":"Garki Office Park (Demo)","email":"peter.akpan@example.com","phone":"08000000118",
       "state":"FCT (Abuja)","town":"Garki","equipment":"Water treatment plant",
       "issue":"technical_advice","description":"Can you advise on how often the softener resin should be regenerated for our usage level?"},

      {"type":"quote","urgency":"high","status":"received","hours":2,
       "name":"Zainab Umar","company":"Northern Oil Services (Demo)","email":"zainab.umar@example.com","phone":"08000000119",
       "state":"Kano","town":"Kano Municipal","site":"oil_gas","product":"chemical_dosing","source":"tank","need":"from_5k_to_20k","timeline":"within_1_month",
       "notes":"Need a dosing skid for corrosion inhibitor at our depot."},

      {"type":"service","urgency":"normal","status":"assigned","hours":36,
       "name":"Femi Coker","company":"Yaba Tech Hub (Demo)","email":"femi.coker@example.com","phone":"08000000120",
       "state":"Lagos","town":"Yaba","equipment":"Solar borehole pump, rooftop panels",
       "issue":"spare_parts","description":"Solar pump controller display is dead. Need a replacement controller for the same model.",
       "engineer":"Funmilayo Bello"}
    ]$json$::jsonb)
  loop
    v_age     := make_interval(hours => (rec->>'hours')::int);
    v_created := now() - v_age;
    v_final   := (rec->>'status')::public.request_status;
    v_engineer := (select e.id from public.engineers e where e.full_name = rec->>'engineer');
    v_id      := gen_random_uuid();
    v_last_at := v_created;

    insert into public.requests (
      id, type, urgency, full_name, company, email, phone, state, town,
      site_type, product_area, water_source, daily_water_need, preferred_timeline, notes,
      equipment_or_site, issue_type, description, created_at, updated_at
    ) values (
      v_id,
      (rec->>'type')::public.request_type,
      (rec->>'urgency')::public.request_urgency,
      rec->>'name', rec->>'company', rec->>'email', rec->>'phone', rec->>'state', rec->>'town',
      (rec->>'site')::public.site_type,
      (rec->>'product')::public.product_area,
      (rec->>'source')::public.water_source,
      (rec->>'need')::public.water_need_band,
      (rec->>'timeline')::public.quote_timeline,
      rec->>'notes',
      rec->>'equipment',
      (rec->>'issue')::public.issue_type,
      rec->>'description',
      v_created, v_created
    );

    -- The "received" message gets the creation time too.
    update public.notifications_log set created_at = v_created where request_id = v_id;

    -- Walk forward through the statuses, spreading them over the request's age.
    v_step_no := 0;
    v_gap := v_age / (array_position(v_steps, v_final) + 1)::double precision;
    if v_final <> 'received' then
      foreach v_step in array v_steps loop
        v_step_no := v_step_no + 1;
        v_at := v_created + v_gap * v_step_no;

        -- The public note goes on the final step, like a real staff update.
        v_note := case when v_step = v_final then rec->>'public_note' else null end;
        perform set_config('app.status_note', coalesce(v_note, ''), true);

        update public.requests
        set status = v_step,
            assigned_engineer_id = coalesce(assigned_engineer_id, v_engineer)
        where id = v_id;

        select h.id into v_history_id
        from public.status_history h
        where h.request_id = v_id and h.to_status = v_step
        order by h.id desc limit 1;

        update public.status_history set changed_at = v_at where id = v_history_id;
        update public.notifications_log set created_at = v_at where status_history_id = v_history_id;

        if v_note is not null then
          insert into public.request_notes (request_id, visibility, body, created_at)
          values (v_id, 'public', v_note, v_at);
        end if;

        v_last_at := v_at;
        exit when v_step = v_final;
      end loop;
    end if;
    perform set_config('app.status_note', '', true);

    if rec->>'internal_note' is not null then
      insert into public.request_notes (request_id, visibility, body, created_at)
      values (v_id, 'internal', rec->>'internal_note', v_created + v_age / 4);
    end if;

    -- Put the request's own timestamps back to the demo times.
    alter table public.requests disable trigger requests_before_update;
    update public.requests
    set updated_at = v_last_at,
        done_at = case when v_final = 'done' then v_last_at else null end
    where id = v_id;
    alter table public.requests enable trigger requests_before_update;
  end loop;
end;
$$;

-- Quick check: how many demo requests in each status.
select status, count(*) as requests
from public.requests
where email_normalized like '%@example.com'
group by status
order by status;
