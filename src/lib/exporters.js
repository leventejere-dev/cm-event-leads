/**
 * ---------------------------------------------------------------------------
 *  EXCEL (.xlsx) AND CSV EXPORT
 * ---------------------------------------------------------------------------
 *  * ExcelJS builds the workbook entirely in the browser — no server, no paid
 *    service, no row limit — and it can EMBED THE SIGNATURE IMAGES, which the
 *    accounting department needs to see next to each visitor.
 *  * CSV is written with a UTF-8 BOM so Microsoft Excel shows Romanian and
 *    Hungarian accented characters correctly (ă â î ș ț ő ű …).
 *  * Custom questions become columns AUTOMATICALLY: every distinct field_key
 *    found in registration_answers gets its own column, headed with the exact
 *    question text the visitor saw.
 * ---------------------------------------------------------------------------
 */
import { MAPPED_COLUMNS, OPTIONS_INTERESTS, OPTIONS_VISITOR_TYPE, OPTIONS_PROJECT_STAGE } from '../config/fieldCatalog'
import { STATUS_BY_VALUE } from '../config/leadStatus'
import { formatDate, labelForValue, safeFileName } from './format'

/* ------------------------------------------------------------------ utils */

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function answerToText(a) {
  if (!a) return ''
  if (a.value_text !== null && a.value_text !== undefined && a.value_text !== '') {
    return a.value_text
  }
  if (a.value_bool !== null && a.value_bool !== undefined) {
    return a.value_bool ? 'Da' : 'Nu'
  }
  if (a.value_number !== null && a.value_number !== undefined) {
    return String(a.value_number)
  }
  if (Array.isArray(a.value_json)) return a.value_json.join(', ')
  if (a.value_json && typeof a.value_json === 'object') {
    return a.value_json.label || a.value_json.value || JSON.stringify(a.value_json)
  }
  return ''
}

/* ------------------------------------------------------------ row builder */

/**
 * Build a flat array of plain objects, ready for a sheet.
 *
 * @param {Array}  leads     rows from `registrations`
 * @param {Array}  answers   rows from `registration_answers` for those leads
 * @param {Object} opts.eventsById   { [uuid]: eventRow }
 * @param {Object} opts.repsById     { [uuid]: repRow }
 * @param {Function} opts.t          translation function
 */
export function buildExportRows(leads, answers, opts = {}) {
  const { eventsById = {}, repsById = {}, t = (k) => k } = opts

  // ---- 1. group answers per registration --------------------------------
  const byReg = new Map()
  const dynamicColumns = new Map() // field_key -> header label
  const mappedKeys = new Set(Object.keys(MAPPED_COLUMNS))

  answers.forEach((a) => {
    if (!byReg.has(a.registration_id)) byReg.set(a.registration_id, {})
    byReg.get(a.registration_id)[a.field_key] = a
    if (!mappedKeys.has(a.field_key)) {
      // The label the visitor actually saw becomes the Excel column header.
      const header = a.field_label || a.field_key
      if (!dynamicColumns.has(a.field_key)) dynamicColumns.set(a.field_key, header)
    }
  })

  // stable, alphabetical order for the dynamic part of the sheet
  const dynamicKeys = [...dynamicColumns.keys()].sort((x, y) =>
    String(dynamicColumns.get(x)).localeCompare(String(dynamicColumns.get(y)), 'ro')
  )

  // ---- 2. header names ---------------------------------------------------
  const H = {
    leadId: t('leads.leadId'),
    date: t('leads.registeredAt'),
    event: t('leads.event'),
    name: t('leads.name'),
    firstName: `${t('leads.name')} (1)`,
    lastName: `${t('leads.name')} (2)`,
    company: t('leads.company'),
    position: t('leads.position'),
    profession: t('leads.profession'),
    phone: t('leads.phone'),
    email: t('leads.email'),
    country: t('leads.country'),
    county: t('leads.county'),
    city: t('leads.city'),
    visitorType: t('leads.visitorType'),
    interests: t('leads.interests'),
    projectStage: t('leads.projectStage'),
    followUp: t('leads.followUp'),
    gdpr: t('leads.gdpr'),
    gdprAt: t('leads.gdprAcceptedAt'),
    gdprVersion: t('leads.gdprVersion'),
    signature: t('leads.signature'),
    status: t('leads.status'),
    assigned: t('leads.assignedTo'),
    notes: t('leads.internalNotes'),
    followUpDate: t('leads.followUpDate'),
    contactedAt: t('leads.contactedAt'),
    source: t('leads.source'),
    updated: t('leads.lastUpdate')
  }

  const yes = t('common.yes')
  const no = t('common.no')

  // Column headers must be UNIQUE: a custom question labelled e.g. "E-mail"
  // would otherwise overwrite the fixed E-mail column for every row. When that
  // happens we disambiguate with the technical key.
  const usedHeaders = new Set(Object.values(H))
  dynamicKeys.forEach((key) => {
    let header = dynamicColumns.get(key)
    if (usedHeaders.has(header)) header = `${header} (${key})`
    let n = 2
    while (usedHeaders.has(header)) {
      header = `${dynamicColumns.get(key)} (${key} ${n})`
      n += 1
    }
    usedHeaders.add(header)
    dynamicColumns.set(key, header)
  })

  // ---- 3. rows -----------------------------------------------------------
  const rows = leads.map((l) => {
    const ans = byReg.get(l.id) || {}
    const row = {
      [H.leadId]: l.lead_number || '',
      [H.date]: formatDate(l.created_at, { withTime: true }),
      [H.event]: eventsById[l.event_id]?.name || '',
      [H.name]: l.full_name || [l.first_name, l.last_name].filter(Boolean).join(' '),
      [H.firstName]: l.first_name || '',
      [H.lastName]: l.last_name || '',
      [H.company]: l.company || '',
      [H.position]: l.job_title || '',
      [H.profession]: l.profession || '',
      [H.phone]: l.phone || '',
      [H.email]: l.email || '',
      [H.country]: l.country || '',
      [H.county]: l.county || '',
      [H.city]: l.city || '',
      [H.visitorType]: l.visitor_type
        ? labelForValue(OPTIONS_VISITOR_TYPE, l.visitor_type)
        : '',
      [H.interests]: Array.isArray(l.interests)
        ? l.interests.map((v) => labelForValue(OPTIONS_INTERESTS, v)).join(', ')
        : '',
      [H.projectStage]: l.project_stage
        ? labelForValue(OPTIONS_PROJECT_STAGE, l.project_stage)
        : '',
      [H.followUp]: l.follow_up_requested ? yes : no,
      [H.gdpr]: l.gdpr_accepted ? yes : no,
      [H.gdprAt]: formatDate(l.gdpr_accepted_at, { withTime: true }),
      [H.gdprVersion]: l.gdpr_version || '',
      [H.signature]: l.signature_path || l.signature_data ? yes : no,
      [H.status]: t(`status.${l.status}`) || STATUS_BY_VALUE[l.status]?.label || l.status,
      [H.assigned]: repsById[l.assigned_to]?.name || '',
      [H.notes]: l.internal_notes || '',
      [H.followUpDate]: formatDate(l.follow_up_date),
      [H.contactedAt]: formatDate(l.contacted_at, { withTime: true }),
      [H.source]: l.source || '',
      [H.updated]: formatDate(l.updated_at, { withTime: true })
    }

    // custom + non-mapped standard questions
    dynamicKeys.forEach((key) => {
      const header = dynamicColumns.get(key)
      row[header] = answerToText(ans[key])
    })

    return row
  })

  const headers = [
    ...Object.values(H),
    ...dynamicKeys.map((k) => dynamicColumns.get(k))
  ]

  return { rows, headers }
}

/* ---------------------------------------------------------------- exports */

/* ------------------------------------------------------------- signatures */

/**
 * Collect the signature PNG of every lead as a base64 string.
 * A signature lives either in the private "signatures" bucket (normal case)
 * or, when the venue had no internet at upload time, as a base64 data URL
 * inside the row itself. Both are handled here.
 */
async function collectSignatures(leads, getSignedUrls) {
  const out = {}

  // 1) the offline fallback copies are already base64 — nothing to fetch
  const needFetch = []
  leads.forEach((l) => {
    if (l.signature_data && String(l.signature_data).includes('base64,')) {
      out[l.id] = String(l.signature_data).split('base64,')[1]
    } else if (l.signature_path) {
      needFetch.push(l)
    }
  })

  if (!needFetch.length || typeof getSignedUrls !== 'function') return out

  // 2) one signed URL per stored image, then download them
  let urls = {}
  try {
    urls = await getSignedUrls(needFetch.map((l) => l.signature_path))
  } catch (err) {
    console.warn('[CM] could not sign signature URLs for the export', err)
    return out
  }

  const CONCURRENCY = 6
  for (let i = 0; i < needFetch.length; i += CONCURRENCY) {
    const slice = needFetch.slice(i, i + CONCURRENCY)
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      slice.map(async (l) => {
        const url = urls[l.signature_path]
        if (!url) return
        try {
          const buf = await fetch(url).then((r) => r.arrayBuffer())
          const bytes = new Uint8Array(buf)
          let bin = ''
          for (let k = 0; k < bytes.length; k += 8192) {
            bin += String.fromCharCode.apply(null, bytes.subarray(k, k + 8192))
          }
          out[l.id] = btoa(bin)
        } catch (err) {
          console.warn('[CM] signature download failed', l.lead_number, err)
        }
      })
    )
  }

  return out
}

/**
 * Build the .xlsx file.
 *
 * @param {Function} opts.getSignedUrls  paths[] -> { path: signedUrl } (optional)
 * @param {Object}   opts.event          the event this export belongs to (optional)
 * @param {Function} opts.onProgress     called with a short status string
 */
export async function exportToXlsx(leads, answers, opts = {}) {
  const { t = (k) => k, event = null, getSignedUrls = null, onProgress } = opts

  // ExcelJS is ~800 kB. It is loaded on demand, the FIRST time somebody
  // exports — so the tablet registration screen stays small and fast.
  onProgress?.('loading')
  const ExcelJS = (await import('exceljs')).default || (await import('exceljs'))

  const { rows, headers } = buildExportRows(leads, answers, opts)
  const filename = `${safeFileName(opts.fileLabel || 'cm_leads')}_${formatDate(
    new Date()
  )}.xlsx`

  onProgress?.('signatures')
  const signatures = await collectSignatures(leads, getSignedUrls)

  onProgress?.('building')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CM Event Leads'
  wb.created = new Date()
  const ws = wb.addWorksheet('Leads', {
    views: [{ state: 'frozen', ySplit: 4 }]
  })

  const sigHeader = t('leads.signature')
  // The signature column is written as a picture, so it must not also carry
  // the Da/Nu text produced by buildExportRows.
  const dataHeaders = headers.filter((h) => h !== sigHeader)
  const allHeaders = [...dataHeaders, sigHeader]
  const sigCol = allHeaders.length // 1-based index of the signature column

  /* ------------------------------------------------------------- title ---- */
  const titleText = event?.name || opts.fileLabel || 'CM Event Leads'
  const subtitleParts = [
    event?.location,
    [formatDate(event?.start_date), formatDate(event?.end_date)]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(' – '),
    `${t('common.export')}: ${formatDate(new Date(), { withTime: true })}`,
    `${t('common.total')}: ${rows.length}`
  ].filter(Boolean)

  const titleRow = ws.addRow([titleText])
  titleRow.font = { name: 'Montserrat', size: 16, bold: true, color: { argb: 'FF323232' } }
  titleRow.height = 24
  ws.mergeCells(1, 1, 1, allHeaders.length)

  const subRow = ws.addRow([subtitleParts.join('   ·   ')])
  subRow.font = { name: 'Montserrat', size: 10, color: { argb: 'FF6E6E73' } }
  ws.mergeCells(2, 1, 2, allHeaders.length)

  ws.addRow([]) // breathing room

  /* ----------------------------------------------------------- headers ---- */
  const headRow = ws.addRow(allHeaders)
  headRow.height = 22
  headRow.eachCell((cell) => {
    cell.font = { name: 'Montserrat', size: 9, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF323232' } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
  })

  /* -------------------------------------------------------------- data ---- */
  rows.forEach((r, i) => {
    const lead = leads[i]
    const values = dataHeaders.map((h) => r[h])
    const row = ws.addRow([...values, null])
    row.alignment = { vertical: 'middle' }

    const b64 = lead ? signatures[lead.id] : null
    if (b64) {
      row.height = 46
      try {
        const imageId = wb.addImage({ base64: b64, extension: 'png' })
        ws.addImage(imageId, {
          // ExcelJS anchors are 0-based
          tl: { col: sigCol - 1 + 0.08, row: row.number - 1 + 0.08 },
          ext: { width: 190, height: 52 },
          editAs: 'oneCell'
        })
      } catch (err) {
        console.warn('[CM] could not embed a signature', err)
        row.getCell(sigCol).value = t('common.yes')
      }
    } else {
      row.getCell(sigCol).value = t('leads.noSignature')
      row.getCell(sigCol).font = { color: { argb: 'FF93959A' }, size: 9 }
    }

    if (i % 2 === 1) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }
      })
    }
  })

  /* ------------------------------------------------------------ layout ---- */
  allHeaders.forEach((h, idx) => {
    const col = ws.getColumn(idx + 1)
    if (idx + 1 === sigCol) {
      col.width = 30
      return
    }
    let width = Math.max(12, Math.min(42, String(h).length + 4))
    rows.slice(0, 200).forEach((r) => {
      const v = r[h]
      if (v) width = Math.max(width, Math.min(50, String(v).length + 2))
    })
    col.width = width
  })

  ws.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: allHeaders.length }
  }

  onProgress?.('writing')
  const buffer = await wb.xlsx.writeBuffer()
  download(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }),
    filename
  )
  return {
    rows: rows.length,
    filename,
    signatures: Object.keys(signatures).length
  }
}

/** Plain-JavaScript CSV writer with a UTF-8 BOM (Excel-friendly). */
export function exportToCsv(leads, answers, opts = {}) {
  const { rows, headers } = buildExportRows(leads, answers, opts)
  const filename = `${safeFileName(opts.fileLabel || 'cm_leads')}_${formatDate(
    new Date()
  )}.csv`
  const sep = opts.separator || ';' // ';' is what Excel expects in RO/HU locales

  const esc = (value) => {
    const s = value === null || value === undefined ? '' : String(value)
    if (s.includes('"') || s.includes(sep) || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const lines = [headers.map(esc).join(sep)]
  rows.forEach((r) => {
    lines.push(headers.map((h) => esc(r[h])).join(sep))
  })

  // \uFEFF = UTF-8 BOM, required by Microsoft Excel for correct diacritics
  const BOM = '\uFEFF'
  const csv = BOM + lines.join('\r\n') + '\r\n'
  download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename)
  return { rows: rows.length, filename }
}

export default { exportToXlsx, exportToCsv, buildExportRows }
