import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useToast } from '../../hooks/useToast'
import { Spinner, Modal, ConfirmDialog, Badge } from '../../components/common'
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  setActiveEvent,
  duplicateEvent,
  eventLeadCounts
} from '../../lib/db'
import { EVENT_STATUS_BY_VALUE } from '../../config/leadStatus'
import { slugify, formatDate } from '../../lib/format'

export default function EventsPage() {
  const { t } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()

  const [events, setEvents] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [duplicating, setDuplicating] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, c] = await Promise.all([listEvents(), eventLeadCounts()])
      setEvents(list)
      setCounts(c)
    } catch (err) {
      console.error(err)
      toast.error(t('errors.loadFailed'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const activate = async (ev) => {
    try {
      await setActiveEvent(ev.id)
      toast.success(t('events.activeNow'))
      load()
    } catch (err) {
      toast.error(err.message || t('errors.generic'))
    }
  }

  const archive = async (ev) => {
    try {
      await updateEvent(ev.id, {
        status: ev.status === 'archived' ? 'draft' : 'archived',
        is_active: false
      })
      load()
    } catch (err) {
      toast.error(err.message || t('errors.generic'))
    }
  }

  return (
    <div className="cm-page">
      <div className="cm-page-head">
        <div>
          <h1>{t('events.title')}</h1>
          <div className="cm-page-sub">{t('events.subtitle')}</div>
        </div>
        <button
          type="button"
          className="cm-btn cm-btn-primary"
          onClick={() => setCreating(true)}
        >
          + {t('events.new')}
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : events.length === 0 ? (
        <div className="cm-card" style={{ textAlign: 'center' }}>
          <p className="cm-muted">{t('events.noEvents')}</p>
          <button
            type="button"
            className="cm-btn cm-btn-primary"
            onClick={() => setCreating(true)}
          >
            {t('events.createFirst')}
          </button>
        </div>
      ) : (
        <div className="cm-table-wrap">
          <table className="cm-table">
            <thead>
              <tr>
                <th>{t('events.name')}</th>
                <th>{t('events.location')}</th>
                <th className="cm-nowrap">{t('events.startDate')}</th>
                <th>{t('events.status')}</th>
                <th className="cm-right">{t('events.leads')}</th>
                <th className="cm-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <Link to={`/admin/events/${ev.id}`} style={{ fontWeight: 600 }}>
                      {ev.name}
                    </Link>
                    <div className="cm-small cm-faint cm-mono">{ev.slug}</div>
                  </td>
                  <td>{ev.location || '—'}</td>
                  <td className="cm-nowrap">
                    {formatDate(ev.start_date) || '—'}
                    {ev.end_date && ev.end_date !== ev.start_date
                      ? ` → ${formatDate(ev.end_date)}`
                      : ''}
                  </td>
                  <td>
                    <div className="cm-row" style={{ gap: 6 }}>
                      <Badge variant={EVENT_STATUS_BY_VALUE[ev.status]?.badge || ''}>
                        {t(`eventStatus.${ev.status}`)}
                      </Badge>
                      {ev.is_active && (
                        <Badge variant="cm-badge-primary">{t('events.activeNow')}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="cm-right cm-col-num">{counts[ev.id] || 0}</td>
                  <td className="cm-right">
                    <div
                      className="cm-row"
                      style={{ justifyContent: 'flex-end', gap: 4, flexWrap: 'wrap' }}
                    >
                      <Link
                        className="cm-btn cm-btn-ghost cm-btn-sm"
                        to={`/admin/events/${ev.id}/form`}
                      >
                        {t('events.configureForm')}
                      </Link>
                      <Link
                        className="cm-btn cm-btn-ghost cm-btn-sm"
                        to={`/admin/leads?event=${ev.id}`}
                      >
                        {t('events.viewLeads')}
                      </Link>
                      {!ev.is_active && ev.status !== 'archived' && (
                        <button
                          type="button"
                          className="cm-btn cm-btn-sm"
                          onClick={() => activate(ev)}
                        >
                          {t('events.setActive')}
                        </button>
                      )}
                      <button
                        type="button"
                        className="cm-btn cm-btn-ghost cm-btn-sm"
                        onClick={() => setDuplicating(ev)}
                      >
                        {t('common.duplicate')}
                      </button>
                      <button
                        type="button"
                        className="cm-btn cm-btn-ghost cm-btn-sm"
                        onClick={() => archive(ev)}
                      >
                        {ev.status === 'archived'
                          ? t('common.unarchive')
                          : t('common.archive')}
                      </button>
                      <button
                        type="button"
                        className="cm-btn cm-btn-danger cm-btn-sm"
                        onClick={() => setConfirm(ev)}
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreateEventModal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            toast.success(t('common.success'))
            navigate(`/admin/events/${id}/form`)
          }}
        />
      )}

      {duplicating && (
        <DuplicateEventModal
          event={duplicating}
          onClose={() => setDuplicating(null)}
          onDone={(id) => {
            setDuplicating(null)
            toast.success(t('common.success'))
            navigate(`/admin/events/${id}`)
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={t('common.delete')}
          message={t('events.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await deleteEvent(confirm.id)
              setConfirm(null)
              load()
            } catch (err) {
              toast.error(err.message || t('errors.generic'))
            }
          }}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------- modals -- */

function CreateEventModal({ onClose, onCreated }) {
  const { t } = useI18n()
  const toast = useToast()
  const [values, setValues] = useState({
    name: '',
    slug: '',
    location: '',
    start_date: '',
    end_date: '',
    description: ''
  })
  const [busy, setBusy] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  const set = (k, v) => setValues((p) => ({ ...p, [k]: v }))

  const submit = async () => {
    if (!values.name.trim()) return
    setBusy(true)
    try {
      const ev = await createEvent({
        ...values,
        slug: values.slug || slugify(values.name)
      })
      onCreated(ev.id)
    } catch (err) {
      if (String(err.message).includes('duplicate key')) toast.error(t('errors.slugTaken'))
      else toast.error(err.message || t('errors.generic'))
      setBusy(false)
    }
  }

  return (
    <Modal
      title={t('events.new')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="cm-btn cm-btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="cm-btn cm-btn-primary"
            onClick={submit}
            disabled={busy || !values.name.trim()}
          >
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <div className="cm-field">
        <label className="cm-label">{t('events.name')}</label>
        <input
          className="cm-input"
          value={values.name}
          placeholder={t('events.namePlaceholder')}
          onChange={(e) => {
            set('name', e.target.value)
            if (!slugTouched) set('slug', slugify(e.target.value))
          }}
        />
      </div>
      <div className="cm-field">
        <label className="cm-label">{t('events.slug')}</label>
        <input
          className="cm-input cm-mono"
          value={values.slug}
          onChange={(e) => {
            setSlugTouched(true)
            set('slug', slugify(e.target.value))
          }}
        />
        <div className="cm-help">{t('events.slugHelp')}</div>
      </div>
      <div className="cm-field">
        <label className="cm-label">{t('events.location')}</label>
        <input
          className="cm-input"
          value={values.location}
          placeholder={t('events.locationPlaceholder')}
          onChange={(e) => set('location', e.target.value)}
        />
      </div>
      <div className="cm-grid cm-grid-2">
        <div className="cm-field">
          <label className="cm-label">{t('events.startDate')}</label>
          <input
            className="cm-input"
            type="date"
            value={values.start_date}
            onChange={(e) => set('start_date', e.target.value)}
          />
        </div>
        <div className="cm-field">
          <label className="cm-label">{t('events.endDate')}</label>
          <input
            className="cm-input"
            type="date"
            value={values.end_date}
            onChange={(e) => set('end_date', e.target.value)}
          />
        </div>
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
    </Modal>
  )
}

function DuplicateEventModal({ event, onClose, onDone }) {
  const { t } = useI18n()
  const toast = useToast()
  const [name, setName] = useState(`${event.name} (copie)`)
  const [slug, setSlug] = useState(slugify(`${event.slug}-copie`))
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      const id = await duplicateEvent(event.id, name, slug)
      onDone(id)
    } catch (err) {
      if (String(err.message).includes('duplicate key')) toast.error(t('errors.slugTaken'))
      else toast.error(err.message || t('errors.generic'))
      setBusy(false)
    }
  }

  return (
    <Modal
      title={t('events.duplicateTitle')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="cm-btn cm-btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="cm-btn cm-btn-primary"
            onClick={submit}
            disabled={busy}
          >
            {busy ? t('common.saving') : t('common.duplicate')}
          </button>
        </>
      }
    >
      <div className="cm-alert cm-alert-info" style={{ marginBottom: 18 }}>
        {t('events.duplicateHelp')}
      </div>
      <div className="cm-field">
        <label className="cm-label">{t('events.duplicateNewName')}</label>
        <input
          className="cm-input"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSlug(slugify(e.target.value))
          }}
        />
      </div>
      <div className="cm-field">
        <label className="cm-label">{t('events.slug')}</label>
        <input
          className="cm-input cm-mono"
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
        />
      </div>
    </Modal>
  )
}
