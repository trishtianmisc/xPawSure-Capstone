import type { PrescriptionRecord } from '../../../src/services/records'

const ROUTE_LABELS: Record<string, string> = {
  ORAL: 'Oral',
  TOPICAL: 'Topical',
  INJECTION: 'Injection',
  EAR: 'Ear',
  EYE: 'Eye',
  OTHER: 'Other',
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => HTML_ESCAPES[character])
}

function parseDateOnly(value: string | null | undefined): {
  year: number
  month: number
  day: number
} | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  return { year, month, day }
}

export function formatPrescriptionDate(value: string | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function calculatePetAge(
  birthDate: string | null | undefined,
  now: Date = new Date(),
): string {
  const birth = parseDateOnly(birthDate)
  if (!birth) return '—'

  let years = now.getFullYear() - birth.year
  const monthDifference = now.getMonth() + 1 - birth.month
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && now.getDate() < birth.day)
  ) {
    years -= 1
  }

  if (years < 1) return '<1 yr'
  return `${years} yr${years === 1 ? '' : 's'}`
}

export function formatPetSex(value: string | null | undefined): string {
  if (!value) return '—'
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

export function formatPetWeight(value: string | null | undefined): string {
  const weight = value?.trim()
  return weight ? `${weight} kg` : '—'
}

export function formatRoute(value: string | null | undefined): string {
  if (!value) return '—'
  return ROUTE_LABELS[value] ?? value
}

export function formatClinicLine(
  clinicName: string | null | undefined,
  clinicAddress: string | null | undefined,
): string {
  return [clinicName?.trim(), clinicAddress?.trim()].filter(Boolean).join(' · ')
}

function field(label: string, value: string | null | undefined): string {
  const displayValue = value?.trim() || '—'
  return `
    <div class="field">
      <span class="field-label">${escapeHtml(label)}</span>
      <span class="field-value">${escapeHtml(displayValue)}</span>
    </div>
  `
}

function textWithBreaks(value: string | null | undefined): string {
  return escapeHtml(value).replace(/\n/g, '<br />')
}

export function buildPrescriptionPdfHtml(prescription: PrescriptionRecord): string {
  const vetName = prescription.veterinarian.trim() || 'Veterinarian'
  const clinicLine = formatClinicLine(
    prescription.clinic_name,
    prescription.clinic_address,
  )
  const clinicPhone = prescription.clinic_phone?.trim() ?? ''
  const instructions = prescription.instructions?.trim() ?? ''
  const licenseNumber = prescription.vet_license_number?.trim() || '—'

  const medicationRows =
    prescription.items.length === 0
      ? '<tr><td class="empty" colspan="6">No medications listed.</td></tr>'
      : prescription.items
          .map((item) => {
            const details = [
              item.generic_name?.trim()
                ? `<p class="med-sub">${escapeHtml(item.generic_name)}</p>`
                : '',
              item.notes?.trim()
                ? `<p class="med-notes">Notes: ${escapeHtml(item.notes)}</p>`
                : '',
            ].join('')

            return `
              <tr>
                <td>
                  <p class="med-name">${escapeHtml(item.medicine_name)}</p>
                  ${details}
                </td>
                <td>${escapeHtml(item.dosage)}</td>
                <td>${escapeHtml(item.frequency)}</td>
                <td>${escapeHtml(item.duration)}</td>
                <td>${escapeHtml(formatRoute(item.route))}</td>
                <td>${item.quantity == null ? '—' : escapeHtml(item.quantity)}</td>
              </tr>
            `
          })
          .join('')

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Prescription - ${escapeHtml(prescription.pet_name)}</title>
    <style>
      @page {
        size: A4;
        margin: 12mm;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
      }

      body {
        -webkit-print-color-adjust: exact;
        color: #1c1917;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 10pt;
        line-height: 1.45;
        print-color-adjust: exact;
      }

      .sheet {
        display: flex;
        flex-direction: column;
        min-height: 265mm;
      }

      .content {
        display: flex;
        flex: 1;
        flex-direction: column;
      }

      header {
        text-align: center;
      }

      h1 {
        color: #1f6f8b;
        font-size: 20pt;
        font-weight: 800;
        letter-spacing: 0.04em;
        margin: 0;
        text-transform: uppercase;
      }

      .subtitle {
        color: #1f6f8b;
        font-size: 7.5pt;
        font-weight: 600;
        letter-spacing: 0.2em;
        margin: 2px 0 0;
        text-transform: uppercase;
      }

      .clinic-phone {
        color: #57534e;
        font-size: 8pt;
        margin: 5px 0 0;
      }

      .clinic-line {
        color: #57534e;
        font-size: 7.5pt;
        font-weight: 600;
        letter-spacing: 0.08em;
        margin: 2px 0 0;
        text-transform: uppercase;
      }

      .rule-thick {
        border-top: 3px solid #1f6f8b;
        margin-top: 12px;
      }

      .rule-thin {
        border-top: 1px solid #1f6f8b;
        margin-top: 3px;
      }

      .info {
        margin-top: 18px;
      }

      .grid {
        display: grid;
        column-gap: 36px;
        grid-template-columns: 1fr 1fr;
        row-gap: 9px;
      }

      .field {
        align-items: flex-end;
        display: flex;
        gap: 8px;
      }

      .field-label {
        color: #57534e;
        flex-shrink: 0;
        font-size: 7.5pt;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .field-value {
        border-bottom: 1px solid #78716c;
        color: #1c1917;
        flex: 1;
        font-size: 9.5pt;
        font-weight: 500;
        min-width: 0;
        padding-bottom: 2px;
        word-break: break-word;
      }

      .rx-section {
        display: flex;
        flex: 1;
        gap: 20px;
        margin-top: 18px;
      }

      .rx-mark {
        color: #1f6f8b;
        flex-shrink: 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 54pt;
        font-weight: 700;
        line-height: 1;
        padding-top: 5px;
        width: 84px;
      }

      .rx-body {
        flex: 1;
        min-width: 0;
      }

      table {
        border-collapse: collapse;
        font-size: 8pt;
        text-align: left;
        width: 100%;
      }

      thead tr {
        border-top: 2px solid #1f6f8b;
      }

      th {
        color: #1f6f8b;
        font-size: 7pt;
        font-weight: 600;
        letter-spacing: 0.04em;
        padding: 7px 8px 7px 0;
        text-transform: uppercase;
      }

      td {
        border-bottom: 1px solid #e7e5e4;
        padding: 7px 8px 7px 0;
        vertical-align: top;
      }

      tbody tr:last-child td {
        border-bottom: 0;
      }

      tr {
        page-break-inside: avoid;
      }

      .med-name {
        font-weight: 600;
        margin: 0;
      }

      .med-sub {
        color: #78716c;
        font-size: 7.5pt;
        margin: 1px 0 0;
      }

      .med-notes {
        color: #57534e;
        font-size: 7.5pt;
        font-style: italic;
        margin: 2px 0 0;
      }

      .empty {
        color: #78716c;
        padding: 12px 0;
      }

      .instructions {
        color: #44403c;
        font-size: 8pt;
        margin: 12px 0 0;
      }

      .instructions strong {
        color: #1c1917;
      }

      footer {
        margin-top: 24px;
        page-break-inside: avoid;
      }

      .signature {
        color: #57534e;
        font-size: 8pt;
        margin-left: auto;
        text-align: right;
        width: 240px;
      }

      .signature-line {
        border-bottom: 1px solid #78716c;
        margin: 0 0 5px auto;
        width: 210px;
      }

      .signature-name {
        color: #1f6f8b;
        font-size: 9pt;
        font-weight: 700;
        margin: 0;
      }

      .license {
        margin: 10px 0 0;
      }

      .license-value {
        border-bottom: 1px solid #78716c;
        color: #1c1917;
        display: inline-block;
        min-width: 130px;
        padding-bottom: 1px;
        text-align: left;
      }

      .brand-bar {
        background: #1f6f8b;
        flex-shrink: 0;
        height: 9mm;
        margin-top: 10mm;
      }
    </style>
  </head>
  <body>
    <article class="sheet">
      <div class="content">
        <header>
          <h1>${escapeHtml(vetName)}, DVM</h1>
          <p class="subtitle">Veterinary Medicine</p>
          ${clinicPhone ? `<p class="clinic-phone">${escapeHtml(clinicPhone)}</p>` : ''}
          ${clinicLine ? `<p class="clinic-line">${escapeHtml(clinicLine)}</p>` : ''}
          <div class="rule-thick"></div>
          <div class="rule-thin"></div>
        </header>

        <section class="info">
          <div class="grid">
            ${field("Owner's Name", prescription.owner_name)}
            ${field('Date', formatPrescriptionDate(prescription.created_at))}
          </div>
          <div class="rule-thick" style="margin-top: 14px;"></div>
          <div class="grid" style="margin-top: 12px;">
            ${field("Pet's Name", prescription.pet_name)}
            ${field("Pet's Age", calculatePetAge(prescription.pet_birth_date))}
            ${field('Sex', formatPetSex(prescription.pet_sex))}
            ${field('Weight', formatPetWeight(prescription.pet_weight))}
            ${field('Breed', prescription.pet_breed)}
            ${field('Color', prescription.pet_color)}
          </div>
        </section>

        <section class="rx-section">
          <div class="rx-mark">Rx</div>
          <div class="rx-body">
            <table>
              <colgroup>
                <col style="width: 30%;" />
                <col style="width: 15%;" />
                <col style="width: 15%;" />
                <col style="width: 14%;" />
                <col style="width: 14%;" />
                <col style="width: 12%;" />
              </colgroup>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                  <th>Route</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                ${medicationRows}
              </tbody>
            </table>

            ${
              instructions
                ? `<p class="instructions"><strong>Instructions:</strong> ${textWithBreaks(instructions)}</p>`
                : ''
            }
          </div>
        </section>

        <footer>
          <div class="signature">
            <div class="signature-line"></div>
            <p class="signature-name">${escapeHtml(vetName)}, DVM</p>
            <p class="license">
              License #:
              <span class="license-value">${escapeHtml(licenseNumber)}</span>
            </p>
          </div>
        </footer>
      </div>

      <div class="brand-bar"></div>
    </article>
  </body>
</html>`
}
