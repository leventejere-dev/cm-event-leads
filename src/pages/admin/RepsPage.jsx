import React, { useEffect, useState, useCallback } from 'react'
import { useI18n } from '../../i18n'
import { useToast } from '../../hooks/useToast'
import { Spinner, Modal, ConfirmDialog, Switch } from '../../components/common'
import { listReps, createRep, updateRep, deleteRep } from '../../lib/db'

export default function RepsPage() {
  const { t } = useI18n()
  const toast = useToast()
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setReps(await listReps())
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

  const toggleActive = async (rep, value) => {
    setReps((prev) => prev.map((r) => (r.id === rep.id ? { ...r, is_active: value } : r)))
    try {
      await updateRep(rep.id, { is_active: value })
    } catch (err) {
      toast.error(err.message || t('errors.generic'))
      load()
    }
  }

  return (
    <div className="cm-page">
      <div className="cm-page-head">
        <div>
          <h1>{t('reps.title')}</h1>
          <div className="cm-page-sub">{t('reps.subtitle')}</div>
        </div>
        <button
          type="button"
          className="cm-btn cm-btn-primary"
          onClick={() => setCreating(true)}
        >
          + {t('reps.new')}
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : reps.length === 0 ? (
        <div className="cm-card cm-empty">{t('reps.noReps')}</div>
      ) : (
        <div className="cm-table-wrap">
          <table className="cm-table">
            <thead>
              <tr>
                <th>{t('reps.name')}</th>
                <th>{t('reps.email')}</th>
                <th>{t('reps.active')}</th>
                <th className="cm-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{r.email || '—'}</td>
                  <td>
                    <Switch
                      checked={r.is_active}
                      onChange={(v) => toggleActive(r, v)}
                      label={r.is_active ? t('common.enabled') : t('common.disabled')}
                    />
                  </td>
                  <td className="cm-right">
                    <div className="cm-row" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="cm-btn cm-btn-ghost cm-btn-sm"
                        onClick={() => setEditing(r)}
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        className="cm-btn cm-btn-danger cm-btn-sm"
                        onClick={() => setConfirm(r)}
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

      {(creating || editing) && (
        <RepModal
          rep={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            load()
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={t('common.delete')}
          message={t('reps.deleteConfirm')}
          confirmLabel={t('common.delete')}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await deleteRep(confirm.id)
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

function RepModal({ rep, onClose, onSaved }) {
  const { t } = useI18n()
  const toast = useToast()
  const [values, setValues] = useState({
    name: rep?.name || '',
    email: rep?.email || '',
    phone: rep?.phone || '',
    sort_order: rep?.sort_order ?? 0,
    is_active: rep ? rep.is_active : true
  })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setValues((p) => ({ ...p, [k]: v }))

  const submit = async () => {
    if (!values.name.trim()) return
    setBusy(true)
    try {
      if (rep) await updateRep(rep.id, values)
      else await createRep(values)
      onSaved()
    } catch (err) {
      toast.error(err.message || t('errors.generic'))
      setBusy(false)
    }
  }

  return (
    <Modal
      title={rep ? t('common.edit') : t('reps.new')}
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
        <label className="cm-label">{t('reps.name')}</label>
        <input
          className="cm-input"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>
      <div className="cm-field">
        <label className="cm-label">{t('reps.email')}</label>
        <input
          className="cm-input"
          type="email"
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
        />
      </div>
      <div className="cm-field">
        <label className="cm-label">{t('leads.phone')}</label>
        <input
          className="cm-input"
          value={values.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
      </div>
      <Switch
        checked={values.is_active}
        onChange={(v) => set('is_active', v)}
        label={t('reps.active')}
      />
    </Modal>
  )
}
