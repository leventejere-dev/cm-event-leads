/**
 * ---------------------------------------------------------------------------
 *  CONTENT LOCALISATION
 * ---------------------------------------------------------------------------
 *  src/i18n/*.js translates the application itself (buttons, section titles,
 *  the admin area). It cannot translate the registration form, because the
 *  form is configured per event and its wording lives in the database.
 *
 *  Romanian is the base language and sits in the plain columns
 *  (`label`, `placeholder`, `help_text`, `gdpr_text`, …). Hungarian and English
 *  live next to it as JSON:
 *
 *      form_fields.config.i18n = {
 *        hu: { label, placeholder, help_text, options: { value: '…' } },
 *        en: { … }
 *      }
 *      events.i18n = { hu: { gdpr_text, success_message, … }, en: { … } }
 *
 *  Everything falls back to the Romanian text, so a missing translation shows
 *  the original wording instead of an empty label.
 * ---------------------------------------------------------------------------
 */

export const BASE_LANG = 'ro'

/** The translation bag of a row, wherever it happens to live. */
export function i18nBag(row) {
  if (!row) return {}
  return row.i18n || (row.config && row.config.i18n) || {}
}

/** Translations stored for one language (never null). */
export function bagFor(row, lang) {
  const bag = i18nBag(row)
  return (lang && bag[lang]) || {}
}

function pick(value, fallback) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

/** One translated column of one row, falling back to the Romanian base. */
export function tr(row, lang, key) {
  if (!row) return ''
  const base = row[key] == null ? '' : row[key]
  if (!lang || lang === BASE_LANG) return base
  return pick(bagFor(row, lang)[key], base)
}

/** A form field with its label / placeholder / help / options translated. */
export function localiseField(field, lang) {
  if (!field) return field
  if (!lang || lang === BASE_LANG) return field

  const optionMap = bagFor(field, lang).options || {}

  return {
    ...field,
    label: tr(field, lang, 'label'),
    placeholder: tr(field, lang, 'placeholder'),
    help_text: tr(field, lang, 'help_text'),
    options: (field.options || []).map((o) =>
      pick(optionMap[o.value], null) ? { ...o, label: optionMap[o.value] } : o
    )
  }
}

export function localiseFields(fields, lang) {
  if (!lang || lang === BASE_LANG) return fields || []
  return (fields || []).map((f) => localiseField(f, lang))
}

/**
 * The event's visitor-facing texts. The NAME is deliberately left alone —
 * an exhibition is called what it is called in every language.
 */
export function localiseEvent(event, lang) {
  if (!event) return event
  if (!lang || lang === BASE_LANG) return event
  return {
    ...event,
    gdpr_text: tr(event, lang, 'gdpr_text'),
    success_message: tr(event, lang, 'success_message'),
    success_sub_message: tr(event, lang, 'success_sub_message')
  }
}

/** Merge a patch into one language of a translation bag (admin editing). */
export function mergeBag(row, lang, patch) {
  const bag = { ...i18nBag(row) }
  bag[lang] = { ...(bag[lang] || {}), ...patch }
  // Drop empty strings so a cleared field falls back to Romanian again.
  Object.keys(bag[lang]).forEach((k) => {
    const v = bag[lang][k]
    if (v === '' || v == null) delete bag[lang][k]
    if (k === 'options' && v && !Object.keys(v).length) delete bag[lang][k]
  })
  if (!Object.keys(bag[lang]).length) delete bag[lang]
  return bag
}

export default localiseField
