/**
 * ---------------------------------------------------------------------------
 *  DYNAMIC FIELD RENDERER
 * ---------------------------------------------------------------------------
 *  Renders ONE question exactly as the administrator configured it.
 *  Nothing about the registration form is hard-coded in the pages — this
 *  component is the only place that knows how a field type looks.
 * ---------------------------------------------------------------------------
 */
import React from 'react'
import { FIELD_TYPES } from '../../config/fieldCatalog'
import { useI18n } from '../../i18n'

export default function FieldRenderer({ field, value, onChange, error, idPrefix = 'f' }) {
  const { t } = useI18n()
  const id = `${idPrefix}-${field.field_key}`
  const invalid = Boolean(error)
  const common = {
    id,
    name: field.field_key,
    className: `cm-input ${invalid ? 'is-invalid' : ''}`,
    placeholder: field.placeholder || '',
    'aria-invalid': invalid || undefined,
    'aria-describedby': field.help_text ? `${id}-help` : undefined
  }

  const label = (
    <label className="cm-label" htmlFor={id}>
      {field.label}
      {field.required && <span className="cm-req" aria-hidden="true">*</span>}
    </label>
  )

  const help = field.help_text ? (
    <div className="cm-help" id={`${id}-help`}>
      {field.help_text}
    </div>
  ) : null

  const errorNode = error ? <div className="cm-error-text">{error}</div> : null

  const wrap = (control, fullWidth = false) => (
    <div className={`cm-field ${fullWidth ? 'cm-field-full' : ''}`}>
      {label}
      {control}
      {help}
      {errorNode}
    </div>
  )

  switch (field.field_type) {
    /* ------------------------------------------------------------- text -- */
    case FIELD_TYPES.TEXTAREA:
      return wrap(
        <textarea
          {...common}
          className={`cm-textarea ${invalid ? 'is-invalid' : ''}`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />,
        true
      )

    case FIELD_TYPES.NUMBER:
      return wrap(
        <input
          {...common}
          type="number"
          inputMode="numeric"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case FIELD_TYPES.EMAIL:
      return wrap(
        <input
          {...common}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case FIELD_TYPES.PHONE:
      return wrap(
        <input
          {...common}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case FIELD_TYPES.URL:
      return wrap(
        <input
          {...common}
          type="text"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case FIELD_TYPES.DATE:
      return wrap(
        <input
          {...common}
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    /* --------------------------------------------------------- booleans -- */
    case FIELD_TYPES.CHECKBOX: {
      const checked = value === true
      return (
        <div className="cm-field cm-field-full">
          <label
            className={`cm-check ${checked ? 'is-checked' : ''} ${
              invalid ? 'is-invalid' : ''
            }`}
            htmlFor={id}
          >
            <input
              id={id}
              name={field.field_key}
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span>
              {field.label}
              {field.required && <span className="cm-req">*</span>}
            </span>
          </label>
          {help}
          {errorNode}
        </div>
      )
    }

    case FIELD_TYPES.BOOLEAN: {
      const yesSelected = value === true
      const noSelected = value === false
      return wrap(
        <div className="cm-row" style={{ gap: 10 }}>
          <button
            type="button"
            className={`cm-btn ${yesSelected ? 'cm-btn-primary' : 'cm-btn-ghost'}`}
            style={{ flex: '1 1 0' }}
            aria-pressed={yesSelected}
            onClick={() => onChange(yesSelected ? null : true)}
          >
            {field.config?.yesLabel || t('common.yes')}
          </button>
          <button
            type="button"
            className={`cm-btn ${noSelected ? 'cm-btn-primary' : 'cm-btn-ghost'}`}
            style={{ flex: '1 1 0' }}
            aria-pressed={noSelected}
            onClick={() => onChange(noSelected ? null : false)}
          >
            {field.config?.noLabel || t('common.no')}
          </button>
        </div>,
        true
      )
    }

    /* ---------------------------------------------------------- choices -- */
    case FIELD_TYPES.SELECT:
      return wrap(
        <select
          {...common}
          className={`cm-select ${invalid ? 'is-invalid' : ''}`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{field.placeholder || '—'}</option>
          {(field.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )

    case FIELD_TYPES.RADIO:
      return (
        <div className="cm-field cm-field-full">
          <span className="cm-label" id={`${id}-label`}>
            {field.label}
            {field.required && <span className="cm-req">*</span>}
          </span>
          <div className="cm-check-list" role="radiogroup" aria-labelledby={`${id}-label`}>
            {(field.options || []).map((o) => {
              const checked = value === o.value
              return (
                <label
                  key={o.value}
                  className={`cm-check ${checked ? 'is-checked' : ''}`}
                >
                  <input
                    type="radio"
                    name={field.field_key}
                    value={o.value}
                    checked={checked}
                    onChange={() => onChange(o.value)}
                  />
                  <span>{o.label}</span>
                </label>
              )
            })}
          </div>
          {help}
          {errorNode}
        </div>
      )

    case FIELD_TYPES.MULTISELECT: {
      const list = Array.isArray(value) ? value : []
      const toggle = (v) => {
        onChange(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
      }
      return (
        <div className="cm-field cm-field-full">
          <span className="cm-label" id={`${id}-label`}>
            {field.label}
            {field.required && <span className="cm-req">*</span>}
          </span>
          <div className="cm-check-list" role="group" aria-labelledby={`${id}-label`}>
            {(field.options || []).map((o) => {
              const checked = list.includes(o.value)
              return (
                <label
                  key={o.value}
                  className={`cm-check ${checked ? 'is-checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    value={o.value}
                    checked={checked}
                    onChange={() => toggle(o.value)}
                  />
                  <span>{o.label}</span>
                </label>
              )
            })}
          </div>
          {help}
          {errorNode}
        </div>
      )
    }

    /* ------------------------------------------------------------ plain -- */
    case FIELD_TYPES.TEXT:
    default:
      return wrap(
        <input
          {...common}
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}
