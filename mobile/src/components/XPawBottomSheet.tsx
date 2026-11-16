import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ReactNode } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { xpawBrand } from '../theme/brand'
import { font } from '../theme/typography'

type MciName = keyof typeof MaterialCommunityIcons.glyphMap

export interface XPawSheetAction {
  label: string
  onPress: () => void
  icon?: MciName
  disabled?: boolean
}

interface XPawBottomSheetProps {
  visible: boolean
  title: string
  message?: string
  icon?: MciName
  note?: string
  primaryAction?: XPawSheetAction
  secondaryAction?: XPawSheetAction
  children?: ReactNode
  onClose?: () => void
}

export function XPawBottomSheet({
  visible,
  title,
  message,
  icon = 'paw',
  note,
  primaryAction,
  secondaryAction,
  children,
  onClose,
}: XPawBottomSheetProps) {
  const insets = useSafeAreaInsets()

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <Pressable accessible={false} onPress={onClose} style={styles.overlay}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}
        >
          <View style={styles.handle} />
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
          >
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons color={xpawBrand.accent} name={icon} size={30} />
            </View>

            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            {children}
            {note ? <Text style={styles.note}>{note}</Text> : null}

            {primaryAction || secondaryAction ? (
              <View style={styles.actions}>
                {primaryAction ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !!primaryAction.disabled }}
                    disabled={primaryAction.disabled}
                    onPress={primaryAction.onPress}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && !primaryAction.disabled && styles.buttonPressed,
                      primaryAction.disabled && styles.buttonDisabled,
                    ]}
                  >
                    {primaryAction.icon ? (
                      <MaterialCommunityIcons
                        color={xpawBrand.background}
                        name={primaryAction.icon}
                        size={19}
                      />
                    ) : null}
                    <Text style={styles.primaryButtonText}>{primaryAction.label}</Text>
                  </Pressable>
                ) : null}

                {secondaryAction ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !!secondaryAction.disabled }}
                    disabled={secondaryAction.disabled}
                    onPress={secondaryAction.onPress}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && !secondaryAction.disabled && styles.buttonPressed,
                      secondaryAction.disabled && styles.buttonDisabled,
                    ]}
                  >
                    {secondaryAction.icon ? (
                      <MaterialCommunityIcons
                        color={xpawBrand.text}
                        name={secondaryAction.icon}
                        size={19}
                      />
                    ) : null}
                    <Text style={styles.secondaryButtonText}>{secondaryAction.label}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function XPawSheetDetails({ children }: { children: ReactNode }) {
  return <View style={styles.details}>{children}</View>
}

export function XPawSheetDetailRow({
  icon,
  value,
}: {
  icon: MciName
  value: string
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <MaterialCommunityIcons color={xpawBrand.accent} name={icon} size={16} />
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: xpawBrand.overlay,
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: xpawBrand.surface,
    borderColor: xpawBrand.border,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    elevation: 24,
    maxHeight: '92%',
    maxWidth: 520,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    width: '100%',
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: xpawBrand.borderLight,
    borderRadius: 999,
    height: 4,
    marginBottom: 20,
    marginTop: 10,
    opacity: 0.8,
    width: 44,
  },
  scroll: {
    flexShrink: 1,
  },
  content: {
    alignItems: 'stretch',
    paddingBottom: 4,
    paddingHorizontal: 22,
  },
  iconCircle: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: xpawBrand.iconBackground,
    borderColor: xpawBrand.accentBorder,
    borderRadius: 32,
    borderWidth: 1,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  title: {
    ...font.extrabold,
    color: xpawBrand.text,
    fontSize: 20,
    letterSpacing: -0.2,
    lineHeight: 26,
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    ...font.regular,
    color: xpawBrand.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    textAlign: 'center',
  },
  details: {
    backgroundColor: xpawBrand.background,
    borderColor: xpawBrand.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 18,
    padding: 14,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: xpawBrand.iconBackground,
    borderRadius: 12,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  detailValue: {
    ...font.semibold,
    color: xpawBrand.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  note: {
    ...font.regular,
    color: xpawBrand.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
    textAlign: 'center',
  },
  actions: {
    gap: 10,
    marginTop: 20,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: xpawBrand.accent,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...font.bold,
    color: xpawBrand.background,
    fontSize: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 248, 242, 0.03)',
    borderColor: xpawBrand.borderLight,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...font.bold,
    color: xpawBrand.text,
    fontSize: 14,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
})
