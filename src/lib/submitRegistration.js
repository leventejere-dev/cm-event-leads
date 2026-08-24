/**
 * ---------------------------------------------------------------------------
 *  REGISTRATION SUBMISSION
 * ---------------------------------------------------------------------------
 *  Turns the values collected on the tablet into the payload expected by the
 *  submit_registration() database function, writes it to IndexedDB FIRST and
 *  only then tries to send it.
 *
 *  Order of operations (this order is what guarantees "no lost leads"):
 *      1. build payload
 *      2. persist to IndexedDB
 *      3. try to send
 *      4a. success -> delete the local copy, show the lead number
 *      4b. failure -> keep the local copy, show "saved locally, sync pending"
 * ---------------------------------------------------------------------------
 */
import { FIELD_TYPES, MAPPED_COLUMNS } from '../config/fieldCatalog'
import { uuid } from './format'
import { enqueue, sendRecord, removeFromQueue } from './offlineQueue'

/** Convert one field + its value into a registration_answers row. */
export function buildAnswer(field, value) {
  const base = {
    field_key: field.field_key,
    field_label: field.label,
    field_type: field.field_type,
    sort_order: field.sort_order ?? 0,
    value_text: null,
    value_number: null,
    value_bool: null,
    value_json: null
  }

  switch (field.field_type) {
    case FIELD_TYPES.NUMBER: {
      const n = Number(value)
      if (value === '' || value === null || value === undefined || Number.isNaN(n)) {
        return null
      }
      return { ...base, value_number: n, value_text: String(value) }
    }

    case FIELD_TYPES.CHECKBOX:
    case FIELD_TYPES.BOOLEAN: {
      if (value === null || value === undefined || value === '') return null
      const b = value === true || value === 'true' || value === 'yes'
      return { ...base, value_bool: b, value_text: b ? 'Da' : 'Nu' }
    }

    case FIELD_TYPES.MULTISELECT: {
      if (!Array.isArray(value) || value.length === 0) return null
      const labels = value.map(
        (v) => (field.options || []).find((o) => o.value === v)?.label || v
      )
      return { ...base, value_json: value, value_text: labels.join(', ') }
    }

    case FIELD_TYPES.SELECT:
    case FIELD_TYPES.RADIO: {
      if (!value) return null
      const label = (field.options || []).find((o) => o.value === value)?.label || value
      return { ...base, value_text: label, value_json: { value } }
    }

    default: {
      const s = value === null || value === undefined ? '' : String(value).trim()
      if (!s) return null
      return { ...base, value_text: s }
    }
  }
}

/** Raw value that belongs in the denormalised `registrations` column. */
function rawProfileValue(field, value) {
  switch (field.field_type) {
    case FIELD_TYPES.MULTISELECT:
      return Array.isArray(value) ? value : []
    case FIELD_TYPES.CHECKBOX:
    case FIELD_TYPES.BOOLEAN:
      return value === true || value === 'true' || value === 'yes'
    default:
      return value === null || value === undefined ? null : String(value).trim() || null
  }
}

/**
 * @param {Object} args
 * @param {Object} args.event      the active event row
 * @param {Array}  args.fields     enabled fields (with .options)
 * @param {Object} args.values     { [field_key]: value }
 * @param {String} args.signatureDataUrl  PNG data URL or null
 * @param {Object} args.gdpr       { accepted, text, version }
 * @param {String} args.source     'kiosk' | 'qr'
 *
 * @returns {Promise<{ id, leadNumber, offline, error }>}
 */
export async function submitRegistration({
  event,
  fields,
  values,
  signatureDataUrl = null,
  gdpr = {},
  source = 'kiosk'
}) {
  const id = uuid()
  const now = new Date().toISOString()

  // ---- answers -----------------------------------------------------------
  const answers = []
  const profile = { interests: [], follow_up_requested: false }

  fields.forEach((field) => {
    const value = values[field.field_key]
    const answer = buildAnswer(field, value)
    if (answer) answers.push(answer)

    const column = MAPPED_COLUMNS[field.field_key]
    if (column) {
      const raw = rawProfileValue(field, value)
      if (column === 'interests') {
        profile.interests = Array.isArray(raw) ? raw : []
      } else if (column === 'follow_up_requested') {
        profile.follow_up_requested = raw === true
      } else if (raw !== null && raw !== '') {
        profile[column] = raw
      }
    }
  })

  // If the form collected first + last name but not full name, compose it so
  // the lead list always has something readable to show.
  if (!profile.full_name && (profile.first_name || profile.last_name)) {
    profile.full_name = [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(' ')
  }

  // ---- payload -----------------------------------------------------------
  const payload = {
    id,
    event_id: event.id,
    source,
    client_created_at: now,
    profile,
    gdpr: {
      accepted: !!gdpr.accepted,
      accepted_at: gdpr.accepted ? now : null,
      text: gdpr.text || null,
      version: gdpr.version || null
    },
    signature: { path: null, data: null },
    answers
  }

  // ---- 1) persist locally BEFORE anything can go wrong --------------------
  const record = {
    id,
    event_id: event.id,
    payload,
    created_at: now,
    signature_data_url: signatureDataUrl || null
  }

  let queued = true
  try {
    await enqueue(record)
  } catch (err) {
    // IndexedDB unavailable (very old browser, private mode, storage quota).
    // Last-resort: keep a copy in localStorage so the lead still exists on the
    // device, then try to send it straight away.
    queued = false
    console.error('[CM] could not write to IndexedDB', err)
    emergencyStash(record)

    const direct = await sendRecord(record)
    if (direct.ok) {
      clearEmergencyStash(id)
      return {
        id,
        leadNumber: direct.result?.lead_number || null,
        offline: false,
        failed: false,
        error: null
      }
    }
    // Nothing could be stored in the queue AND the send failed. This is the one
    // case where the operator MUST be told, instead of showing "saved locally".
    return {
      id,
      leadNumber: null,
      offline: false,
      failed: true,
      error: direct.error
    }
  }

  // ---- 2) try to send now -------------------------------------------------
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { id, leadNumber: null, offline: true, failed: false, error: null }
  }

  const res = await sendRecord(record)
  if (res.ok) {
    await removeFromQueue(id)
    return {
      id,
      leadNumber: res.result?.lead_number || null,
      offline: false,
      failed: false,
      error: null
    }
  }

  // Stays in the queue; the background synchroniser will retry.
  return { id, leadNumber: null, offline: true, failed: !queued, error: res.error }
}

/* --------------------------------------------------------------------------
 *  Emergency stash — only used when IndexedDB itself is unavailable.
 *  Keeps the raw payload in localStorage so a lead is still recoverable from
 *  the device (Admin -> Settings shows nothing about it, but the data is there
 *  under the key "cm_emergency_leads" and can be copied out by hand).
 * ------------------------------------------------------------------------ */
const EMERGENCY_KEY = 'cm_emergency_leads'

function emergencyStash(record) {
  try {
    const raw = localStorage.getItem(EMERGENCY_KEY)
    const list = raw ? JSON.parse(raw) : []
    list.push(record)
    localStorage.setItem(EMERGENCY_KEY, JSON.stringify(list))
  } catch (err) {
    console.error('[CM] emergency stash failed too', err)
  }
}

function clearEmergencyStash(id) {
  try {
    const raw = localStorage.getItem(EMERGENCY_KEY)
    if (!raw) return
    const list = JSON.parse(raw).filter((r) => r.id !== id)
    localStorage.setItem(EMERGENCY_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export default submitRegistration
