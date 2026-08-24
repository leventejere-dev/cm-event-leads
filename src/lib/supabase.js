/**
 * ---------------------------------------------------------------------------
 *  SUPABASE CLIENT
 * ---------------------------------------------------------------------------
 *  Only the PUBLIC ("anon") key is used here. It is safe to ship it in the
 *  browser bundle — Row Level Security decides what it may actually do.
 *  NEVER put the service_role key in this project.
 * ---------------------------------------------------------------------------
 */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True when the .env file has been filled in. */
export const isConfigured = Boolean(
  url && anonKey && !url.includes('xxxxxxxx') && anonKey.length > 20
)

if (!isConfigured && typeof console !== 'undefined') {
  console.warn(
    '[CM Event Leads] Supabase is not configured. Copy .env.example to .env ' +
      'and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // we use a hash router — avoid conflicts
        storageKey: 'cm-event-leads-auth'
      },
      global: {
        headers: { 'x-application-name': 'cm-event-leads' }
      }
    })
  : null

/** Bucket that stores the signature PNGs (private). */
export const SIGNATURE_BUCKET = 'signatures'

/**
 * Small helper: unwrap a Supabase response and throw a real Error on failure,
 * so callers can just use try / catch.
 */
export function unwrap({ data, error }) {
  if (error) {
    const err = new Error(error.message || 'Supabase error')
    err.code = error.code
    err.details = error.details
    err.hint = error.hint
    throw err
  }
  return data
}

export default supabase
