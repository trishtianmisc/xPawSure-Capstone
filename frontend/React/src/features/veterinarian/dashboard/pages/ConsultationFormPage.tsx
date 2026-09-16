import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export function ConsultationFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [form, setForm] = useState({
    pet_name: '',
    breed: '',
    age: '',
    owner_name: '',
    owner_contact: '',
    chief_complaint: '',
    observations: '',
    diagnosis: '',
    diagnosis_date: '',
    notes: '',
  })

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleNext() {
    navigate(`/veterinarian/consultations/${id}/prescription`)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Consultation Form
          </h1>
          <p className="mt-2 max-w-xl text-base text-amber-200/80">
            Record pet information and consultation details.
          </p>
        </div>
      </div>

      <h2 className="mb-4 text-base font-bold text-stone-900 dark:text-stone-100">Pet Information</h2>

      <div className="mb-8 rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
        <div className="flex items-start gap-6">
          <div className="grid size-20 place-items-center rounded-md bg-stone-200 dark:bg-stone-700">
            <svg className="size-8 text-stone-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Pet Name</label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('pet_name', e.target.value)}
                value={form.pet_name}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Breed</label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('breed', e.target.value)}
                value={form.breed}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Age</label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('age', e.target.value)}
                value={form.age}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Owner Name</label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('owner_name', e.target.value)}
                value={form.owner_name}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Contact Info of Owner</label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('owner_contact', e.target.value)}
                value={form.owner_contact}
              />
            </div>
          </div>
        </div>
      </div>

      <h2 className="mb-4 text-base font-bold text-stone-900 dark:text-stone-100">Consultation Form</h2>

      <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800 space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Chief complaint</label>
            <textarea
              className="h-28 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              onChange={(e) => handleChange('chief_complaint', e.target.value)}
              value={form.chief_complaint}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Observations</label>
            <textarea
              className="h-28 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              onChange={(e) => handleChange('observations', e.target.value)}
              value={form.observations}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Diagnosis</label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('diagnosis', e.target.value)}
                value={form.diagnosis}
              />
              <button
                className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
                type="button"
              >
                Select
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Date of Diagnosis</label>
            <input
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              onChange={(e) => handleChange('diagnosis_date', e.target.value)}
              type="date"
              value={form.diagnosis_date}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Notes</label>
          <textarea
            className="h-24 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            onChange={(e) => handleChange('notes', e.target.value)}
            value={form.notes}
          />
        </div>

        <div className="flex justify-end">
          <button
            className="rounded-md bg-amber-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-950"
            onClick={handleNext}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
