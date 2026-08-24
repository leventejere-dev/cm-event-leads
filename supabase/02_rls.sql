-- ===========================================================================
--  CM EVENT LEADS · 02 — ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
--  Run this AFTER 01_schema.sql.
--
--  SECURITY MODEL
--  --------------
--  PUBLIC (anon key, the tablet / QR visitor) can:
--      * read the ACTIVE event and its enabled form fields  (via public_* views)
--      * read the branding settings                          (via public_settings)
--      * submit a registration                               (via RPC only)
--      * ask whether a contact looks like a duplicate        (via RPC, returns
--        only true/false — no personal data ever leaves the server)
--  PUBLIC can NOT:
--      * list, read, search, update or delete any registration
--      * read internal notes, statuses, assignments, other events
--      * read the events table directly (internal description stays hidden)
--
--  ADMIN (authenticated + a row in admin_profiles with is_active = true) can:
--      * everything on events / form_fields / form_options / registrations /
--        registration_answers / sales_reps / app_settings
--
--  The service_role key is NEVER used by the front-end.
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  Helper: is the current user an active admin?
--  SECURITY DEFINER so it can read admin_profiles without recursing into RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.admin_profiles p
     where p.id = auth.uid()
       and p.is_active
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
--  Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.app_settings          enable row level security;
alter table public.admin_profiles        enable row level security;
alter table public.sales_reps            enable row level security;
alter table public.events                enable row level security;
alter table public.form_fields           enable row level security;
alter table public.form_options          enable row level security;
alter table public.registrations         enable row level security;
alter table public.registration_answers  enable row level security;
alter table public.lead_counters         enable row level security;

-- ---------------------------------------------------------------------------
--  Drop old policies (so the file can be re-run)
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('app_settings','admin_profiles','sales_reps','events',
                         'form_fields','form_options','registrations',
                         'registration_answers','lead_counters')
  loop
    execute format('drop policy if exists %I on %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
--  APP SETTINGS — admins read/write. Anonymous users get branding through the
--  public_settings view instead.
-- ---------------------------------------------------------------------------
create policy app_settings_admin_all on public.app_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  ADMIN PROFILES — a user may always read their own row (so the app can tell
--  "you are logged in but not an admin"); admins see and manage everyone.
-- ---------------------------------------------------------------------------
create policy admin_profiles_self_select on public.admin_profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy admin_profiles_admin_write on public.admin_profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  SALES REPS — admins only.
-- ---------------------------------------------------------------------------
create policy sales_reps_admin_all on public.sales_reps
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  EVENTS / FORM FIELDS / FORM OPTIONS — admins only at table level.
--  The tablet reads them through the public_* views.
-- ---------------------------------------------------------------------------
create policy events_admin_all on public.events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy form_fields_admin_all on public.form_fields
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy form_options_admin_all on public.form_options
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  REGISTRATIONS + ANSWERS — admins only.
--  There is deliberately NO insert policy for anon: the tablet inserts through
--  the submit_registration() SECURITY DEFINER function.
-- ---------------------------------------------------------------------------
create policy registrations_admin_all on public.registrations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy registration_answers_admin_all on public.registration_answers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
--  LEAD COUNTERS — nobody touches this directly; only the SECURITY DEFINER
--  function next_lead_number() writes to it. RLS on + no policy = locked.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
--  TABLE GRANTS
--  Revoke everything from anon, then re-grant only what the tablet needs.
-- ---------------------------------------------------------------------------
revoke all on public.app_settings         from anon;
revoke all on public.admin_profiles       from anon;
revoke all on public.sales_reps           from anon;
revoke all on public.events               from anon;
revoke all on public.form_fields          from anon;
revoke all on public.form_options         from anon;
revoke all on public.registrations        from anon;
revoke all on public.registration_answers from anon;
revoke all on public.lead_counters        from anon, authenticated;

grant select on public.public_events      to anon, authenticated;
grant select on public.public_form_fields to anon, authenticated;
grant select on public.public_form_options to anon, authenticated;
grant select on public.public_settings    to anon, authenticated;

grant select, insert, update, delete on public.app_settings         to authenticated;
grant select, insert, update, delete on public.admin_profiles       to authenticated;
grant select, insert, update, delete on public.sales_reps           to authenticated;
grant select, insert, update, delete on public.events               to authenticated;
grant select, insert, update, delete on public.form_fields          to authenticated;
grant select, insert, update, delete on public.form_options         to authenticated;
grant select, insert, update, delete on public.registrations        to authenticated;
grant select, insert, update, delete on public.registration_answers to authenticated;

-- ===========================================================================
--  DONE. Next: 03_functions.sql
-- ===========================================================================
