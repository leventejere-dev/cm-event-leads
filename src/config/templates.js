/**
 * ---------------------------------------------------------------------------
 *  REGISTRATION FORM TEMPLATES
 * ---------------------------------------------------------------------------
 *  A template is simply a list of field keys that should be ENABLED (and which
 *  of them are REQUIRED) plus the signature / GDPR settings.
 *  Applying a template never deletes custom fields — it only switches the
 *  standard fields on/off and sets the required flags. Everything stays
 *  editable afterwards in the form builder.
 *
 *  Add your own template by copying one of the blocks below.
 * ---------------------------------------------------------------------------
 */

export const FORM_TEMPLATES = [
  {
    key: 'basic_contact',
    name: 'Contact de bază',
    description:
      'Formular scurt: nume, firmă, telefon, e-mail. Ideal pentru înregistrare rapidă la intrare.',
    enabled: ['full_name', 'company', 'phone', 'email'],
    required: ['full_name'],
    signature_mode: 'disabled',
    gdpr_mode: 'required'
  },
  {
    key: 'trade_show',
    name: 'Târg / Expoziție',
    description:
      'Set standard pentru târguri: contact, județ, oraș, profil vizitator, interese, contactare ulterioară.',
    enabled: [
      'full_name',
      'company',
      'job_title',
      'phone',
      'email',
      'county',
      'city',
      'visitor_type',
      'interests',
      'contact_request',
      'how_heard'
    ],
    required: ['full_name', 'phone'],
    signature_mode: 'optional',
    gdpr_mode: 'required'
  },
  {
    key: 'architect_event',
    name: 'Eveniment pentru arhitecți',
    description:
      'Profil profesional detaliat: funcție, județ, oraș, materiale de interes, tip și stadiu proiect, semnătură.',
    enabled: [
      'full_name',
      'company',
      'job_title',
      'email',
      'phone',
      'county',
      'city',
      'visitor_type',
      'interests',
      'project_type',
      'project_stage',
      'project_timeframe',
      'contact_request'
    ],
    required: ['full_name', 'email'],
    signature_mode: 'required',
    gdpr_mode: 'required'
  },
  {
    key: 'installer_event',
    name: 'Eveniment pentru montatori',
    description:
      'Orientat pe execuție: firmă, telefon, județ, interese tehnice, mașini și scule.',
    enabled: [
      'full_name',
      'company',
      'phone',
      'email',
      'county',
      'city',
      'visitor_type',
      'interests',
      'contact_request',
      'preferred_contact'
    ],
    required: ['full_name', 'phone'],
    signature_mode: 'optional',
    gdpr_mode: 'required'
  },
  {
    key: 'open_day',
    name: 'Zi deschisă / Open Day',
    description:
      'Vizitatori mixt: contact minim, profil, interese și observații libere.',
    enabled: [
      'full_name',
      'company',
      'phone',
      'email',
      'city',
      'visitor_type',
      'interests',
      'visitor_notes',
      'contact_request'
    ],
    required: ['full_name'],
    signature_mode: 'disabled',
    gdpr_mode: 'required'
  },
  {
    key: 'full_qualification',
    name: 'Calificare completă (vânzări)',
    description:
      'Toate întrebările de calificare pornite. De folosit doar când aveți timp cu vizitatorul.',
    enabled: [
      'full_name',
      'company',
      'job_title',
      'profession',
      'phone',
      'email',
      'country',
      'county',
      'city',
      'company_type',
      'company_size',
      'website',
      'industry',
      'visitor_type',
      'interests',
      'project_type',
      'project_stage',
      'project_timeframe',
      'project_size',
      'contact_request',
      'preferred_contact',
      'how_heard',
      'visitor_notes'
    ],
    required: ['full_name', 'phone'],
    signature_mode: 'optional',
    gdpr_mode: 'required'
  }
]

export const TEMPLATES_BY_KEY = FORM_TEMPLATES.reduce((acc, t) => {
  acc[t.key] = t
  return acc
}, {})

export default FORM_TEMPLATES
