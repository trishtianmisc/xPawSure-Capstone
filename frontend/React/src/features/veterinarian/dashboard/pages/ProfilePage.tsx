import { useState } from 'react'

export function ProfilePage() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    gender: 'Male',
    date_of_birth: '',
    address: '',
    associated_clinic: 'PawCare Veterinary Clinic',
    specialization: '',
    license_number: '',
    years_of_experience: '',
    username: '',
    password: '',
    confirm_password: '',
  })

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">Profile</h2>

      <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-3">
            <div className="grid size-24 place-items-center rounded-md bg-stone-200 dark:bg-stone-700">
              <svg className="size-10 text-stone-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <button
              className="text-sm font-semibold text-amber-900 transition hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              type="button"
            >
              Change Profile Picture
            </button>
          </div>

          <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">First Name</label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('first_name', e.target.value)}
                value={form.first_name}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Last Name</label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('last_name', e.target.value)}
                value={form.last_name}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Phone Number</label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('phone', e.target.value)}
                value={form.phone}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Email Address</label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('email', e.target.value)}
                value={form.email}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Gender</label>
              <select
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('gender', e.target.value)}
                value={form.gender}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Date of Birth</label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('date_of_birth', e.target.value)}
                type="date"
                value={form.date_of_birth}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Address</label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('address', e.target.value)}
                value={form.address}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Associated Clinic</label>
              <select
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('associated_clinic', e.target.value)}
                value={form.associated_clinic}
              >
                <option value="PawCare Veterinary Clinic">PawCare Veterinary Clinic</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Specialization</label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('specialization', e.target.value)}
                value={form.specialization}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">License Number</label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('license_number', e.target.value)}
                value={form.license_number}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Years of Experience</label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                onChange={(e) => handleChange('years_of_experience', e.target.value)}
                value={form.years_of_experience}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Upload License File</label>
              <div className="grid size-20 place-items-center rounded-md border-2 border-dashed border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800">
                <svg className="size-6 text-stone-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-xl font-extrabold text-stone-900 dark:text-stone-100">Account Information</h3>

      <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800 space-y-4">
        <div className="max-w-sm">
          <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Username</label>
          <input
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            onChange={(e) => handleChange('username', e.target.value)}
            value={form.username}
          />
        </div>
        <div className="max-w-sm">
          <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Password</label>
          <input
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            onChange={(e) => handleChange('password', e.target.value)}
            type="password"
            value={form.password}
          />
        </div>
        <div className="max-w-sm">
          <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Confirm Password</label>
          <input
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            onChange={(e) => handleChange('confirm_password', e.target.value)}
            type="password"
            value={form.confirm_password}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          className="rounded-md bg-amber-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-950"
          type="button"
        >
          Edit Profile
        </button>
      </div>
    </div>
  )
}
