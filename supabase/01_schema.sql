-- ===========================================================================
--  CM EVENT LEADS · 01 — DATABASE SCHEMA
--  Color Metal SRL · Supabase / PostgreSQL
-- ---------------------------------------------------------------------------
--  HOW TO RUN
--    Supabase Dashboard -> SQL Editor -> New query -> paste this whole file
--    -> Run.  Then run 02_rls.sql, 03_functions.sql and 04_storage.sql,
--    in that order.
--
--  This script is idempotent: it can be run again safely.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ===========================================================================
--  1. APPLICATION SETTINGS  (single row)
-- ===========================================================================
create table if not exists public.app_settings (
  id                  smallint primary key default 1 check (id = 1),
  company_name        text        not null default 'Color Metal',
  logo_url            text,
  logo_light_url      text,
  favicon_url         text,
  -- Free-form colour overrides for src/config/brand.js, e.g.
  --   {"primaryColor":"#C0A062","accentColor":"#F4B422"}
  colors              jsonb       not null default '{}'::jsonb,
  default_country     text        not null default 'România',
  default_language    text        not null default 'ro',
  default_gdpr_text   text        not null default
    'Prin completarea acestui formular sunt de acord ca Color Metal SRL să prelucreze datele furnizate în scopul comunicării comerciale și profesionale. Datele nu vor fi transmise către terți fără acordul meu. Îmi pot retrage consimțământul oricând scriind la direct@color-metal.ro.',
  default_gdpr_version text       not null default '2026-01',
  success_message     text        not null default 'Înregistrarea a fost salvată cu succes.',
  success_sub_message text        not null default 'Un reprezentant Color Metal vă poate contacta ulterior.',
  auto_reset_seconds  integer     not null default 5 check (auto_reset_seconds between 2 and 60),
  updated_at          timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ===========================================================================
--  2. ADMIN PROFILES
--  A row here = the right to open /admin. Creating an auth user is NOT enough.
-- ===========================================================================
create table if not exists public.admin_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        text        not null default 'admin' check (role in ('admin', 'viewer')),
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.admin_profiles is
  'Whitelist of Supabase Auth users allowed into the admin area.';

-- ===========================================================================
--  3. SALES REPRESENTATIVES
--  Never hard-coded in the front-end — fully managed from Admin -> Sales reps.
-- ===========================================================================
create table if not exists public.sales_reps (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  email       text,
  phone       text,
  is_active   boolean     not null default true,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists sales_reps_active_idx on public.sales_reps (is_active, sort_order);

-- ===========================================================================
--  4. EVENTS
-- ===========================================================================
create table if not exists public.events (
  id                  uuid primary key default gen_random_uuid(),
  slug                text        not null unique,
  name                text        not null,
  location            text,
  start_date          date,
  end_date            date,
  description         text,                              -- internal only
  status              text        not null default 'draft'
                        check (status in ('draft', 'active', 'closed', 'archived')),
  is_active           boolean     not null default false, -- the one shown on the tablet
  signature_mode      text        not null default 'optional'
                        check (signature_mode in ('disabled', 'optional', 'required')),
  gdpr_mode           text        not null default 'required'
                        check (gdpr_mode in ('disabled', 'optional', 'required')),
  gdpr_text           text        not null default '',
  gdpr_version        text        not null default '2026-01',
  success_message     text,
  success_sub_message text,
  auto_reset_seconds  integer,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users (id) on delete set null
);

-- Only ONE event may carry the "active on tablet" flag.
create unique index if not exists events_single_active_idx
  on public.events (is_active) where (is_active);

create index if not exists events_status_idx on public.events (status);
create index if not exists events_slug_idx   on public.events (slug);

-- ===========================================================================
--  5. FORM FIELDS  (the configurable registration form, per event)
-- ===========================================================================
create table if not exists public.form_fields (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid        not null references public.events (id) on delete cascade,
  field_key   text        not null,
  section     text        not null default 'custom',
  field_type  text        not null
                check (field_type in (
                  'text', 'textarea', 'number', 'email', 'phone', 'checkbox',
                  'boolean', 'select', 'radio', 'multiselect', 'date', 'url')),
  label       text        not null,
  placeholder text        not null default '',
  help_text   text        not null default '',
  enabled     boolean     not null default true,
  required    boolean     not null default false,
  sort_order  integer     not null default 0,
  is_custom   boolean     not null default false,
  config      jsonb       not null default '{}'::jsonb,  -- room for future settings
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id, field_key)
);

create index if not exists form_fields_event_idx on public.form_fields (event_id, sort_order);

-- ===========================================================================
--  6. FORM OPTIONS  (choices for select / radio / multiselect fields)
-- ===========================================================================
create table if not exists public.form_options (
  id         uuid primary key default gen_random_uuid(),
  field_id   uuid    not null references public.form_fields (id) on delete cascade,
  value      text    not null,
  label      text    not null,
  sort_order integer not null default 0,
  unique (field_id, value)
);

create index if not exists form_options_field_idx on public.form_options (field_id, sort_order);

-- ===========================================================================
--  7. LEAD NUMBER COUNTER  (human readable CM-2026-000123)
-- ===========================================================================
create table if not exists public.lead_counters (
  year       integer primary key,
  last_value bigint  not null default 0
);

-- ===========================================================================
--  8. REGISTRATIONS  (one row per visitor)
--  `id` is generated on the CLIENT (crypto.randomUUID) so retries and offline
--  re-sends can never create duplicates — see submit_registration().
-- ===========================================================================
create table if not exists public.registrations (
  id                  uuid primary key,
  event_id            uuid        not null references public.events (id) on delete cascade,
  lead_number         text        unique,
  created_at          timestamptz not null default now(),
  client_created_at   timestamptz,                       -- when the visitor pressed Submit
  source              text        not null default 'kiosk'
                        check (source in ('kiosk', 'qr', 'import', 'manual')),

  -- ---- denormalised answers (filled by submit_registration) --------------
  -- These exist ONLY to make search / filter / export fast. The full truth is
  -- always in registration_answers, so new questions never need a migration.
  full_name           text,
  first_name          text,
  last_name           text,
  company             text,
  job_title           text,
  profession          text,
  phone               text,
  email               text,
  country             text,
  county              text,
  city                text,
  address             text,
  visitor_type        text,
  interests           text[]      not null default '{}',
  project_stage       text,
  follow_up_requested boolean     not null default false,

  -- ---- GDPR --------------------------------------------------------------
  gdpr_accepted       boolean     not null default false,
  gdpr_accepted_at    timestamptz,
  gdpr_text_snapshot  text,       -- exact wording the visitor agreed to
  gdpr_version        text,

  -- ---- signature ---------------------------------------------------------
  signature_path      text,       -- object path inside the "signatures" bucket
  signature_data      text,       -- data:image/png;base64,... fallback (offline)

  -- ---- internal sales fields (never visible to the visitor) --------------
  status              text        not null default 'new'
                        check (status in ('new', 'to_contact', 'contacted',
                                          'qualified', 'opportunity',
                                          'customer', 'not_relevant')),
  assigned_to         uuid references public.sales_reps (id) on delete set null,
  internal_notes      text,
  follow_up_date      date,
  contacted_at        timestamptz,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users (id) on delete set null
);

create index if not exists registrations_event_idx   on public.registrations (event_id, created_at desc);
create index if not exists registrations_created_idx on public.registrations (created_at desc);
create index if not exists registrations_status_idx  on public.registrations (status);
create index if not exists registrations_assigned_idx on public.registrations (assigned_to);
create index if not exists registrations_email_idx   on public.registrations (lower(email));
create index if not exists registrations_phone_idx   on public.registrations (phone);
create index if not exists registrations_company_idx on public.registrations (lower(company));
create index if not exists registrations_county_idx  on public.registrations (county);
create index if not exists registrations_city_idx    on public.registrations (city);
create index if not exists registrations_interests_idx on public.registrations using gin (interests);

-- ===========================================================================
--  9. REGISTRATION ANSWERS  (the flexible EAV part — custom questions live
--     here, so a new question NEVER requires a schema change)
-- ===========================================================================
create table if not exists public.registration_answers (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid    not null references public.registrations (id) on delete cascade,
  field_key       text    not null,
  field_label     text,                 -- label as shown at the time of answering
  field_type      text,
  sort_order      integer not null default 0,
  value_text      text,
  value_number    numeric,
  value_bool      boolean,
  value_json      jsonb,                -- arrays for multiselect
  unique (registration_id, field_key)
);

create index if not exists reg_answers_reg_idx on public.registration_answers (registration_id);
create index if not exists reg_answers_key_idx on public.registration_answers (field_key);

-- ===========================================================================
--  10. TRIGGERS
-- ===========================================================================

-- keep updated_at fresh -----------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

drop trigger if exists form_fields_touch on public.form_fields;
create trigger form_fields_touch before update on public.form_fields
  for each row execute function public.touch_updated_at();

drop trigger if exists registrations_touch on public.registrations;
create trigger registrations_touch before update on public.registrations
  for each row execute function public.touch_updated_at();

drop trigger if exists app_settings_touch on public.app_settings;
create trigger app_settings_touch before update on public.app_settings
  for each row execute function public.touch_updated_at();

-- only one active event -----------------------------------------------------
create or replace function public.ensure_single_active_event()
returns trigger
language plpgsql
as $$
begin
  if new.is_active then
    update public.events
       set is_active = false
     where is_active = true
       and id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists events_single_active on public.events;
create trigger events_single_active before insert or update of is_active on public.events
  for each row when (new.is_active) execute function public.ensure_single_active_event();

-- ===========================================================================
--  11. PUBLIC (ANON) VIEWS
--  The tablet must read the ACTIVE event and its form — and nothing else.
--  These views expose only safe columns; the underlying tables stay locked.
--  (Views are owned by the SQL runner, so they are not subject to the
--   underlying tables' RLS — security_invoker stays OFF on purpose.)
-- ===========================================================================
create or replace view public.public_events as
  select
    e.id,
    e.slug,
    e.name,
    e.location,
    e.start_date,
    e.end_date,
    e.status,
    e.is_active,
    e.signature_mode,
    e.gdpr_mode,
    e.gdpr_text,
    e.gdpr_version,
    e.success_message,
    e.success_sub_message,
    e.auto_reset_seconds
  from public.events e
  where e.status = 'active';

create or replace view public.public_form_fields as
  select
    f.id,
    f.event_id,
    f.field_key,
    f.section,
    f.field_type,
    f.label,
    f.placeholder,
    f.help_text,
    f.required,
    f.sort_order,
    f.is_custom,
    f.config
  from public.form_fields f
  join public.events e on e.id = f.event_id
  where f.enabled
    and e.status = 'active';

create or replace view public.public_form_options as
  select
    o.id,
    o.field_id,
    o.value,
    o.label,
    o.sort_order
  from public.form_options o
  join public.form_fields f on f.id = o.field_id
  join public.events e      on e.id = f.event_id
  where f.enabled
    and e.status = 'active';

create or replace view public.public_settings as
  select
    s.company_name,
    s.logo_url,
    s.logo_light_url,
    s.favicon_url,
    s.colors,
    s.default_country,
    s.default_language,
    s.success_message,
    s.success_sub_message,
    s.auto_reset_seconds
  from public.app_settings s
  where s.id = 1;

-- ===========================================================================
--  DONE. Next: 02_rls.sql
-- ===========================================================================
