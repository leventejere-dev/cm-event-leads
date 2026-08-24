/**
 * ---------------------------------------------------------------------------
 *  FORM BUILDER
 * ---------------------------------------------------------------------------
 *  Per-event configuration of the registration form:
 *      * enable / disable every standard field
 *      * required / optional, independently, per field
 *      * label, placeholder, help text
 *      * order (drag & drop, with Up/Down buttons as a reliable fallback)
 *      * brand-new custom questions of any supported type
 *      * signature mode and GDPR mode / text
 *      * form templates
 *      * live preview of exactly what the visitor sees
 * ---------------------------------------------------------------------------
 */
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useToast } from '../../hooks/useToast'
import { Spinner, Modal, ConfirmDialog, Switch, Badge } from '../../components/common'
import RegistrationForm from '../../components/form/RegistrationForm'
import {
  getEvent,
  updateEvent,
  getFormFields,
  updateField,
  createField,
  deleteField,
  replaceFieldOptions,
  saveFieldOrder
} from '../../lib/db'
import {
  SECTIONS,
  FIELD_TYPE_LIST,
  TYPES_WITH_OPTIONS,
  FIELD_TYPES,
  CATALOG_BY_KEY
} from '../../config/fieldCatalog'
import { FORM_TEMPLATES } from '../../config/templates'
import { CONSENT_MODES } from '../../config/leadStatus'
import { keyify } from '../../lib/format'

export default function FormBuilderPage() {
  const { t } = useI18n()
  const { id } = useParams()
  const toast = useToast()

  const [event, setEvent] = useState(null)
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [preview, setPreview] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [savingConsent, setSavingConsent] = useState(false)
  const dragKey = useRef(null)
  const [dragOver, setDragOver] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ev, fs] = await Promise.all([getEvent(id), getFormFields(id)])
      setEvent(ev)
      setFields(fs)
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

  const enabledFields = useMemo(() => fields.filter((f) => f.enabled), [fields])

  /* --------------------------------------------------------- field edits */

  const patchField = async (field, patch) => {
    setFields((prev) =>
      prev.map((f) => (f.id === field.id ? { ...f, ...patch } : f))
    )
    try {
      await updateField(field.id, patch)
    } catch (err) {
      toast.error(err.message || t('errors.generic'))
      load()
    }
  }

  const move = async (index, dir) => {
    const next = [...fields]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    const tmp = next[index]
    next[index] = next[target]
    next[target] = tmp
    const reordered = next.map((f, i) => ({ ...f, sort_order: (i + 1) * 10 }))
    setFields(reordered)
    try {
      await saveFieldOrder(reordered.map((f) => ({ id: f.id, sort_order: f.sort_order })))
    } catch (err) {
      toast.error(err.message || t('errors.generic'))
      load()
    }
  }

  const dropOn = async (targetId) => {
    const fromId = dragKey.current
    setDragOver(null)
    dragKey.current = null
    if (!fromId || fromId === targetId) return
    const fromIndex = fields.findIndex((f) => f.id === fromId)
    const toIndex = fields.findIndex((f) => f.id === targetId)
    if (fromIndex < 0 || toIndex < 0) return

    const next = [...fields]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    const reordered = next.map((f, i) => ({ ...f, sort_order: (i + 1) * 10 }))
    setFields(reordered)
    try {
      await saveFieldOrder(reordered.map((f) => ({ id: f.id, sort_order: f.sort_order })))
    } catch (err) {
      toast.error(err.message || t('errors.generic'))
      load()
    }
  }

  /* ------------------------------------------------------------ consent */

  const saveConsent = async (patch) => {
    setEvent((p) => ({ ...p, ...patch }))
    setSavingConsent(true)
    try {
      await updateEvent(id, patch)
    } catch (err) {
      toast.error(err.message || t('errors.generic'))
    } finally {
      setSavingConsent(false)
    }
  }

  /* ----------------------------------------------------------- template */

  const applyTemplate = async (tpl) => {
    setTemplateOpen(false)
    try {
      const enabledSet = new Set(tpl.enabled)
      const requiredSet = new Set(tpl.required)
      const updates = fields
        .filter((f) => !f.is_custom)
        .map((f) => ({
          id: f.id,
          enabled: enabledSet.has(f.field_key),
          required: requiredSet.has(f.field_key)
        }))

      await Promise.all(updates.map((u) => updateField(u.id, {
        enabled: u.enabled,
        required: u.required
      })))
      await updateEvent(id, {
        signature_mode: tpl.signature_mode,
        gdpr_mode: tpl.gdpr_mode
      })
      toast.success(t('builder.saved'))
      load()
    } catch (err) {
      toast.error(err.message || t('errors.generic'))
    }
  }

  if (loading || !event) return <Spinner />

  /* -------------------------------------------------------------- render */

  // group for display, but keep the true global order
  const grouped = SECTIONS.map((s) => ({
    section: s,
    items: fields.filter((f) => f.section === s.key)
  })).filter((g) => g.items.length > 0)

  const customOnly = fields.filter((f) => !SECTIONS.some((s) => s.key === f.section))
  if (customOnly.length) {
    grouped.push({
      section: { key: 'custom', titleKey: 'section.custom' },
      items: customOnly
    })
  }

  return (
    <div className="cm-page">
      <div className="cm-page-head">
        <div>
          <div className="cm-eyebrow">
            <Link to={`/admin/events/${id}`}>← {event.name}</Link>
          </div>
          <h1>{t('builder.title')}</h1>
          <div className="cm-page-sub">{t('builder.subtitle')}</div>
        </div>
        <div className="cm-row" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className="cm-btn cm-btn-ghost"
            onClick={() => setTemplateOpen(true)}
          >
            {t('builder.applyTemplate')}
          </button>
          <button
            type="button"
            className="cm-btn cm-btn-ghost"
            onClick={() => setCreating(true)}
          >
            + {t('builder.addCustom')}
          </button>
          <button
            type="button"
            className="cm-btn cm-btn-primary"
            onClick={() => setPreview(true)}
          >
            {t('builder.previewForm')}
          </button>
        </div>
      </div>

      <div
        className="cm-grid"
        style={{ gridTemplateColumns: 'minmax(0,2.2fr) minmax(0,1fr)', alignItems: 'start' }}
      >
        {/* ---------------------------------------------------- field list */}
        <div className="cm-card cm-card-flush">
          <div className="cm-card-head">
            <h3>{t('builder.fields')}</h3>
            <span className="cm-small cm-muted">
              {t('builder.enabledCount', { n: enabledFields.length })}
            </span>
          </div>
          <div style={{ padding: '10px 20px 0' }}>
            <p className="cm-small cm-faint">{t('builder.reorderHint')}</p>
          </div>

          {grouped.map((group) => (
            <div key={group.section.key}>
              <div className="cm-section-head">{t(group.section.titleKey)}</div>
              {group.items.map((field) => {
                const index = fields.findIndex((f) => f.id === field.id)
                return (
                  <div
                    key={field.id}
                    className={`cm-builder-row ${field.enabled ? '' : 'is-disabled'} ${
                      dragOver === field.id ? 'is-dragover' : ''
                    }`}
                    draggable
                    onDragStart={() => {
                      dragKey.current = field.id
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(field.id)
                    }}
                    onDragLeave={() => setDragOver((v) => (v === field.id ? null : v))}
                    onDrop={(e) => {
                      e.preventDefault()
                      dropOn(field.id)
                    }}
                  >
                    <span className="cm-builder-handle" title={t('common.moveUp')}>
                      ⠿
                    </span>

                    <div className="cm-grow">
                      <div className="cm-builder-label">
                        {field.label}
                        {field.required && <span className="cm-req">*</span>}
                        {field.is_custom && (
                          <>
                            {' '}
                            <Badge variant="cm-badge-primary">
                              {t('section.custom')}
                            </Badge>
                          </>
                        )}
                      </div>
                      <div className="cm-builder-key">
                        {field.field_key} · {t(`fieldType.${field.field_type}`)}
                        {field.options?.length ? ` · ${field.options.length} opt.` : ''}
                      </div>
                    </div>

                    <Switch
                      checked={field.enabled}
                      onChange={(v) => patchField(field, { enabled: v })}
                      label={t('common.enabled')}
                    />
                    <Switch
                      checked={field.required}
                      onChange={(v) => patchField(field, { required: v })}
                      label={t('common.required')}
                      disabled={!field.enabled}
                    />

                    <div className="cm-builder-actions">
                      <button
                        type="button"
                        className="cm-btn cm-btn-ghost cm-btn-icon"
                        onClick={() => move(index, -1)}
                        aria-label={t('common.moveUp')}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="cm-btn cm-btn-ghost cm-btn-icon"
                        onClick={() => move(index, 1)}
                        aria-label={t('common.moveDown')}
                        disabled={index === fields.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="cm-btn cm-btn-ghost cm-btn-sm"
                        onClick={() => setEditing(field)}
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        className="cm-btn cm-btn-danger cm-btn-icon"
                        onClick={() => setConfirmDelete(field)}
                        aria-label={t('common.delete')}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* ------------------------------------------------- consent panel */}
        <div className="cm-stack">
          <div className="cm-card">
            <h3 style={{ marginBottom: 16 }}>{t('builder.signature')}</h3>
            <div className="cm-field">
              <label className="cm-label">{t('builder.signatureMode')}</label>
              <select
                className="cm-select"
                value={event.signature_mode}
                onChange={(e) => saveConsent({ signature_mode: e.target.value })}
              >
                {CONSENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {t(`mode.${m.value}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="cm-card">
            <h3 style={{ marginBottom: 16 }}>{t('builder.gdpr')}</h3>
            <div className="cm-field">
              <label className="cm-label">{t('builder.gdprMode')}</label>
              <select
                className="cm-select"
                value={event.gdpr_mode}
                onChange={(e) => saveConsent({ gdpr_mode: e.target.value })}
              >
                {CONSENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {t(`mode.${m.value}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="cm-field">
              <label className="cm-label">{t('builder.gdprText')}</label>
              <textarea
                className="cm-textarea"
                rows={7}
                value={event.gdpr_text || ''}
                onChange={(e) => setEvent((p) => ({ ...p, gdpr_text: e.target.value }))}
                onBlur={(e) => saveConsent({ gdpr_text: e.target.value })}
              />
            </div>

            <div className="cm-field">
              <label className="cm-label">{t('builder.gdprVersion')}</label>
              <input
                className="cm-input cm-mono"
                value={event.gdpr_version || ''}
                onChange={(e) => setEvent((p) => ({ ...p, gdpr_version: e.target.value }))}
                onBlur={(e) => saveConsent({ gdpr_version: e.target.value })}
              />
              <div className="cm-help">{t('builder.gdprVersionHelp')}</div>
            </div>

            {savingConsent && <span className="cm-small cm-faint">{t('common.saving')}</span>}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ modals */}
      {editing && (
        <FieldModal
          field={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}

      {creating && (
        <FieldModal
          eventId={id}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            load()
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t('common.delete')}
          message={t('builder.deleteFieldConfirm')}
          confirmLabel={t('common.delete')}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            try {
              await deleteField(confirmDelete.id)
              setConfirmDelete(null)
              load()
            } catch (err) {
              toast.error(err.message || t('errors.generic'))
            }
          }}
        />
      )}

      {templateOpen && (
        <Modal title={t('builder.templates')} onClose={() => setTemplateOpen(false)} size="lg">
          <div className="cm-alert cm-alert-warning" style={{ marginBottom: 18 }}>
            {t('builder.templateWarn')}
          </div>
          <div className="cm-stack">
            {FORM_TEMPLATES.map((tpl) => (
              <div className="cm-card cm-card-accent" key={tpl.key}>
                <div className="cm-row-between">
                  <div>
                    <h3 style={{ marginBottom: 4 }}>{tpl.name}</h3>
                    <p className="cm-small cm-muted" style={{ margin: 0 }}>
                      {tpl.description}
                    </p>
                    <p className="cm-small cm-faint" style={{ marginTop: 8, marginBottom: 0 }}>
                      {tpl.enabled.length} {t('builder.fields').toLowerCase()} ·{' '}
                      {t('builder.signature')}: {t(`mode.${tpl.signature_mode}`)} · GDPR:{' '}
                      {t(`mode.${tpl.gdpr_mode}`)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="cm-btn cm-btn-primary"
                    onClick={() => applyTemplate(tpl)}
                  >
                    {t('common.apply')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {preview && (
        <PreviewOverlay
          event={event}
          fields={enabledFields}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  )
}

/* ========================================================================== */
/*  FIELD EDITOR                                                              */
/* ========================================================================== */

function FieldModal({ field, eventId, onClose, onSaved }) {
  const { t } = useI18n()
  const toast = useToast()
  const isNew = !field
  const catalogEntry = field ? CATALOG_BY_KEY[field.field_key] : null
  const lockType = Boolean(field && !field.is_custom && catalogEntry)

  const [values, setValues] = useState(() => ({
    label: field?.label || '',
    field_key: field?.field_key || '',
    field_type: field?.field_type || FIELD_TYPES.TEXT,
    section: field?.section || 'custom',
    placeholder: field?.placeholder || '',
    help_text: field?.help_text || '',
    enabled: field ? field.enabled : true,
    required: field ? field.required : false
  }))
  const originalOptionsText = (field?.options || []).map((o) => o.label).join('\n')
  const [optionsText, setOptionsText] = useState(originalOptionsText)
  const [busy, setBusy] = useState(false)
  const [keyTouched, setKeyTouched] = useState(!isNew)

  const set = (k, v) => setValues((p) => ({ ...p, [k]: v }))
  const needsOptions = TYPES_WITH_OPTIONS.includes(values.field_type)

  // IMPORTANT: the stored `value` of an option is what ends up in the database,
  // in the filters and in the Excel export. Renaming a label must NEVER change
  // the value of an option that already exists, otherwise previously collected
  // leads stop matching. So we keep the old value whenever the label is
  // unchanged and only generate a new one for genuinely new options.
  const existingValueByLabel = (field?.options || []).reduce((acc, o) => {
    acc[o.label.trim().toLowerCase()] = o.value
    return acc
  }, {})

  const parseOptions = () =>
    optionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label) => ({
        value: existingValueByLabel[label.toLowerCase()] || keyify(label) || label,
        label
      }))

  const submit = async () => {
    if (!values.label.trim()) return
    setBusy(true)
    try {
      if (isNew) {
        await createField(eventId, {
          ...values,
          field_key: values.field_key || keyify(values.label),
          is_custom: true,
          options: needsOptions ? parseOptions() : []
        })
      } else {
        await updateField(field.id, {
          label: values.label,
          placeholder: values.placeholder,
          help_text: values.help_text,
          enabled: values.enabled,
          required: values.required,
          section: values.section,
          ...(field.is_custom ? { field_type: values.field_type } : {})
        })
        // Only rewrite the option rows when the admin actually edited them.
        if (needsOptions && optionsText !== originalOptionsText) {
          await replaceFieldOptions(field.id, parseOptions())
        }
      }
      onSaved()
    } catch (err) {
      if (String(err.message).includes('duplicate key')) {
        toast.error(t('errors.fieldKeyTaken'))
      } else {
        toast.error(err.message || t('errors.generic'))
      }
      setBusy(false)
    }
  }

  return (
    <Modal
      title={isNew ? t('builder.newCustomField') : t('builder.editField')}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="cm-btn cm-btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="cm-btn cm-btn-primary"
            onClick={submit}
            disabled={busy || !values.label.trim()}
          >
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <div className="cm-field">
        <label className="cm-label">{t('builder.label')}</label>
        <input
          className="cm-input"
          value={values.label}
          onChange={(e) => {
            set('label', e.target.value)
            if (isNew && !keyTouched) set('field_key', keyify(e.target.value))
          }}
        />
      </div>

      <div className="cm-grid cm-grid-2">
        <div className="cm-field">
          <label className="cm-label">{t('builder.fieldKey')}</label>
          <input
            className="cm-input cm-mono"
            value={values.field_key}
            disabled={!isNew}
            onChange={(e) => {
              setKeyTouched(true)
              set('field_key', keyify(e.target.value))
            }}
          />
          <div className="cm-help">{t('builder.fieldKeyHelp')}</div>
        </div>

        <div className="cm-field">
          <label className="cm-label">{t('builder.fieldType')}</label>
          <select
            className="cm-select"
            value={values.field_type}
            disabled={lockType}
            onChange={(e) => set('field_type', e.target.value)}
          >
            {FIELD_TYPE_LIST.map((ft) => (
              <option key={ft.value} value={ft.value}>
                {t(ft.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cm-grid cm-grid-2">
        <div className="cm-field">
          <label className="cm-label">{t('builder.placeholder')}</label>
          <input
            className="cm-input"
            value={values.placeholder}
            onChange={(e) => set('placeholder', e.target.value)}
          />
        </div>
        <div className="cm-field">
          <label className="cm-label">{t('builder.section')}</label>
          <select
            className="cm-select"
            value={values.section}
            onChange={(e) => set('section', e.target.value)}
          >
            {SECTIONS.filter((s) => s.key !== 'consent').map((s) => (
              <option key={s.key} value={s.key}>
                {t(s.titleKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cm-field">
        <label className="cm-label">{t('builder.helpText')}</label>
        <input
          className="cm-input"
          value={values.help_text}
          onChange={(e) => set('help_text', e.target.value)}
        />
      </div>

      {needsOptions && (
        <div className="cm-field">
          <label className="cm-label">{t('builder.options')}</label>
          <textarea
            className="cm-textarea"
            rows={7}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder={'Aluminiu\nCupru\nTitan-zinc\nOțel\nAltele'}
          />
          <div className="cm-help">{t('builder.optionsHelp')}</div>
        </div>
      )}

      <div className="cm-row" style={{ gap: 28, marginTop: 8 }}>
        <Switch
          checked={values.enabled}
          onChange={(v) => set('enabled', v)}
          label={t('builder.enabled')}
        />
        <Switch
          checked={values.required}
          onChange={(v) => set('required', v)}
          label={t('builder.required')}
        />
      </div>
    </Modal>
  )
}

/* ========================================================================== */
/*  PREVIEW                                                                   */
/* ========================================================================== */

function PreviewOverlay({ event, fields, onClose }) {
  const { t } = useI18n()
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--cm-bg)',
        zIndex: 1100,
        overflow: 'auto'
      }}
    >
      <div className="cm-kiosk">
        <header className="cm-kiosk-header">
          <div>
            <div className="cm-kiosk-event-name">{event.name}</div>
            <div className="cm-kiosk-event-meta">{t('common.preview')}</div>
          </div>
          <button type="button" className="cm-btn cm-btn-ghost" onClick={onClose}>
            ✕ {t('builder.exitPreview')}
          </button>
        </header>
        <div className="cm-kiosk-body">
          <div className="cm-alert cm-alert-info" style={{ marginBottom: 24 }}>
            {t('builder.previewNote')}
          </div>
          <RegistrationForm
            key={resetKey}
            event={event}
            fields={fields}
            preview
            resetKey={resetKey}
            onSubmit={async () => {
              // eslint-disable-next-line no-alert
              setResetKey((k) => k + 1)
            }}
          />
        </div>
      </div>
    </div>
  )
}
