-- ===========================================================================
--  CM EVENT LEADS · 03 — SERVER FUNCTIONS (RPC)
-- ---------------------------------------------------------------------------
--  Run AFTER 02_rls.sql.
--
--  submit_registration() is the ONLY way a visitor's data enters the database.
--  It is SECURITY DEFINER, so the anon key never needs INSERT rights on the
--  registrations table itself.
--  It is IDEMPOTENT: the client generates the registration UUID, so a retry
--  after a lost connection can never create a second copy of the same lead.
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  Human readable lead number:  CM-2026-000123
-- ---------------------------------------------------------------------------
create or replace function public.next_lead_number(p_prefix text default 'CM')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from now())::int;
  v_val  bigint;
begin
  insert into public.lead_counters (year, last_value)
       values (v_year, 1)
  on conflict (year) do update
          set last_value = public.lead_counters.last_value + 1
    returning last_value into v_val;

  return p_prefix || '-' || v_year::text || '-' || lpad(v_val::text, 6, '0');
end;
$$;

revoke all on function public.next_lead_number(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
--  Normalise a phone number to digits only (for duplicate matching)
-- ---------------------------------------------------------------------------
create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g'), '');
$$;

-- ---------------------------------------------------------------------------
--  Duplicate check for the tablet.
--  Returns ONLY a boolean — no personal data is ever exposed to the anon key.
-- ---------------------------------------------------------------------------
create or replace function public.check_duplicate_registration(
  p_event_id uuid,
  p_email    text default null,
  p_phone    text default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone text := public.normalize_phone(p_phone);
  v_found boolean;
begin
  if v_email is null and v_phone is null then
    return false;
  end if;

  select exists (
    select 1
      from public.registrations r
     where r.event_id = p_event_id
       and (
             (v_email is not null and lower(r.email) = v_email)
          or (v_phone is not null and length(v_phone) >= 6
              and right(public.normalize_phone(r.phone), 9) = right(v_phone, 9))
           )
  ) into v_found;

  return coalesce(v_found, false);
end;
$$;

revoke all on function public.check_duplicate_registration(uuid, text, text) from public;
grant execute on function public.check_duplicate_registration(uuid, text, text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
--  SUBMIT REGISTRATION
--  payload = {
--    "id":                "<uuid generated on the client>",
--    "event_id":          "<uuid>",
--    "source":            "kiosk" | "qr",
--    "client_created_at": "2026-08-20T09:14:00.000Z",
--    "profile": { "full_name": "...", "company": "...", "email": "...",
--                 "phone": "...", "county": "...", "city": "...",
--                 "interests": ["aluminium","copper"],
--                 "follow_up_requested": true, ... },
--    "gdpr":    { "accepted": true, "accepted_at": "...",
--                 "text": "…exact wording…", "version": "2026-01" },
--    "signature": { "path": "signatures/…png", "data": "data:image/png;base64,…" },
--    "answers": [ { "field_key": "...", "field_label": "...",
--                   "field_type": "...", "sort_order": 10,
--                   "value_text": "...", "value_number": 12,
--                   "value_bool": true, "value_json": ["a","b"] } ]
--  }
--
--  returns { "id": uuid, "lead_number": "CM-2026-000123", "already_existed": bool }
-- ---------------------------------------------------------------------------
create or replace function public.submit_registration(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id          uuid;
  v_event_id    uuid;
  v_event       public.events%rowtype;
  v_existing    public.registrations%rowtype;
  v_lead_number text;
  v_profile     jsonb := coalesce(payload -> 'profile', '{}'::jsonb);
  v_gdpr        jsonb := coalesce(payload -> 'gdpr', '{}'::jsonb);
  v_sig         jsonb := coalesce(payload -> 'signature', '{}'::jsonb);
  v_answer      jsonb;
  v_interests   text[];
begin
  ------------------------------------------------------------------ validate
  if payload is null then
    raise exception 'EMPTY_PAYLOAD';
  end if;

  v_id := nullif(payload ->> 'id', '')::uuid;
  if v_id is null then
    v_id := gen_random_uuid();
  end if;

  v_event_id := nullif(payload ->> 'event_id', '')::uuid;
  if v_event_id is null then
    raise exception 'EVENT_REQUIRED';
  end if;

  select * into v_event from public.events where id = v_event_id;
  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  if v_event.status <> 'active' then
    raise exception 'EVENT_NOT_ACTIVE';
  end if;

  -------------------------------------------------------------- idempotency
  select * into v_existing from public.registrations where id = v_id;
  if found then
    return jsonb_build_object(
      'id',              v_existing.id,
      'lead_number',     v_existing.lead_number,
      'already_existed', true
    );
  end if;

  ---------------------------------------------------------------- interests
  select coalesce(array_agg(x), '{}')
    into v_interests
    from jsonb_array_elements_text(
           case
             when jsonb_typeof(v_profile -> 'interests') = 'array'
               then v_profile -> 'interests'
             else '[]'::jsonb
           end
         ) as x;

  ------------------------------------------------------------------- insert
  v_lead_number := public.next_lead_number('CM');

  insert into public.registrations (
    id, event_id, lead_number, client_created_at, source,
    full_name, first_name, last_name, company, job_title, profession,
    phone, email, country, county, city, address,
    visitor_type, interests, project_stage, follow_up_requested,
    gdpr_accepted, gdpr_accepted_at, gdpr_text_snapshot, gdpr_version,
    signature_path, signature_data
  ) values (
    v_id,
    v_event_id,
    v_lead_number,
    nullif(payload ->> 'client_created_at', '')::timestamptz,
    coalesce(nullif(payload ->> 'source', ''), 'kiosk'),

    nullif(trim(coalesce(v_profile ->> 'full_name',  '')), ''),
    nullif(trim(coalesce(v_profile ->> 'first_name', '')), ''),
    nullif(trim(coalesce(v_profile ->> 'last_name',  '')), ''),
    nullif(trim(coalesce(v_profile ->> 'company',    '')), ''),
    nullif(trim(coalesce(v_profile ->> 'job_title',  '')), ''),
    nullif(trim(coalesce(v_profile ->> 'profession', '')), ''),
    nullif(trim(coalesce(v_profile ->> 'phone',      '')), ''),
    nullif(lower(trim(coalesce(v_profile ->> 'email', ''))), ''),
    nullif(trim(coalesce(v_profile ->> 'country',    '')), ''),
    nullif(trim(coalesce(v_profile ->> 'county',     '')), ''),
    nullif(trim(coalesce(v_profile ->> 'city',       '')), ''),
    nullif(trim(coalesce(v_profile ->> 'address',    '')), ''),
    nullif(trim(coalesce(v_profile ->> 'visitor_type', '')), ''),
    v_interests,
    nullif(trim(coalesce(v_profile ->> 'project_stage', '')), ''),
    coalesce((v_profile ->> 'follow_up_requested')::boolean, false),

    coalesce((v_gdpr ->> 'accepted')::boolean, false),
    nullif(v_gdpr ->> 'accepted_at', '')::timestamptz,
    nullif(v_gdpr ->> 'text', ''),
    nullif(v_gdpr ->> 'version', ''),

    nullif(v_sig ->> 'path', ''),
    nullif(v_sig ->> 'data', '')
  );

  ------------------------------------------------------------------ answers
  for v_answer in
    select value
      from jsonb_array_elements(
             case
               when jsonb_typeof(payload -> 'answers') = 'array'
                 then payload -> 'answers'
               else '[]'::jsonb
             end
           )
  loop
    if nullif(v_answer ->> 'field_key', '') is null then
      continue;
    end if;

    insert into public.registration_answers (
      registration_id, field_key, field_label, field_type, sort_order,
      value_text, value_number, value_bool, value_json
    ) values (
      v_id,
      v_answer ->> 'field_key',
      v_answer ->> 'field_label',
      v_answer ->> 'field_type',
      coalesce((v_answer ->> 'sort_order')::int, 0),
      nullif(v_answer ->> 'value_text', ''),
      case
        when jsonb_typeof(v_answer -> 'value_number') = 'number'
          then (v_answer ->> 'value_number')::numeric
        else null
      end,
      case
        when jsonb_typeof(v_answer -> 'value_bool') = 'boolean'
          then (v_answer ->> 'value_bool')::boolean
        else null
      end,
      case
        when jsonb_typeof(v_answer -> 'value_json') in ('array', 'object')
          then v_answer -> 'value_json'
        else null
      end
    )
    on conflict (registration_id, field_key) do nothing;
  end loop;

  return jsonb_build_object(
    'id',              v_id,
    'lead_number',     v_lead_number,
    'already_existed', false
  );
end;
$$;

revoke all on function public.submit_registration(jsonb) from public;
grant execute on function public.submit_registration(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
--  DUPLICATE AN EVENT together with its complete form configuration.
--  Leads are NOT copied. Admin only.
-- ---------------------------------------------------------------------------
create or replace function public.duplicate_event(
  p_event_id uuid,
  p_new_name text,
  p_new_slug text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_new_id uuid;
  v_field  record;
  v_new_field_id uuid;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED';
  end if;

  insert into public.events (
    slug, name, location, start_date, end_date, description, status,
    is_active, signature_mode, gdpr_mode, gdpr_text, gdpr_version,
    success_message, success_sub_message, auto_reset_seconds, created_by
  )
  select
    p_new_slug,
    coalesce(nullif(trim(p_new_name), ''), e.name || ' (copie)'),
    e.location, null, null, e.description, 'draft',
    false, e.signature_mode, e.gdpr_mode, e.gdpr_text, e.gdpr_version,
    e.success_message, e.success_sub_message, e.auto_reset_seconds, auth.uid()
  from public.events e
  where e.id = p_event_id
  returning id into v_new_id;

  if v_new_id is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  for v_field in
    select * from public.form_fields where event_id = p_event_id order by sort_order
  loop
    insert into public.form_fields (
      event_id, field_key, section, field_type, label, placeholder, help_text,
      enabled, required, sort_order, is_custom, config
    ) values (
      v_new_id, v_field.field_key, v_field.section, v_field.field_type,
      v_field.label, v_field.placeholder, v_field.help_text,
      v_field.enabled, v_field.required, v_field.sort_order,
      v_field.is_custom, v_field.config
    )
    returning id into v_new_field_id;

    insert into public.form_options (field_id, value, label, sort_order)
    select v_new_field_id, o.value, o.label, o.sort_order
      from public.form_options o
     where o.field_id = v_field.id;
  end loop;

  return v_new_id;
end;
$$;

revoke all on function public.duplicate_event(uuid, text, text) from public, anon;
grant execute on function public.duplicate_event(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
--  DASHBOARD COUNTERS (admin)
-- ---------------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_active_event uuid;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED';
  end if;

  select id into v_active_event from public.events where is_active limit 1;

  select jsonb_build_object(
    'total_leads',     count(*),
    'today_leads',     count(*) filter (where created_at >= date_trunc('day', now())),
    'event_leads',     count(*) filter (where event_id = v_active_event),
    'companies',       count(distinct lower(company)) filter (where company is not null and company <> ''),
    'follow_up',       count(*) filter (where follow_up_requested),
    'new_leads',       count(*) filter (where status = 'new'),
    'contacted_leads', count(*) filter (where status = 'contacted'),
    'qualified_leads', count(*) filter (where status in ('qualified','opportunity','customer')),
    'active_event_id', v_active_event
  )
  into v_result
  from public.registrations;

  return v_result;
end;
$$;

revoke all on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;

-- ---------------------------------------------------------------------------
--  PER-EVENT STATISTICS (admin)
-- ---------------------------------------------------------------------------
create or replace function public.event_stats(p_event_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED';
  end if;

  select jsonb_build_object(
    'registrations',    (select count(*) from public.registrations where event_id = p_event_id),
    'unique_companies', (select count(distinct lower(company)) from public.registrations
                          where event_id = p_event_id and company is not null and company <> ''),
    'follow_up',        (select count(*) from public.registrations
                          where event_id = p_event_id and follow_up_requested),
    'with_signature',   (select count(*) from public.registrations
                          where event_id = p_event_id
                            and (signature_path is not null or signature_data is not null)),
    'visitor_types',    (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                            select visitor_type as key, count(*) as n
                              from public.registrations
                             where event_id = p_event_id and visitor_type is not null
                             group by visitor_type order by n desc limit 12) t),
    'interests',        (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                            select i as key, count(*) as n
                              from public.registrations r, unnest(r.interests) as i
                             where r.event_id = p_event_id
                             group by i order by n desc limit 12) t),
    'counties',         (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                            select county as key, count(*) as n
                              from public.registrations
                             where event_id = p_event_id and county is not null and county <> ''
                             group by county order by n desc limit 12) t),
    'cities',           (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                            select city as key, count(*) as n
                              from public.registrations
                             where event_id = p_event_id and city is not null and city <> ''
                             group by city order by n desc limit 12) t)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.event_stats(uuid) from public, anon;
grant execute on function public.event_stats(uuid) to authenticated;

-- ---------------------------------------------------------------------------
--  Counts of leads per event (for the events list)
-- ---------------------------------------------------------------------------
create or replace function public.event_lead_counts()
returns table (event_id uuid, lead_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select r.event_id, count(*)::bigint
    from public.registrations r
   group by r.event_id;
$$;

revoke all on function public.event_lead_counts() from public, anon;
grant execute on function public.event_lead_counts() to authenticated;

-- ===========================================================================
--  DONE. Next: 04_storage.sql
-- ===========================================================================
