/**
 * ---------------------------------------------------------------------------
 *  FIELD CATALOG
 * ---------------------------------------------------------------------------
 *  The catalog of the "built-in" questions Color Metal can switch on/off for
 *  every event. NOTHING here is hard-coded into the registration form — the
 *  form is always rendered from the rows stored in the `form_fields` table.
 *  This catalog is only used:
 *    1. when a NEW event is created (to seed its form_fields rows),
 *    2. in the form builder, to offer "add a standard field" options.
 *
 *  The administrator can afterwards change label / placeholder / help text /
 *  required / enabled / order / options for every single field, per event,
 *  from the Admin UI — without touching this file.
 *
 *  To add a new *standard* field for future events, add an entry here.
 *  To add a one-off question for a single event, use "Custom field" in the
 *  Admin form builder (no code change needed).
 * ---------------------------------------------------------------------------
 */

/** Field types supported by the renderer (src/components/form/FieldRenderer.jsx) */
export const FIELD_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  EMAIL: 'email',
  PHONE: 'phone',
  CHECKBOX: 'checkbox', // single tick box -> true/false
  BOOLEAN: 'boolean', // Yes / No pair of buttons
  SELECT: 'select', // dropdown, single answer
  RADIO: 'radio', // radio list, single answer
  MULTISELECT: 'multiselect', // check list, many answers
  DATE: 'date',
  URL: 'url'
}

export const FIELD_TYPE_LIST = [
  { value: FIELD_TYPES.TEXT, labelKey: 'fieldType.text' },
  { value: FIELD_TYPES.TEXTAREA, labelKey: 'fieldType.textarea' },
  { value: FIELD_TYPES.NUMBER, labelKey: 'fieldType.number' },
  { value: FIELD_TYPES.EMAIL, labelKey: 'fieldType.email' },
  { value: FIELD_TYPES.PHONE, labelKey: 'fieldType.phone' },
  { value: FIELD_TYPES.CHECKBOX, labelKey: 'fieldType.checkbox' },
  { value: FIELD_TYPES.BOOLEAN, labelKey: 'fieldType.boolean' },
  { value: FIELD_TYPES.SELECT, labelKey: 'fieldType.select' },
  { value: FIELD_TYPES.RADIO, labelKey: 'fieldType.radio' },
  { value: FIELD_TYPES.MULTISELECT, labelKey: 'fieldType.multiselect' },
  { value: FIELD_TYPES.DATE, labelKey: 'fieldType.date' },
  { value: FIELD_TYPES.URL, labelKey: 'fieldType.url' }
]

/** Types that need a list of options */
export const TYPES_WITH_OPTIONS = [
  FIELD_TYPES.SELECT,
  FIELD_TYPES.RADIO,
  FIELD_TYPES.MULTISELECT
]

/**
 * Logical groups. `step` drives the automatic multi-step split on the tablet.
 * The order of this array is the default order of the form.
 */
export const SECTIONS = [
  { key: 'contact', step: 1, titleKey: 'section.contact' },
  { key: 'location', step: 1, titleKey: 'section.location' },
  { key: 'business', step: 2, titleKey: 'section.business' },
  { key: 'profile', step: 2, titleKey: 'section.profile' },
  { key: 'interests', step: 3, titleKey: 'section.interests' },
  { key: 'project', step: 4, titleKey: 'section.project' },
  { key: 'followup', step: 4, titleKey: 'section.followup' },
  { key: 'notes', step: 5, titleKey: 'section.notes' },
  { key: 'custom', step: 5, titleKey: 'section.custom' },
  { key: 'consent', step: 6, titleKey: 'section.consent' }
]

export const SECTION_KEYS = SECTIONS.map((s) => s.key)

/* --------------------------------------------------------------------------
 *  Reusable option sets (Romanian primary, HU / EN in the i18n option maps).
 *  `value` is what is stored in the database and exported — keep it stable!
 * ------------------------------------------------------------------------ */

export const OPTIONS_VISITOR_TYPE = [
  { value: 'architect', label: 'Arhitect' },
  { value: 'designer', label: 'Designer / Proiectant' },
  { value: 'contractor', label: 'Antreprenor' },
  { value: 'installer', label: 'Instalator / Montator' },
  { value: 'distributor', label: 'Distribuitor' },
  { value: 'investor', label: 'Investitor' },
  { value: 'developer', label: 'Dezvoltator' },
  { value: 'builder', label: 'Constructor' },
  { value: 'roofer', label: 'Acoperitor / Tinichigiu' },
  { value: 'engineer', label: 'Inginer' },
  { value: 'student', label: 'Student' },
  { value: 'public_institution', label: 'Instituție publică' },
  { value: 'private_client', label: 'Client privat' },
  { value: 'other', label: 'Altele' }
]

export const OPTIONS_INTERESTS = [
  { value: 'aluminium', label: 'Aluminiu' },
  { value: 'copper', label: 'Cupru' },
  { value: 'titanium_zinc', label: 'Titan-zinc' },
  { value: 'stainless_steel', label: 'Oțel inoxidabil' },
  { value: 'roofing_systems', label: 'Sisteme de acoperiș' },
  { value: 'facade_systems', label: 'Sisteme de fațadă' },
  { value: 'rainwater_systems', label: 'Sisteme pluviale' },
  { value: 'standing_seam', label: 'Acoperiș cu falț' },
  { value: 'metal_processing', label: 'Prelucrare metal' },
  { value: 'cutting', label: 'Debitare' },
  { value: 'bending', label: 'Îndoire' },
  { value: 'profiling', label: 'Profilare' },
  { value: 'roofing_machines', label: 'Mașini pentru tinichigerie' },
  { value: 'professional_tools', label: 'Scule profesionale' },
  { value: 'technical_consultation', label: 'Consultanță tehnică' },
  { value: 'custom_fabrication', label: 'Fabricație la comandă' },
  { value: 'other', label: 'Altele' }
]

export const OPTIONS_PROJECT_TYPE = [
  { value: 'residential', label: 'Rezidențial' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'public_building', label: 'Clădire publică' },
  { value: 'restoration', label: 'Restaurare' },
  { value: 'roofing', label: 'Acoperiș' },
  { value: 'facade', label: 'Fațadă' },
  { value: 'no_active_project', label: 'Nu am proiect activ' },
  { value: 'other', label: 'Altele' }
]

export const OPTIONS_PROJECT_STAGE = [
  { value: 'idea', label: 'Idee' },
  { value: 'design', label: 'Proiectare' },
  { value: 'tender', label: 'Licitație' },
  { value: 'procurement', label: 'Achiziție' },
  { value: 'construction', label: 'Execuție' },
  { value: 'renovation', label: 'Renovare' },
  { value: 'future', label: 'Proiect viitor' }
]

export const OPTIONS_TIMEFRAME = [
  { value: 'immediately', label: 'Imediat' },
  { value: '0_3_months', label: '0–3 luni' },
  { value: '3_6_months', label: '3–6 luni' },
  { value: '6_12_months', label: '6–12 luni' },
  { value: 'more_12_months', label: 'Peste 12 luni' },
  { value: 'not_defined', label: 'Nedefinit' }
]

export const OPTIONS_PROJECT_SIZE = [
  { value: 'lt_100', label: 'sub 100 m²' },
  { value: '100_500', label: '100–500 m²' },
  { value: '500_1000', label: '500–1.000 m²' },
  { value: '1000_5000', label: '1.000–5.000 m²' },
  { value: 'gt_5000', label: 'peste 5.000 m²' },
  { value: 'unknown', label: 'Nu știu încă' }
]

export const OPTIONS_CONTACT_METHOD = [
  { value: 'phone', label: 'Telefon' },
  { value: 'email', label: 'E-mail' },
  { value: 'whatsapp', label: 'WhatsApp' }
]

export const OPTIONS_HOW_HEARD = [
  { value: 'existing_customer', label: 'Client existent' },
  { value: 'architect', label: 'Arhitect' },
  { value: 'installer', label: 'Instalator' },
  { value: 'google', label: 'Google' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'event', label: 'Eveniment' },
  { value: 'recommendation', label: 'Recomandare' },
  { value: 'partner', label: 'Partener' },
  { value: 'other', label: 'Altele' }
]

export const OPTIONS_COMPANY_TYPE = [
  { value: 'srl', label: 'SRL' },
  { value: 'sa', label: 'SA' },
  { value: 'pfa', label: 'PFA / II' },
  { value: 'public', label: 'Instituție publică' },
  { value: 'ngo', label: 'ONG' },
  { value: 'private_person', label: 'Persoană fizică' },
  { value: 'other', label: 'Altele' }
]

export const OPTIONS_COMPANY_SIZE = [
  { value: '1', label: '1 angajat' },
  { value: '2_9', label: '2–9 angajați' },
  { value: '10_49', label: '10–49 angajați' },
  { value: '50_249', label: '50–249 angajați' },
  { value: '250_plus', label: 'peste 250 angajați' }
]

export const OPTIONS_INDUSTRY = [
  { value: 'architecture', label: 'Arhitectură' },
  { value: 'construction', label: 'Construcții' },
  { value: 'roofing', label: 'Acoperișuri / tinichigerie' },
  { value: 'facade', label: 'Fațade' },
  { value: 'hvac', label: 'Instalații' },
  { value: 'metal_industry', label: 'Industria metalurgică' },
  { value: 'trade', label: 'Comerț / distribuție' },
  { value: 'real_estate', label: 'Imobiliare / dezvoltare' },
  { value: 'public_sector', label: 'Sector public' },
  { value: 'education', label: 'Educație' },
  { value: 'other', label: 'Altele' }
]

/** Romanian counties — used by the `county` field when it is a dropdown. */
export const OPTIONS_COUNTIES = [
  'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani',
  'Brașov', 'Brăila', 'București', 'Buzău', 'Caraș-Severin', 'Călărași',
  'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu',
  'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș',
  'Mehedinți', 'Mureș', 'Neamț', 'Olt', 'Prahova', 'Satu Mare', 'Sălaj',
  'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vaslui', 'Vâlcea',
  'Vrancea'
].map((c) => ({ value: c, label: c }))

/* --------------------------------------------------------------------------
 *  THE CATALOG
 *  order  = default sort order (10, 20, 30 ... so custom fields fit between)
 *  enabled/required = defaults for a brand-new event
 * ------------------------------------------------------------------------ */
export const FIELD_CATALOG = [
  /* ------------------------------------------------------------ contact -- */
  {
    field_key: 'first_name',
    section: 'contact',
    field_type: FIELD_TYPES.TEXT,
    label: 'Prenume',
    placeholder: 'Ex. Andrei',
    enabled: false,
    required: false,
    order: 10,
    maps_to: 'first_name'
  },
  {
    field_key: 'last_name',
    section: 'contact',
    field_type: FIELD_TYPES.TEXT,
    label: 'Nume',
    placeholder: 'Ex. Popescu',
    enabled: false,
    required: false,
    order: 20,
    maps_to: 'last_name'
  },
  {
    field_key: 'full_name',
    section: 'contact',
    field_type: FIELD_TYPES.TEXT,
    label: 'Nume și prenume',
    placeholder: 'Ex. Andrei Popescu',
    enabled: true,
    required: true,
    order: 30,
    maps_to: 'full_name'
  },
  {
    field_key: 'company',
    section: 'contact',
    field_type: FIELD_TYPES.TEXT,
    label: 'Firmă / Organizație',
    placeholder: 'Ex. Arhitect Studio SRL',
    enabled: true,
    required: false,
    order: 40,
    maps_to: 'company'
  },
  {
    field_key: 'job_title',
    section: 'contact',
    field_type: FIELD_TYPES.TEXT,
    label: 'Funcție / Poziție',
    placeholder: 'Ex. Arhitect principal',
    enabled: true,
    required: false,
    order: 50,
    maps_to: 'job_title'
  },
  {
    field_key: 'profession',
    section: 'contact',
    field_type: FIELD_TYPES.TEXT,
    label: 'Profesie',
    placeholder: 'Ex. Arhitect',
    enabled: false,
    required: false,
    order: 60,
    maps_to: 'profession'
  },
  {
    field_key: 'phone',
    section: 'contact',
    field_type: FIELD_TYPES.PHONE,
    label: 'Telefon',
    placeholder: '07xx xxx xxx',
    enabled: true,
    required: false,
    order: 70,
    maps_to: 'phone'
  },
  {
    field_key: 'email',
    section: 'contact',
    field_type: FIELD_TYPES.EMAIL,
    label: 'E-mail',
    placeholder: 'nume@firma.ro',
    enabled: true,
    required: false,
    order: 80,
    maps_to: 'email'
  },

  /* ----------------------------------------------------------- location -- */
  {
    field_key: 'country',
    section: 'location',
    field_type: FIELD_TYPES.TEXT,
    label: 'Țara',
    placeholder: 'România',
    enabled: false,
    required: false,
    order: 90,
    maps_to: 'country'
  },
  {
    field_key: 'county',
    section: 'location',
    field_type: FIELD_TYPES.SELECT,
    label: 'Județ',
    placeholder: 'Selectați județul',
    enabled: true,
    required: false,
    order: 100,
    options: OPTIONS_COUNTIES,
    maps_to: 'county'
  },
  {
    field_key: 'city',
    section: 'location',
    field_type: FIELD_TYPES.TEXT,
    label: 'Localitate',
    placeholder: 'Ex. Odorheiu Secuiesc',
    enabled: true,
    required: false,
    order: 110,
    maps_to: 'city'
  },
  {
    field_key: 'address',
    section: 'location',
    field_type: FIELD_TYPES.TEXT,
    label: 'Adresă',
    placeholder: 'Str., nr.',
    enabled: false,
    required: false,
    order: 120,
    maps_to: 'address'
  },

  /* ----------------------------------------------------------- business -- */
  {
    field_key: 'company_type',
    section: 'business',
    field_type: FIELD_TYPES.SELECT,
    label: 'Tip organizație',
    placeholder: 'Selectați',
    enabled: false,
    required: false,
    order: 130,
    options: OPTIONS_COMPANY_TYPE
  },
  {
    field_key: 'company_size',
    section: 'business',
    field_type: FIELD_TYPES.SELECT,
    label: 'Mărimea firmei',
    placeholder: 'Selectați',
    enabled: false,
    required: false,
    order: 140,
    options: OPTIONS_COMPANY_SIZE
  },
  {
    field_key: 'website',
    section: 'business',
    field_type: FIELD_TYPES.URL,
    label: 'Website',
    placeholder: 'www.exemplu.ro',
    enabled: false,
    required: false,
    order: 150
  },
  {
    field_key: 'vat_id',
    section: 'business',
    field_type: FIELD_TYPES.TEXT,
    label: 'CUI / CIF',
    placeholder: 'RO12345678',
    enabled: false,
    required: false,
    order: 160
  },
  {
    field_key: 'industry',
    section: 'business',
    field_type: FIELD_TYPES.SELECT,
    label: 'Domeniu de activitate',
    placeholder: 'Selectați',
    enabled: false,
    required: false,
    order: 170,
    options: OPTIONS_INDUSTRY
  },

  /* ------------------------------------------------------------ profile -- */
  {
    field_key: 'visitor_type',
    section: 'profile',
    field_type: FIELD_TYPES.RADIO,
    label: 'Profilul dumneavoastră',
    help_text: 'Alegeți categoria care vă descrie cel mai bine.',
    enabled: false,
    required: false,
    order: 180,
    options: OPTIONS_VISITOR_TYPE,
    maps_to: 'visitor_type'
  },

  /* ---------------------------------------------------------- interests -- */
  {
    field_key: 'interests',
    section: 'interests',
    field_type: FIELD_TYPES.MULTISELECT,
    label: 'Ce vă interesează?',
    help_text: 'Puteți alege mai multe opțiuni.',
    enabled: false,
    required: false,
    order: 190,
    options: OPTIONS_INTERESTS,
    maps_to: 'interests'
  },

  /* ------------------------------------------------------------ project -- */
  {
    field_key: 'project_type',
    section: 'project',
    field_type: FIELD_TYPES.SELECT,
    label: 'La ce tip de proiect lucrați în prezent?',
    placeholder: 'Selectați',
    enabled: false,
    required: false,
    order: 200,
    options: OPTIONS_PROJECT_TYPE
  },
  {
    field_key: 'project_stage',
    section: 'project',
    field_type: FIELD_TYPES.SELECT,
    label: 'Stadiul proiectului',
    placeholder: 'Selectați',
    enabled: false,
    required: false,
    order: 210,
    options: OPTIONS_PROJECT_STAGE,
    maps_to: 'project_stage'
  },
  {
    field_key: 'project_timeframe',
    section: 'project',
    field_type: FIELD_TYPES.SELECT,
    label: 'Termenul estimat al proiectului',
    placeholder: 'Selectați',
    enabled: false,
    required: false,
    order: 220,
    options: OPTIONS_TIMEFRAME
  },
  {
    field_key: 'project_size',
    section: 'project',
    field_type: FIELD_TYPES.SELECT,
    label: 'Mărimea aproximativă a proiectului',
    placeholder: 'Selectați',
    enabled: false,
    required: false,
    order: 230,
    options: OPTIONS_PROJECT_SIZE
  },

  /* ----------------------------------------------------------- followup -- */
  {
    field_key: 'contact_request',
    section: 'followup',
    field_type: FIELD_TYPES.BOOLEAN,
    label: 'Doriți să fiți contactat de un reprezentant Color Metal?',
    enabled: false,
    required: false,
    order: 240,
    maps_to: 'follow_up_requested'
  },
  {
    field_key: 'preferred_contact',
    section: 'followup',
    field_type: FIELD_TYPES.RADIO,
    label: 'Modalitatea preferată de contact',
    enabled: false,
    required: false,
    order: 250,
    options: OPTIONS_CONTACT_METHOD
  },
  {
    field_key: 'how_heard',
    section: 'followup',
    field_type: FIELD_TYPES.SELECT,
    label: 'De unde ați auzit de Color Metal?',
    placeholder: 'Selectați',
    enabled: false,
    required: false,
    order: 260,
    options: OPTIONS_HOW_HEARD
  },

  /* -------------------------------------------------------------- notes -- */
  {
    field_key: 'visitor_notes',
    section: 'notes',
    field_type: FIELD_TYPES.TEXTAREA,
    label: 'Observații',
    placeholder: 'Scrieți aici dacă aveți o solicitare concretă…',
    enabled: false,
    required: false,
    order: 270
  },
  {
    field_key: 'additional_info',
    section: 'notes',
    field_type: FIELD_TYPES.TEXTAREA,
    label: 'Informații suplimentare',
    enabled: false,
    required: false,
    order: 280
  }
]

/** Quick lookup by key */
export const CATALOG_BY_KEY = FIELD_CATALOG.reduce((acc, f) => {
  acc[f.field_key] = f
  return acc
}, {})

/**
 * Denormalised columns on `registrations` that the database function fills in
 * from the answers. Used by the admin filters, search and export.
 * key = field_key in the form, value = column name on `registrations`.
 */
export const MAPPED_COLUMNS = FIELD_CATALOG.filter((f) => f.maps_to).reduce(
  (acc, f) => {
    acc[f.field_key] = f.maps_to
    return acc
  },
  {}
)

/** Build the rows to insert into form_fields for a brand new event. */
export function buildDefaultFields() {
  return FIELD_CATALOG.map((f) => ({
    field_key: f.field_key,
    section: f.section,
    field_type: f.field_type,
    label: f.label,
    placeholder: f.placeholder || '',
    help_text: f.help_text || '',
    enabled: !!f.enabled,
    required: !!f.required,
    sort_order: f.order,
    is_custom: false,
    options: f.options ? f.options.map((o) => ({ ...o })) : []
  }))
}

export default FIELD_CATALOG
