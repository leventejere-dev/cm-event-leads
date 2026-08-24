-- ===========================================================================
--  CM EVENT LEADS · 06 — OPTIONAL SEED DATA
-- ---------------------------------------------------------------------------
--  Completely optional. Run it if you want a few sales representatives ready
--  in the dropdowns. Events and their form fields are created from the Admin
--  UI (Events -> New event), which automatically seeds the standard fields.
-- ===========================================================================

insert into public.sales_reps (name, email, sort_order, is_active) values
  ('Lucian',  null, 10, true),
  ('Oszkár',  null, 20, true),
  ('Lehel',   null, 30, true),
  ('Tamás',   null, 40, true)
on conflict do nothing;

-- Optional: adapt the default GDPR text once, for all future events.
-- update public.app_settings
--    set default_gdpr_text = 'Prin completarea acestui formular …',
--        default_gdpr_version = '2026-02'
--  where id = 1;
