import { ROUTE_OPTIONS } from '../constants/prescription'
import { CLINIC_TIME_ZONE, clinicToday } from '../../../../utils/format'
import type {
  VetAppointmentDetail,
  VetPrescriptionInfo,
} from '../types/dashboard.types'

const EM_DASH = '—'

function formatPrescriptionDate(value: string | null | undefined): string {
  if (!value) return EM_DASH
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return EM_DASH
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: CLINIC_TIME_ZONE,
  })
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

function ageFromBirthDate(
  birthDate: string | null | undefined,
  now: Date = clinicToday(),
): string {
  const birth = parseDateOnly(birthDate)
  if (!birth) return EM_DASH

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

function routeLabel(value: string | null | undefined): string {
  if (!value) return EM_DASH
  return ROUTE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function sexLabel(value: string | null | undefined): string {
  if (!value?.trim()) return EM_DASH
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function formatWeight(weight: string | null | undefined): string {
  const value = weight?.trim()
  return value ? `${value} kg` : EM_DASH
}

function formatClinicLine(
  clinicName: string | null | undefined,
  clinicAddress: string | null | undefined,
): string {
  return [clinicName?.trim(), clinicAddress?.trim()].filter(Boolean).join(' · ')
}

function displayValue(value: string | null | undefined): string {
  return value?.trim() || EM_DASH
}

function Field({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="rx-doc-field">
      <p className="rx-doc-field-label">{label}</p>
      <p className="rx-doc-field-value">{displayValue(value)}</p>
    </div>
  )
}

interface PrescriptionPreviewDocumentProps {
  appointment: VetAppointmentDetail
  prescription: VetPrescriptionInfo
}

export function PrescriptionPreviewDocument({
  appointment,
  prescription,
}: PrescriptionPreviewDocumentProps) {
  const vetName =
    prescription.veterinarian?.trim() || 'Veterinarian'
  const clinicLine = formatClinicLine(
    appointment.clinic_name,
    appointment.clinic_address,
  )
  const clinicPhone = appointment.clinic_phone?.trim() ?? ''
  const instructions = prescription.instructions?.trim() ?? ''
  const licenseNumber = appointment.vet_license_number?.trim() || EM_DASH

  return (
    <article className="prescription-preview-sheet relative mx-auto border border-stone-300 shadow-xl">
      <div className="rx-doc-content">
        <header className="rx-doc-header">
          <h1 className="rx-doc-vet">{vetName}, DVM</h1>
          <p className="rx-doc-subtitle">Veterinary Medicine</p>
          {clinicPhone ? <p className="rx-doc-phone">{clinicPhone}</p> : null}
          {clinicLine ? <p className="rx-doc-clinic">{clinicLine}</p> : null}
          <div className="rx-doc-rule-thick" />
          <div className="rx-doc-rule-thin" />
        </header>

        <section className="rx-doc-info">
          <div className="rx-doc-field-row">
            <Field label="Owner's Name" value={appointment.owner_name} />
            <Field
              label="Date"
              value={formatPrescriptionDate(prescription.created_at)}
            />
          </div>
          <div className="rx-doc-info-rule" />
          <div className="rx-doc-field-row">
            <Field label="Pet's Name" value={appointment.pet_name} />
            <Field
              label="Pet's Age"
              value={ageFromBirthDate(appointment.pet_birth_date)}
            />
          </div>
          <div className="rx-doc-field-row">
            <Field label="Sex" value={sexLabel(appointment.pet_sex)} />
            <Field label="Weight" value={formatWeight(appointment.pet_weight)} />
          </div>
          <div className="rx-doc-field-row">
            <Field label="Breed" value={appointment.pet_breed} />
            <Field label="Color" value={appointment.pet_color} />
          </div>
        </section>

        <section className="rx-doc-rx-section">
          <div className="rx-doc-rx-mark">Rx</div>
          <div className="rx-doc-rx-body">
            <div className="rx-doc-table-header">
              <span className="rx-doc-table-header-text rx-doc-medicine-col">
                Medicine
              </span>
              <span className="rx-doc-table-header-text rx-doc-schedule-col">
                Dosage &amp; schedule
              </span>
            </div>

            {prescription.items.length === 0 ? (
              <p className="rx-doc-empty">No medications listed.</p>
            ) : (
              prescription.items.map((item) => {
                const genericName = item.generic_name?.trim()
                const notes = item.notes?.trim()

                return (
                  <div className="rx-doc-med-row" key={item.id}>
                    <div className="rx-doc-medicine-col">
                      <p className="rx-doc-med-name">{item.medicine_name}</p>
                      {genericName ? (
                        <p className="rx-doc-med-generic">{genericName}</p>
                      ) : null}
                      {notes ? (
                        <p className="rx-doc-med-notes">Notes: {notes}</p>
                      ) : null}
                    </div>
                    <div className="rx-doc-schedule-col">
                      <p className="rx-doc-schedule-primary">{item.dosage}</p>
                      <p className="rx-doc-schedule-secondary">
                        {item.frequency} · {item.duration}
                      </p>
                      <p className="rx-doc-schedule-secondary">
                        {routeLabel(item.route)} · Qty:{' '}
                        {item.quantity == null ? EM_DASH : item.quantity}
                      </p>
                    </div>
                  </div>
                )
              })
            )}

            {instructions ? (
              <p className="rx-doc-instructions">
                <span className="rx-doc-instructions-label">Instructions: </span>
                {instructions}
              </p>
            ) : null}
          </div>
        </section>

        <div className="rx-doc-signature">
          <div className="rx-doc-signature-line" />
          <p className="rx-doc-signature-name">{vetName}, DVM</p>
          <div className="rx-doc-license-row">
            <span className="rx-doc-license-label">License #:</span>
            <span className="rx-doc-license-value">{licenseNumber}</span>
          </div>
        </div>
      </div>

      <div className="rx-doc-brand-bar" />
    </article>
  )
}
