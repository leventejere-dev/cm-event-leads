import React, { useEffect, useState } from 'react'
import { useI18n, LANGUAGES } from '../../i18n'
import { useToast } from '../../hooks/useToast'
import { useBranding } from '../../hooks/useBranding'
import { useConnection } from '../../hooks/useConnection'
import { Spinner } from '../../components/common'
import { getSettings, updateSettings } from '../../lib/db'
import { brand as baseBrand } from '../../config/brand'
import { listPending } from '../../lib/offlineQueue'
import { formatDate } from '../../lib/format'

const COLOR_KEYS = [
  { key: 'primaryColor', labelKey: 'settings.primaryColor' },
  { key: 'secondaryColor', labelKey: 'settings.secondaryColor' },
  { key: 'accentColor', labelKey: 'settings.accentColor' },
  { key: 'darkColor', labelKey: 'settings.darkColor' },
  { key: 'backgroundColor', labelKey: 'settings.backgroundColor' },
  { key: 'textColor', labelKey: 'settings.textColor' },
  { key: 'borderColor', labelKey: 'settings.borderColor' }
]

export default function SettingsPage() {
  const { t } = useI18n()
  const toast = useToast()
  const { refresh } = useBranding()
  const { pending, sync, syncing } = useConnection()

  const [values, setValues] = useState(null)
  const [colors, setColors] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [queue, setQueue] = useState([])

  useEffect(() => {
    ;(async () => {
      try {
        const s = await getSettings()
        setValues(s)
        setColors(s.colors || {})
      } catch (err) {
        console.error(err)
        toast.error(t('errors.loadFailed'))
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    listPending().then(setQueue).catch(() => setQueue([]))
  }, [pending])

  const set = (k, v) => setValues((p) => ({ ...p, [k]: v }))

  const save = async () => {
    setBusy(true)
    try {
      await updateSettings({
        company_name: values.company_name,
        logo_url: values.logo_url || null,
        logo_light_url: values.logo_light_url || null,
        favicon_url: values.favicon_url || null,
        colors,
        default_country: values.default_country,
        default_language: values.default_language,
        default_gdpr_text: values.default_gdpr_text,
        default_gdpr_version: values.default_gdpr_version,
        success_message: values.success_message,
        success_sub_message: values.success_sub_message,
        auto_reset_seconds: Number(values.auto_reset_seconds) || 5
      })
      await refresh()
      toast.success(t('settings.saved'))
    } catch (err) {
      toast.error(err.message || t('errors.generic'))
    } finally {
      setBusy(false)
    }
  }

  if (loading || !values) return <Spinner />

  return (
    <div className="cm-page">
      <div className="cm-page-head">
        <div>
          <h1>{t('settings.title')}</h1>
          <div className="cm-page-sub">{t('settings.subtitle')}</div>
        </div>
        <button
          type="button"
          className="cm-btn cm-btn-primary"
          onClick={save}
          disabled={busy}
        >
          {busy ? t('common.saving') : t('common.saveChanges')}
        </button>
      </div>

      <div className="cm-grid cm-grid-2" style={{ alignItems: 'start' }}>
        {/* ---------------------------------------------------- branding */}
        <div className="cm-card">
          <h3 style={{ marginBottom: 18 }}>{t('settings.branding')}</h3>

          <div className="cm-field">
            <label className="cm-label">{t('settings.companyName')}</label>
            <input
              className="cm-input"
              value={values.company_name || ''}
              onChange={(e) => set('company_name', e.target.value)}
            />
          </div>

          <div className="cm-field">
            <label className="cm-label">{t('settings.logoUrl')}</label>
            <input
              className="cm-input"
              value={values.logo_url || ''}
              placeholder={baseBrand.logo}
              onChange={(e) => set('logo_url', e.target.value)}
            />
            <div className="cm-help">{t('settings.logoUrlHelp')}</div>
          </div>

          <div className="cm-field">
            <label className="cm-label">{t('settings.logoLightUrl')}</label>
            <input
              className="cm-input"
              value={values.logo_light_url || ''}
              placeholder={baseBrand.logoLight}
              onChange={(e) => set('logo_light_url', e.target.value)}
            />
          </div>

          <div className="cm-field">
            <label className="cm-label">{t('settings.faviconUrl')}</label>
            <input
              className="cm-input"
              value={values.favicon_url || ''}
              placeholder={baseBrand.favicon}
              onChange={(e) => set('favicon_url', e.target.value)}
            />
          </div>

          <hr className="cm-rule" />

          <h4 style={{ marginBottom: 12 }}>{t('settings.colors')}</h4>
          {COLOR_KEYS.map((c) => (
            <div className="cm-field" key={c.key}>
              <label className="cm-label">{t(c.labelKey)}</label>
              <div className="cm-row">
                <input
                  type="color"
                  className="cm-input"
                  style={{ width: 62, padding: 4 }}
                  value={colors[c.key] || baseBrand[c.key] || '#000000'}
                  onChange={(e) =>
                    setColors((p) => ({ ...p, [c.key]: e.target.value.toUpperCase() }))
                  }
                />
                <input
                  className="cm-input cm-mono"
                  value={colors[c.key] || ''}
                  placeholder={baseBrand[c.key]}
                  onChange={(e) =>
                    setColors((p) => ({ ...p, [c.key]: e.target.value.toUpperCase() }))
                  }
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="cm-btn cm-btn-ghost cm-btn-sm"
            onClick={() => setColors({})}
          >
            {t('settings.resetColors')}
          </button>
        </div>

        {/* ---------------------------------------------------- defaults */}
        <div className="cm-stack">
          <div className="cm-card">
            <h3 style={{ marginBottom: 18 }}>{t('settings.defaults')}</h3>

            <div className="cm-grid cm-grid-2">
              <div className="cm-field">
                <label className="cm-label">{t('settings.defaultCountry')}</label>
                <input
                  className="cm-input"
                  value={values.default_country || ''}
                  onChange={(e) => set('default_country', e.target.value)}
                />
              </div>
              <div className="cm-field">
                <label className="cm-label">{t('settings.defaultLanguage')}</label>
                <select
                  className="cm-select"
                  value={values.default_language || 'ro'}
                  onChange={(e) => set('default_language', e.target.value)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="cm-field">
              <label className="cm-label">{t('settings.successMessage')}</label>
              <input
                className="cm-input"
                value={values.success_message || ''}
                onChange={(e) => set('success_message', e.target.value)}
              />
            </div>

            <div className="cm-field">
              <label className="cm-label">{t('settings.successSubMessage')}</label>
              <input
                className="cm-input"
                value={values.success_sub_message || ''}
                onChange={(e) => set('success_sub_message', e.target.value)}
              />
            </div>

            <div className="cm-field">
              <label className="cm-label">{t('settings.autoReset')}</label>
              <input
                className="cm-input"
                type="number"
                min={2}
                max={60}
                value={values.auto_reset_seconds ?? 5}
                onChange={(e) => set('auto_reset_seconds', e.target.value)}
              />
              <div className="cm-help">{t('settings.autoResetHelp')}</div>
            </div>

            <div className="cm-field">
              <label className="cm-label">{t('settings.defaultGdpr')}</label>
              <textarea
                className="cm-textarea"
                rows={7}
                value={values.default_gdpr_text || ''}
                onChange={(e) => set('default_gdpr_text', e.target.value)}
              />
              <div className="cm-help">{t('settings.defaultGdprHelp')}</div>
            </div>

            <div className="cm-field">
              <label className="cm-label">{t('builder.gdprVersion')}</label>
              <input
                className="cm-input cm-mono"
                value={values.default_gdpr_version || ''}
                onChange={(e) => set('default_gdpr_version', e.target.value)}
              />
            </div>
          </div>

          {/* -------------------------------------------------- local queue */}
          <div className="cm-card">
            <h3 style={{ marginBottom: 12 }}>{t('settings.localQueue')}</h3>
            {queue.length === 0 ? (
              <p className="cm-small cm-muted">{t('settings.localQueueEmpty')}</p>
            ) : (
              <>
                <div className="cm-alert cm-alert-warning" style={{ marginBottom: 14 }}>
                  {t('settings.localQueueCount', { n: queue.length })}
                </div>
                <div className="cm-table-wrap" style={{ marginBottom: 14 }}>
                  <table className="cm-table">
                    <thead>
                      <tr>
                        <th>{t('common.date')}</th>
                        <th>{t('leads.name')}</th>
                        <th className="cm-right">{t('settings.attempts')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.map((q) => (
                        <tr key={q.id}>
                          <td className="cm-nowrap">
                            {formatDate(q.created_at, { withTime: true })}
                          </td>
                          <td>{q.payload?.profile?.full_name || '—'}</td>
                          <td className="cm-right cm-col-num">{q.attempts || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <button
              type="button"
              className="cm-btn cm-btn-ghost"
              onClick={sync}
              disabled={syncing}
            >
              {syncing ? t('connection.syncing') : t('settings.forceSync')}
            </button>
          </div>

          <div className="cm-card">
            <h3 style={{ marginBottom: 12 }}>{t('settings.about')}</h3>
            <dl className="cm-kv">
              <dt>App</dt>
              <dd>{baseBrand.appName} v1.0.0</dd>
              <dt>{t('settings.companyName')}</dt>
              <dd>{baseBrand.companyLegalName}</dd>
              <dt>Brand file</dt>
              <dd className="cm-mono cm-small">src/config/brand.js</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
