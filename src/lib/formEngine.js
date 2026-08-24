/**
 * ---------------------------------------------------------------------------
 *  FORM ENGINE
 * ---------------------------------------------------------------------------
 *  Decides how the configured fields are laid out on the tablet and validates
 *  the answers. The rules:
 *
 *    * short form  (<= SINGLE_PAGE_LIMIT questions, no signature)
 *          -> one single page, no step indicator
 *    * longer form
 *          -> automatically split into clean steps following the logical
 *             sections (contact -> professional -> interests -> project ->
 *             notes -> consent & signature)
 *    * empty sections never produce an empty step
 *    * the consent / signature step is always the last one
 * ---------------------------------------------------------------------------
 */
import { SECTIONS, FIELD_TYPES } from '../config/fieldCatalog'
import { isValidEmail, isValidPhone, isValidUrl } from './format'

export const SINGLE_PAGE_LIMIT = 8

const SECTION_STEP = SECTIONS.reduce((acc, s) => {
  acc[s.key] = s.step
  return acc
}, {})

const SECTION_TITLE = SECTIONS.reduce((acc, s) => {
  acc[s.key] = s.titleKey
  return acc
}, {})

/** true when the event asks for a signature and/or a GDPR tick */
export function needsConsentStep(event) {
  if (!event) return false
  return event.signature_mode !== 'disabled' || event.gdpr_mode !== 'disabled'
}

/**
 * @returns [{ key, titleKey, fields: [] , isConsent: bool }]
 */
export function buildSteps(fields, event) {
  const list = [...(fields || [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )
  const consent = needsConsentStep(event)

  // ---- short form: EVERYTHING on one page ---------------------------------
  // At a busy booth visitors have no time to page through steps, so when the
  // form is short the consent + signature block sits on the SAME screen as the
  // fields — one page, one Submit.
  if (list.length <= SINGLE_PAGE_LIMIT) {
    if (!list.length && !consent) return []
    return [
      {
        key: 'all',
        titleKey: 'section.contact',
        fields: list,
        isConsent: false,
        inlineConsent: consent
      }
    ]
  }

  // ---- long form: group by the section's step number ----------------------
  const groups = new Map()
  list.forEach((f) => {
    const step = SECTION_STEP[f.section] ?? 5
    if (!groups.has(step)) groups.set(step, [])
    groups.get(step).push(f)
  })

  const steps = [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([step, groupFields]) => ({
      key: `step-${step}`,
      titleKey: SECTION_TITLE[groupFields[0].section] || 'section.contact',
      fields: groupFields,
      isConsent: false
    }))
    .filter((s) => s.fields.length > 0)

  if (consent) {
    steps.push({
      key: 'consent',
      titleKey: 'section.consent',
      fields: [],
      isConsent: true
    })
  }

  return steps
}

/** Empty value object for a set of fields. */
export function initialValues(fields) {
  const values = {}
  ;(fields || []).forEach((f) => {
    switch (f.field_type) {
      case FIELD_TYPES.MULTISELECT:
        values[f.field_key] = []
        break
      case FIELD_TYPES.CHECKBOX:
        values[f.field_key] = false
        break
      case FIELD_TYPES.BOOLEAN:
        values[f.field_key] = null
        break
      default:
        values[f.field_key] = ''
    }
  })
  return values
}

function isEmptyValue(field, value) {
  switch (field.field_type) {
    case FIELD_TYPES.MULTISELECT:
      return !Array.isArray(value) || value.length === 0
    case FIELD_TYPES.CHECKBOX:
      return value !== true
    case FIELD_TYPES.BOOLEAN:
      return value !== true && value !== false
    default:
      return value === null || value === undefined || String(value).trim() === ''
  }
}

/**
 * Validate a list of fields.
 * @returns { [field_key]: 'message' }
 */
export function validateFields(fields, values, t) {
  const errors = {}

  ;(fields || []).forEach((field) => {
    const value = values[field.field_key]
    const empty = isEmptyValue(field, value)

    if (field.required && empty) {
      errors[field.field_key] = t('kiosk.fillRequired')
      return
    }
    if (empty) return // optional + empty = fine, no format check

    switch (field.field_type) {
      case FIELD_TYPES.EMAIL:
        if (!isValidEmail(value)) errors[field.field_key] = t('kiosk.invalidEmail')
        break
      case FIELD_TYPES.PHONE:
        if (!isValidPhone(value)) errors[field.field_key] = t('kiosk.invalidPhone')
        break
      case FIELD_TYPES.URL:
        if (!isValidUrl(value)) errors[field.field_key] = t('kiosk.invalidUrl')
        break
      case FIELD_TYPES.NUMBER:
        if (Number.isNaN(Number(value))) errors[field.field_key] = t('kiosk.invalidNumber')
        break
      default:
        break
    }
  })

  return errors
}

/** Validation for the consent step. */
export function validateConsent(event, { gdprAccepted, hasSignature }, t) {
  const errors = {}
  if (event?.gdpr_mode === 'required' && !gdprAccepted) {
    errors.gdpr = t('kiosk.gdprRequired')
  }
  if (event?.signature_mode === 'required' && !hasSignature) {
    errors.signature = t('kiosk.signatureRequired')
  }
  return errors
}

/** The e-mail / phone values used for duplicate detection. */
export function extractContact(fields, values) {
  const emailField = (fields || []).find(
    (f) => f.field_type === FIELD_TYPES.EMAIL || f.field_key === 'email'
  )
  const phoneField = (fields || []).find(
    (f) => f.field_type === FIELD_TYPES.PHONE || f.field_key === 'phone'
  )
  return {
    email: emailField ? String(values[emailField.field_key] || '').trim() : '',
    phone: phoneField ? String(values[phoneField.field_key] || '').trim() : ''
  }
}

export default {
  buildSteps,
  initialValues,
  validateFields,
  validateConsent,
  needsConsentStep,
  extractContact
}
