import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useToast } from '../../hooks/useToast'
import { Spinner, Badge } from '../../components/common'
import {
  listLeads,
  listAllLeads,
  listEvents,
  listReps,
  getAnswersFor,
  bulkUpdateLeads
} from '../../lib/db'
import { LEAD_STATUSES, STATUS_BY_VALUE } from '../../config/leadStatus'
import {
  OPTIONS_VISITOR_TYPE,
  OPTIONS_INTERESTS,
  OPTIONS_COUNTIES
} from '../../config/fieldCatalog'
import { exportToXlsx, exportToCsv } from '../../lib/exporters'
import { formatDate, labelForValue } from '../../lib/format'

const PAGE_SIZE = 50

const EMPTY_FILTERS = {
  search: '',
  event_id: '',
  status: '',
  assigned_to: '',
  county: '',
  city: '',
  country: '',
  profession: '',
  visitor_type: '',
  interest: '',
  follow_up: '',
  date_from: '',
  date_to: ''
}

export default function LeadsPage() {
  const { t } = useI18n()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    event_id: params.get('event') || ''
  })
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [reps, setReps] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [exporting, setExporting] = useState(false)

  const eventsById = useMemo(
    () => events.reduce((a, e) => ({ ...a, [e.id]: e }), {}),
    [events]
  )
  const repsById = useMemo(() => reps.reduce((a, r) => ({ ...a, [r.id]: r }), {}), [reps])

  /* ---------------------------------------------------------------- load */
  useEffect(() => {
    ;(async () => {
      try {
        const [ev, rp] = await Promise.all([listEvents(), listReps()])
        setEvents(ev)
        setReps(rp)
      } catch (err) {
        console.error(err)
      }
    })()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listLeads(filters, { page, pageSize: PAGE_SIZE })
      setRows(res.rows)
      setTotal(res.total)
    } catch (err) {
      console.error(err)
      toast.error(t('errors.loadFailed'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page])

  useEffect(() => {
    load()
  }, [load])

  // debounce the free-text search
  useEffect(() => {
    const id = window.setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }))
      setPage(0)
    }, 350)
    return () => window.clearTimeout(id)
  }, [searchInput])

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(0)
    if (key === 'event_id') {
      const next = new URLSearchParams(params)
      if (value) next.set('event', value)
      else next.delete('event')
      setParams(next, { replace: true })
    }
  }

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS)
    setSearchInput('')
    setPage(0)
    setParams(new URLSearchParams(), { replace: true })
  }

  /* -------------------------------------------------------------- export */
  const runExport = async (scope, format) => {
    setExporting(true)
    try {
      let exportFilters = {}
      let label = 'cm_leads_all'

      if (scope === 'filtered') {
        exportFilters = filters
        label = 'cm_leads_filtrat'
      } else if (scope === 'event') {
        const eventId = filters.event_id || events.find((e) => e.is_active)?.id
        if (!eventId) {
          toast.error(t('dashboard.noActiveEvent'))
          setExporting(false)
          return
        }
        exportFilters = { event_id: eventId }
        label = `cm_leads_${eventsById[eventId]?.slug || 'eveniment'}`
      }

      const leads = await listAllLeads(exportFilters)
      if (!leads.length) {
        toast.error(t('common.noResults'))
        setExporting(false)
        return
      }
      const answers = await getAnswersFor(leads.map((l) => l.id))
      const opts = { eventsById, repsById, t, fileLabel: label }
      const res =
        format === 'csv'
          ? exportToCsv(leads, answers, opts)
          : await exportToXlsx(leads, answers, opts)
      toast.success(`${res.filename} · ${res.rows} ${t('common.rows')}`)
    } catch (err) {
      console.error(err)
      toast.error(err.message || t('errors.generic'))
    } finally {
      setExporting(false)
    }
  }

  /* ---------------------------------------------------------------- bulk */
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))
    )
  }

  const applyBulk = async (patch) => {
    if (!selected.size) return
    try {
      await bulkUpdateLeads([...selected], patch)
      setSelected(new Set())
      toast.success(t('leads.saved'))
      load()
    } catch (err) {
      toast.error(err.message || t('errors.generic'))
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="cm-page">
      <div className="cm-page-head">
        <div>
          <h1>{t('leads.title')}</h1>
          <div className="cm-page-sub">{t('leads.subtitle')}</div>
        </div>
        <div className="cm-row" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className="cm-btn cm-btn-ghost"
            disabled={exporting}
            onClick={() => runExport('filtered', 'xlsx')}
          >
            {t('leads.exportFiltered')} · XLSX
          </button>
          <button
            type="button"
            className="cm-btn cm-btn-ghost"
            disabled={exporting}
            onClick={() => runExport('event', 'xlsx')}
          >
            {t('leads.exportEvent')}
          </button>
          <button
            type="button"
            className="cm-btn"
            disabled={exporting}
            onClick={() => runExport('all', 'xlsx')}
          >
            {t('leads.exportAll')} · XLSX
          </button>
          <button
            type="button"
            className="cm-btn cm-btn-ghost"
            disabled={exporting}
            onClick={() => runExport('filtered', 'csv')}
          >
            CSV
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------- filters */}
      <div className="cm-card" style={{ marginBottom: 18 }}>
        <div className="cm-field">
          <input
            className="cm-input"
            placeholder={t('leads.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="cm-filters">
          <Select
            label={t('leads.filterEvent')}
            value={filters.event_id}
            onChange={(v) => setFilter('event_id', v)}
            options={events.map((e) => ({ value: e.id, label: e.name }))}
            allLabel={t('common.all')}
          />
          <Select
            label={t('leads.filterStatus')}
            value={filters.status}
            onChange={(v) => setFilter('status', v)}
            options={LEAD_STATUSES.map((s) => ({
              value: s.value,
              label: t(`status.${s.value}`)
            }))}
            allLabel={t('common.all')}
          />
          <Select
            label={t('leads.filterRep')}
            value={filters.assigned_to}
            onChange={(v) => setFilter('assigned_to', v)}
            options={[
              { value: '__none__', label: t('leads.unassigned') },
              ...reps.map((r) => ({ value: r.id, label: r.name }))
            ]}
            allLabel={t('common.all')}
          />
          <Select
            label={t('leads.filterCounty')}
            value={filters.county}
            onChange={(v) => setFilter('county', v)}
            options={OPTIONS_COUNTIES}
            allLabel={t('common.all')}
          />
          <Text
            label={t('leads.filterCity')}
            value={filters.city}
            onChange={(v) => setFilter('city', v)}
          />
          <Text
            label={t('leads.filterCountry')}
            value={filters.country}
            onChange={(v) => setFilter('country', v)}
          />
          <Text
            label={t('leads.filterProfession')}
            value={filters.profession}
            onChange={(v) => setFilter('profession', v)}
          />
          <Select
            label={t('leads.filterVisitorType')}
            value={filters.visitor_type}
            onChange={(v) => setFilter('visitor_type', v)}
            options={OPTIONS_VISITOR_TYPE}
            allLabel={t('common.all')}
          />
          <Select
            label={t('leads.filterInterest')}
            value={filters.interest}
            onChange={(v) => setFilter('interest', v)}
            options={OPTIONS_INTERESTS}
            allLabel={t('common.all')}
          />
          <Select
            label={t('leads.filterFollowUp')}
            value={filters.follow_up}
            onChange={(v) => setFilter('follow_up', v)}
            options={[
              { value: 'yes', label: t('common.yes') },
              { value: 'no', label: t('common.no') }
            ]}
            allLabel={t('common.all')}
          />
          <Text
            label={t('leads.filterDateFrom')}
            type="date"
            value={filters.date_from}
            onChange={(v) => setFilter('date_from', v)}
          />
          <Text
            label={t('leads.filterDateTo')}
            type="date"
            value={filters.date_to}
            onChange={(v) => setFilter('date_to', v)}
          />
        </div>

        <div className="cm-row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
          <span className="cm-small cm-muted">
            {t('leads.showing', {
              from: total === 0 ? 0 : page * PAGE_SIZE + 1,
              to: Math.min((page + 1) * PAGE_SIZE, total),
              total
            })}
          </span>
          <button type="button" className="cm-btn cm-btn-ghost cm-btn-sm" onClick={resetFilters}>
            {t('common.resetFilters')}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ bulk */}
      {selected.size > 0 && (
        <div className="cm-card" style={{ marginBottom: 14, padding: 14 }}>
          <div className="cm-row" style={{ flexWrap: 'wrap' }}>
            <strong className="cm-small">{t('leads.selected', { n: selected.size })}</strong>
            <select
              className="cm-select"
              style={{ maxWidth: 220 }}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) applyBulk({ status: e.target.value })
                e.target.value = ''
              }}
            >
              <option value="">{t('leads.bulkStatus')}…</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(`status.${s.value}`)}
                </option>
              ))}
            </select>
            <select
              className="cm-select"
              style={{ maxWidth: 220 }}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  applyBulk({
                    assigned_to: e.target.value === '__none__' ? null : e.target.value
                  })
                }
                e.target.value = ''
              }}
            >
              <option value="">{t('leads.bulkAssign')}…</option>
              <option value="__none__">{t('leads.unassigned')}</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="cm-btn cm-btn-ghost cm-btn-sm"
              onClick={() => setSelected(new Set())}
            >
              {t('common.clear')}
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- table */}
      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="cm-card cm-empty">{t('leads.noLeads')}</div>
      ) : (
        <>
          <div className="cm-table-wrap">
            <table className="cm-table">
              <thead>
                <tr>
                  <th style={{ width: 34 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === rows.length && rows.length > 0}
                      onChange={toggleSelectAll}
                      aria-label="select all"
                    />
                  </th>
                  <th>{t('leads.leadId')}</th>
                  <th>{t('leads.name')}</th>
                  <th>{t('leads.company')}</th>
                  <th>{t('leads.phone')}</th>
                  <th>{t('leads.email')}</th>
                  <th>{t('leads.county')}</th>
                  <th>{t('leads.visitorType')}</th>
                  <th>{t('leads.event')}</th>
                  <th>{t('leads.status')}</th>
                  <th>{t('leads.assignedTo')}</th>
                  <th className="cm-nowrap">{t('leads.registeredAt')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() => toggleSelect(l.id)}
                        aria-label={l.lead_number}
                      />
                    </td>
                    <td className="cm-col-num">
                      <Link to={`/admin/leads/${l.id}`}>{l.lead_number}</Link>
                    </td>
                    <td>
                      <Link to={`/admin/leads/${l.id}`} style={{ fontWeight: 600 }}>
                        {l.full_name ||
                          [l.first_name, l.last_name].filter(Boolean).join(' ') ||
                          '—'}
                      </Link>
                      {l.follow_up_requested && (
                        <>
                          {' '}
                          <Badge variant="cm-badge-warning">
                            {t('leads.followUp')}
                          </Badge>
                        </>
                      )}
                    </td>
                    <td>{l.company || '—'}</td>
                    <td className="cm-nowrap">{l.phone || '—'}</td>
                    <td className="cm-truncate" style={{ maxWidth: 200 }}>
                      {l.email || '—'}
                    </td>
                    <td>{l.county || '—'}</td>
                    <td>
                      {l.visitor_type
                        ? labelForValue(OPTIONS_VISITOR_TYPE, l.visitor_type)
                        : '—'}
                    </td>
                    <td className="cm-truncate" style={{ maxWidth: 170 }}>
                      {eventsById[l.event_id]?.name || '—'}
                    </td>
                    <td>
                      <Badge variant={STATUS_BY_VALUE[l.status]?.badge || ''}>
                        {t(`status.${l.status}`)}
                      </Badge>
                    </td>
                    <td>{repsById[l.assigned_to]?.name || '—'}</td>
                    <td className="cm-nowrap cm-muted">
                      {formatDate(l.created_at, { withTime: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cm-pager">
            <span>
              {t('common.page')} {page + 1} {t('common.of')} {pages}
            </span>
            <div className="cm-row">
              <button
                type="button"
                className="cm-btn cm-btn-ghost cm-btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ←
              </button>
              <button
                type="button"
                className="cm-btn cm-btn-ghost cm-btn-sm"
                disabled={page + 1 >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------- controls -- */

function Select({ label, value, onChange, options, allLabel }) {
  return (
    <div className="cm-field">
      <label className="cm-label">{label}</label>
      <select className="cm-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Text({ label, value, onChange, type = 'text' }) {
  return (
    <div className="cm-field">
      <label className="cm-label">{label}</label>
      <input
        className="cm-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
