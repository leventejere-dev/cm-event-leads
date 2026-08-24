/**
 * ---------------------------------------------------------------------------
 *  ADMIN USERS
 * ---------------------------------------------------------------------------
 *  Who can open the admin area, and who can only look at it.
 *
 *  A login account (e-mail + password) is created once in the Supabase
 *  Dashboard. This screen then decides what that account may do here:
 *      * grant access to an existing login account (by e-mail)
 *      * switch between "admin" (full) and "viewer" (read-only) role
 *      * suspend an account temporarily, or remove its access completely
 *
 *  Passwords never pass through this application.
 * ---------------------------------------------------------------------------
 */
import React, { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../../i18n'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import { Spinner, Badge, ConfirmDialog, Modal } from '../../components/common'
import {
  listAdminUsers,
  grantAdminByEmail,
  setAdminAccess,
  revokeAdmin
} from '../../lib/db'
import { formatDate } from '../../lib/format'

export default function UsersPage() {
  const { t } = useI18n()
  const toast = useToast()
  const { profile } = useAuth()

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await listAdminUsers())
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

  const patch = async (row, changes) => {
    try {
      await setAdminAccess(row.id, changes)
      await load()
      toast.success(t('users.saved'))
    } catch (err) {
      toast.error(translateError(err, t))
    }
  }

  return (
    <div className="cm-page">
      <div className="cm-page-head">
        <div>
          <h1>{t('users.title')}</h1>
          <div className="cm-page-sub">{t('users.subtitle')}</div>
        </div>
        <button
          type="button"
          className="cm-btn cm-btn-primary"
          onClick={() => setAdding(true)}
        >
          + {t('users.add')}
        </button>
      </div>

      <div className="cm-alert cm-alert-info" style={{ marginBottom: 20 }}>
        <div className="cm-alert-title">{t('users.howToTitle')}</div>
        <div style={{ whiteSpace: 'pre-line' }}>{t('users.howToBody')}</div>
      </div>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="cm-card cm-empty">{t('users.none')}</div>
      ) : (
        <div className="cm-table-wrap">
          <table className="cm-table">
            <thead>
              <tr>
                <th>{t('users.email')}</th>
                <th>{t('users.name')}</th>
                <th>{t('users.role')}</th>
                <th>{t('users.status')}</th>
                <th className="cm-nowrap">{t('users.lastSignIn')}</th>
                <th className="cm-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>
                    {u.email}
                    {u.is_self && (
                      <>
                        {' '}
                        <Badge variant="cm-badge-primary">{t('users.you')}</Badge>
                      </>
                    )}
                  </td>
                  <td>{u.full_name || '—'}</td>
                  <td>
                    <select
                      className="cm-select"
                      style={{ minWidth: 160, maxWidth: 200, height: 34 }}
                      value={u.role}
                      disabled={u.is_self}
                      onChange={(e) => patch(u, { role: e.target.value })}
                    >
                      <option value="admin">{t('users.roleAdmin')}</option>
                      <option value="viewer">{t('users.roleViewer')}</option>
                    </select>
                  </td>
                  <td>
                    {u.is_active ? (
                      <Badge variant="cm-badge-success">{t('users.active')}</Badge>
                    ) : (
                      <Badge variant="cm-badge-warning">{t('users.suspended')}</Badge>
                    )}
                  </td>
                  <td className="cm-nowrap cm-muted">
                    {u.last_sign_in
                      ? formatDate(u.last_sign_in, { withTime: true })
                      : t('users.never')}
                  </td>
                  <td className="cm-right">
                    <div className="cm-row" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="cm-btn cm-btn-ghost cm-btn-sm"
                        disabled={u.is_self}
                        onClick={() => patch(u, { is_active: !u.is_active })}
                      >
                        {u.is_active ? t('users.suspend') : t('users.reactivate')}
                      </button>
                      <button
                        type="button"
                        className="cm-btn cm-btn-danger cm-btn-sm"
                        disabled={u.is_self}
                        onClick={() => setConfirm(u)}
                      >
                        {t('users.remove')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="cm-small cm-faint" style={{ marginTop: 16 }}>
        {t('users.selfNote', { email: profile?.email || '' })}
      </p>

      {adding && (
        <AddAdminModal
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false)
            load()
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={t('users.remove')}
          message={t('users.removeConfirm', { email: confirm.email })}
          confirmLabel={t('users.remove')}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await revokeAdmin(confirm.id)
              setConfirm(null)
              load()
              toast.success(t('users.saved'))
            } catch (err) {
              toast.error(translateError(err, t))
            }
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ modal */

function AddAdminModal({ onClose, onDone }) {
  const { t } = useI18n()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('admin')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async () => {
    if (!email.trim()) return
    setBusy(true)
    setError(null)
    try {
      await grantAdminByEmail(email, name, role)
      toast.success(t('users.saved'))
      onDone()
    } catch (err) {
      setError(translateError(err, t))
      setBusy(false)
    }
  }

  return (
    <Modal
      title={t('users.add')}
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
            disabled={busy || !email.trim()}
          >
            {busy ? t('common.saving') : t('users.add')}
          </button>
        </>
      }
    >
      <div className="cm-alert cm-alert-info" style={{ marginBottom: 18 }}>
        <div style={{ whiteSpace: 'pre-line' }}>{t('users.addHelp')}</div>
      </div>

      <div className="cm-field">
        <label className="cm-label">{t('users.email')}</label>
        <input
          className="cm-input"
          type="email"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
          placeholder={t('users.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">{t('users.name')}</label>
        <input
          className="cm-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="cm-field">
        <label className="cm-label">{t('users.role')}</label>
        <select
          className="cm-select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="admin">{t('users.roleAdmin')}</option>
          <option value="viewer">{t('users.roleViewer')}</option>
        </select>
        <div className="cm-help">{t('users.roleHelp')}</div>
      </div>

      {error && <div className="cm-alert cm-alert-danger">{error}</div>}
    </Modal>
  )
}

/* --------------------------------------------------------------- helpers */

/** Turn the PostgreSQL exception names into readable sentences. */
function translateError(err, t) {
  const msg = String(err?.message || err || '')
  if (msg.includes('AUTH_USER_NOT_FOUND')) return t('users.errNoAccount')
  if (msg.includes('CANNOT_MODIFY_SELF')) return t('users.errSelf')
  if (msg.includes('NOT_AUTHORISED')) return t('auth.noAccess')
  if (msg.includes('INVALID_ROLE')) return t('errors.generic')
  if (msg.includes('EMAIL_REQUIRED')) return t('kiosk.fillRequired')
  return msg || t('errors.generic')
}
