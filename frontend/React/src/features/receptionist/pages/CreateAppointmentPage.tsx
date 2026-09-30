import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { useCreateAppointment } from '../hooks/useAppointments'
import { useAvailableSlots, useVetsForDate } from '../hooks/useAvailableSlots'
import { usePets } from '../hooks/usePets'
import { createAppointmentSchema, type CreateAppointmentForm } from '../schemas/receptionist.schema'
import type { VetSlot } from '../types/receptionist.types'

export function CreateAppointmentPage() {
  const navigate = useNavigate()
  const createAppointment = useCreateAppointment()

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedVet, setSelectedVet] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<VetSlot | null>(null)
  const [petSearch, setPetSearch] = useState('')

  const { data: vets, isLoading: vetsLoading } = useVetsForDate(selectedDate)
  const { data: slots, isLoading: slotsLoading } = useAvailableSlots(selectedVet, selectedDate)
  const { data: petsData } = usePets({ search: petSearch || undefined, page_size: 50 })

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateAppointmentForm>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      apt_type: 'CONSULTATION',
    },
  })

  function onSubmit(data: CreateAppointmentForm) {
    if (!selectedSlot) return
    createAppointment.mutate(
      { ...data, slot_id: selectedSlot.vsl_id },
      { onSuccess: (result) => navigate(`/receptionist/appointments/${result.apt_id}`) },
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-sm font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
      >
        ← Back
      </button>

      <h1 className="mb-6 text-2xl font-bold text-stone-900 dark:text-stone-100">New Appointment</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
        {/* Step 1: Select Pet */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">1. Select Pet</h2>
          <input
            type="text"
            placeholder="Search pets..."
            value={petSearch}
            onChange={(e) => setPetSearch(e.target.value)}
            className="mb-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
          />
          <select
            {...register('pet_id')}
            onChange={(e) => { register('pet_id').onChange(e); setPetSearch(e.target.value) }}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
          >
            <option value="">Select a pet</option>
            {petsData?.results.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name} — Owner: {(pet as unknown as Record<string, string>).owner_name ?? 'Unknown'}
              </option>
            ))}
          </select>
          {errors.pet_id && <p className="mt-1 text-xs text-red-500">{errors.pet_id.message}</p>}
        </div>

        {/* Step 2: Select Date & Vet */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">2. Select Date & Veterinarian</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Date</label>
              <input
                type="date"
                min={today}
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedVet(''); setSelectedSlot(null) }}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Veterinarian</label>
              <select
                value={selectedVet}
                onChange={(e) => { setSelectedVet(e.target.value); setSelectedSlot(null) }}
                disabled={!selectedDate || vetsLoading}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 disabled:opacity-50"
              >
                <option value="">Select a vet</option>
                {vets?.map((vet) => (
                  <option key={vet.stf_id} value={vet.stf_id}>{vet.full_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 3: Select Time Slot */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">3. Select Time Slot</h2>
          {!selectedDate || !selectedVet ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Select a date and veterinarian first</p>
          ) : slotsLoading ? (
            <div className="flex gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 w-24 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
              ))}
            </div>
          ) : slots && slots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.vsl_id}
                  type="button"
                  onClick={() => { setSelectedSlot(slot); setValue('slot_id', slot.vsl_id) }}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${selectedSlot?.vsl_id === slot.vsl_id
                    ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'border-stone-300 text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800'
                    }`}
                >
                  {slot.vsl_start_time.slice(0, 5)} – {slot.vsl_end_time.slice(0, 5)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">No available slots for this date</p>
          )}
        </div>

        {/* Step 4: Appointment Type & Reason */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">4. Details</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Type</label>
              <select
                {...register('apt_type')}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="CONSULTATION">Consultation</option>
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="VACCINATION">Vaccination</option>
                <option value="AI_REVIEW">AI Review</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Reason (optional)</label>
              <textarea
                {...register('reason')}
                rows={3}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                placeholder="Reason for the visit..."
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedSlot || createAppointment.isPending}
            className="rounded-lg bg-amber-700 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-50"
          >
            {createAppointment.isPending ? 'Booking...' : 'Book Appointment'}
          </button>
        </div>
      </form>
    </div>
  )
}
