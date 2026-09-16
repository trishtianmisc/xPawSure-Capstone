import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ConsultationsTable } from '../components/ConsultationsTable'
import type { Consultation } from '../types/veterinarian.types'

const MOCK_CONSULTATIONS: Consultation[] = [
  { id: '1', pet_name: 'Max', breed: 'Golden Retriever', date: '04/12/2026', time: '10:00 AM', status: 'COMPLETED' },
  { id: '2', pet_name: 'Lerclerc', breed: 'Golden Retriever', date: '03/20/2026', time: '10:00 AM', status: 'COMPLETED' },
  { id: '3', pet_name: 'Bella', breed: 'Shih Tzu', date: '04/18/2026', time: '8:30 AM', status: 'TODAY' },
  { id: '4', pet_name: 'Rocky', breed: 'Labrador', date: '04/20/2026', time: '2:00 PM', status: 'UPCOMING' },
  { id: '5', pet_name: 'Daisy', breed: 'Pomeranian', date: '04/10/2026', time: '11:00 AM', status: 'CANCELLED' },
]

const TABS = ['Upcoming', 'Today', 'Completed', 'Cancelled']

export function ConsultationsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Today')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const filtered = MOCK_CONSULTATIONS.filter((c) => {
    const matchesSearch = c.pet_name.toLowerCase().includes(search.toLowerCase()) ||
      c.breed.toLowerCase().includes(search.toLowerCase())
    const matchesDate = !dateFilter || c.date === dateFilter
    return matchesSearch && matchesDate
  })

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

      <ConsultationsTable
        activeTab={activeTab}
        consultations={filtered}
        onStart={(id) => navigate(`/veterinarian/consultations/${id}`)}
        onView={(id) => navigate(`/veterinarian/consultations/${id}`)}
      />
    </div>
  )
}
