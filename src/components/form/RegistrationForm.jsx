/**
 * ---------------------------------------------------------------------------
 *  REGISTRATION FORM (the tablet form itself)
 * ---------------------------------------------------------------------------
 *  Used by BOTH the public kiosk page and the admin "Preview form" screen, so
 *  what the administrator previews is literally the same component the
 *  visitor uses.
 *
 *  Everything it renders comes from the event configuration:
 *      * which questions appear      -> form_fields.enabled
 *      * required or optional        -> form_fields.required
 *      * labels / placeholders / help-> form_fields.*
 *      * order                       -> form_fields.sort_order
 *      * number of steps             -> computed automatically
 *      * signature                   -> events.signature_mode
 *      * GDPR                        -> events.gdpr_mode / gdpr_text
 * ---------------------------------------------------------------------------
 */
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import FieldRenderer from './FieldRenderer'
import SignaturePad from './SignaturePad'
import { useI18n } from '../../i18n'
import {
  buildSteps,
  initialValues,
  validateFields,
  validateConsent,
  extractContact
} from '../../lib/formEngine'
import { Modal } from '../common'
import { brand } from '../../config/brand'

export default function RegistrationForm({
  event,
  fields,
  onSubmit,
  onCheckDuplicate,
  preview = false,
  resetKey = 0
}) {
  const { t } = useI18n()
  const sigRef = useRef(null)
  const topRef = useRef(null)

  const steps = useMemo(() => buildSteps(fields, event), [fields, event])
  const [stepIndex, setStepIndex] = useState(0)
  const [values, setValues] = useState(() => initialValues(fields))
  const [errors, setErrors] = useState({})
  const [gdprAccepted, setGdprAccepted] = useState(false)
  const [signatureData, setSignatureData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)

  /* -------------------------------------------------- reset between visitors */
  useEffect(() => {
    setValues(initialValues(fields))
    setErrors({})
    setGdprAccepted(false)
    setSignatureData(null)
    setStepIndex(0)
    setBusy(false)
    setDuplicateOpen(false)
    sigRef.current?.clear?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, event?.id])

  useEffect(() => {
    // Re-seed defaults when the field list changes (e.g. live in the builder)
    setValues((prev) => ({ ...initialValues(fields), ...prev }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields])

  const setValue = useCallback((key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const hasSignature = Boolean(signatureData)

  // Stable identity, so the pad's native listeners are never re-bound.
  const handleSignatureChange = useCallback((dataUrl) => {
    setSignatureData(dataUrl)
    if (dataUrl) {
      setErrors((p) => {
        if (!p.signature) return p
        const n = { ...p }
        delete n.signature
        return n
      })
    }
  }, [])

  // Clamp, so a configuration change in the builder preview can never leave the
  // form pointing at a step that no longer exists.
  const safeIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0))
  const step = steps[safeIndex]
  const isLast = safeIndex === steps.length - 1
  const multi = steps.length > 1

  const scrollTop = () => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  /* -------------------------------------------------------------- validate */
  const validateCurrent = () => {
    if (!step) return true
    if (step.isConsent) {
      const e = validateConsent(event, { gdprAccepted, hasSignature }, t)
      setErrors(e)
      return Object.keys(e).length === 0
    }
    const e = validateFields(step.fields, values, t)
    if (step.inlineConsent) {
      Object.assign(e, validateConsent(event, { gdprAccepted, hasSignature }, t))
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateAll = () => {
    const e = validateFields(fields, values, t)
    Object.assign(e, validateConsent(event, { gdprAccepted, hasSignature }, t))
    setErrors(e)
    return e
  }

  /* ------------------------------------------------------------ navigation */
  const goNext = () => {
    if (!validateCurrent()) return
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
    scrollTop()
  }

  const goBack = () => {
    setErrors({})
    setStepIndex((i) => Math.max(i - 1, 0))
    scrollTop()
  }

  /* ---------------------------------------------------------------- submit */
  //  A hard re-entrancy guard. Without it a double-tap on a tablet (very easy
  //  to do) would run the whole submit twice and create TWO leads, because each
  //  run mints its own registration UUID.
  const submittingRef = useRef(false)

  const doSubmit = async () => {
    try {
      await onSubmit?.({
        values,
        // the canvas may be unmounted (we are on another step) — the parent
        // state is the source of truth for the signature
        signatureDataUrl: signatureData || sigRef.current?.toDataURL?.() || null,
        gdprAccepted,
        gdprText: event?.gdpr_text || '',
        gdprVersion: event?.gdpr_version || ''
      })
    } finally {
      submittingRef.current = false
      setBusy(false)
    }
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (submittingRef.current) return
    submittingRef.current = true
    setBusy(true)

    const allErrors = validateAll()
    if (Object.keys(allErrors).length > 0) {
      // jump to the first step that has a problem
      const badKey = Object.keys(allErrors)[0]
      const idx = steps.findIndex(
        (s) =>
          (badKey === 'gdpr' || badKey === 'signature'
            ? s.isConsent
            : s.fields.some((f) => f.field_key === badKey))
      )
      if (idx >= 0) setStepIndex(idx)
      scrollTop()
      submittingRef.current = false
      setBusy(false)
      return
    }

    if (preview) {
      await doSubmit()
      return
    }

    // duplicate detection — informative only, never blocking
    if (onCheckDuplicate) {
      const { email, phone } = extractContact(fields, values)
      if (email || phone) {
        try {
          const dup = await onCheckDuplicate(email, phone)
          if (dup) {
            setDuplicateOpen(true)
            submittingRef.current = false
            setBusy(false)
            return
          }
        } catch {
          /* a failed duplicate check must never stop a registration */
        }
      }
    }

    await doSubmit()
  }

  /* ---------------------------------------------------------------- render */
  if (!steps.length) {
    return (
      <div className="cm-alert cm-alert-warning">
        {t('builder.enabledCount', { n: 0 })}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <span ref={topRef} />

      {multi && (
        <>
          <div className="cm-steps" aria-hidden="true">
            {steps.map((s, i) => (
              <span
                key={s.key}
                className={`cm-step-seg ${
                  i < safeIndex ? 'is-done' : i === safeIndex ? 'is-current' : ''
                }`}
              />
            ))}
          </div>
          <div className="cm-step-title">
            <h2>{t(step.titleKey)}</h2>
            <span className="cm-step-counter">
              {t('kiosk.stepOf', { current: safeIndex + 1, total: steps.length })}
            </span>
          </div>
        </>
      )}

      {/* ------------------------------------------------------ normal step */}
      {!step.isConsent && (
        <div className="cm-kiosk-cols">
          {step.fields.map((field) => (
            <FieldRenderer
              key={field.id || field.field_key}
              field={field}
              value={values[field.field_key]}
              error={errors[field.field_key]}
              onChange={(v) => setValue(field.field_key, v)}
            />
          ))}
        </div>
      )}

      {/* --------------------------- consent: own step OR inline on one page */}
      {(step.isConsent || step.inlineConsent) && (
        <div className="cm-stack">
          {step.inlineConsent && (
            <div className="cm-step-title" style={{ marginTop: 8 }}>
              <h2>{t('section.consent')}</h2>
            </div>
          )}

          {event?.gdpr_mode !== 'disabled' && (
            <div className="cm-field cm-field-full">
              <div
                className="cm-alert"
                style={{ marginBottom: 14, whiteSpace: 'pre-wrap' }}
              >
                {event?.gdpr_text || ''}
              </div>
              <label
                className={`cm-check ${gdprAccepted ? 'is-checked' : ''}`}
                style={{ minHeight: 64 }}
              >
                <input
                  type="checkbox"
                  checked={gdprAccepted}
                  onChange={(e) => {
                    setGdprAccepted(e.target.checked)
                    setErrors((p) => {
                      const n = { ...p }
                      delete n.gdpr
                      return n
                    })
                  }}
                />
                <span>
                  {t('kiosk.consentLabel')}
                  {event?.gdpr_mode === 'required' && <span className="cm-req">*</span>}
                </span>
              </label>
              {errors.gdpr && <div className="cm-error-text">{errors.gdpr}</div>}
              <div className="cm-help" style={{ marginTop: 8 }}>
                {brand.defaults.gdprPolicyUrl && (
                  <a
                    href={brand.defaults.gdprPolicyUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: 'underline' }}
                  >
                    {t('kiosk.gdprPolicyLink')}
                  </a>
                )}
              </div>
            </div>
          )}

          {event?.signature_mode !== 'disabled' && (
            <div className="cm-field cm-field-full">
              <span className="cm-label">
                {t('builder.signature')}
                {event?.signature_mode === 'required' && <span className="cm-req">*</span>}
              </span>
              <SignaturePad
                ref={sigRef}
                value={signatureData}
                onChange={handleSignatureChange}
              />
              {errors.signature && (
                <div className="cm-error-text">{errors.signature}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------- buttons */}
      <div className="cm-kiosk-foot">
        <div className="cm-kiosk-foot-inner">
          {safeIndex > 0 && (
            <button
              type="button"
              className="cm-btn cm-btn-ghost"
              onClick={goBack}
              disabled={busy}
              style={{ flex: '0 0 34%' }}
            >
              ← {t('common.back')}
            </button>
          )}
          {!isLast && (
            <button type="button" className="cm-btn cm-btn-primary" onClick={goNext}>
              {t('common.next')} →
            </button>
          )}
          {isLast && (
            <button type="submit" className="cm-btn cm-btn-primary" disabled={busy}>
              {busy ? t('kiosk.sending') : t('common.submit')}
            </button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------- duplicate modal */}
      {duplicateOpen && (
        <Modal
          title={t('kiosk.duplicateTitle')}
          onClose={() => setDuplicateOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="cm-btn cm-btn-ghost"
                onClick={() => setDuplicateOpen(false)}
              >
                {t('kiosk.duplicateCancel')}
              </button>
              <button
                type="button"
                className="cm-btn cm-btn-primary"
                disabled={busy}
                onClick={async () => {
                  if (submittingRef.current) return
                  submittingRef.current = true
                  setBusy(true)
                  setDuplicateOpen(false)
                  await doSubmit()
                }}
              >
                {t('kiosk.duplicateContinue')}
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>{t('kiosk.duplicateBody')}</p>
        </Modal>
      )}
    </form>
  )
}
