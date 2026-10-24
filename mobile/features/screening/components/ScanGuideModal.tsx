import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { SCAN_GUIDE_QUALITY_TIPS, SCAN_GUIDE_STEPS } from '../constants/scanGuide'

interface ScanGuideModalProps {
  visible: boolean
  onClose: () => void
}

export default function ScanGuideModal({ visible, onClose }: ScanGuideModalProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons color={colors.primary} name="camera-enhance-outline" size={22} />
            </View>
            <Text style={styles.headerLabel}>PHOTO GUIDE</Text>
            <Pressable
              accessibilityLabel="Close photo guide"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons color={colors.textMuted} name="close" size={22} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            style={styles.body}
          >
            <Text style={styles.title}>Five photos, better screening</Text>
            <Text style={styles.subtitle}>
              The AI compares five views of the affected area, so clear and varied photos give it the best chance to help.
            </Text>

            <View style={styles.steps}>
              {SCAN_GUIDE_STEPS.map((step, index) => (
                <View key={step.title} style={styles.step}>
                  <View style={styles.stepIcon}>
                    <MaterialCommunityIcons color={colors.primary} name={step.icon} size={20} />
                  </View>
                  <View style={styles.stepCopy}>
                    <Text style={styles.stepTitle}>
                      {index + 1}. {step.title}
                    </Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>What makes a good photo</Text>
              {SCAN_GUIDE_QUALITY_TIPS.map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <MaterialCommunityIcons color={colors.primary} name="check-circle-outline" size={15} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            <View style={styles.notice}>
              <MaterialCommunityIcons color={colors.textMuted} name="shield-check-outline" size={17} />
              <Text style={styles.noticeText}>
                Photos are checked on your device before analysis. The result is a screening suggestion, not a diagnosis.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              accessibilityLabel="Close photo guide and start screening"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxHeight: '90%',
    maxWidth: 460,
    overflow: 'hidden',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.borderLight,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerLabel: {
    ...font.bold,
    color: colors.textMuted,
    flex: 1,
    fontSize: 11,
    letterSpacing: 0.7,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  body: { flexShrink: 1 },
  bodyContent: { paddingHorizontal: 20, paddingVertical: 20 },
  title: { ...font.extrabold, color: colors.text, fontSize: 21, lineHeight: 27 },
  subtitle: { ...font.regular, color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  steps: { gap: 16, marginTop: 20 },
  step: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  stepIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 22,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  stepCopy: { flex: 1 },
  stepTitle: { ...font.bold, color: colors.text, fontSize: 14, lineHeight: 20 },
  stepDescription: { ...font.regular, color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 2 },
  tipsCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    gap: 8,
    marginTop: 22,
    padding: 16,
  },
  tipsTitle: { ...font.bold, color: colors.text, fontSize: 14, marginBottom: 2 },
  tipRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  tipText: { ...font.regular, color: colors.textSecondary, flex: 1, fontSize: 12, lineHeight: 18 },
  notice: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  noticeText: { ...font.regular, color: colors.textMuted, flex: 1, fontSize: 11, lineHeight: 16 },
  footer: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  doneButtonText: { ...font.bold, color: '#FFFFFF', fontSize: 15 },
})
