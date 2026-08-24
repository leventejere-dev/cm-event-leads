import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useAuth } from '../../hooks/useAuth'
import { useBranding } from '../../hooks/useBranding'
import { Logo } from '../../components/common'
import { isConfigured } from '../../lib/supabase'

export default function LoginPage() {
  const { t } = useI18n()
  const { signIn } = useAuth()
  const { brand } = useBranding()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(email, password)
    } catch (err) {
      if (err.code === 'NO_ADMIN_ACCESS') setError(t('auth.noAccess'))
      else if (err.message === 'NOT_CONFIGURED') setError(t('errors.noConfig'))
      else setError(t('auth.invalid'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cm-login">
      <form className="cm-login-card" onSubmit={submit}>
        <Logo height={38} />
        <h2 style={{ marginBottom: 4 }}>{t('auth.title')}</h2>
        <p className="cm-small cm-faint" style={{ marginBottom: 24 }}>
          {t('auth.subtitle')}
        </p>

        {!isConfigured && (
          <div className="cm-alert cm-alert-danger" style={{ marginBottom: 16 }}>
            {t('errors.noConfig')}
          </div>
        )}

        <div className="cm-field">
          <label className="cm-label" htmlFor="login-email">
            {t('auth.email')}
          </label>
          <input
            id="login-email"
            className="cm-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="cm-field">
          <label className="cm-label" htmlFor="login-password">
            {t('auth.password')}
          </label>
          <input
            id="login-password"
            className="cm-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="cm-alert cm-alert-danger" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="cm-btn cm-btn-primary cm-btn-block"
          disabled={busy || !isConfigured}
        >
          {busy ? t('auth.loggingIn') : t('auth.login')}
        </button>

        <p className="cm-small cm-faint" style={{ marginTop: 20, marginBottom: 0 }}>
          {t('auth.forgot')}
        </p>
        <p className="cm-small" style={{ marginTop: 12, marginBottom: 0 }}>
          <Link to="/">← {t('auth.backToRegistration')}</Link>
        </p>
        <p className="cm-small cm-faint" style={{ marginTop: 20, marginBottom: 0 }}>
          {brand.appName} · {brand.companyLegalName}
        </p>
      </form>
    </div>
  )
}
