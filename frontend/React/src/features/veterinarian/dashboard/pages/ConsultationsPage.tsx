import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ConsultationsTable } from '../components/ConsultationsTable'
import { useStartConsultation, useVetAppointments } from '../hooks/useVetAppointments'
import type { AppointmentStatus, VetAppointmentSummary } from '../types/dashboard.types'

const TABS = ['Upcoming', 'Today', 'Completed', 'Cancelled']

function toDateStr(iso: string): string {
  const d = new Date(iso)
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function matchesTab(appointment: VetAppointmentSummary, tab: string, todayStr: string): boolean {
  const status: AppointmentStatus = appointment.apt_status
  const dateStr = toDateStr(appointment.apt_scheduled_at)

  if (tab === 'Upcoming') return status === 'CONFIRMED' && dateStr > todayStr
  if (tab === 'Today') {
    return (
      dateStr === todayStr &&
      (status === 'CONFIRMED' || status === 'CHECKED_IN' || status === 'IN_PROGRESS')
    )
  }
  if (tab === 'Completed') return status === 'COMPLETED'
  if (tab === 'Cancelled') return status === 'CANCELLED' || status === 'NO_SHOW'
  return true
}

export function ConsultationsPage() {
  const navigate = useNavigate()
  const { data: appointments = [], isLoading, error } = useVetAppointments()
  const startConsultation = useStartConsultation()
  const [activeTab, setActiveTab] = useState('Today')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const todayStr = toDateStr(new Date().toISOString())

  const filtered = appointments.filter((c) => {
    const matchesTabFilter = matchesTab(c, activeTab, todayStr)
    const matchesSearch =
      c.pet_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.pet_species ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesDate = !dateFilter || toDateStr(c.apt_scheduled_at) === dateFilter
    return matchesTabFilter && matchesSearch && matchesDate
  })

  function handleStart(aptId: string) {
    startConsultation.mutate(aptId, {
      onSuccess: () => navigate(`/veterinarian/consultations/${aptId}`),
    })
  }

  function handleView(aptId: string) {
    navigate(`/veterinarian/appointments/${aptId}`)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Consultations
          </h1>
          <p className="mt-2 max-w-xl text-base text-amber-200/80">
            Manage and review all veterinary consultations.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <input
            className="flex-1 rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            type="text"
            value={search}
          />
          <input
            className="rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            onChange={(e) => setDateFilter(e.target.value)}
            type="date"
            value={dateFilter}
          />
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab
                ? 'bg-amber-900 text-white'
                : 'bg-stone-200 text-stone-600 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-400 dark:hover:bg-stone-600'
            }`}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-6 py-8 text-center dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            Failed to load consultations. Please try again.
          </p>
        </div>
      ) : isLoading ? (
        <div className="h-64 animate-pulse rounded-md border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
      ) : (
        <ConsultationsTable
          consultations={filtered}
          onStart={handleStart}
          onView={handleView}
        />
      )}
    </div>
  )
}
