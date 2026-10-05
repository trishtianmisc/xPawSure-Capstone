import { useMemo, useState } from 'react'
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import {
  MOCK_SCHEDULE_BY_DAY,
  MOCK_SCHEDULE_BY_MONTH,
  MOCK_SCHEDULE_WEEKS,
} from '../../../features/vet/data/mock'
import type { ScheduleDayAppointment, ScheduleMonthAppointment, ScheduleWeekDay } from '../../../features/vet/types'

const TABS = ['Day', 'Week', 'Month'] as const
const WEEKDAYS = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const NOW = new Date()
const TODAY = NOW.getDate()
const CURRENT_MONTH = NOW.getMonth()
const CURRENT_YEAR = NOW.getFullYear()

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function buildCalendarDays(year: number, month: number) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const daysInPrevMonth = getDaysInMonth(year, month - 1)
  const days: { day: number; monthType: 'prev' | 'current' | 'next' }[] = []

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, monthType: 'prev' })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, monthType: 'current' })
  }
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push({ day: d, monthType: 'next' })
  }
  return days
}

function getWeekKey(date: Date): string {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const sMonth = MONTHS_FULL[start.getMonth()]
  const eMonth = MONTHS_FULL[end.getMonth()]
  if (start.getMonth() === end.getMonth()) {
    return `${sMonth.slice(0, 3)} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
  }
  return `${sMonth.slice(0, 3)} ${start.getDate()} – ${eMonth.slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`
}

export default function ScheduleScreen() {
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Day')

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Schedule</Text>

        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'Day' && <DayView styles={styles} />}
        {activeTab === 'Week' && <WeekView styles={styles} />}
        {activeTab === 'Month' && <MonthView styles={styles} />}
      </ScrollView>
    </SafeAreaView>
  )
}

function DayView({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const [viewMonth, setViewMonth] = useState(CURRENT_MONTH)
  const [viewYear, setViewYear] = useState(CURRENT_YEAR)
  const [selectedDay, setSelectedDay] = useState(TODAY)

  const calendarDays = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth])
  const dayAppointments: ScheduleDayAppointment[] = MOCK_SCHEDULE_BY_DAY[selectedDay] || []
  const isCurrentMonth = viewMonth === CURRENT_MONTH && viewYear === CURRENT_YEAR

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  return (
    <>
      <View style={styles.monthNav}>
        <Pressable onPress={prevMonth} style={styles.navArrow}>
          <Text style={styles.navArrowText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{MONTHS_FULL[viewMonth]} {viewYear}</Text>
        <Pressable onPress={nextMonth} style={styles.navArrow}>
          <Text style={styles.navArrowText}>{'>'}</Text>
        </Pressable>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekdayText}>{day}</Text>
          ))}
        </View>
        <View style={styles.daysGrid}>
          {calendarDays.map((day, index) => {
            const isCurrent = day.monthType === 'current'
            const isToday = isCurrentMonth && isCurrent && day.day === TODAY
            const isSelected = isCurrent && day.day === selectedDay
            const hasAppointments = isCurrent && MOCK_SCHEDULE_BY_DAY[day.day]?.length > 0
            return (
              <Pressable
                key={index}
                style={styles.dayCell}
                onPress={() => {
                  if (isCurrent) setSelectedDay(day.day)
                }}
              >
                {isSelected ? (
                  <View style={styles.daySelected}>
                    <Text style={[styles.dayTextSelected, !isCurrent && styles.dayTextMuted]}>
                      {day.day}
                    </Text>
                  </View>
                ) : hasAppointments ? (
                  <View style={styles.dayDot}>
                    <Text style={[styles.dayText, !isCurrent && styles.dayTextMuted, isToday && styles.dayTextToday]}>
                      {day.day}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.dayText, !isCurrent && styles.dayTextMuted, isToday && styles.dayTextToday]}>
                    {day.day}
                  </Text>
                )}
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Appointments for {MONTHS_FULL[viewMonth]} {selectedDay}</Text>
      </View>

      <View style={styles.appointmentsSection}>
        {dayAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No appointments on this day</Text>
          </View>
        ) : (
          dayAppointments.map((apt) => (
            <View key={apt.id} style={styles.aptCard}>
              <View style={styles.aptTimeCol}>
                <Text style={styles.aptTime}>{apt.time}</Text>
              </View>
              <View style={styles.aptDivider} />
              <View style={styles.aptInfoCol}>
                <View style={styles.aptPetRow}>
                  <Text style={styles.aptPetName} numberOfLines={1}>{apt.pet_name}</Text>
                  <Text style={styles.aptBreed} numberOfLines={1}> | {apt.breed}</Text>
                </View>
                <Text style={styles.aptOwner}>Owner: {apt.owner_name}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </>
  )
}

function WeekView({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const [weekOffset, setWeekOffset] = useState(0)

  const baseDate = useMemo(() => {
    const d = new Date(CURRENT_YEAR, CURRENT_MONTH, TODAY)
    d.setDate(d.getDate() + weekOffset * 7)
    return d
  }, [weekOffset])

  const weekKey = getWeekKey(baseDate)
  const weekData: ScheduleWeekDay[] = MOCK_SCHEDULE_WEEKS[weekKey] || []

  return (
    <>
      <View style={styles.monthNav}>
        <Pressable onPress={() => setWeekOffset(weekOffset - 1)} style={styles.navArrow}>
          <Text style={styles.navArrowText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{weekKey}</Text>
        <Pressable onPress={() => setWeekOffset(weekOffset + 1)} style={styles.navArrow}>
          <Text style={styles.navArrowText}>{'>'}</Text>
        </Pressable>
      </View>

      <View style={styles.appointmentsSection}>
        {weekData.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No appointments this week</Text>
          </View>
        ) : (
          weekData.map((dayGroup) => (
            <View key={dayGroup.dayLabel}>
              {dayGroup.appointments.length > 0 && (
                <>
                  <Text style={styles.weekDayHeader}>{dayGroup.dayLabel}</Text>
                  {dayGroup.appointments.map((apt) => (
                    <View key={apt.id} style={styles.aptCard}>
                      <View style={styles.aptTimeCol}>
                        <Text style={styles.aptTime}>{apt.time}</Text>
                      </View>
                      <View style={styles.aptDivider} />
                      <View style={styles.aptInfoCol}>
                        <View style={styles.aptPetRow}>
                          <Text style={styles.aptPetName} numberOfLines={1}>{apt.pet_name}</Text>
                          <Text style={styles.aptBreed} numberOfLines={1}> | {apt.breed}</Text>
                        </View>
                        <Text style={styles.aptOwner}>Owner: {apt.owner_name}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          ))
        )}
      </View>
    </>
  )
}

function MonthView({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)

  const monthKey = `${selectedMonth + 1}-${CURRENT_YEAR}`
  const monthAppointments: ScheduleMonthAppointment[] = MOCK_SCHEDULE_BY_MONTH[monthKey] || []

  return (
    <>
      <View style={styles.monthGrid}>
        {MONTHS.map((m, index) => {
          const isCurrent = index === CURRENT_MONTH
          const isSelected = index === selectedMonth
          return (
            <Pressable
              key={m}
              style={[
                styles.monthCell,
                isCurrent && styles.monthCellCurrent,
                isSelected && styles.monthCellSelected,
              ]}
              onPress={() => setSelectedMonth(index)}
            >
              <Text
                style={[
                  styles.monthCellText,
                  isCurrent && !isSelected && styles.monthCellTextCurrent,
                  isSelected && styles.monthCellTextSelected,
                ]}
              >
                {m}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{MONTHS_FULL[selectedMonth]} {CURRENT_YEAR}</Text>
      </View>

      <View style={styles.appointmentsSection}>
        {monthAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No appointments this month</Text>
          </View>
        ) : (
          monthAppointments.map((apt) => (
            <View key={apt.id} style={styles.aptCard}>
              <View style={styles.aptTimeCol}>
                <Text style={styles.aptDateLabel}>{apt.date}</Text>
                <Text style={styles.aptTime}>{apt.time}</Text>
              </View>
              <View style={styles.aptDivider} />
              <View style={styles.aptInfoCol}>
                <View style={styles.aptPetRow}>
                  <Text style={styles.aptPetName} numberOfLines={1}>{apt.pet_name}</Text>
                  <Text style={styles.aptBreed} numberOfLines={1}> | {apt.breed}</Text>
                </View>
                <Text style={styles.aptOwner}>Owner: {apt.owner_name}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 16 },

  tabRow: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 4, marginBottom: 20 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: colors.surface },
  tabText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: colors.text },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderLight },
  navArrowText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  monthTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },

  calendarCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: colors.borderLight },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayText: { flex: 1, textAlign: 'center', color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', alignItems: 'center', paddingVertical: 6 },
  dayText: { color: colors.text, fontSize: 13, fontWeight: '500' },
  dayTextMuted: { color: colors.textMuted },
  dayTextToday: { color: colors.primary, fontWeight: '800' },
  dayDot: { backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  dayDotToday: { backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  daySelected: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  dayTextSelected: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  monthCell: { width: '30.5%', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight },
  monthCellCurrent: { borderColor: colors.primary },
  monthCellSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthCellText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  monthCellTextCurrent: { color: colors.primary },
  monthCellTextSelected: { color: '#FFFFFF', fontWeight: '700' },

  weekDayHeader: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 12, marginBottom: 8 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },

  appointmentsSection: { gap: 10 },
  aptCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.borderLight },
  aptTimeCol: { width: 80 },
  aptDateLabel: { color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 2 },
  aptTime: { color: colors.text, fontSize: 13, fontWeight: '700' },
  aptDivider: { width: 3, height: 40, backgroundColor: colors.primary, borderRadius: 2, marginHorizontal: 12 },
  aptInfoCol: { flex: 1 },
  aptPetRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  aptPetName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  aptBreed: { color: colors.textSecondary, fontSize: 13, flexShrink: 1 },
  aptOwner: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
})
