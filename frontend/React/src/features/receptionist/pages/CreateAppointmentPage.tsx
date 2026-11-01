import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { useCancelPayment, useCreateCheckout, usePayment } from '../../payments/hooks/usePayments'
import type { Payment, PaymentMethod } from '../../payments/types/payment.types'
import { apiErrorCode } from '../../../utils/error'
import { useCreateAppointment } from '../hooks/useAppointments'
import { useAvailableSlots, useVetsForDate } from '../hooks/useAvailableSlots'
import { useClinicSettings } from '../hooks/useClinicSettings'
import { useOwners } from '../hooks/useOwners'
import { usePets } from '../hooks/usePets'
import { createAppointmentSchema, type CreateAppointmentForm } from '../schemas/receptionist.schema'
import type { VetSlot } from '../types/receptionist.types'

const METHOD_OPTIONS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'GCASH', label: 'GCash', hint: 'Owner pays on the checkout page' },
  { value: 'CARD', label: 'Card', hint: 'Owner pays on the checkout page' },
  { value: 'CASH', label: 'Cash', hint: 'Recorded now, settled at the counter' },
]

function isSettledWithoutPayment(status: Payment['status']): boolean {
  return status === 'FAILED' || status === 'EXPIRED' || status === 'VOID'
}

export function CreateAppointmentPage() {
  const navigate = useNavigate()
  const createAppointment = useCreateAppointment()
  const checkout = useCreateCheckout()
  const { data: clinicSettings, isError: settingsFailed } = useClinicSettings()

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedVet, setSelectedVet] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<VetSlot | null>(null)
  const [ownerSearch, setOwnerSearch] = useState('')
  const [selectedOwnerId, setSelectedOwnerId] = useState('')
  const [petSearch, setPetSearch] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('GCASH')
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null)
  const [submittedForm, setSubmittedForm] = useState<CreateAppointmentForm | null>(null)
  const bookingStarted = useRef(false)

  // Clinic settings decide whether payment is part of this booking at all.
  const fee = clinicSettings ? Number(clinicSettings.consultation_fee ?? 0) : undefined
  const requiresPayment = fee !== undefined && fee > 0

  const { data: pendingPayment } = usePayment(pendingPaymentId ?? '', {
    enabled: !!pendingPaymentId,
  })
  const cancelPayment = useCancelPayment()

  const { data: vets, isLoading: vetsLoading } = useVetsForDate(selectedDate)
  const { data: slots, isLoading: slotsLoading } = useAvailableSlots(selectedVet, selectedDate)
  const { data: ownersData } = useOwners({ search: ownerSearch || undefined, page_size: 20 })
  const { data: petsData } = usePets(
    {
      owner_id: selectedOwnerId || undefined,
      scope: selectedOwnerId ? 'owner' : undefined,
      page_size: 50,
    },
    { enabled: !!selectedOwnerId },
  )

  const visiblePets = (petsData?.results ?? []).filter(
    (pet) => !petSearch || pet.name.toLowerCase().includes(petSearch.toLowerCase()),
  )

  function onOwnerChange(value: string) {
    setSelectedOwnerId(value)
    setPetSearch('')
    setValue('pet_id', '')
    // A payment belongs to one owner, so a pending checkout for the previous
    // owner can no longer pay for this booking.
    setPendingPaymentId(null)
    bookingStarted.current = false
  }

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateAppointmentForm>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      apt_type: 'CONSULTATION',
    },
  })

  function book(data: CreateAppointmentForm, payId?: string | null) {
    if (!selectedSlot) return
    createAppointment.mutate(
      { ...data, slot_id: selectedSlot.vsl_id, pay_id: payId ?? undefined },
      { onSuccess: (result) => navigate(`/receptionist/appointments/${result.apt_id}`) },
    )
  }

  function onSubmit(data: CreateAppointmentForm) {
    if (!selectedSlot) return
    setSubmittedForm(data)

    if (pendingPayment?.status === 'PAID') {
      // Already settled for this session — just create the appointment.
      book(data, pendingPayment.pay_id)
      return
    }
    if (pendingPayment?.status === 'PENDING') {
      // The checkout panel is waiting for the gateway.
      return
    }
    if (fee === undefined) {
      // Settings still loading; the submit button is disabled meanwhile.
      return
    }
    if (fee <= 0) {
      book(data)
      return
    }

    checkout.mutate(
      {
        pet_id: data.pet_id,
        slot_id: selectedSlot.vsl_id,
        apt_type: data.apt_type,
        method,
        reason: data.reason ?? '',
      },
      {
        onSuccess: (payment) => {
          if (payment.status === 'PAID') {
            book(data, payment.pay_id)
            return
          }
          setPendingPaymentId(payment.pay_id)
        },
        onError: (error) => {
          // A clinic with no fee answers here; book without a payment then.
          if (apiErrorCode(error) === 'PAYMENT_NOT_REQUIRED') {
            book(data)
          }
        },
      },
    )
  }

  // The mock checkout page confirms the payment in another tab; this picks the
  // result up and finishes the booking exactly once.
  useEffect(() => {
    if (pendingPayment?.status !== 'PAID') return
    if (bookingStarted.current) return
    if (!submittedForm) return
    bookingStarted.current = true
    book(submittedForm, pendingPayment.pay_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPayment?.status, pendingPayment?.pay_id, submittedForm])

  function resetPendingPayment() {
    setPendingPaymentId(null)
    bookingStarted.current = false
  }

  function handleDiscardCheckout() {
    if (pendingPaymentId) {
      cancelPayment.mutate(pendingPaymentId)
    }
    resetPendingPayment()
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
        {/* Step 1: Select Owner & Pet */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">1. Select Owner & Pet</h2>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Owner</label>
          <input
            type="text"
            placeholder="Search owners..."
            value={ownerSearch}
            onChange={(e) => setOwnerSearch(e.target.value)}
            className="mb-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
          />
          <select
            value={selectedOwnerId}
            onChange={(e) => onOwnerChange(e.target.value)}
            className="mb-4 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
          >
            <option value="">Select an owner</option>
            {ownersData?.results.map((owner) => (
              <option key={owner.own_id} value={owner.own_id}>
                {owner.full_name} — {owner.email}
              </option>
            ))}
          </select>

          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Pet</label>
          <input
            type="text"
            placeholder="Search this owner's pets..."
            value={petSearch}
            onChange={(e) => setPetSearch(e.target.value)}
            disabled={!selectedOwnerId}
            className="mb-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 disabled:opacity-50"
          />
          <select
            {...register('pet_id')}
            disabled={!selectedOwnerId}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 disabled:opacity-50"
          >
            <option value="">{selectedOwnerId ? 'Select a pet' : 'Select an owner first'}</option>
            {visiblePets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name}
              </option>
            ))}
          </select>
          {selectedOwnerId && petsData && petsData.results.length === 0 && (
            <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
              No pets found for this owner.
            </p>
          )}
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

        {/* Step 5: Payment (only when the clinic charges a fee) */}
        {requiresPayment && (
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h2 className="mb-1 text-lg font-semibold text-stone-900 dark:text-stone-100">
              5. Payment
            </h2>
            <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
              ₱{fee?.toFixed(2)} consultation fee. The appointment is created only after the
              payment settles.
            </p>

            {!pendingPayment && (
              <div className="space-y-2">
                {METHOD_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                      method === option.value
                        ? 'border-amber-500 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                        : 'border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={method === option.value}
                      onChange={() => setMethod(option.value)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-stone-800 dark:text-stone-100">
                        {option.label}
                      </span>
                      <span className="block text-xs text-stone-500 dark:text-stone-400">
                        {option.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            {pendingPayment?.status === 'PENDING' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                      Checkout {pendingPayment.reference_no} created
                    </p>
                    <p className="mt-1 text-xs text-amber-800 dark:text-amber-400">
                      Waiting for ₱{Number(pendingPayment.amount).toFixed(2)} via{' '}
                      {pendingPayment.method}. The booking finishes automatically once it pays.
                    </p>
                  </div>
                  <span className="mt-1 size-4 shrink-0 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      pendingPayment.checkout_url &&
                      window.open(pendingPayment.checkout_url, '_blank', 'noopener')
                    }
                    className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800"
                  >
                    Open checkout page
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardCheckout}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-white dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    Discard checkout
                  </button>
                </div>
              </div>
            )}

            {pendingPayment?.status === 'PAID' && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                Payment received — creating the appointment…
              </div>
            )}

            {pendingPayment && isSettledWithoutPayment(pendingPayment.status) && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  {pendingPayment.failure_reason ?? 'The payment did not go through.'}
                </p>
                <button
                  type="button"
                  onClick={handleDiscardCheckout}
                  className="mt-3 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-white dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  Start over
                </button>
              </div>
            )}
          </div>
        )}

        {/* Settings decide whether payment is part of the booking, so a failed
            load has to be visible instead of silently blocking the button. */}
        {settingsFailed && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            Clinic settings could not be loaded, so booking is paused. Refresh the page to try
            again.
          </div>
        )}

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
            disabled={
              !selectedSlot ||
              fee === undefined ||
              checkout.isPending ||
              createAppointment.isPending ||
              pendingPayment?.status === 'PENDING'
            }
            className="rounded-lg bg-amber-700 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-50"
          >
            {pendingPayment?.status === 'PENDING'
              ? 'Waiting for payment…'
              : checkout.isPending
                ? 'Starting checkout…'
                : createAppointment.isPending
                  ? 'Booking...'
                  : requiresPayment
                    ? 'Pay & Book'
                    : 'Book Appointment'}
          </button>
        </div>
      </form>
    </div>
  )
}
