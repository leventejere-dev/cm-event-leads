/**
 * ---------------------------------------------------------------------------
 *  BRANDING
 * ---------------------------------------------------------------------------
 *  Merges src/config/brand.js (the file you edit) with the optional overrides
 *  stored in the app_settings table (what the admin edits in Settings), and
 *  pushes the result into the CSS custom properties.
 * ---------------------------------------------------------------------------
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback
} from 'react'
import { brand as baseBrand, applyBrand } from '../config/brand'
import { fetchPublicSettings } from '../lib/db'
import { isConfigured } from '../lib/supabase'

const BrandingContext = createContext(null)

const CACHE_KEY = 'cm_branding_cache'

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(value) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

/** settings row -> brand override object */
function toOverrides(settings) {
  if (!settings) return {}
  const o = {}
  if (settings.company_name) o.companyName = settings.company_name
  if (settings.logo_url) o.logo = settings.logo_url
  if (settings.logo_light_url) o.logoLight = settings.logo_light_url
  if (settings.favicon_url) o.favicon = settings.favicon_url
  if (settings.colors && typeof settings.colors === 'object') {
    Object.assign(o, settings.colors)
  }
  return o
}

export function BrandingProvider({ children }) {
  const cached = readCache()
  const [settings, setSettings] = useState(cached)
  const [brand, setBrand] = useState(() =>
    applyBrand(toOverrides(cached))
  )

  const refresh = useCallback(async () => {
    if (!isConfigured) return
    try {
      const s = await fetchPublicSettings()
      if (s) {
        setSettings(s)
        writeCache(s)
        setBrand(applyBrand(toOverrides(s)))
      }
    } catch (err) {
      // Offline at the venue: keep whatever we cached, never block the form.
      console.warn('[CM] branding fetch failed, using cached/brand.js values', err)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const value = useMemo(
    () => ({ brand, settings, refresh, baseBrand }),
    [brand, settings, refresh]
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}

export function useBranding() {
  const ctx = useContext(BrandingContext)
  if (!ctx) {
    return { brand: baseBrand, settings: null, refresh: () => {}, baseBrand }
  }
  return ctx
}

export default useBranding
