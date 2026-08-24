import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { Stat, Spinner, Badge } from '../../components/common'
import { dashboardStats, listEvents, listLeads } from '../../lib/db'
import { useConnection } from '../../hooks/useConnection'
import { formatDate } from '../../lib/format'
import { STATUS_BY_VALUE } from '../../config/leadStatus'

export default function DashboardPage() {
  const { t } = useI18n()
  const { pending } = useConnection()
  const [stats, setStats] = useState(null)
  const [activeEvent, setActiveEvent] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [s, events, leads] = await Promise.all([
          dashboardStats(),
          listEvents(),
          listLeads({}, { page: 0, pageSize: 8 })
        ])
        if (!alive) return
        setStats(s)
        setActiveEvent(events.find((e) => e.is_active) || null)
        setRecent(leads.rows)
      } catch (err) {
        console.error(err)
        if (alive) setError(err)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="cm-page">
      <div className="cm-page-head">
        <div>
          <h1>{t('dashboard.title')}</h1>
          <div className="cm-page-sub">{t('dashboard.subtitle')}</div>
        </div>
        <div className="cm-row">
          <Link className="cm-btn cm-btn-ghost" to="/admin/events">
            {t('nav.events')}
          </Link>
          <Link className="cm-btn cm-btn-primary" to="/admin/leads">
            {t('nav.leads')}
          </Link>
        </div>
      </div>

      {error && (
        <div className="cm-alert cm-alert-danger" style={{ marginBottom: 20 }}>
          {t('errors.loadFailed')}
        </div>
      )}

      {!activeEvent && (
        <div className="cm-alert cm-alert-warning" style={{ marginBottom: 20 }}>
          <div className="cm-alert-title">{t('dashboard.noActiveEvent')}</div>
          {t('dashboard.setActiveEvent')}{' '}
          <Link to="/admin/events">{t('nav.events')} →</Link>
        </div>
      )}

      {pending > 0 && (
        <div className="cm-alert cm-alert-info" style={{ marginBottom: 20 }}>
          <div className="cm-alert-title">{t('dashboard.pendingLocal')}</div>
          {t('connection.pendingSync', { n: pending })}
        </div>
      )}

      <div className="cm-grid cm-grid-4" style={{ marginBottom: 20 }}>
        <Stat label={t('dashboard.totalLeads')} value={stats?.total_leads ?? 0} />
        <Stat
          label={t('dashboard.todayLeads')}
          value={stats?.today_leads ?? 0}
          tone="accent"
        />
        <Stat
          label={t('dashboard.eventLeads')}
          value={stats?.event_leads ?? 0}
          hint={activeEvent?.name}
          tone="dark"
        />
        <Stat
          label={t('dashboard.companies')}
          value={stats?.companies ?? 0}
          tone="secondary"
        />
      </div>

      <div className="cm-grid cm-grid-4" style={{ marginBottom: 28 }}>
        <Stat label={t('dashboard.followUp')} value={stats?.follow_up ?? 0} tone="accent" />
        <Stat label={t('dashboard.newLeads')} value={stats?.new_leads ?? 0} />
        <Stat
          label={t('dashboard.contactedLeads')}
          value={stats?.contacted_leads ?? 0}
          tone="secondary"
        />
        <Stat
          label={t('dashboard.qualifiedLeads')}
          value={stats?.qualified_leads ?? 0}
          tone="dark"
        />
      </div>

      <div className="cm-card cm-card-flush">
        <div className="cm-card-head">
          <h3>{t('dashboard.recentLeads')}</h3>
          <Link className="cm-btn cm-btn-ghost cm-btn-sm" to="/admin/leads">
            {t('dashboard.viewAll')}
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="cm-empty">{t('leads.noLeads')}</div>
        ) : (
          <div className="cm-table-wrap" style={{ border: 0, borderRadius: 0 }}>
            <table className="cm-table">
              <thead>
                <tr>
                  <th>{t('leads.leadId')}</th>
                  <th>{t('leads.name')}</th>
                  <th>{t('leads.company')}</th>
                  <th>{t('leads.phone')}</th>
                  <th>{t('leads.status')}</th>
                  <th>{t('leads.registeredAt')}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((l) => (
                  <tr key={l.id} className="is-clickable">
                    <td className="cm-col-num">
                      <Link to={`/admin/leads/${l.id}`}>{l.lead_number}</Link>
                    </td>
                    <td>
                      <Link to={`/admin/leads/${l.id}`}>
                        {l.full_name || [l.first_name, l.last_name].filter(Boolean).join(' ') || '—'}
                      </Link>
                    </td>
                    <td>{l.company || '—'}</td>
                    <td className="cm-nowrap">{l.phone || '—'}</td>
                    <td>
                      <Badge variant={STATUS_BY_VALUE[l.status]?.badge || ''}>
                        {t(`status.${l.status}`)}
                      </Badge>
                    </td>
                    <td className="cm-nowrap cm-muted">
                      {formatDate(l.created_at, { withTime: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
