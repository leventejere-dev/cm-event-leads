/**
 * ---------------------------------------------------------------------------
 *  TINY i18n LAYER (no external dependency)
 * ---------------------------------------------------------------------------
 *  Usage:
 *     const { t, lang, setLang } = useI18n()
 *     t('common.save')
 *     t('kiosk.stepOf', { current: 2, total: 4 })
 *
 *  Adding a language:
 *     1. copy src/i18n/en.js to src/i18n/xx.js and translate it
 *     2. import it below and add it to LANGUAGES
 *  No component needs to change.
 * ---------------------------------------------------------------------------
 */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import ro from './ro'
import hu from './hu'
import en from './en'

export const DICTS = { ro, hu, en }

export const LANGUAGES = [
  { code: 'ro', name: 'Română', short: 'RO' },
  { code: 'hu', name: 'Magyar', short: 'HU' },
  { code: 'en', name: 'English', short: 'EN' }
]

const STORAGE_KEY = 'cm_lang'
const FALLBACK = 'ro'

function readStoredLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v && DICTS[v]) return v
  } catch {
    /* storage unavailable (private mode) — ignore */
  }
  return null
}

/** Resolve "a.b.c" inside a nested object. */
function lookup(dict, path) {
  return path.split('.').reduce((acc, part) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, part)) return acc[part]
    return undefined
  }, dict)
}

/** Replace {placeholders} in a string. */
function interpolate(str, params) {
  if (!params) return str
  return str.replace(/\{(\w+)\}/g, (m, key) =>
    params[key] === undefined || params[key] === null ? m : String(params[key])
  )
}

export function translate(lang, key, params) {
  const dict = DICTS[lang] || DICTS[FALLBACK]
  let value = lookup(dict, key)
  if (value === undefined && lang !== FALLBACK) value = lookup(DICTS[FALLBACK], key)
  if (value === undefined) return key // show the key so missing strings are obvious
  if (typeof value !== 'string') return value
  return interpolate(value, params)
}

const I18nContext = createContext(null)

export function I18nProvider({ children, defaultLang = FALLBACK }) {
  const [lang, setLangState] = useState(() => readStoredLang() || defaultLang || FALLBACK)

  const setLang = useCallback((next) => {
    if (!DICTS[next]) return
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = next
  }, [])

  const t = useCallback((key, params) => translate(lang, key, params), [lang])

  const value = useMemo(
    () => ({ lang, setLang, t, languages: LANGUAGES }),
    [lang, setLang, t]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Safe fallback so a component used outside the provider never crashes.
    return {
      lang: FALLBACK,
      setLang: () => {},
      t: (key, params) => translate(FALLBACK, key, params),
      languages: LANGUAGES
    }
  }
  return ctx
}

export default useI18n
