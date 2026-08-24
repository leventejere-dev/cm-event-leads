import React, { useEffect, useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useToast } from '../../hooks/useToast'
import { Spinner, Badge, ConfirmDialog } from '../../components/common'
import {
  getLead,
  updateLead,
  deleteLead,
  listReps,
  getSignatureUrl
} from '../../lib/db'
import { LEAD_STATUSES, STATUS_BY_VALUE } from '../../config/leadStatus'
import { OPTIONS_INTERESTS, OPTIONS_VISITOR_TYPE } from '../../config/fieldCatalog'
import { formatDate, labelForValue } from '../../lib/format'

export default function LeadDetailPage() {
  const { t } = useI18n()
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [lead, setLead] = useState(null)
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [sigUrl, setSigUrl] = useState(null)
  const [internal, setInternal] = useState({
    status: 'new',
    assigned_to: '',
    internal_notes: '',
    follow_up_date: '',
    contacted_at: ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [l, r] = await Promise.all([getLead(id), listReps()])
      setLead(l)
      setReps(r)
      setInternal({
        status: l.status || 'new',
        assigned_to: l.assigned_to || '',
        internal_notes: l.internal_notes || '',
        follow_up_date: l.follow_up_date || '',
        contacted_at: l.contacted_at ? l.contacted_at.slice(0, 10) : ''
      })
      if (l.signature_path) {
        const url = await getSignatureUrl(l.signature_path)
        setSigUrl(url)
      } else if (l.signature_data) {
        setSigUrl(l.signature_data)
      }
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

  const save = async () => {
    setBusy(true)
    try {
      const patch = {
        status: internal.status,
        assigned_to: internal.assigned_to || null,
        internal_notes: internal.internal_notes || null,
        follow_up_date: internal.follow_up_date || null,
        contacted_at: internal.contacted_at
          ? new Date(`${internal.contacted_at}T12:00:00`).toISOString()
          : null
      }
      const updated = await updateLead(id, patch)
      setLead((p) => ({ ...p, ...updated }))
      toast.success(t('leads.saved'))
    } catch (err) {
      toast.error(err.message || t('errors.generic'))
    } finally {
      setBusy(false)
    }
  }

  if (loading || !lead) return <Spinner />

  const name =
    lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'

  return (
    <div className="cm-page">
      <div className="cm-page-head">
        <div>
          <div className="cm-eyebrow">
            <Link to="/admin/leads">← {t('leads.backToList')}</Link>
          </div>
          <h1>{name}</h1>
          <div className="cm-row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <span className="cm-mono cm-small cm-faint">{lead.lead_number}</span>
            <Badge variant={STATUS_BY_VALUE[lead.status]?.badge || ''}>
              {t(`status.${lead.status}`)}
            </Badge>
            {lead.follow_up_requested && (
              <Badge variant="cm-badge-warning">{t('leads.followUp')}</Badge>
            )}
            {lead.gdpr_accepted && (
              <Badge variant="cm-badge-success">GDPR ✓</Badge>
            )}
          </div>
        </div>
        <div className="cm-row">
          <button
            type="button"
            className="cm-btn cm-btn-danger"
            onClick={() => setConfirm(true)}
          >
            {t('common.delete')}
          </button>
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

      <div
        className="cm-grid"
        style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', alignItems: 'start' }}
      >
        {/* ------------------------------------------------------ visitor */}
        <div className="cm-stack">
          <div className="cm-card">
            <h3 style={{ marginBottom: 16 }}>{t('section.contact')}</h3>
            <dl className="cm-kv">
              <Row label={t('leads.name')} value={name} />
              <Row label={t('leads.company')} value={lead.company} />
              <Row label={t('leads.position')} value={lead.job_title} />
              <Row label={t('leads.profession')} value={lead.profession} />
              <Row
                label={t('leads.phone')}
                value={
                  lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : null
                }
              />
              <Row
                label={t('leads.email')}
                value={
                  lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : null
                }
              />
              <Row label={t('leads.country')} value={lead.country} />
              <Row label={t('leads.county')} value={lead.county} />
              <Row label={t('leads.city')} value={lead.city} />
              <Row
                label={t('leads.visitorType')}
                value={
                  lead.visitor_type
                    ? labelForValue(OPTIONS_VISITOR_TYPE, lead.visitor_type)
                    : null
                }
              />
              <Row
                label={t('leads.interests')}
                value={
                  lead.interests?.length ? (
                    <div className="cm-chip-row">
                      {lead.interests.map((i) => (
                        <Badge key={i}>{labelForValue(OPTIONS_INTERESTS, i)}</Badge>
                      ))}
                    </div>
                  ) : null
                }
              />
              <Row
                label={t('leads.followUp')}
                value={lead.follow_up_requested ? t('common.yes') : t('common.no')}
              />
              <Row label={t('leads.event')} value={lead.event?.name} />
              <Row
                label={t('leads.registeredAt')}
                value={formatDate(lead.created_at, { withTime: true })}
              />
              <Row label={t('leads.source')} value={lead.source} />
            </dl>
          </div>

          {/* --------------------------------------------------- answers */}
          <div className="cm-card cm-card-flush">
            <div className="cm-card-head">
              <h3>{t('leads.answers')}</h3>
            </div>
            {lead.answers?.length ? (
              <div className="cm-table-wrap" style={{ border: 0, borderRadius: 0 }}>
                <table className="cm-table">
                  <tbody>
                    {lead.answers.map((a) => (
                      <tr key={a.id}>
                        <td style={{ width: '42%', color: 'var(--cm-text-muted)' }}>
                          {a.field_label || a.field_key}
                          <div className="cm-builder-key">{a.field_key}</div>
                        </td>
                        <td>{renderAnswer(a, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="cm-empty">{t('common.noResults')}</div>
            )}
          </div>

          {/* ------------------------------------------------- gdpr / sig */}
          <div className="cm-card">
            <h3 style={{ marginBottom: 16 }}>{t('section.consent')}</h3>
            <dl className="cm-kv">
              <Row
                label={t('leads.gdpr')}
                value={lead.gdpr_accepted ? t('common.yes') : t('common.no')}
              />
              <Row
                label={t('leads.gdprAcceptedAt')}
                value={formatDate(lead.gdpr_accepted_at, { withTime: true })}
              />
              <Row label={t('leads.gdprVersion')} value={lead.gdpr_version} />
              <Row
                label={t('builder.gdprText')}
                value={
                  lead.gdpr_text_snapshot ? (
                    <span className="cm-small" style={{ whiteSpace: 'pre-wrap' }}>
                      {lead.gdpr_text_snapshot}
                    </span>
                  ) : null
                }
              />
            </dl>

            <div style={{ marginTop: 18 }}>
              <label className="cm-label">{t('leads.signature')}</label>
              {sigUrl ? (
                <div className="cm-sig-preview">
                  <img src={sigUrl} alt={t('leads.signature')} />
                </div>
              ) : (
                <div className="cm-small cm-faint">{t('leads.noSignature')}</div>
              )}
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------- internal */}
        <div className="cm-card cm-card-accent">
          <h3 style={{ marginBottom: 6 }}>{t('leads.internal')}</h3>
          <p className="cm-small cm-faint">{t('leads.internalNotesHelp')}</p>

          <div className="cm-field">
            <label className="cm-label">{t('leads.status')}</label>
            <select
              className="cm-select"
              value={internal.status}
              onChange={(e) => setInternal((p) => ({ ...p, status: e.target.value }))}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(`status.${s.value}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="cm-field">
            <label className="cm-label">{t('leads.assignedTo')}</label>
            <select
              className="cm-select"
              value={internal.assigned_to}
              onChange={(e) =>
                setInternal((p) => ({ ...p, assigned_to: e.target.value }))
              }
            >
              <option value="">{t('leads.unassigned')}</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="cm-field">
            <label className="cm-label">{t('leads.internalNotes')}</label>
            <textarea
              className="cm-textarea"
              rows={7}
              value={internal.internal_notes}
              onChange={(e) =>
                setInternal((p) => ({ ...p, internal_notes: e.target.value }))
              }
              placeholder={t('leads.internalNotesPlaceholder')}
            />
          </div>

          <div className="cm-field">
            <label className="cm-label">{t('leads.followUpDate')}</label>
            <input
              className="cm-input"
              type="date"
              value={internal.follow_up_date || ''}
              onChange={(e) =>
                setInternal((p) => ({ ...p, follow_up_date: e.target.value }))
              }
            />
          </div>

          <div className="cm-field">
            <label className="cm-label">{t('leads.contactedAt')}</label>
            <input
              className="cm-input"
              type="date"
              value={internal.contacted_at || ''}
              onChange={(e) =>
                setInternal((p) => ({ ...p, contacted_at: e.target.value }))
              }
            />
          </div>

          <div className="cm-small cm-faint">
            {t('leads.lastUpdate')}: {formatDate(lead.updated_at, { withTime: true })}
          </div>

          <button
            type="button"
            className="cm-btn cm-btn-primary cm-btn-block"
            style={{ marginTop: 18 }}
            onClick={save}
            disabled={busy}
          >
            {busy ? t('common.saving') : t('common.saveChanges')}
          </button>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title={t('common.delete')}
          message={t('leads.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            try {
              await deleteLead(id)
              navigate('/admin/leads')
            } catch (err) {
              toast.error(err.message || t('errors.generic'))
            }
          }}
        />
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value || <span className="cm-faint">—</span>}</dd>
    </>
  )
}

function renderAnswer(a, t) {
  if (a.value_bool !== null && a.value_bool !== undefined) {
    return a.value_bool ? t('common.yes') : t('common.no')
  }
  if (Array.isArray(a.value_json)) {
    return (
      <div className="cm-chip-row">
        {(a.value_text ? a.value_text.split(', ') : a.value_json).map((v, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <Badge key={`${v}-${i}`}>{v}</Badge>
        ))}
      </div>
    )
  }
  if (a.value_text) return <span style={{ whiteSpace: 'pre-wrap' }}>{a.value_text}</span>
  if (a.value_number !== null && a.value_number !== undefined) return String(a.value_number)
  return <span className="cm-faint">—</span>
}
