/**
 * ---------------------------------------------------------------------------
 *  DATA ACCESS LAYER
 * ---------------------------------------------------------------------------
 *  Every call the application makes to Supabase goes through this file, so the
 *  rest of the code never has to know about table names or query syntax.
 * ---------------------------------------------------------------------------
 */
import { supabase, isConfigured, unwrap, SIGNATURE_BUCKET } from './supabase'
import { buildDefaultFields } from '../config/fieldCatalog'

function requireClient() {
  if (!isConfigured || !supabase) {
    const err = new Error('NOT_CONFIGURED')
    err.code = 'NOT_CONFIGURED'
    throw err
  }
  return supabase
}

/* =========================================================================
 *  PUBLIC (anon) — used by the tablet / QR registration screen
 * ====================================================================== */

/** Branding + defaults, readable without login. */
export async function fetchPublicSettings() {
  const sb = requireClient()
  const { data, error } = await sb.from('public_settings').select('*').maybeSingle()
  if (error) throw error
  return data
}

/** The single event flagged as active on the tablet. */
export async function fetchActiveEvent() {
  const sb = requireClient()
  const { data, error } = await sb
    .from('public_events')
    .select('*')
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  return data
}

/** A specific active event, addressed by its slug (QR code links). */
export async function fetchEventBySlug(slug) {
  const sb = requireClient()
  const { data, error } = await sb
    .from('public_events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Enabled fields + their options for the public form. */
export async function fetchPublicForm(eventId) {
  const sb = requireClient()
  const fields = unwrap(
    await sb
      .from('public_form_fields')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true })
  )
  if (!fields.length) return []

  const ids = fields.map((f) => f.id)
  const options = unwrap(
    await sb
      .from('public_form_options')
      .select('*')
      .in('field_id', ids)
      .order('sort_order', { ascending: true })
  )

  const byField = options.reduce((acc, o) => {
    ;(acc[o.field_id] = acc[o.field_id] || []).push(o)
    return acc
  }, {})

  return fields.map((f) => ({ ...f, options: byField[f.id] || [] }))
}

/** Returns true when the same e-mail / phone already exists for this event. */
export async function checkDuplicate(eventId, email, phone) {
  const sb = requireClient()
  const { data, error } = await sb.rpc('check_duplicate_registration', {
    p_event_id: eventId,
    p_email: email || null,
    p_phone: phone || null
  })
  if (error) throw error
  return Boolean(data)
}

/* =========================================================================
 *  ADMIN — EVENTS
 * ====================================================================== */

export async function listEvents({ includeArchived = true } = {}) {
  const sb = requireClient()
  let q = sb.from('events').select('*').order('created_at', { ascending: false })
  if (!includeArchived) q = q.neq('status', 'archived')
  return unwrap(await q)
}

export async function getEvent(id) {
  const sb = requireClient()
  return unwrap(await sb.from('events').select('*').eq('id', id).single())
}

export async function eventLeadCounts() {
  const sb = requireClient()
  const { data, error } = await sb.rpc('event_lead_counts')
  if (error) throw error
  return (data || []).reduce((acc, r) => {
    acc[r.event_id] = Number(r.lead_count)
    return acc
  }, {})
}

/**
 * Create an event AND seed its form with the standard field catalog.
 * The administrator can then switch fields on/off in the form builder.
 */
export async function createEvent(values) {
  const sb = requireClient()
  const settings = await getSettings().catch(() => null)

  const event = unwrap(
    await sb
      .from('events')
      .insert({
        slug: values.slug,
        name: values.name,
        location: values.location || null,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        description: values.description || null,
        status: values.status || 'draft',
        is_active: false,
        signature_mode: values.signature_mode || 'optional',
        gdpr_mode: values.gdpr_mode || 'required',
        gdpr_text: values.gdpr_text || settings?.default_gdpr_text || '',
        gdpr_version:
          values.gdpr_version || settings?.default_gdpr_version || '2026-01',
        success_message: values.success_message || null,
        success_sub_message: values.success_sub_message || null,
        auto_reset_seconds: values.auto_reset_seconds || null
      })
      .select()
      .single()
  )

  await seedEventFields(event.id)
  return event
}

/** Insert the default catalog rows for an event that has no fields yet. */
export async function seedEventFields(eventId) {
  const sb = requireClient()
  const defaults = buildDefaultFields()

  const rows = defaults.map((f) => ({
    event_id: eventId,
    field_key: f.field_key,
    section: f.section,
    field_type: f.field_type,
    label: f.label,
    placeholder: f.placeholder,
    help_text: f.help_text,
    enabled: f.enabled,
    required: f.required,
    sort_order: f.sort_order,
    is_custom: false
  }))

  const inserted = unwrap(await sb.from('form_fields').insert(rows).select('id, field_key'))
  const idByKey = inserted.reduce((acc, r) => {
    acc[r.field_key] = r.id
    return acc
  }, {})

  const optionRows = []
  defaults.forEach((f) => {
    if (!f.options || !f.options.length) return
    const fieldId = idByKey[f.field_key]
    if (!fieldId) return
    f.options.forEach((o, i) => {
      optionRows.push({
        field_id: fieldId,
        value: o.value,
        label: o.label,
        sort_order: (i + 1) * 10
      })
    })
  })

  if (optionRows.length) {
    unwrap(await sb.from('form_options').insert(optionRows))
  }
}

export async function updateEvent(id, patch) {
  const sb = requireClient()
  return unwrap(await sb.from('events').update(patch).eq('id', id).select().single())
}

export async function deleteEvent(id) {
  const sb = requireClient()
  unwrap(await sb.from('events').delete().eq('id', id))
}

export async function setActiveEvent(id) {
  const sb = requireClient()
  // The database trigger clears the flag on every other event, and an event
  // must be "active" in status to be reachable by the public views.
  unwrap(await sb.from('events').update({ is_active: false }).eq('is_active', true))
  return unwrap(
    await sb
      .from('events')
      .update({ is_active: true, status: 'active' })
      .eq('id', id)
      .select()
      .single()
  )
}

export async function duplicateEvent(eventId, newName, newSlug) {
  const sb = requireClient()
  const { data, error } = await sb.rpc('duplicate_event', {
    p_event_id: eventId,
    p_new_name: newName,
    p_new_slug: newSlug
  })
  if (error) throw error
  return data // uuid of the new event
}

/* =========================================================================
 *  ADMIN — FORM BUILDER
 * ====================================================================== */

export async function getFormFields(eventId) {
  const sb = requireClient()
  const fields = unwrap(
    await sb
      .from('form_fields')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true })
  )
  if (!fields.length) return []

  const options = unwrap(
    await sb
      .from('form_options')
      .select('*')
      .in(
        'field_id',
        fields.map((f) => f.id)
      )
      .order('sort_order', { ascending: true })
  )

  const byField = options.reduce((acc, o) => {
    ;(acc[o.field_id] = acc[o.field_id] || []).push(o)
    return acc
  }, {})

  return fields.map((f) => ({ ...f, options: byField[f.id] || [] }))
}

export async function updateField(fieldId, patch) {
  const sb = requireClient()
  return unwrap(
    await sb.from('form_fields').update(patch).eq('id', fieldId).select().single()
  )
}

export async function createField(eventId, values) {
  const sb = requireClient()
  const field = unwrap(
    await sb
      .from('form_fields')
      .insert({
        event_id: eventId,
        field_key: values.field_key,
        section: values.section || 'custom',
        field_type: values.field_type,
        label: values.label,
        placeholder: values.placeholder || '',
        help_text: values.help_text || '',
        enabled: values.enabled !== false,
        required: !!values.required,
        sort_order: values.sort_order ?? 9999,
        is_custom: values.is_custom !== false
      })
      .select()
      .single()
  )

  if (values.options && values.options.length) {
    await replaceFieldOptions(field.id, values.options)
  }
  return field
}

export async function deleteField(fieldId) {
  const sb = requireClient()
  unwrap(await sb.from('form_fields').delete().eq('id', fieldId))
}

export async function replaceFieldOptions(fieldId, options) {
  const sb = requireClient()
  unwrap(await sb.from('form_options').delete().eq('field_id', fieldId))
  if (!options || !options.length) return []
  const rows = options.map((o, i) => ({
    field_id: fieldId,
    value: o.value,
    label: o.label,
    sort_order: (i + 1) * 10
  }))
  return unwrap(await sb.from('form_options').insert(rows).select())
}

/** Persist a new order for a list of fields (array of {id, sort_order}). */
export async function saveFieldOrder(items) {
  const sb = requireClient()
  await Promise.all(
    items.map((it) =>
      sb.from('form_fields').update({ sort_order: it.sort_order }).eq('id', it.id)
    )
  )
}

/* =========================================================================
 *  ADMIN — LEADS
 * ====================================================================== */

const LEAD_LIST_COLUMNS =
  'id, lead_number, event_id, created_at, full_name, first_name, last_name, ' +
  'company, job_title, profession, phone, email, country, county, city, ' +
  'visitor_type, interests, project_stage, follow_up_requested, status, ' +
  'assigned_to, gdpr_accepted, signature_path, signature_data, follow_up_date, ' +
  'contacted_at, updated_at, source'

function applyLeadFilters(query, f = {}) {
  let q = query

  if (f.event_id) q = q.eq('event_id', f.event_id)
  if (f.status) q = q.eq('status', f.status)
  if (f.assigned_to === '__none__') q = q.is('assigned_to', null)
  else if (f.assigned_to) q = q.eq('assigned_to', f.assigned_to)
  if (f.county) q = q.eq('county', f.county)
  if (f.city) q = q.ilike('city', f.city)
  if (f.country) q = q.ilike('country', f.country)
  if (f.profession) q = q.ilike('profession', `%${f.profession}%`)
  if (f.visitor_type) q = q.eq('visitor_type', f.visitor_type)
  if (f.interest) q = q.contains('interests', [f.interest])
  if (f.follow_up === 'yes') q = q.eq('follow_up_requested', true)
  if (f.follow_up === 'no') q = q.eq('follow_up_requested', false)
  if (f.date_from) q = q.gte('created_at', `${f.date_from}T00:00:00.000Z`)
  if (f.date_to) q = q.lte('created_at', `${f.date_to}T23:59:59.999Z`)

  if (f.search && f.search.trim()) {
    const s = f.search.trim().replace(/[%,()]/g, ' ')
    q = q.or(
      [
        `full_name.ilike.%${s}%`,
        `first_name.ilike.%${s}%`,
        `last_name.ilike.%${s}%`,
        `company.ilike.%${s}%`,
        `phone.ilike.%${s}%`,
        `email.ilike.%${s}%`,
        `lead_number.ilike.%${s}%`
      ].join(',')
    )
  }

  return q
}

export async function listLeads(filters = {}, { page = 0, pageSize = 50 } = {}) {
  const sb = requireClient()
  let q = sb.from('registrations').select(LEAD_LIST_COLUMNS, { count: 'exact' })
  q = applyLeadFilters(q, filters)
  q = q.order('created_at', { ascending: false })
  q = q.range(page * pageSize, page * pageSize + pageSize - 1)

  const { data, error, count } = await q
  if (error) throw error
  return { rows: data || [], total: count || 0 }
}

/** All matching leads (no paging) — used by the export functions. */
export async function listAllLeads(filters = {}) {
  const sb = requireClient()
  const pageSize = 1000
  let page = 0
  const out = []
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q = sb.from('registrations').select('*')
    q = applyLeadFilters(q, filters)
    q = q.order('created_at', { ascending: true })
    q = q.range(page * pageSize, page * pageSize + pageSize - 1)
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await q
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < pageSize) break
    page += 1
    if (page > 200) break // 200k safety stop
  }
  return out
}

export async function getLead(id) {
  const sb = requireClient()
  const lead = unwrap(await sb.from('registrations').select('*').eq('id', id).single())
  const answers = unwrap(
    await sb
      .from('registration_answers')
      .select('*')
      .eq('registration_id', id)
      .order('sort_order', { ascending: true })
  )
  let event = null
  if (lead.event_id) {
    const res = await sb.from('events').select('*').eq('id', lead.event_id).maybeSingle()
    event = res.data || null
  }
  return { ...lead, answers, event }
}

/** Answers for many registrations at once (export). */
export async function getAnswersFor(registrationIds) {
  const sb = requireClient()
  const out = []
  const chunk = 200
  for (let i = 0; i < registrationIds.length; i += chunk) {
    const slice = registrationIds.slice(i, i + chunk)
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await sb
      .from('registration_answers')
      .select('*')
      .in('registration_id', slice)
    if (error) throw error
    out.push(...(data || []))
  }
  return out
}

export async function updateLead(id, patch) {
  const sb = requireClient()
  return unwrap(
    await sb.from('registrations').update(patch).eq('id', id).select().single()
  )
}

export async function deleteLead(id) {
  const sb = requireClient()
  unwrap(await sb.from('registrations').delete().eq('id', id))
}

export async function bulkUpdateLeads(ids, patch) {
  const sb = requireClient()
  unwrap(await sb.from('registrations').update(patch).in('id', ids))
}

/** Short-lived signed URL for a private signature image. */
export async function getSignatureUrl(path, expiresIn = 3600) {
  if (!path) return null
  const sb = requireClient()
  const { data, error } = await sb.storage
    .from(SIGNATURE_BUCKET)
    .createSignedUrl(path, expiresIn)
  if (error) {
    console.warn('[CM] could not sign signature URL', error)
    return null
  }
  return data?.signedUrl || null
}


/** Signed URLs for many private signature images at once (export). */
export async function getSignatureUrls(paths, expiresIn = 3600) {
  const clean = (paths || []).filter(Boolean)
  if (!clean.length) return {}
  const sb = requireClient()
  const out = {}
  const chunk = 100
  for (let i = 0; i < clean.length; i += chunk) {
    const slice = clean.slice(i, i + chunk)
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await sb.storage
      .from(SIGNATURE_BUCKET)
      .createSignedUrls(slice, expiresIn)
    if (error) {
      console.warn('[CM] could not sign signature URLs', error)
      continue
    }
    ;(data || []).forEach((row) => {
      if (row && row.signedUrl && !row.error) out[row.path] = row.signedUrl
    })
  }
  return out
}

/* =========================================================================
 *  ADMIN — SALES REPS
 * ====================================================================== */

export async function listReps({ onlyActive = false } = {}) {
  const sb = requireClient()
  let q = sb
    .from('sales_reps')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (onlyActive) q = q.eq('is_active', true)
  return unwrap(await q)
}

export async function createRep(values) {
  const sb = requireClient()
  return unwrap(await sb.from('sales_reps').insert(values).select().single())
}

export async function updateRep(id, patch) {
  const sb = requireClient()
  return unwrap(await sb.from('sales_reps').update(patch).eq('id', id).select().single())
}

export async function deleteRep(id) {
  const sb = requireClient()
  unwrap(await sb.from('sales_reps').delete().eq('id', id))
}

/* =========================================================================
 *  ADMIN — SETTINGS & STATS
 * ====================================================================== */

export async function getSettings() {
  const sb = requireClient()
  return unwrap(await sb.from('app_settings').select('*').eq('id', 1).single())
}

export async function updateSettings(patch) {
  const sb = requireClient()
  return unwrap(
    await sb.from('app_settings').update(patch).eq('id', 1).select().single()
  )
}

export async function dashboardStats() {
  const sb = requireClient()
  const { data, error } = await sb.rpc('dashboard_stats')
  if (error) throw error
  return data || {}
}

export async function eventStats(eventId) {
  const sb = requireClient()
  const { data, error } = await sb.rpc('event_stats', { p_event_id: eventId })
  if (error) throw error
  return data || {}
}

/* =========================================================================
 *  ADMIN — PROFILE
 * ====================================================================== */

/* -------------------------------------------------------------------------
 *  ADMIN USERS (who may open the admin area)
 *  These go through SECURITY DEFINER functions because the browser is never
 *  allowed to read auth.users directly — see supabase/07_admin_users.sql.
 * ---------------------------------------------------------------------- */

export async function listAdminUsers() {
  const sb = requireClient()
  const { data, error } = await sb.rpc('admin_list_users')
  if (error) throw error
  return data || []
}

export async function grantAdminByEmail(email, fullName, role = 'admin') {
  const sb = requireClient()
  const { data, error } = await sb.rpc('grant_admin_by_email', {
    p_email: String(email || '').trim(),
    p_name: String(fullName || '').trim() || null,
    p_role: role || 'admin'
  })
  if (error) throw error
  return data
}

export async function setAdminAccess(id, { is_active = null, role = null } = {}) {
  const sb = requireClient()
  const { error } = await sb.rpc('set_admin_access', {
    p_id: id,
    p_active: is_active,
    p_role: role
  })
  if (error) throw error
}

export async function revokeAdmin(id) {
  const sb = requireClient()
  const { error } = await sb.rpc('revoke_admin', { p_id: id })
  if (error) throw error
}

export async function getMyAdminProfile(userId) {
  const sb = requireClient()
  const { data, error } = await sb
    .from('admin_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export default {
  fetchPublicSettings,
  fetchActiveEvent,
  fetchEventBySlug,
  fetchPublicForm,
  checkDuplicate,
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  setActiveEvent,
  duplicateEvent,
  eventLeadCounts,
  getFormFields,
  createField,
  updateField,
  deleteField,
  replaceFieldOptions,
  saveFieldOrder,
  listLeads,
  listAllLeads,
  getLead,
  getAnswersFor,
  updateLead,
  deleteLead,
  bulkUpdateLeads,
  getSignatureUrl,
  getSignatureUrls,
  listReps,
  createRep,
  updateRep,
  deleteRep,
  getSettings,
  updateSettings,
  dashboardStats,
  eventStats,
  listAdminUsers,
  grantAdminByEmail,
  setAdminAccess,
  revokeAdmin,
  getMyAdminProfile
}
