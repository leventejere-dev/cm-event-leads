/**
 * ---------------------------------------------------------------------------
 *  PUBLIC / KIOSK REGISTRATION SCREEN
 * ---------------------------------------------------------------------------
 *  This is the screen that runs on the tablet at the booth, and the same
 *  screen a visitor opens on their own phone after scanning the QR code.
 *
 *      /#/                      -> the event flagged "active"
 *      /#/register              -> the event flagged "active"
 *      /#/register?event=slug   -> that specific event (QR code links)
 *
 *  It NEVER shows internal data: no lead list, no statuses, no notes.
 * ---------------------------------------------------------------------------
 */
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useBranding } from '../../hooks/useBranding'
import { useConnection } from '../../hooks/useConnection'
import { Logo, Spinner, LanguageSwitcher } from '../../components/common'
import RegistrationForm from '../../components/form/RegistrationForm'
import SuccessScreen from './SuccessScreen'
import {
  fetchActiveEvent,
  fetchEventBySlug,
  fetchPublicForm,
  checkDuplicate
} from '../../lib/db'
import { submitRegistration } from '../../lib/submitRegistration'
import { isConfigured } from '../../lib/supabase'
import { formatDate } from '../../lib/format'
import { localiseEvent, localiseFields } from '../../lib/localise'

const CACHE_EVENT = 'cm_cached_event'
const CACHE_FIELDS = 'cm_cached_fields'

function cacheSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}
function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function RegisterPage() {
  const { t, lang } = useI18n()
  const { brand } = useBranding()
  const { online, pending } = useConnection()
  const [params] = useSearchParams()
  const slug = params.get('event')

  const [event, setEvent] = useState(null)
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [done, setDone] = useState(null) // { leadNumber, offline }
  const [submitError, setSubmitError] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  /* ------------------------------------------------------------- language */
  // The form is configured per event and stored in the database, so its
  // wording cannot come from src/i18n. Translate it here, once per render,
  // and let every child component stay language-agnostic.
  const viewEvent = useMemo(() => localiseEvent(event, lang), [event, lang])
  const viewFields = useMemo(() => localiseFields(fields, lang), [fields, lang])

  /* --------------------------------------------------------------- loading */
  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      if (!isConfigured) throw new Error('NOT_CONFIGURED')
      const ev = slug ? await fetchEventBySlug(slug) : await fetchActiveEvent()
      if (!ev) {
        setEvent(null)
        setFields([])
        setLoading(false)
        return
      }
      const fs = await fetchPublicForm(ev.id)
      if (!mounted.current) return
      setEvent(ev)
      setFields(fs)
      // Cache so the tablet keeps working if the venue Wi-Fi dies mid-day.
      cacheSet(CACHE_EVENT, ev)
      cacheSet(CACHE_FIELDS, fs)
    } catch (err) {
      console.warn('[CM] could not load the event, trying the local cache', err)
      const ev = cacheGet(CACHE_EVENT)
      const fs = cacheGet(CACHE_FIELDS)
      if (ev && fs && (!slug || ev.slug === slug)) {
        setEvent(ev)
        setFields(fs)
      } else {
        setLoadError(err)
      }
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  // Refresh the configuration when the connection comes back.
  useEffect(() => {
    if (online) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  /* ---------------------------------------------------------------- submit */
  const handleSubmit = async ({ values, signatureDataUrl, gdprAccepted }) => {
    setSubmitError(false)
    const res = await submitRegistration({
      event,
      fields,
      values,
      signatureDataUrl,
      gdpr: {
        accepted: gdprAccepted,
        text: viewEvent?.gdpr_text || event?.gdpr_text || '',
        version: event?.gdpr_version || ''
      },
      source: slug ? 'qr' : 'kiosk'
    })
    if (!mounted.current) return

    // The one case we must NOT celebrate: nothing could be stored locally and
    // the upload failed too. Keep the form filled in and tell the operator.
    if (res.failed) {
      setSubmitError(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setDone({ leadNumber: res.leadNumber, offline: res.offline })
  }

  const handleReset = useCallback(() => {
    setDone(null)
    setSubmitError(false)
    setResetKey((k) => k + 1)
    window.scrollTo({ top: 0 })
  }, [])

  /* ---------------------------------------------------------------- render */
  if (loading) {
    return (
      <div className="cm-kiosk">
        <KioskHeader event={null} />
        <div className="cm-kiosk-body">
          <Spinner />
        </div>
      </div>
    )
  }

  if (!isConfigured) {
    return (
      <div className="cm-kiosk">
        <KioskHeader event={null} />
        <div className="cm-kiosk-body">
          <div className="cm-alert cm-alert-danger">
            <div className="cm-alert-title">{t('common.error')}</div>
            {t('errors.noConfig')}
          </div>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <SuccessScreen
        event={viewEvent}
        leadNumber={done.leadNumber}
        offline={done.offline}
        onReset={handleReset}
      />
    )
  }

  if (!event) {
    return (
      <div className="cm-kiosk">
        <KioskHeader event={null} />
        <div className="cm-kiosk-body">
          <div className="cm-card" style={{ textAlign: 'center' }}>
            <h2>{t('kiosk.noEvent')}</h2>
            <p className="cm-muted">{t('kiosk.noEventHelp')}</p>
            {loadError && (
              <button type="button" className="cm-btn cm-btn-ghost" onClick={load}>
                {t('common.retry')}
              </button>
            )}
          </div>
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Link className="cm-small cm-faint" to="/admin">
              {brand.appName} · Admin
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cm-kiosk">
      <KioskHeader event={viewEvent} />

      {!online && (
        <div className="cm-kiosk-status is-offline">
          <span aria-hidden="true">●</span>
          {t('connection.offlineNotice')}
        </div>
      )}
      {online && pending > 0 && (
        <div className="cm-kiosk-status is-pending">
          <span aria-hidden="true">●</span>
          {t('connection.pendingSync', { n: pending })}
        </div>
      )}

      <div className="cm-kiosk-body">
        <div className="cm-kiosk-title">
          <h1>{viewEvent.name}</h1>
          {[viewEvent.location, formatDate(viewEvent.start_date)].filter(Boolean).length > 0 && (
            <div className="cm-kiosk-title-meta">
              {[viewEvent.location, formatDate(viewEvent.start_date)]
                .filter(Boolean)
                .join(' · ')}
            </div>
          )}
          <div className="cm-kiosk-title-sub">{t('kiosk.welcome')}</div>
        </div>

        {submitError && (
          <div className="cm-alert cm-alert-danger" style={{ marginBottom: 24 }}>
            <div className="cm-alert-title">{t('common.error')}</div>
            {t('kiosk.submitFailed')}
          </div>
        )}
        <RegistrationForm
          key={`${event.id}-${resetKey}`}
          event={viewEvent}
          fields={viewFields}
          resetKey={resetKey}
          onSubmit={handleSubmit}
          onCheckDuplicate={(email, phone) => checkDuplicate(event.id, email, phone)}
        />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- sub-views */

function KioskHeader({ event }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="cm-kiosk-header">
      <Logo variant="light" height={26} />

      <div className="cm-row" style={{ gap: 20 }}>
        <LanguageSwitcher />

        {/* discreet staff menu — three lines, opens a small dropdown */}
        <div className="cm-kiosk-menu-wrap">
          <button
            type="button"
            className="cm-kiosk-burger"
            aria-label="Meniu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          {menuOpen && (
            <>
              <div
                className="cm-kiosk-menu-scrim"
                onClick={() => setMenuOpen(false)}
              />
              <div className="cm-kiosk-menu" role="menu">
                <Link to="/admin" role="menuitem" onClick={() => setMenuOpen(false)}>
                  Admin
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => window.location.reload()}
                >
                  ↻ Reîncarcă
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
