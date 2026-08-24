/**
 * ---------------------------------------------------------------------------
 *  SUCCESS SCREEN
 * ---------------------------------------------------------------------------
 *  Shown for a few seconds after a visitor submits, then the form resets
 *  itself completely. THE NEXT VISITOR MUST NEVER SEE THE PREVIOUS ONE'S DATA:
 *  the parent unmounts the whole form (new React key) and every field, the
 *  signature canvas and all temporary state are rebuilt from scratch.
 * ---------------------------------------------------------------------------
 */
import React, { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import { useBranding } from '../../hooks/useBranding'
import { Logo } from '../../components/common'

export default function SuccessScreen({ event, leadNumber, offline, onReset }) {
  const { t } = useI18n()
  const { brand, settings } = useBranding()

  const seconds =
    event?.auto_reset_seconds ||
    settings?.auto_reset_seconds ||
    brand.kiosk.autoResetSeconds ||
    5

  const [left, setLeft] = useState(seconds)

  // Keep the callback in a ref: the timer must depend ONLY on `seconds`, or a
  // re-render (e.g. the offline queue emitting) would restart the countdown and
  // the screen would linger.
  const resetRef = useRef(onReset)
  useEffect(() => {
    resetRef.current = onReset
  }, [onReset])

  useEffect(() => {
    const tick = window.setInterval(() => setLeft((v) => v - 1), 1000)
    const timer = window.setTimeout(() => resetRef.current?.(), seconds * 1000)
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(timer)
    }
  }, [seconds])

  const title =
    event?.success_message || settings?.success_message || t('kiosk.successTitle')
  const sub =
    event?.success_sub_message || settings?.success_sub_message || t('kiosk.successSub')

  return (
    <div className="cm-success" onClick={onReset} role="button" tabIndex={-1}>
      <Logo height={54} />

      <div className="cm-success-mark" aria-hidden="true">
        ✓
      </div>

      <h1>{t('kiosk.successTitle')}</h1>
      <p>{title === t('kiosk.successTitle') ? t('kiosk.successMessage') : title}</p>
      {sub && <p className="cm-faint">{sub}</p>}

      {offline && (
        <div
          className="cm-alert cm-alert-warning"
          style={{ maxWidth: 620, marginTop: 16 }}
        >
          {t('connection.savedLocally')}
        </div>
      )}

      {leadNumber && !offline && (
        <div className="cm-success-lead">{leadNumber}</div>
      )}

      <div className="cm-progress-bar" aria-hidden="true">
        <span style={{ animationDuration: `${seconds}s` }} />
      </div>
      <div className="cm-small cm-faint" style={{ marginTop: 10 }}>
        {t('kiosk.resetIn')} {Math.max(left, 0)}s
      </div>

      <button
        type="button"
        className="cm-btn cm-btn-ghost"
        style={{ marginTop: 24 }}
        onClick={onReset}
      >
        {t('kiosk.newRegistration')}
      </button>
    </div>
  )
}
