import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { useTheme, type AppColors } from '../../../../src/context/ThemeContext'
import type { Prediction } from '../../../../ai/types/ai.types'

const DISEASE_META: Record<string, { color: string; icon: string }> = {
  ALLERGIC_DERMATITIS: { color: '#E67E22', icon: 'alert-circle-outline' },
  BACTERIAL: { color: '#C0392B', icon: 'bacteria-outline' },
  FUNGAL: { color: '#8E44AD', icon: 'flower-tulip-outline' },
  HOTSPOT: { color: '#D35400', icon: 'fire' },
  MANGE: { color: '#27AE60', icon: 'bug-outline' },
}

function ConfidenceBar({ label, confidence, isTop, color }: {
  label: string
  confidence: number
  isTop: boolean
  color: string
}) {
  const { colors } = useTheme()
  const pct = Math.round(confidence)

  return (
    <View style={barStyles.row}>
      <View style={barStyles.labelRow}>
        <Text style={[barStyles.label, isTop && { color: colors.text }]} numberOfLines={1}>
          {isTop ? '★ ' : '  '}{label}
        </Text>
        <Text style={[barStyles.pct, isTop && { color: colors.text, fontWeight: '700' }]}>{pct}%</Text>
      </View>
      <View style={[barStyles.track, { backgroundColor: colors.surfaceAlt }]}>
        <View
          style={[
            barStyles.fill,
            {
              backgroundColor: isTop ? color : colors.border,
              width: `${pct}%`,
            },
          ]}
        />
      </View>
    </View>
  )
}

const barStyles = StyleSheet.create({
  row: { gap: 6, marginBottom: 14 },
  labelRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: '#A0A0A0', flex: 1, fontSize: 13, fontWeight: '500' },
  pct: { color: '#A0A0A0', fontSize: 13, fontWeight: '600', marginLeft: 8, minWidth: 36, textAlign: 'right' },
  track: { borderRadius: 4, height: 8, overflow: 'hidden', width: '100%' },
  fill: { borderRadius: 4, height: '100%' },
})

export default function ResultScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const params = useLocalSearchParams<{
    imageUri: string
    petId: string
    petName: string
    predictions: string
  }>()
  const styles = useMemo(() => createStyles(colors), [colors])

  const predictions: Prediction[] = useMemo(() => {
    try {
      return JSON.parse(params.predictions || '[]')
    } catch {
      return []
    }
  }, [params.predictions])

  const sorted = useMemo(() => [...predictions].sort((a, b) => b.confidence - a.confidence), [predictions])
  const top = sorted[0]
  const topMeta = top ? DISEASE_META[top.disease] ?? { color: colors.primary, icon: 'help-circle-outline' } : null
  const confidencePct = top ? Math.round(top.confidence) : 0

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBack}>
          <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Screening Result</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.imageRow}>
          {params.imageUri && (
            <Image source={{ uri: params.imageUri }} style={styles.thumbnail} />
          )}
          <View style={styles.imageInfo}>
            <Text style={styles.petName}>{params.petName}</Text>
            <Text style={styles.timestamp}>Just now</Text>
          </View>
        </View>

        {top && topMeta && (
          <View style={[styles.topCard, { borderColor: topMeta.color + '30' }]}>
            <View style={[styles.topIconCircle, { backgroundColor: topMeta.color + '18' }]}>
              <MaterialCommunityIcons color={topMeta.color} name={topMeta.icon as any} size={28} />
            </View>
            <Text style={styles.topLabel}>Predicted Condition</Text>
            <Text style={[styles.topDisease, { color: topMeta.color }]}>{top.label}</Text>
            <View style={styles.confidenceBadge}>
              <Text style={[styles.confidenceText, { color: topMeta.color }]}>{confidencePct}%</Text>
              <Text style={styles.confidenceLabel}>confidence</Text>
            </View>
          </View>
        )}

        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>All Predictions</Text>
          {sorted.map((pred, i) => {
            const meta = DISEASE_META[pred.disease] ?? { color: colors.primary }
            return (
              <ConfidenceBar
                key={pred.disease}
                label={pred.label}
                confidence={pred.confidence}
                isTop={i === 0}
                color={meta.color}
              />
            )
          })}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <MaterialCommunityIcons color={colors.textMuted} name="information-outline" size={16} />
          <Text style={styles.infoText}>
            This is an AI-assisted screening and does not replace professional veterinary diagnosis.
            Consult a vet for definitive results.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => router.replace('/(owner)/pets/screening')}
          style={[styles.actionBtn, styles.secondaryBtn, { borderColor: colors.border }]}
        >
          <MaterialCommunityIcons color={colors.primary} name="camera" size={16} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Scan Again</Text>
        </Pressable>
        <Pressable
          onPress={() => router.dismissTo('/(owner)')}
          style={[styles.actionBtn, styles.primaryBtn]}
        >
          <MaterialCommunityIcons color="#FFF" name="home" size={16} />
          <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: 4,
  },
  headerBack: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  headerRight: { width: 48 },

  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 120 },

  imageRow: { alignItems: 'center', flexDirection: 'row', gap: 14, marginBottom: 20 },
  thumbnail: { borderRadius: 14, height: 56, width: 56 },
  imageInfo: { flex: 1 },
  petName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  timestamp: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  topCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  topIconCircle: {
    alignItems: 'center',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    marginBottom: 12,
    width: 64,
  },
  topLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  topDisease: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  confidenceBadge: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 10 },
  confidenceText: { fontSize: 32, fontWeight: '800' },
  confidenceLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },

  breakdownCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  breakdownTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 16 },

  infoCard: {
    alignItems: 'flex-start',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoText: { color: colors.textMuted, flex: 1, fontSize: 12, lineHeight: 17 },

  bottomBar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    left: 0,
    paddingHorizontal: 24,
    paddingVertical: 16,
    position: 'absolute',
    right: 0,
  },
  actionBtn: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryBtn: { backgroundColor: '#B96534' },
  secondaryBtn: { backgroundColor: colors.surface, borderWidth: 1.5 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
})
