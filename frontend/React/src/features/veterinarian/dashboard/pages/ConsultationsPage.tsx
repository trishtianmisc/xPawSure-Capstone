import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Card } from '../../../../components/ui'
import { PageHero } from '../../../receptionist/components/PageHero'
import { clinicDateKey } from '../../../../utils/format'
import { ConsultationsTable } from '../components/ConsultationsTable'
import { useStartConsultation, useVetAppointments } from '../hooks/useVetAppointments'
import type { AppointmentStatus, VetAppointmentSummary } from '../types/dashboard.types'

const TABS = ['All', 'Upcoming', 'Today', 'Completed', 'Cancelled']

const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

function toDateStr(iso: string): string {
  return clinicDateKey(iso)
}

function matchesTab(appointment: VetAppointmentSummary, tab: string, todayStr: string): boolean {
  const status: AppointmentStatus = appointment.apt_status
  const dateStr = toDateStr(appointment.apt_scheduled_at)

  if (tab === 'All') return true
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
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const todayStr = clinicDateKey()

  const yearOptions = useMemo(() => {
    const years = new Set<string>()
    appointments.forEach((appointment) => {
      const year = toDateStr(appointment.apt_scheduled_at).slice(0, 4)
      if (/^\d{4}$/.test(year)) years.add(year)
    })
    years.add(todayStr.slice(0, 4))
    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }, [appointments, todayStr])

  const filtered = appointments.filter((c) => {
    const dateStr = toDateStr(c.apt_scheduled_at)
    const matchesTabFilter = matchesTab(c, activeTab, todayStr)
    const matchesSearch =
      c.pet_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.pet_species ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesDate = !dateFilter || dateStr === dateFilter
    const matchesMonth = !monthFilter || Number(dateStr.slice(5, 7)) === Number(monthFilter)
    const matchesYear = !yearFilter || dateStr.slice(0, 4) === yearFilter
    return matchesTabFilter && matchesSearch && matchesDate && matchesMonth && matchesYear
  }).sort((a, b) => {
    const aTime = new Date(a.apt_scheduled_at).getTime()
    const bTime = new Date(b.apt_scheduled_at).getTime()
    return sortDirection === 'asc' ? aTime - bTime : bTime - aTime
  })

  function handleDayChange(value: string) {
    setDateFilter(value)
    if (value) {
      setMonthFilter('')
      setYearFilter('')
    }
  }

  function handleMonthChange(value: string) {
    setMonthFilter(value)
    if (value) {
      setDateFilter('')
      setActiveTab('All')
    }
  }

  function handleYearChange(value: string) {
    setYearFilter(value)
    if (value) {
      setDateFilter('')
      setActiveTab('All')
    }
  }

  function handleStart(aptId: string) {
    startConsultation.mutate(aptId, {
      onSuccess: () => navigate(`/veterinarian/consultations/${aptId}`),
    })
  }

  function handleView(aptId: string) {
    navigate(`/veterinarian/appointments/${aptId}`)
  }

  function toggleSort() {
    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="space-y-6">
        <PageHero
          title="Consultations"
          subtitle="Manage and review all veterinary consultations."
        />

        <Card padding="md">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <input
              className="w-full flex-1 rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pets or breed"
              type="text"
              value={search}
            />
            <input
              aria-label="Filter by date"
              className="w-full rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 sm:w-44"
              onChange={(e) => handleDayChange(e.target.value)}
              type="date"
              value={dateFilter}
            />
            <select
              aria-label="Filter by month"
              className="w-full rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 sm:w-40"
              onChange={(e) => handleMonthChange(e.target.value)}
              value={monthFilter}
            >
              <option value="">All months</option>
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by year"
              className="w-full rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 sm:w-32"
              onChange={(e) => handleYearChange(e.target.value)}
              value={yearFilter}
            >
              <option value="">All years</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? 'bg-amber-700 text-white'
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
            sortDirection={sortDirection}
            onStart={handleStart}
            onToggleSort={toggleSort}
            onView={handleView}
          />
        )}
      </div>
    </div>
  )
}
