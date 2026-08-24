/**
 * ---------------------------------------------------------------------------
 *  OFFLINE QUEUE (IndexedDB)
 * ---------------------------------------------------------------------------
 *  PRIORITY #1 OF THIS APPLICATION: NEVER LOSE A LEAD.
 *
 *  Every registration is written into IndexedDB FIRST. Only after the row is
 *  safely on disk do we try to send it to Supabase. If the send succeeds the
 *  local copy is removed; if it fails (no Wi-Fi at the venue, server hiccup,
 *  the tablet is put to sleep) the record simply stays in the queue and is
 *  retried automatically:
 *      * when the browser fires the "online" event
 *      * every 20 seconds while anything is pending
 *      * when the operator presses "Sync now"
 *      * on the next app start
 *
 *  IDEMPOTENCY: the registration UUID is generated on the client and used as
 *  the primary key in PostgreSQL. submit_registration() returns the existing
 *  row instead of inserting a second one, so a retry can never duplicate a
 *  lead — no matter how many times it runs.
 * ---------------------------------------------------------------------------
 */
import { openDB } from 'idb'
import { supabase, isConfigured, SIGNATURE_BUCKET } from './supabase'

const DB_NAME = 'cm-event-leads'
const DB_VERSION = 1
const STORE_QUEUE = 'queue'
const STORE_META = 'meta'

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          const store = db.createObjectStore(STORE_QUEUE, { keyPath: 'id' })
          store.createIndex('created_at', 'created_at')
          store.createIndex('event_id', 'event_id')
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' })
        }
      }
    })
  }
  return dbPromise
}

/* ------------------------------------------------------------------ events */
const listeners = new Set()

/** Subscribe to queue changes: cb({ pending, syncing, lastError }) */
export function onQueueChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

let state = { pending: 0, syncing: false, lastError: null, lastSyncAt: null }

function emit(patch = {}) {
  state = { ...state, ...patch }
  listeners.forEach((cb) => {
    try {
      cb(state)
    } catch {
      /* a broken listener must never break the queue */
    }
  })
}

export function getQueueState() {
  return state
}

async function refreshCount() {
  const n = await countPending()
  emit({ pending: n })
  return n
}

/* ------------------------------------------------------------- basic CRUD */

export async function enqueue(record) {
  const db = await getDB()
  await db.put(STORE_QUEUE, {
    id: record.id,
    event_id: record.event_id,
    payload: record.payload,
    created_at: record.created_at || new Date().toISOString(),
    attempts: 0,
    last_error: null,
    // The signature PNG as a data URL. Kept separately from the payload so we
    // can upload it to Storage at sync time and then drop it.
    signature_data_url: record.signature_data_url || null
  })
  await refreshCount()
}

export async function countPending() {
  try {
    const db = await getDB()
    return await db.count(STORE_QUEUE)
  } catch {
    return 0
  }
}

export async function listPending() {
  const db = await getDB()
  const all = await db.getAll(STORE_QUEUE)
  return all.sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
}

export async function removeFromQueue(id) {
  const db = await getDB()
  await db.delete(STORE_QUEUE, id)
  await refreshCount()
}

export async function clearQueue() {
  const db = await getDB()
  await db.clear(STORE_QUEUE)
  await refreshCount()
}

/* ------------------------------------------------------------------- meta */

export async function setMeta(key, value) {
  const db = await getDB()
  await db.put(STORE_META, { key, value })
}

export async function getMeta(key, fallback = null) {
  try {
    const db = await getDB()
    const row = await db.get(STORE_META, key)
    return row ? row.value : fallback
  } catch {
    return fallback
  }
}

/* --------------------------------------------------------------- helpers */

/** data:image/png;base64,xxx  ->  Blob */
function dataUrlToBlob(dataUrl) {
  const [head, body] = String(dataUrl).split(',')
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/png'
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * Upload a signature PNG to the private "signatures" bucket.
 * Returns the object path, or null if the upload was not possible.
 *
 * The path is deterministic (based on the registration id). The anon key may
 * only INSERT into the bucket (never UPDATE — see supabase/04_storage.sql), so
 * `upsert` stays false and a "already exists" answer on a retry is treated as
 * success: the object is already there from the first attempt.
 */
export async function uploadSignature(registrationId, eventId, dataUrl) {
  if (!isConfigured || !dataUrl) return null
  try {
    const blob = dataUrlToBlob(dataUrl)
    const path = `${eventId || 'unknown-event'}/${registrationId}.png`
    const { error } = await supabase.storage
      .from(SIGNATURE_BUCKET)
      .upload(path, blob, {
        contentType: 'image/png',
        upsert: false,
        cacheControl: '3600'
      })

    if (error) {
      const msg = `${error.message || ''} ${error.error || ''}`.toLowerCase()
      const alreadyThere =
        error.statusCode === '409' ||
        error.status === 409 ||
        msg.includes('already exists') ||
        msg.includes('duplicate') ||
        msg.includes('resource already')
      if (alreadyThere) return path // uploaded by a previous attempt
      throw error
    }
    return path
  } catch (err) {
    console.warn('[CM] signature upload failed, keeping base64 fallback', err)
    return null
  }
}

/* --------------------------------------------------------------- sending */

/**
 * Send ONE queued record to Supabase.
 * Returns { ok: true, lead_number } or { ok: false, error }.
 */
export async function sendRecord(record) {
  if (!isConfigured) return { ok: false, error: new Error('NOT_CONFIGURED') }

  const payload = { ...record.payload }

  // 1) try to move the signature into Storage
  if (record.signature_data_url && !payload?.signature?.path) {
    const path = await uploadSignature(
      record.id,
      record.event_id,
      record.signature_data_url
    )
    if (path) {
      payload.signature = { path, data: null }
    } else {
      // keep the base64 copy in the database so the signature is never lost
      payload.signature = { path: null, data: record.signature_data_url }
    }
  }

  // 2) submit through the SECURITY DEFINER RPC (idempotent)
  const { data, error } = await supabase.rpc('submit_registration', { payload })
  if (error) return { ok: false, error }
  return { ok: true, result: data }
}

/**
 * Try to flush the whole queue. Safe to call at any time — it never throws
 * and never removes a record that was not confirmed by the server.
 */
export async function syncQueue({ force = false } = {}) {
  if (state.syncing && !force) return { sent: 0, failed: 0, pending: state.pending }
  if (!isConfigured) return { sent: 0, failed: 0, pending: await refreshCount() }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { sent: 0, failed: 0, pending: await refreshCount() }
  }

  emit({ syncing: true, lastError: null })

  let sent = 0
  let failed = 0

  try {
    const items = await listPending()
    for (const item of items) {
      /* eslint-disable no-await-in-loop */
      const res = await sendRecord(item)
      if (res.ok) {
        await removeFromQueue(item.id)
        sent += 1
      } else {
        failed += 1
        const db = await getDB()
        await db.put(STORE_QUEUE, {
          ...item,
          attempts: (item.attempts || 0) + 1,
          last_error: String(res.error?.message || res.error || 'unknown')
        })
        // A network-level failure means the rest will fail too — stop early.
        const msg = String(res.error?.message || '').toLowerCase()
        if (msg.includes('fetch') || msg.includes('network')) break
      }
      /* eslint-enable no-await-in-loop */
    }
  } catch (err) {
    emit({ lastError: String(err?.message || err) })
  }

  const pending = await countPending()
  emit({
    syncing: false,
    pending,
    lastSyncAt: new Date().toISOString(),
    lastError: failed > 0 ? 'SYNC_PARTIAL' : null
  })

  return { sent, failed, pending }
}

/* ------------------------------------------------------------ auto-runner */

let intervalId = null
let started = false

/** Start the background synchroniser. Call once from main.jsx. */
export function startAutoSync() {
  if (started || typeof window === 'undefined') return
  started = true

  const kick = () => {
    syncQueue().catch(() => {})
  }

  window.addEventListener('online', kick)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') kick()
  })

  // Poll while anything is pending. 20 s is gentle enough for a free tier and
  // fast enough that the operator sees the counter go down at the booth.
  intervalId = window.setInterval(async () => {
    const n = await countPending()
    if (n > 0) kick()
  }, 20000)

  // Initial pass, slightly delayed so the app can boot first.
  window.setTimeout(kick, 1500)
  refreshCount()
}

export function stopAutoSync() {
  if (intervalId) window.clearInterval(intervalId)
  intervalId = null
  started = false
}

export default {
  enqueue,
  listPending,
  countPending,
  removeFromQueue,
  clearQueue,
  syncQueue,
  startAutoSync,
  onQueueChange,
  getQueueState,
  uploadSignature
}
