/**
 * Small formatting / validation helpers shared by the whole application.
 */

export function formatDate(value, { withTime = false } = {}) {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (!withTime) return date
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDateHuman(value, locale = 'ro-RO', withTime = true) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  })
}

export function todayISO() {
  return formatDate(new Date())
}

/** "nZEB Expo București 2026" -> "nzeb-expo-bucuresti-2026" */
export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ăâ]/gi, 'a')
    .replace(/[îï]/gi, 'i')
    .replace(/[șş]/gi, 's')
    .replace(/[țţ]/gi, 't')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Technical key for a custom field: "Ce material folosiți?" -> "ce_material_folositi" */
export function keyify(text) {
  const base = slugify(text).replace(/-/g, '_')
  const safe = base.replace(/^[^a-z_]+/, '')
  return (safe || 'camp').slice(0, 48)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || '').trim())
}

export function isValidPhone(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '')
  return digits.length >= 7 && digits.length <= 15
}

export function isValidUrl(value) {
  const v = String(value || '').trim()
  if (!v) return false
  return /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(v)
}

/** A UUID that works even in browsers without crypto.randomUUID. */
export function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const b = crypto.getRandomValues(new Uint8Array(16))
    b[6] = (b[6] & 0x0f) | 0x40
    b[8] = (b[8] & 0x3f) | 0x80
    const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
      16,
      20
    )}-${hex.slice(20)}`
  }
  // Last-resort fallback (never used in practice on a modern tablet)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Turn "aluminium" into "Aluminiu" using the field's option list. */
export function labelForValue(options, value) {
  if (!options) return value
  const found = options.find((o) => o.value === value)
  return found ? found.label : value
}

export function labelsForValues(options, values) {
  if (!Array.isArray(values)) return ''
  return values.map((v) => labelForValue(options, v)).join(', ')
}

/** Safe file name for downloads. */
export function safeFileName(text) {
  return (
    slugify(text).replace(/-/g, '_') || 'export'
  )
}

export function truncate(text, max = 60) {
  const s = String(text || '')
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

export function pluralRo(n, one, few, many) {
  const abs = Math.abs(n)
  if (abs === 1) return one
  if (abs === 0 || (abs % 100 >= 1 && abs % 100 <= 19)) return few
  return many
}
