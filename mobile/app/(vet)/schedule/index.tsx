import { useMemo, useState } from 'react'
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { MOCK_SCHEDULE_CALENDAR, MOCK_SCHEDULE_BY_DAY } from '../../../features/vet/data/mock'

const TABS = ['Month', 'Week', 'Day'] as const
const WEEKDAYS = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat']

export default function ScheduleScreen() {
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Month')
  const [selectedDay, setSelectedDay] = useState<number>(9)
  const calendar = MOCK_SCHEDULE_CALENDAR

  const dayAppointments = MOCK_SCHEDULE_BY_DAY[selectedDay] || []

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

        <Text style={styles.monthTitle}>{calendar.month}</Text>

        <View style={styles.calendarCard}>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.weekdayText}>{day}</Text>
            ))}
          </View>
          <View style={styles.daysGrid}>
            {calendar.days.map((day, index) => {
              const isCurrentMonth = day.month === 'current'
              const isToday = day.month === 'current' && day.day === 9
              const isSelected = day.month === 'current' && day.day === selectedDay
              return (
                <Pressable
                  key={index}
                  style={styles.dayCell}
                  onPress={() => {
                    if (isCurrentMonth) setSelectedDay(day.day)
                  }}
                >
                  {isSelected ? (
                    <View style={styles.daySelected}>
                      <Text style={[styles.dayTextSelected, !isCurrentMonth && styles.dayTextMuted]}>
                        {day.day}
                      </Text>
                    </View>
                  ) : day.hasAppointment ? (
                    <View style={[styles.dayDot, isToday && styles.dayDotToday]}>
                      <Text style={[styles.dayText, !isCurrentMonth && styles.dayTextMuted, isToday && styles.dayTextToday]}>
                        {day.day}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.dayText, !isCurrentMonth && styles.dayTextMuted, isToday && styles.dayTextToday]}>
                      {day.day}
                    </Text>
                  )}
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Appointments for April {selectedDay}</Text>
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
      </ScrollView>
    </SafeAreaView>
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

  monthTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },

  calendarCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: colors.borderLight },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayText: { flex: 1, textAlign: 'center', color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', alignItems: 'center', paddingVertical: 6 },
  dayText: { color: colors.text, fontSize: 13, fontWeight: '500' },
  dayTextMuted: { color: colors.textMuted },
  dayTextToday: { color: colors.primary, fontWeight: '800' },
  dayDot: { backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  dayDotToday: { backgroundColor: colors.primary },
  daySelected: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  dayTextSelected: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },

  appointmentsSection: { gap: 10 },
  aptCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.borderLight },
  aptTimeCol: { width: 70 },
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
