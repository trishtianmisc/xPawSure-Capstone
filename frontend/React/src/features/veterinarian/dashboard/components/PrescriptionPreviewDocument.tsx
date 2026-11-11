import { ROUTE_OPTIONS } from '../constants/prescription'
import type {
  VetAppointmentDetail,
  VetPrescriptionInfo,
} from '../types/dashboard.types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function ageFromBirthDate(birthDate: string | null): string {
  if (!birthDate) return '-'
  const birth = new Date(birthDate)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) years -= 1
  if (years < 1) return '<1 yr'
  return `${years} yr${years === 1 ? '' : 's'}`
}

function routeLabel(value: string): string {
  return ROUTE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function sexLabel(value: string): string {
  if (!value) return '-'
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function formatWeight(weight: string | null): string {
  return weight ? `${weight} kg` : '-'
}

function Field({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={`flex items-end gap-2 ${className}`}>
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
        {label}
      </span>
      <span className="min-w-0 flex-1 break-words border-b border-stone-500 pb-0.5 text-[12px] font-medium text-stone-900">
        {value || '\u00A0'}
      </span>
    </div>
  )
}

function PrescriptionWatermark() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full text-[#1f6f8b] opacity-[0.06]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          height="140"
          id="rx-watermark-pattern"
          patternTransform="rotate(-12)"
          patternUnits="userSpaceOnUse"
          width="140"
        >
          <g fill="currentColor">
            <g transform="translate(28 30) rotate(-18)">
              <ellipse cx="0" cy="6" rx="8" ry="7" />
              <ellipse cx="-9" cy="-5" rx="3.2" ry="4.5" />
              <ellipse cx="-3" cy="-10" rx="3.2" ry="4.5" />
              <ellipse cx="4" cy="-10" rx="3.2" ry="4.5" />
              <ellipse cx="10" cy="-5" rx="3.2" ry="4.5" />
            </g>
            <g transform="translate(98 82) rotate(28)">
              <rect height="6" rx="3" width="20" x="-10" y="-3" />
              <circle cx="-11" cy="-4" r="3.2" />
              <circle cx="-11" cy="4" r="3.2" />
              <circle cx="11" cy="-4" r="3.2" />
              <circle cx="11" cy="4" r="3.2" />
            </g>
            <g transform="translate(96 24) rotate(12)">
              <ellipse cx="0" cy="6" rx="8" ry="7" />
              <ellipse cx="-9" cy="-5" rx="3.2" ry="4.5" />
              <ellipse cx="-3" cy="-10" rx="3.2" ry="4.5" />
              <ellipse cx="4" cy="-10" rx="3.2" ry="4.5" />
              <ellipse cx="10" cy="-5" rx="3.2" ry="4.5" />
            </g>
            <g transform="translate(32 100) rotate(-30)">
              <rect height="6" rx="3" width="20" x="-10" y="-3" />
              <circle cx="-11" cy="-4" r="3.2" />
              <circle cx="-11" cy="4" r="3.2" />
              <circle cx="11" cy="-4" r="3.2" />
              <circle cx="11" cy="4" r="3.2" />
            </g>
          </g>
        </pattern>
      </defs>
      <rect fill="url(#rx-watermark-pattern)" height="100%" width="100%" />
    </svg>
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
  const vetName = appointment.vet_name ?? prescription.veterinarian
  const clinicLine = appointment.clinic_address
    ? `${appointment.clinic_name} - ${appointment.clinic_address}`
    : appointment.clinic_name

  return (
    <article className="prescription-preview-sheet relative mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col overflow-hidden border border-stone-300 bg-white text-sm leading-relaxed text-stone-900 shadow-xl print:min-h-[269mm] print:max-w-none print:shadow-none">
      <PrescriptionWatermark />

      <div className="relative z-10 flex flex-1 flex-col px-10 pb-6 pt-10 print:pt-0">
        <header className="print-section text-center">
          <h1 className="text-2xl font-extrabold uppercase tracking-wide text-[#1f6f8b]">
            {vetName}, DVM
          </h1>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1f6f8b]">
            Veterinary Medicine
          </p>
          {appointment.clinic_phone && (
            <p className="mt-1 text-[10px] text-stone-600">{appointment.clinic_phone}</p>
          )}
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-600">
            {clinicLine}
          </p>
          <div className="mt-3 border-t-[3px] border-[#1f6f8b]" />
          <div className="mt-1 border-t border-[#1f6f8b]" />
        </header>

        <section className="print-section mt-5">
          <div className="grid grid-cols-2 gap-x-10 gap-y-2.5">
            <Field label="Owner's Name:" value={appointment.owner_name ?? ''} />
            <Field label="Date:" value={formatDate(prescription.created_at)} />
          </div>
          <div className="mt-3 border-t-[3px] border-[#1f6f8b]" />
          <div className="mt-3 grid grid-cols-2 gap-x-10 gap-y-2.5">
            <Field label="Pet's Name:" value={appointment.pet_name} />
            <Field label="Pet's Age:" value={ageFromBirthDate(appointment.pet_birth_date)} />
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-x-10 gap-y-2.5">
            <Field label="Sex:" value={sexLabel(appointment.pet_sex)} />
            <Field label="Weight:" value={formatWeight(appointment.pet_weight)} />
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-x-10 gap-y-2.5">
            <Field label="Breed:" value={appointment.pet_breed ?? ''} />
            <Field label="Color:" value={appointment.pet_color ?? ''} />
          </div>
        </section>

        <section className="mt-4 flex flex-1 gap-5">
          <div className="w-24 shrink-0 pt-1">
            <span className="font-serif text-7xl font-bold leading-none text-[#1f6f8b]">
              Rx
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <table className="w-full border-collapse text-left text-[10px]">
              <thead>
                <tr className="border-t-2 border-[#1f6f8b] text-[9px] uppercase tracking-wide text-[#1f6f8b]">
                  <th className="py-2 pr-3 font-semibold">Medicine</th>
                  <th className="py-2 pr-3 font-semibold">Dosage</th>
                  <th className="py-2 pr-3 font-semibold">Frequency</th>
                  <th className="py-2 pr-3 font-semibold">Duration</th>
                  <th className="py-2 pr-3 font-semibold">Route</th>
                  <th className="py-2 font-semibold">Qty</th>
                </tr>
              </thead>
              <tbody>
                {prescription.items.length === 0 && (
                  <tr>
                    <td className="py-3 text-stone-500" colSpan={6}>
                      No medications listed.
                    </td>
                  </tr>
                )}
                {prescription.items.map((item) => (
                  <tr
                    className="border-b border-stone-200 align-top last:border-0"
                    key={item.id}
                  >
                    <td className="py-2 pr-3">
                      <p className="font-semibold text-stone-900">{item.medicine_name}</p>
                      {item.generic_name && (
                        <p className="text-stone-500">{item.generic_name}</p>
                      )}
                      {item.notes && (
                        <p className="mt-0.5 italic text-stone-600">Notes: {item.notes}</p>
                      )}
                    </td>
                    <td className="py-2 pr-3">{item.dosage}</td>
                    <td className="py-2 pr-3">{item.frequency}</td>
                    <td className="py-2 pr-3">{item.duration}</td>
                    <td className="py-2 pr-3">{routeLabel(item.route)}</td>
                    <td className="py-2">{item.quantity ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {prescription.instructions && (
              <p className="mt-3 text-[10px] text-stone-700">
                <span className="font-semibold">Instructions:</span> {prescription.instructions}
              </p>
            )}
          </div>
        </section>

        <footer className="print-section mt-auto pt-10">
          <div className="ml-auto w-64 text-right text-[10px] text-stone-600">
            <div className="mb-1.5 ml-auto w-56 border-b border-stone-500" />
            <p className="text-xs font-bold text-[#1f6f8b]">{vetName}, DVM</p>
            <p className="mt-3">
              License #:{' '}
              <span className="ml-1 inline-block w-36 border-b border-stone-500 text-left text-stone-900">
                {appointment.vet_license_number ?? ''}
              </span>
            </p>
          </div>
        </footer>
      </div>

      <div className="relative z-10 h-10 w-full shrink-0 bg-[#1f6f8b]" />
    </article>
  )
}
