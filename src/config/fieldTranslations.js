/**
 * ---------------------------------------------------------------------------
 *  CONTENT TRANSLATIONS FOR THE REGISTRATION FORM
 * ---------------------------------------------------------------------------
 *  The visitor-facing form is built from rows in `form_fields` / `form_options`,
 *  so its wording lives in the DATABASE, not in src/i18n/*.js. Those files only
 *  translate the application's own chrome (buttons, section titles, admin UI).
 *
 *  Romanian is the base language: it is what sits in the plain `label`,
 *  `placeholder` and `help_text` columns. Hungarian and English are kept in
 *  `form_fields.config.i18n`, in this shape:
 *
 *      config.i18n = {
 *        hu: { label, placeholder, help_text, options: { <option value>: '…' } },
 *        en: { … }
 *      }
 *
 *  Storing the translations inside the existing `config` JSON column means no
 *  database migration is needed and the public view already exposes them.
 *
 *  This file is the DEFAULT set: it seeds every new event, and supabase/
 *  08_content_i18n.sql applies the same wording to events created earlier.
 *  Anything typed afterwards in Admin -> Formular -> field -> "Traduceri"
 *  wins over what is written here.
 * ---------------------------------------------------------------------------
 */

/** Languages offered next to the Romanian base text. */
export const CONTENT_LANGS = ['hu', 'en']

/* --------------------------------------------------------------- options -- */
/**
 * Option translations, keyed by the STORED value (never by the visible label —
 * the value is what ends up in the database and in the Excel export, so it is
 * the only stable key). Values are shared between fields on purpose:
 * "architect" means the same thing in `visitor_type` and in `how_heard`.
 */
export const OPTION_I18N = {
  /* visitor type */
  architect: { hu: 'Építész', en: 'Architect' },
  designer: { hu: 'Tervező', en: 'Designer / planner' },
  contractor: { hu: 'Kivitelező', en: 'Contractor' },
  installer: { hu: 'Szerelő / kivitelező', en: 'Installer / fitter' },
  distributor: { hu: 'Forgalmazó', en: 'Distributor' },
  investor: { hu: 'Befektető', en: 'Investor' },
  developer: { hu: 'Ingatlanfejlesztő', en: 'Developer' },
  builder: { hu: 'Építőipari vállalkozó', en: 'Builder' },
  roofer: { hu: 'Tetőfedő / bádogos', en: 'Roofer / tinsmith' },
  engineer: { hu: 'Mérnök', en: 'Engineer' },
  student: { hu: 'Diák / hallgató', en: 'Student' },
  public_institution: { hu: 'Közintézmény', en: 'Public institution' },
  private_client: { hu: 'Magánügyfél', en: 'Private client' },
  other: { hu: 'Egyéb', en: 'Other' },

  /* interests */
  aluminium: { hu: 'Alumínium', en: 'Aluminium' },
  copper: { hu: 'Réz', en: 'Copper' },
  titanium_zinc: { hu: 'Titáncink', en: 'Titanium zinc' },
  stainless_steel: { hu: 'Rozsdamentes acél', en: 'Stainless steel' },
  roofing_systems: { hu: 'Tetőrendszerek', en: 'Roofing systems' },
  facade_systems: { hu: 'Homlokzati rendszerek', en: 'Facade systems' },
  rainwater_systems: { hu: 'Csapadékvíz-elvezetés', en: 'Rainwater systems' },
  standing_seam: { hu: 'Állókorcos tetőfedés', en: 'Standing seam roofing' },
  metal_processing: { hu: 'Fémmegmunkálás', en: 'Metal processing' },
  cutting: { hu: 'Darabolás', en: 'Cutting' },
  bending: { hu: 'Hajlítás', en: 'Bending' },
  profiling: { hu: 'Profilozás', en: 'Profiling' },
  roofing_machines: { hu: 'Bádogosgépek', en: 'Roofing machines' },
  professional_tools: { hu: 'Professzionális szerszámok', en: 'Professional tools' },
  technical_consultation: { hu: 'Műszaki tanácsadás', en: 'Technical consultation' },
  custom_fabrication: { hu: 'Egyedi gyártás', en: 'Custom fabrication' },

  /* project type */
  residential: { hu: 'Lakóépület', en: 'Residential' },
  commercial: { hu: 'Kereskedelmi', en: 'Commercial' },
  industrial: { hu: 'Ipari', en: 'Industrial' },
  public_building: { hu: 'Középület', en: 'Public building' },
  restoration: { hu: 'Felújítás / műemlék', en: 'Restoration' },
  roofing: { hu: 'Tető', en: 'Roofing' },
  facade: { hu: 'Homlokzat', en: 'Facade' },
  no_active_project: { hu: 'Nincs aktív projektem', en: 'No active project' },

  /* project stage */
  idea: { hu: 'Ötlet', en: 'Idea' },
  design: { hu: 'Tervezés', en: 'Design' },
  tender: { hu: 'Pályázat / tender', en: 'Tender' },
  procurement: { hu: 'Beszerzés', en: 'Procurement' },
  construction: { hu: 'Kivitelezés', en: 'Construction' },
  renovation: { hu: 'Felújítás', en: 'Renovation' },
  future: { hu: 'Jövőbeli projekt', en: 'Future project' },

  /* timeframe */
  immediately: { hu: 'Azonnal', en: 'Immediately' },
  '0_3_months': { hu: '0–3 hónap', en: '0–3 months' },
  '3_6_months': { hu: '3–6 hónap', en: '3–6 months' },
  '6_12_months': { hu: '6–12 hónap', en: '6–12 months' },
  more_12_months: { hu: 'Több mint 12 hónap', en: 'More than 12 months' },
  not_defined: { hu: 'Nincs meghatározva', en: 'Not defined' },

  /* project size */
  lt_100: { hu: '100 m² alatt', en: 'under 100 m²' },
  '100_500': { hu: '100–500 m²', en: '100–500 m²' },
  '500_1000': { hu: '500–1.000 m²', en: '500–1,000 m²' },
  '1000_5000': { hu: '1.000–5.000 m²', en: '1,000–5,000 m²' },
  gt_5000: { hu: '5.000 m² felett', en: 'over 5,000 m²' },
  unknown: { hu: 'Még nem tudom', en: 'Not sure yet' },

  /* preferred contact */
  phone: { hu: 'Telefon', en: 'Phone' },
  email: { hu: 'E-mail', en: 'E-mail' },
  whatsapp: { hu: 'WhatsApp', en: 'WhatsApp' },

  /* how heard */
  existing_customer: { hu: 'Meglévő ügyfél', en: 'Existing customer' },
  google: { hu: 'Google', en: 'Google' },
  facebook: { hu: 'Facebook', en: 'Facebook' },
  instagram: { hu: 'Instagram', en: 'Instagram' },
  linkedin: { hu: 'LinkedIn', en: 'LinkedIn' },
  event: { hu: 'Rendezvény / kiállítás', en: 'Event / exhibition' },
  recommendation: { hu: 'Ajánlás', en: 'Recommendation' },
  partner: { hu: 'Partner', en: 'Partner' },

  /* company type */
  srl: { hu: 'Kft. (SRL)', en: 'Ltd. (SRL)' },
  sa: { hu: 'Rt. (SA)', en: 'PLC (SA)' },
  pfa: { hu: 'Egyéni vállalkozó (PFA / II)', en: 'Sole trader (PFA / II)' },
  public: { hu: 'Közintézmény', en: 'Public institution' },
  ngo: { hu: 'Civil szervezet', en: 'NGO' },
  private_person: { hu: 'Magánszemély', en: 'Private individual' },

  /* company size */
  '1': { hu: '1 alkalmazott', en: '1 employee' },
  '2_9': { hu: '2–9 alkalmazott', en: '2–9 employees' },
  '10_49': { hu: '10–49 alkalmazott', en: '10–49 employees' },
  '50_249': { hu: '50–249 alkalmazott', en: '50–249 employees' },
  '250_plus': { hu: '250 fölött', en: 'over 250 employees' },

  /* industry */
  architecture: { hu: 'Építészet', en: 'Architecture' },
  hvac: { hu: 'Épületgépészet', en: 'Building services' },
  metal_industry: { hu: 'Fémipar', en: 'Metal industry' },
  trade: { hu: 'Kereskedelem / forgalmazás', en: 'Trade / distribution' },
  real_estate: { hu: 'Ingatlan / fejlesztés', en: 'Real estate / development' },
  public_sector: { hu: 'Közszféra', en: 'Public sector' },
  education: { hu: 'Oktatás', en: 'Education' }
}

/**
 * Romanian counties. In English the Romanian name is the correct name, so only
 * Hungarian is listed — and only for the counties that genuinely have a
 * customary Hungarian name. Anything missing simply falls back to Romanian.
 */
export const COUNTY_I18N_HU = {
  Alba: 'Fehér',
  Arad: 'Arad',
  Bacău: 'Bákó',
  Bihor: 'Bihar',
  'Bistrița-Năsăud': 'Beszterce-Naszód',
  Brașov: 'Brassó',
  București: 'Bukarest',
  'Caraș-Severin': 'Krassó-Szörény',
  Cluj: 'Kolozs',
  Constanța: 'Konstanca',
  Covasna: 'Kovászna',
  Galați: 'Galac',
  Harghita: 'Hargita',
  Hunedoara: 'Hunyad',
  Iași: 'Jászvásár',
  Maramureș: 'Máramaros',
  Mureș: 'Maros',
  'Satu Mare': 'Szatmár',
  Sălaj: 'Szilágy',
  Sibiu: 'Szeben',
  Suceava: 'Szucsáva',
  Timiș: 'Temes',
  Tulcea: 'Tulcsa'
}

/* ---------------------------------------------------------------- fields -- */
/**
 * Field translations, keyed by field_key.
 * `options: true` means "translate this field's options from OPTION_I18N",
 * `options: 'counties'` means "use the county map".
 */
export const FIELD_I18N = {
  first_name: {
    hu: { label: 'Keresztnév', placeholder: 'Pl. András' },
    en: { label: 'First name', placeholder: 'e.g. Andrei' }
  },
  last_name: {
    hu: { label: 'Vezetéknév', placeholder: 'Pl. Kovács' },
    en: { label: 'Last name', placeholder: 'e.g. Popescu' }
  },
  full_name: {
    hu: { label: 'Név', placeholder: 'Pl. Kovács András' },
    en: { label: 'Full name', placeholder: 'e.g. Andrei Popescu' }
  },
  company: {
    hu: { label: 'Cég / Szervezet', placeholder: 'Pl. Építész Stúdió Kft.' },
    en: { label: 'Company / Organisation', placeholder: 'e.g. Architect Studio Ltd.' }
  },
  job_title: {
    hu: { label: 'Beosztás / Pozíció', placeholder: 'Pl. vezető építész' },
    en: { label: 'Job title / Position', placeholder: 'e.g. Lead architect' }
  },
  profession: {
    hu: { label: 'Foglalkozás', placeholder: 'Pl. építész' },
    en: { label: 'Profession', placeholder: 'e.g. Architect' }
  },
  phone: {
    hu: { label: 'Telefon', placeholder: '07xx xxx xxx' },
    en: { label: 'Phone', placeholder: '07xx xxx xxx' }
  },
  email: {
    hu: { label: 'E-mail', placeholder: 'nev@ceg.hu' },
    en: { label: 'E-mail', placeholder: 'name@company.com' }
  },
  country: {
    hu: { label: 'Ország', placeholder: 'Románia' },
    en: { label: 'Country', placeholder: 'Romania' }
  },
  county: {
    hu: { label: 'Megye', placeholder: 'Válasszon megyét' },
    en: { label: 'County', placeholder: 'Select a county' },
    options: 'counties'
  },
  city: {
    hu: { label: 'Település', placeholder: 'Pl. Székelyudvarhely' },
    en: { label: 'City / Town', placeholder: 'e.g. Odorheiu Secuiesc' }
  },
  address: {
    hu: { label: 'Cím', placeholder: 'Utca, házszám' },
    en: { label: 'Address', placeholder: 'Street, number' }
  },
  company_type: {
    hu: { label: 'Szervezet típusa', placeholder: 'Válasszon' },
    en: { label: 'Organisation type', placeholder: 'Select' },
    options: true
  },
  company_size: {
    hu: { label: 'Cégméret', placeholder: 'Válasszon' },
    en: { label: 'Company size', placeholder: 'Select' },
    options: true
  },
  website: {
    hu: { label: 'Weboldal', placeholder: 'www.pelda.hu' },
    en: { label: 'Website', placeholder: 'www.example.com' }
  },
  vat_id: {
    hu: { label: 'Adószám (CUI / CIF)', placeholder: 'RO12345678' },
    en: { label: 'VAT number (CUI / CIF)', placeholder: 'RO12345678' }
  },
  industry: {
    hu: { label: 'Tevékenységi terület', placeholder: 'Válasszon' },
    en: { label: 'Industry', placeholder: 'Select' },
    options: true
  },
  visitor_type: {
    hu: {
      label: 'Az Ön profilja',
      help_text: 'Válassza ki az Önre leginkább jellemző kategóriát.'
    },
    en: {
      label: 'Your profile',
      help_text: 'Choose the category that describes you best.'
    },
    options: true
  },
  interests: {
    hu: { label: 'Mi érdekli Önt?', help_text: 'Több lehetőséget is választhat.' },
    en: { label: 'What are you interested in?', help_text: 'You can choose more than one.' },
    options: true
  },
  project_type: {
    hu: { label: 'Milyen típusú projekten dolgozik jelenleg?', placeholder: 'Válasszon' },
    en: { label: 'What type of project are you working on?', placeholder: 'Select' },
    options: true
  },
  project_stage: {
    hu: { label: 'A projekt fázisa', placeholder: 'Válasszon' },
    en: { label: 'Project stage', placeholder: 'Select' },
    options: true
  },
  project_timeframe: {
    hu: { label: 'A projekt becsült időtávja', placeholder: 'Válasszon' },
    en: { label: 'Estimated project timeframe', placeholder: 'Select' },
    options: true
  },
  project_size: {
    hu: { label: 'A projekt hozzávetőleges mérete', placeholder: 'Válasszon' },
    en: { label: 'Approximate project size', placeholder: 'Select' },
    options: true
  },
  contact_request: {
    hu: { label: 'Szeretné, hogy a Color Metal munkatársa felvegye Önnel a kapcsolatot?' },
    en: { label: 'Would you like a Color Metal representative to contact you?' }
  },
  preferred_contact: {
    hu: { label: 'Preferált kapcsolatfelvételi mód' },
    en: { label: 'Preferred way of contact' },
    options: true
  },
  how_heard: {
    hu: { label: 'Honnan hallott a Color Metalról?', placeholder: 'Válasszon' },
    en: { label: 'How did you hear about Color Metal?', placeholder: 'Select' },
    options: true
  },
  visitor_notes: {
    hu: { label: 'Megjegyzés', placeholder: 'Írja ide, ha konkrét kérése van…' },
    en: { label: 'Notes', placeholder: 'Write here if you have a specific request…' }
  },
  additional_info: {
    hu: { label: 'További információk' },
    en: { label: 'Additional information' }
  }
}

/**
 * Build the `config.i18n` object for one catalog field.
 * @param {string} fieldKey
 * @param {Array}  options  [{ value, label }] as stored for this field
 */
export function buildFieldI18n(fieldKey, options = []) {
  const spec = FIELD_I18N[fieldKey]
  if (!spec) return null

  const out = {}
  CONTENT_LANGS.forEach((lang) => {
    const base = spec[lang]
    if (!base) return
    const entry = { ...base }

    if (spec.options && options.length) {
      const map = {}
      options.forEach((o) => {
        const translated =
          spec.options === 'counties'
            ? lang === 'hu'
              ? COUNTY_I18N_HU[o.value]
              : null
            : OPTION_I18N[o.value]?.[lang]
        if (translated) map[o.value] = translated
      })
      if (Object.keys(map).length) entry.options = map
    }

    out[lang] = entry
  })

  return Object.keys(out).length ? out : null
}

export default FIELD_I18N
