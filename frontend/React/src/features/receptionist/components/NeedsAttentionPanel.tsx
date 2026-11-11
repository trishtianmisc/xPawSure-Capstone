import { Link } from 'react-router-dom'

import { formatDateTime, isoDate } from '../../../utils/format'
import { useAppointments } from '../hooks/useAppointments'
import { QuickStatusAction } from './QuickStatusAction'

const GROUP_SIZE = 5
const PENDING_WINDOW_DAYS = 7

function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

function GroupLabel({
  title,
  className,
}: {
  title: string
  className: string
}) {
  return (
    <p
      className={`px-5 pb-1.5 pt-4 text-xs font-semibold uppercase tracking-wide ${className}`}
    >
      {title}
    </p>
  )
}

function MoreLink({ to, hidden }: { to: string; hidden: number }) {
  if (hidden <= 0) return null
  return (
    <div className="px-5 pb-4">
      <Link
        to={to}
        className="inline-block text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400"
      >
        +{hidden} more &rarr;
      </Link>
    </div>
  )
}

/**
 * The receptionist's action list: pending confirmations for the next 7 days
 * and past-due rows still inside the no-show grace window. Rows share the
 * flat divide-and-hover layout of the appointments card. Hidden entirely
 * when there is nothing to act on; status actions refresh it in place
 * because every row mutation invalidates the appointments query key.
 */
export function NeedsAttentionPanel() {
  const pendingQuery = useAppointments({
    status: 'PENDING',
    date_from: isoDate(),
    date_to: daysFromNow(PENDING_WINDOW_DAYS),
    sort: 'apt_scheduled_at',
    page_size: GROUP_SIZE,
  })
  const overdueQuery = useAppointments({
    overdue: '1',
    sort: 'apt_scheduled_at',
    page_size: GROUP_SIZE,
  })

  const pendingRows = pendingQuery.data?.results ?? []
  const pendingTotal = pendingQuery.data?.total ?? 0
  const overdueRows = overdueQuery.data?.results ?? []
  const overdueTotal = overdueQuery.data?.total ?? 0

  const total = pendingTotal + overdueTotal
  if (total === 0) return null

  return (
    <section className="mb-8 overflow-hidden rounded-xl border border-amber-300 bg-amber-50 shadow-sm dark:border-amber-800 dark:bg-amber-900/20">
      <header className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-800">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Needs attention &middot; {total}
        </h2>
        <Link
          to="/receptionist/appointments"
          className="text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400"
        >
          View appointments &rarr;
        </Link>
      </header>

      <div className="divide-y divide-stone-100 dark:divide-stone-800">
        {pendingTotal > 0 && (
          <div>
            <GroupLabel
              title={`${pendingTotal} pending confirmation${
                pendingTotal === 1 ? '' : 's'
              } · next ${PENDING_WINDOW_DAYS} days`}
              className="text-amber-700 dark:text-amber-400"
            />
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {pendingRows.map((apt) => (
                <div
                  key={apt.apt_id}
                  data-apt-id={apt.apt_id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition hover:bg-stone-50 dark:hover:bg-stone-800/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                      {apt.pet_name} — {apt.owner_name ?? 'Unknown owner'}
                    </p>
                    <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                      {formatDateTime(apt.apt_scheduled_at)}
                    </p>
                  </div>
                  <QuickStatusAction
                    aptId={apt.apt_id}
                    status={apt.apt_status}
                    scheduledAt={apt.apt_scheduled_at}
                  />
                </div>
              ))}
            </div>
            <MoreLink
              to="/receptionist/appointments?status=PENDING"
              hidden={pendingTotal - pendingRows.length}
            />
          </div>
        )}

        {overdueTotal > 0 && (
          <div>
            <GroupLabel
              title={`${overdueTotal} past due`}
              className="text-orange-700 dark:text-orange-400"
            />
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {overdueRows.map((apt) => (
                <div
                  key={apt.apt_id}
                  data-apt-id={apt.apt_id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition hover:bg-stone-50 dark:hover:bg-stone-800/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                      {apt.pet_name} — {apt.owner_name ?? 'Unknown owner'}
                    </p>
                    <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                      Scheduled {formatDateTime(apt.apt_scheduled_at)}
                    </p>
                  </div>
                  <QuickStatusAction
                    aptId={apt.apt_id}
                    status={apt.apt_status}
                    scheduledAt={apt.apt_scheduled_at}
                    allowNoShow
                  />
                </div>
              ))}
            </div>
            <MoreLink
              to="/receptionist/appointments?attention=1"
              hidden={overdueTotal - overdueRows.length}
            />
          </div>
        )}
      </div>
    </section>
  )
}
