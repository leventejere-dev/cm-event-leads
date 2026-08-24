import React, { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useToast } from '../../hooks/useToast'
import { Spinner, Stat, QRCode, CopyField, Badge } from '../../components/common'
import { getEvent, updateEvent, eventStats, setActiveEvent } from '../../lib/db'
import { EVENT_STATUSES, EVENT_STATUS_BY_VALUE } from '../../config/leadStatus'
import { slugify, labelForValue } from '../../lib/format'
import {
  OPTIONS_INTERESTS,
  OPTIONS_VISITOR_TYPE
} from '../../config/fieldCatalog'

/** Absolute, shareable registration URL for this event (works on GitHub Pages). */
export function buildRegistrationUrl(slug) {
  const base = import.meta.env.BASE_URL || '/'
  const origin = window.location.origin
  const path = `${origin}${base}`.replace(/\/+$/, '/')
  return `${path}#/register?event=${encodeURIComponent(slug)}`
}

export default function EventDetailPage() {
  const { t } = useI18n()
  const { id } = useParams()
  const toast = useToast()

  const [event, setEvent] = useState(null)
  const [values, setValues] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const ev = await getEvent(id)
      setEvent(ev)
      setValues({
        name: ev.name || '',
        slug: ev.slug || '',
        location: ev.location || '',
        start_date: ev.start_date || '',
        end_date: ev.end_date || '',
        description: ev.description || '',
        status: ev.status || 'draft'
      })
      const s = await eventStats(id).catch(() => null)
      setStats(s)
    } catch (err) {
      console.error(err)
      toast.error(t('errors.loadFailed'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const set = (k, v) => setValues((p) => ({ ...p, [k]: v }))

  const save = async () => {
    setBusy(true)
    try {
      const patch = {
        ...values,
        start_date: values.start_date || null,
        end_date: values.end_date || null
      }
      const updated = await updateEvent(id, patch)
      setEvent(updated)
      toast.success(t('common.success'))
    } catch (err) {
      if (String(err.message).includes('duplicate key')) toast.error(t('errors.slugTaken'))
      else toast.error(err.message || t('errors.generic'))
    } finally {
      setBusy(false)
    }
  }

  const activate = async () => {
    try {
      const updated = await setActiveEvent(id)
      setEvent(updated)
      setValues((p) => ({ ...p, status: 'active' }))
      toast.success(t('events.activeNow'))
    } catch (err) {
      toast.error(err.message || t('errors.generic'))
    }
  }

  if (loading || !values) return <Spinner />

  const url = buildRegistrationUrl(event.slug)

  return (
    <div className="cm-page">
      <div className="cm-page-head">
        <div>
          <div className="cm-eyebrow">
            <Link to="/admin/events">← {t('events.title')}</Link>
          </div>
          <h1>{event.name}</h1>
          <div className="cm-row" style={{ marginTop: 8 }}>
            <Badge variant={EVENT_STATUS_BY_VALUE[event.status]?.badge || ''}>
              {t(`eventStatus.${event.status}`)}
            </Badge>
            {event.is_active && (
              <Badge variant="cm-badge-primary">{t('events.activeNow')}</Badge>
            )}
          </div>
        </div>
        <div className="cm-row" style={{ flexWrap: 'wrap' }}>
          {!event.is_active && (
            <button type="button" className="cm-btn" onClick={activate}>
              {t('events.setActive')}
            </button>
          )}
          <Link className="cm-btn cm-btn-ghost" to={`/admin/leads?event=${event.id}`}>
            {t('events.viewLeads')}
          </Link>
          <Link className="cm-btn cm-btn-primary" to={`/admin/events/${event.id}/form`}>
            {t('events.configureForm')}
          </Link>
        </div>
      </div>

      <div className="cm-grid" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }}>
        {/* ------------------------------------------------------- details */}
        <div className="cm-card">
          <h3 style={{ marginBottom: 18 }}>{t('events.edit')}</h3>

          <div className="cm-field">
            <label className="cm-label">{t('events.name')}</label>
            <input
              className="cm-input"
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="cm-field">
            <label className="cm-label">{t('events.slug')}</label>
            <input
              className="cm-input cm-mono"
              value={values.slug}
              onChange={(e) => set('slug', slugify(e.target.value))}
            />
            <div className="cm-help">{t('events.slugHelp')}</div>
          </div>

          <div className="cm-field">
            <label className="cm-label">{t('events.location')}</label>
            <input
              className="cm-input"
              value={values.location}
              onChange={(e) => set('location', e.target.value)}
            />
          </div>

          <div className="cm-grid cm-grid-2">
            <div className="cm-field">
              <label className="cm-label">{t('events.startDate')}</label>
              <input
                className="cm-input"
                type="date"
                value={values.start_date || ''}
                onChange={(e) => set('start_date', e.target.value)}
              />
            </div>
            <div className="cm-field">
              <label className="cm-label">{t('events.endDate')}</label>
              <input
                className="cm-input"
                type="date"
                value={values.end_date || ''}
                onChange={(e) => set('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="cm-field">
            <label className="cm-label">{t('events.status')}</label>
            <select
              className="cm-select"
              value={values.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {EVENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(`eventStatus.${s.value}`)}
                </option>
              ))}
            </select>
            <div className="cm-help">{t('events.isActiveHelp')}</div>
          </div>

          <div className="cm-field">
            <label className="cm-label">{t('events.description')}</label>
            <textarea
              className="cm-textarea"
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
            />
            <div className="cm-help">{t('events.descriptionHelp')}</div>
          </div>

          <div className="cm-row" style={{ justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="cm-btn cm-btn-primary"
              onClick={save}
              disabled={busy}
            >
              {busy ? t('common.saving') : t('common.saveChanges')}
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------ QR */}
        <div className="cm-stack">
          <div className="cm-card">
            <h3 style={{ marginBottom: 14 }}>{t('events.qrTitle')}</h3>
            <p className="cm-small cm-muted">{t('events.qrHelp')}</p>
            <QRCode value={url} label={`qr-${event.slug}`} />
            <div style={{ marginTop: 18 }}>
              <label className="cm-label">{t('events.publicLink')}</label>
              <CopyField value={url} />
              <div style={{ marginTop: 10 }}>
                <a
                  className="cm-btn cm-btn-ghost cm-btn-sm"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('common.open')} →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ stats */}
      {stats && (
        <>
          <h2 style={{ marginTop: 32, marginBottom: 14 }}>{t('events.stats')}</h2>
          <div className="cm-grid cm-grid-4" style={{ marginBottom: 20 }}>
            <Stat label={t('leads.title')} value={stats.registrations ?? 0} />
            <Stat
              label={t('events.uniqueCompanies')}
              value={stats.unique_companies ?? 0}
              tone="secondary"
            />
            <Stat
              label={t('events.followUpRequests')}
              value={stats.follow_up ?? 0}
              tone="accent"
            />
            <Stat label={t('builder.signature')} value={stats.with_signature ?? 0} tone="dark" />
          </div>

          <div className="cm-grid cm-grid-2">
            <TopList
              title={t('events.visitorProfiles')}
              items={stats.visitor_types}
              options={OPTIONS_VISITOR_TYPE}
            />
            <TopList
              title={t('events.topInterests')}
              items={stats.interests}
              options={OPTIONS_INTERESTS}
            />
            <TopList title={t('events.counties')} items={stats.counties} />
            <TopList title={t('events.cities')} items={stats.cities} />
          </div>
        </>
      )}
    </div>
  )
}

function TopList({ title, items, options }) {
  const { t } = useI18n()
  const list = Array.isArray(items) ? items : []
  const max = list.reduce((m, i) => Math.max(m, Number(i.n) || 0), 0) || 1

  return (
    <div className="cm-card cm-card-flush">
      <div className="cm-card-head">
        <h3>{title}</h3>
      </div>
      {list.length === 0 ? (
        <div className="cm-empty">{t('common.noResults')}</div>
      ) : (
        <div style={{ padding: '12px 20px 18px' }}>
          {list.map((i) => (
            <div key={i.key} style={{ marginBottom: 10 }}>
              <div className="cm-row-between" style={{ marginBottom: 3 }}>
                <span className="cm-small">
                  {options ? labelForValue(options, i.key) : i.key}
                </span>
                <span className="cm-small cm-mono cm-muted">{i.n}</span>
              </div>
              <div
                style={{
                  height: 4,
                  background: 'var(--cm-border)',
                  borderRadius: 1
                }}
              >
                <div
                  style={{
                    width: `${(Number(i.n) / max) * 100}%`,
                    height: '100%',
                    background: 'var(--cm-primary)'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
