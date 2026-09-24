import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Alert, Button, Card, Input } from '../../../components/ui'
import { settingsSchema, type SettingsFormValues } from '../schemas/clinicProfile.schema'
import type { ClinicSettings } from '../types/clinicProfile.types'

interface ClinicSettingsCardProps {
  settings: ClinicSettings
  isUpdating: boolean
  onUpdate: (data: SettingsFormValues) => void
}

function toTimeInputValue(timeStr: string): string {
  if (!timeStr) return ''
  const parts = timeStr.split(':')
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
}

export function ClinicSettingsCard({ settings, isUpdating, onUpdate }: ClinicSettingsCardProps) {
  const [editing, setEditing] = useState(false)

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      opening_time: toTimeInputValue(settings.opening_time),
      closing_time: toTimeInputValue(settings.closing_time),
      appointment_duration: settings.appointment_duration,
      max_appointments_per_day: settings.max_appointments_per_day,
      allow_owner_booking: settings.allow_owner_booking,
    },
  })

  function openEdit() {
    reset({
      opening_time: toTimeInputValue(settings.opening_time),
      closing_time: toTimeInputValue(settings.closing_time),
      appointment_duration: settings.appointment_duration,
      max_appointments_per_day: settings.max_appointments_per_day,
      allow_owner_booking: settings.allow_owner_booking,
    })
    setEditing(true)
  }

  return (
    <Card padding="lg">
      <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
        Clinic Settings
      </h2>

      <dl className="mt-6 divide-y divide-stone-100 dark:divide-stone-700">
        <div className="py-4 sm:py-5">
          <InfoRow label="Opening Time" value={settings.opening_time} />
        </div>
        <div className="py-4 sm:py-5">
          <InfoRow label="Closing Time" value={settings.closing_time} />
        </div>
        <div className="py-4 sm:py-5">
          <InfoRow label="Appointment Duration" value={`${settings.appointment_duration} minutes`} />
        </div>
        <div className="py-4 sm:py-5">
          <InfoRow label="Max Appointments / Day" value={String(settings.max_appointments_per_day)} />
        </div>
        <div className="py-4 sm:py-5">
          <InfoRow
            label="Owner Booking"
            value={settings.allow_owner_booking ? 'Enabled' : 'Disabled'}
          />
        </div>
        <div className="py-4 sm:py-5">
          <InfoRow label="Timezone" value={settings.timezone} />
        </div>
      </dl>

      <div className="mt-6">
        <Button variant="secondary" size="sm" onClick={openEdit}>
          Edit Settings
        </Button>
      </div>

      {editing && (
        <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-600 dark:bg-stone-900">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Edit Settings</h3>
          <form
            className="mt-4 space-y-4"
            noValidate
            onSubmit={handleSubmit((data) => {
              onUpdate(data)
              setEditing(false)
            })}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                {...register('opening_time')}
                error={errors.opening_time?.message}
                label="Opening Time"
                type="time"
              />
              <Input
                {...register('closing_time')}
                error={errors.closing_time?.message}
                label="Closing Time"
                type="time"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                {...register('appointment_duration', { valueAsNumber: true })}
                error={errors.appointment_duration?.message}
                label="Appointment Duration (minutes)"
                type="number"
                min={1}
                max={240}
              />
              <Input
                {...register('max_appointments_per_day', { valueAsNumber: true })}
                error={errors.max_appointments_per_day?.message}
                label="Max Appointments / Day"
                type="number"
                min={1}
                max={500}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allow_owner_booking"
                {...register('allow_owner_booking')}
                className="size-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="allow_owner_booking" className="text-sm font-medium text-stone-700 dark:text-stone-300">
                Allow Owner Booking
              </label>
            </div>
            {errors.root?.message && (
              <Alert variant="error">{errors.root.message}</Alert>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditing(false)} type="button">
                Cancel
              </Button>
              <Button loading={isUpdating} type="submit">
                Save Settings
              </Button>
            </div>
          </form>
        </div>
      )}
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
      <dt className="text-sm font-medium text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="mt-1 text-sm text-stone-900 dark:text-stone-100 sm:col-span-2 sm:mt-0">{value}</dd>
    </div>
  )
}
