/**
 * ---------------------------------------------------------------------------
 *  INTERNAL SALES STATUSES
 * ---------------------------------------------------------------------------
 *  These are INTERNAL ONLY. They are never shown on the public registration
 *  screen — the visitor never sees them.
 *  The `value` strings are stored in registrations.status and are validated by
 *  a CHECK constraint in the database. If you add a status here, remember to
 *  update the CHECK constraint in supabase/01_schema.sql as well
 *  (or drop the constraint if you prefer full freedom).
 * ---------------------------------------------------------------------------
 */

export const LEAD_STATUSES = [
  { value: 'new', label: 'Nou', badge: 'cm-badge-primary' },
  { value: 'to_contact', label: 'De contactat', badge: 'cm-badge-warning' },
  { value: 'contacted', label: 'Contactat', badge: 'cm-badge-info' },
  { value: 'qualified', label: 'Calificat', badge: 'cm-badge-success' },
  { value: 'opportunity', label: 'Oportunitate', badge: 'cm-badge-success' },
  { value: 'customer', label: 'Client', badge: 'cm-badge-dark' },
  { value: 'not_relevant', label: 'Nerelevant', badge: 'cm-badge' }
]

export const STATUS_BY_VALUE = LEAD_STATUSES.reduce((acc, s) => {
  acc[s.value] = s
  return acc
}, {})

export const EVENT_STATUSES = [
  { value: 'draft', label: 'Ciornă', badge: 'cm-badge' },
  { value: 'active', label: 'Activ', badge: 'cm-badge-success' },
  { value: 'closed', label: 'Încheiat', badge: 'cm-badge-info' },
  { value: 'archived', label: 'Arhivat', badge: 'cm-badge' }
]

export const EVENT_STATUS_BY_VALUE = EVENT_STATUSES.reduce((acc, s) => {
  acc[s.value] = s
  return acc
}, {})

export const CONSENT_MODES = [
  { value: 'disabled', label: 'Dezactivat' },
  { value: 'optional', label: 'Opțional' },
  { value: 'required', label: 'Obligatoriu' }
]
