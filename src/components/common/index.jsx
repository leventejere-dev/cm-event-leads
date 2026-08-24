/**
 * ---------------------------------------------------------------------------
 *  SHARED UI BUILDING BLOCKS
 * ---------------------------------------------------------------------------
 *  Small, dependency-free components used across the kiosk and the admin.
 * ---------------------------------------------------------------------------
 */
import React, { useEffect, useRef, useState } from 'react'
import QRCodeLib from 'qrcode'
import { useI18n } from '../../i18n'
import { useBranding } from '../../hooks/useBranding'
import { useConnection } from '../../hooks/useConnection'

/* ------------------------------------------------------------------- logo */

export function Logo({ variant = 'color', height, className = '', style }) {
  const { brand } = useBranding()
  const src = variant === 'light' ? brand.logoLight || brand.logo : brand.logo
  return (
    <img
      src={src}
      alt={brand.companyName}
      className={className}
      style={{ height: height || brand.logoHeight, width: 'auto', ...style }}
      draggable="false"
    />
  )
}

/* ---------------------------------------------------------------- spinner */

export function Spinner({ label }) {
  const { t } = useI18n()
  return (
    <div className="cm-loading">
      <span className="cm-spinner" />
      <span>{label || t('common.loading')}</span>
    </div>
  )
}

export function EmptyState({ children }) {
  return <div className="cm-empty">{children}</div>
}

/* ------------------------------------------------------------------ modal */

export function Modal({ title, children, footer, onClose, size = '' }) {
  const { t } = useI18n()
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="cm-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={`cm-modal ${size === 'lg' ? 'cm-modal-lg' : ''}`}>
        <div className="cm-modal-head">
          <h3>{title}</h3>
          <button
            type="button"
            className="cm-btn cm-btn-ghost cm-btn-icon"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>
        <div className="cm-modal-body">{children}</div>
        {footer && <div className="cm-modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger = true,
  onConfirm,
  onCancel,
  busy = false
}) {
  const { t } = useI18n()
  return (
    <Modal
      title={title || t('common.confirm')}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="cm-btn cm-btn-ghost" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={`cm-btn ${danger ? 'cm-btn-danger' : 'cm-btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? t('common.saving') : confirmLabel || t('common.confirm')}
          </button>
        </>
      }
    >
      <p style={{ margin: 0 }}>{message || t('common.areYouSure')}</p>
    </Modal>
  )
}

/* --------------------------------------------------------------- switches */

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <label className="cm-switch">
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="cm-switch-track" />
      {label && <span className="cm-switch-label">{label}</span>}
    </label>
  )
}

/* ------------------------------------------------------------ stat / badge */

export function Stat({ label, value, hint, tone = '' }) {
  return (
    <div className={`cm-stat ${tone ? `is-${tone}` : ''}`}>
      <span className="cm-stat-label">{label}</span>
      <span className="cm-stat-value">{value ?? '—'}</span>
      {hint && <span className="cm-stat-hint">{hint}</span>}
    </div>
  )
}

export function Badge({ children, variant = '' }) {
  return <span className={`cm-badge ${variant}`}>{children}</span>
}

/* ------------------------------------------------------- connection badge */

export function ConnectionBadge({ compact = false }) {
  const { t } = useI18n()
  const { online, pending, syncing, sync } = useConnection()

  let cls = online ? 'is-online' : 'is-offline'
  if (online && pending > 0) cls = 'is-pending'

  return (
    <button
      type="button"
      className={`cm-conn ${cls}`}
      onClick={() => sync()}
      title={t('connection.syncNow')}
    >
      <span className="cm-dot" />
      {syncing
        ? t('connection.syncing')
        : online
          ? t('connection.online')
          : t('connection.offline')}
      {pending > 0 && !compact && ` · ${t('connection.pendingSync', { n: pending })}`}
      {pending > 0 && compact && ` · ${pending}`}
    </button>
  )
}

/* ------------------------------------------------------ language switcher */

export function LanguageSwitcher() {
  const { lang, setLang, languages } = useI18n()
  return (
    <div className="cm-lang" role="group" aria-label="Language">
      {languages.map((l) => (
        <button
          key={l.code}
          type="button"
          className={l.code === lang ? 'is-active' : ''}
          onClick={() => setLang(l.code)}
        >
          {l.short}
        </button>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------- qr code */

export function QRCode({ value, size = 320, label = 'qr' }) {
  const canvasRef = useRef(null)
  const [dataUrl, setDataUrl] = useState(null)
  const { t } = useI18n()

  useEffect(() => {
    let cancelled = false
    if (!value) return () => {}
    QRCodeLib.toDataURL(value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#323232', light: '#FFFFFF' }
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch((err) => console.warn('[CM] QR generation failed', err))
    return () => {
      cancelled = true
    }
  }, [value, size])

  if (!value) return null

  return (
    <div>
      <div className="cm-qr">
        {dataUrl ? (
          <img ref={canvasRef} src={dataUrl} alt={label} />
        ) : (
          <div style={{ width: 200, height: 200 }} />
        )}
      </div>
      {dataUrl && (
        <div style={{ marginTop: 12 }}>
          <a
            className="cm-btn cm-btn-ghost cm-btn-sm"
            href={dataUrl}
            download={`${label}.png`}
          >
            {t('events.downloadQr')}
          </a>
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- copyable */

export function CopyField({ value }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const el = document.createElement('textarea')
      el.value = value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="cm-row">
      <input className="cm-input cm-mono" readOnly value={value} onFocus={(e) => e.target.select()} />
      <button type="button" className="cm-btn cm-btn-ghost" onClick={copy}>
        {copied ? t('common.copied') : t('common.copy')}
      </button>
    </div>
  )
}

export default {
  Logo,
  Spinner,
  EmptyState,
  Modal,
  ConfirmDialog,
  Switch,
  Stat,
  Badge,
  ConnectionBadge,
  LanguageSwitcher,
  QRCode,
  CopyField
}
