-- ===========================================================================
--  CM EVENT LEADS · 08 — MULTILINGUAL FORM CONTENT
-- ---------------------------------------------------------------------------
--  Run AFTER 01_schema.sql. Safe to run more than once.
--
--  WHY THIS EXISTS
--  The RO / HU / EN switch on the tablet translates the application itself
--  (buttons, section titles, the admin area) because those words live in
--  src/i18n/*.js. It could NOT translate the registration form, because the
--  form is configured per event and its wording lives in this database:
--  form_fields.label / placeholder / help_text, form_options.label and
--  events.gdpr_text. A Hungarian visitor therefore still saw Romanian labels.
--
--  HOW IT IS SOLVED
--  Romanian stays the base language, in the columns it always used. Hungarian
--  and English sit beside it as JSON:
--
--    form_fields.config -> 'i18n' = {
--      "hu": { "label": "…", "placeholder": "…", "help_text": "…",
--              "options": { "<stored option value>": "…" } },
--      "en": { … }
--    }
--    events.i18n = { "hu": { "gdpr_text": "…" }, "en": { … } }
--
--  Option translations are keyed by the STORED VALUE, never by the visible
--  label, because the value is what lands in the export and in the filters.
--
--  Anything missing falls back to Romanian, so a half-finished translation can
--  never produce an empty label on the tablet.
--
--  form_fields already has a `config` jsonb column that the public view
--  exposes, so only `events` needs a new column.
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  1. Translations for the event-level texts
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists i18n jsonb not null default '{}'::jsonb;

-- The kiosk reads events through this view, so it has to carry i18n too.
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
    e.auto_reset_seconds,
    e.i18n
  from public.events e
  where e.status = 'active';

-- ---------------------------------------------------------------------------
--  2. Hungarian and English GDPR wording for events that still use the
--     standard Romanian consent text. An event whose text was rewritten by
--     hand is left alone — the administrator translates it in
--     Admin -> Formular -> GDPR, where both boxes are now available.
-- ---------------------------------------------------------------------------
update public.events e
   set i18n = coalesce(e.i18n, '{}'::jsonb) || jsonb_build_object(
         'hu', jsonb_build_object('gdpr_text',
           'A jelen űrlap kitöltésével hozzájárulok ahhoz, hogy a Color Metal SRL a megadott adatokat kereskedelmi és szakmai kapcsolattartás céljából kezelje. Az adatokat a hozzájárulásom nélkül harmadik félnek nem adják át. Hozzájárulásomat bármikor visszavonhatom a direct@color-metal.ro címre írva.'),
         'en', jsonb_build_object('gdpr_text',
           'By completing this form I agree that Color Metal SRL may process the data provided for the purpose of commercial and professional communication. The data will not be passed on to third parties without my consent. I may withdraw my consent at any time by writing to direct@color-metal.ro.')
       )
 where e.gdpr_text like 'Prin completarea acestui formular%'
   and not (coalesce(e.i18n, '{}'::jsonb) ? 'hu');

-- ---------------------------------------------------------------------------
--  3. Hungarian and English wording for the standard questions.
--     Generated from src/config/fieldTranslations.js, which is also what
--     seeds every NEW event — so the two stay in step.
--     A field that already carries translations is never overwritten.
-- ---------------------------------------------------------------------------

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Keresztnév","placeholder":"Pl. András"},"en":{"label":"First name","placeholder":"e.g. Andrei"}}'::jsonb)
 where f.field_key = 'first_name'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Vezetéknév","placeholder":"Pl. Kovács"},"en":{"label":"Last name","placeholder":"e.g. Popescu"}}'::jsonb)
 where f.field_key = 'last_name'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Név","placeholder":"Pl. Kovács András"},"en":{"label":"Full name","placeholder":"e.g. Andrei Popescu"}}'::jsonb)
 where f.field_key = 'full_name'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Cég / Szervezet","placeholder":"Pl. Építész Stúdió Kft."},"en":{"label":"Company / Organisation","placeholder":"e.g. Architect Studio Ltd."}}'::jsonb)
 where f.field_key = 'company'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Beosztás / Pozíció","placeholder":"Pl. vezető építész"},"en":{"label":"Job title / Position","placeholder":"e.g. Lead architect"}}'::jsonb)
 where f.field_key = 'job_title'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Foglalkozás","placeholder":"Pl. építész"},"en":{"label":"Profession","placeholder":"e.g. Architect"}}'::jsonb)
 where f.field_key = 'profession'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Telefon","placeholder":"07xx xxx xxx"},"en":{"label":"Phone","placeholder":"07xx xxx xxx"}}'::jsonb)
 where f.field_key = 'phone'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"E-mail","placeholder":"nev@ceg.hu"},"en":{"label":"E-mail","placeholder":"name@company.com"}}'::jsonb)
 where f.field_key = 'email'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Ország","placeholder":"Románia"},"en":{"label":"Country","placeholder":"Romania"}}'::jsonb)
 where f.field_key = 'country'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Megye","placeholder":"Válasszon megyét","options":{"Alba":"Fehér","Arad":"Arad","Bacău":"Bákó","Bihor":"Bihar","Bistrița-Năsăud":"Beszterce-Naszód","Brașov":"Brassó","București":"Bukarest","Caraș-Severin":"Krassó-Szörény","Cluj":"Kolozs","Constanța":"Konstanca","Covasna":"Kovászna","Galați":"Galac","Harghita":"Hargita","Hunedoara":"Hunyad","Iași":"Jászvásár","Maramureș":"Máramaros","Mureș":"Maros","Satu Mare":"Szatmár","Sălaj":"Szilágy","Sibiu":"Szeben","Suceava":"Szucsáva","Timiș":"Temes","Tulcea":"Tulcsa"}},"en":{"label":"County","placeholder":"Select a county"}}'::jsonb)
 where f.field_key = 'county'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Település","placeholder":"Pl. Székelyudvarhely"},"en":{"label":"City / Town","placeholder":"e.g. Odorheiu Secuiesc"}}'::jsonb)
 where f.field_key = 'city'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Cím","placeholder":"Utca, házszám"},"en":{"label":"Address","placeholder":"Street, number"}}'::jsonb)
 where f.field_key = 'address'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Szervezet típusa","placeholder":"Válasszon","options":{"srl":"Kft. (SRL)","sa":"Rt. (SA)","pfa":"Egyéni vállalkozó (PFA / II)","public":"Közintézmény","ngo":"Civil szervezet","private_person":"Magánszemély","other":"Egyéb"}},"en":{"label":"Organisation type","placeholder":"Select","options":{"srl":"Ltd. (SRL)","sa":"PLC (SA)","pfa":"Sole trader (PFA / II)","public":"Public institution","ngo":"NGO","private_person":"Private individual","other":"Other"}}}'::jsonb)
 where f.field_key = 'company_type'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Cégméret","placeholder":"Válasszon","options":{"1":"1 alkalmazott","2_9":"2–9 alkalmazott","10_49":"10–49 alkalmazott","50_249":"50–249 alkalmazott","250_plus":"250 fölött"}},"en":{"label":"Company size","placeholder":"Select","options":{"1":"1 employee","2_9":"2–9 employees","10_49":"10–49 employees","50_249":"50–249 employees","250_plus":"over 250 employees"}}}'::jsonb)
 where f.field_key = 'company_size'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Weboldal","placeholder":"www.pelda.hu"},"en":{"label":"Website","placeholder":"www.example.com"}}'::jsonb)
 where f.field_key = 'website'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Adószám (CUI / CIF)","placeholder":"RO12345678"},"en":{"label":"VAT number (CUI / CIF)","placeholder":"RO12345678"}}'::jsonb)
 where f.field_key = 'vat_id'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Tevékenységi terület","placeholder":"Válasszon","options":{"architecture":"Építészet","construction":"Kivitelezés","roofing":"Tető","facade":"Homlokzat","hvac":"Épületgépészet","metal_industry":"Fémipar","trade":"Kereskedelem / forgalmazás","real_estate":"Ingatlan / fejlesztés","public_sector":"Közszféra","education":"Oktatás","other":"Egyéb"}},"en":{"label":"Industry","placeholder":"Select","options":{"architecture":"Architecture","construction":"Construction","roofing":"Roofing","facade":"Facade","hvac":"Building services","metal_industry":"Metal industry","trade":"Trade / distribution","real_estate":"Real estate / development","public_sector":"Public sector","education":"Education","other":"Other"}}}'::jsonb)
 where f.field_key = 'industry'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Az Ön profilja","help_text":"Válassza ki az Önre leginkább jellemző kategóriát.","options":{"architect":"Építész","designer":"Tervező","contractor":"Kivitelező","installer":"Szerelő / kivitelező","distributor":"Forgalmazó","investor":"Befektető","developer":"Ingatlanfejlesztő","builder":"Építőipari vállalkozó","roofer":"Tetőfedő / bádogos","engineer":"Mérnök","student":"Diák / hallgató","public_institution":"Közintézmény","private_client":"Magánügyfél","other":"Egyéb"}},"en":{"label":"Your profile","help_text":"Choose the category that describes you best.","options":{"architect":"Architect","designer":"Designer / planner","contractor":"Contractor","installer":"Installer / fitter","distributor":"Distributor","investor":"Investor","developer":"Developer","builder":"Builder","roofer":"Roofer / tinsmith","engineer":"Engineer","student":"Student","public_institution":"Public institution","private_client":"Private client","other":"Other"}}}'::jsonb)
 where f.field_key = 'visitor_type'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Mi érdekli Önt?","help_text":"Több lehetőséget is választhat.","options":{"aluminium":"Alumínium","copper":"Réz","titanium_zinc":"Titáncink","stainless_steel":"Rozsdamentes acél","roofing_systems":"Tetőrendszerek","facade_systems":"Homlokzati rendszerek","rainwater_systems":"Csapadékvíz-elvezetés","standing_seam":"Állókorcos tetőfedés","metal_processing":"Fémmegmunkálás","cutting":"Darabolás","bending":"Hajlítás","profiling":"Profilozás","roofing_machines":"Bádogosgépek","professional_tools":"Professzionális szerszámok","technical_consultation":"Műszaki tanácsadás","custom_fabrication":"Egyedi gyártás","other":"Egyéb"}},"en":{"label":"What are you interested in?","help_text":"You can choose more than one.","options":{"aluminium":"Aluminium","copper":"Copper","titanium_zinc":"Titanium zinc","stainless_steel":"Stainless steel","roofing_systems":"Roofing systems","facade_systems":"Facade systems","rainwater_systems":"Rainwater systems","standing_seam":"Standing seam roofing","metal_processing":"Metal processing","cutting":"Cutting","bending":"Bending","profiling":"Profiling","roofing_machines":"Roofing machines","professional_tools":"Professional tools","technical_consultation":"Technical consultation","custom_fabrication":"Custom fabrication","other":"Other"}}}'::jsonb)
 where f.field_key = 'interests'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Milyen típusú projekten dolgozik jelenleg?","placeholder":"Válasszon","options":{"residential":"Lakóépület","commercial":"Kereskedelmi","industrial":"Ipari","public_building":"Középület","restoration":"Felújítás / műemlék","roofing":"Tető","facade":"Homlokzat","no_active_project":"Nincs aktív projektem","other":"Egyéb"}},"en":{"label":"What type of project are you working on?","placeholder":"Select","options":{"residential":"Residential","commercial":"Commercial","industrial":"Industrial","public_building":"Public building","restoration":"Restoration","roofing":"Roofing","facade":"Facade","no_active_project":"No active project","other":"Other"}}}'::jsonb)
 where f.field_key = 'project_type'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"A projekt fázisa","placeholder":"Válasszon","options":{"idea":"Ötlet","design":"Tervezés","tender":"Pályázat / tender","procurement":"Beszerzés","construction":"Kivitelezés","renovation":"Felújítás","future":"Jövőbeli projekt"}},"en":{"label":"Project stage","placeholder":"Select","options":{"idea":"Idea","design":"Design","tender":"Tender","procurement":"Procurement","construction":"Construction","renovation":"Renovation","future":"Future project"}}}'::jsonb)
 where f.field_key = 'project_stage'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"A projekt becsült időtávja","placeholder":"Válasszon","options":{"immediately":"Azonnal","0_3_months":"0–3 hónap","3_6_months":"3–6 hónap","6_12_months":"6–12 hónap","more_12_months":"Több mint 12 hónap","not_defined":"Nincs meghatározva"}},"en":{"label":"Estimated project timeframe","placeholder":"Select","options":{"immediately":"Immediately","0_3_months":"0–3 months","3_6_months":"3–6 months","6_12_months":"6–12 months","more_12_months":"More than 12 months","not_defined":"Not defined"}}}'::jsonb)
 where f.field_key = 'project_timeframe'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"A projekt hozzávetőleges mérete","placeholder":"Válasszon","options":{"lt_100":"100 m² alatt","100_500":"100–500 m²","500_1000":"500–1.000 m²","1000_5000":"1.000–5.000 m²","gt_5000":"5.000 m² felett","unknown":"Még nem tudom"}},"en":{"label":"Approximate project size","placeholder":"Select","options":{"lt_100":"under 100 m²","100_500":"100–500 m²","500_1000":"500–1,000 m²","1000_5000":"1,000–5,000 m²","gt_5000":"over 5,000 m²","unknown":"Not sure yet"}}}'::jsonb)
 where f.field_key = 'project_size'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Szeretné, hogy a Color Metal munkatársa felvegye Önnel a kapcsolatot?"},"en":{"label":"Would you like a Color Metal representative to contact you?"}}'::jsonb)
 where f.field_key = 'contact_request'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Preferált kapcsolatfelvételi mód","options":{"phone":"Telefon","email":"E-mail","whatsapp":"WhatsApp"}},"en":{"label":"Preferred way of contact","options":{"phone":"Phone","email":"E-mail","whatsapp":"WhatsApp"}}}'::jsonb)
 where f.field_key = 'preferred_contact'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Honnan hallott a Color Metalról?","placeholder":"Válasszon","options":{"existing_customer":"Meglévő ügyfél","architect":"Építész","installer":"Szerelő / kivitelező","google":"Google","facebook":"Facebook","instagram":"Instagram","linkedin":"LinkedIn","event":"Rendezvény / kiállítás","recommendation":"Ajánlás","partner":"Partner","other":"Egyéb"}},"en":{"label":"How did you hear about Color Metal?","placeholder":"Select","options":{"existing_customer":"Existing customer","architect":"Architect","installer":"Installer / fitter","google":"Google","facebook":"Facebook","instagram":"Instagram","linkedin":"LinkedIn","event":"Event / exhibition","recommendation":"Recommendation","partner":"Partner","other":"Other"}}}'::jsonb)
 where f.field_key = 'how_heard'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"Megjegyzés","placeholder":"Írja ide, ha konkrét kérése van…"},"en":{"label":"Notes","placeholder":"Write here if you have a specific request…"}}'::jsonb)
 where f.field_key = 'visitor_notes'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

update public.form_fields f
   set config = coalesce(f.config, '{}'::jsonb) || jsonb_build_object('i18n', '{"hu":{"label":"További információk"},"en":{"label":"Additional information"}}'::jsonb)
 where f.field_key = 'additional_info'
   and not (coalesce(f.config, '{}'::jsonb) ? 'i18n');

-- ===========================================================================
--  DONE.
--  Check with:
--    select field_key, config->'i18n'->'hu'->>'label' as hu
--      from public.form_fields order by sort_order;
-- ===========================================================================
