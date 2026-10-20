import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../context/ThemeContext'
import { font } from '../theme/typography'

interface ConfirmDialogProps {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  icon?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  icon = 'trash-can-outline',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={busy ? undefined : onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons color={colors.error} name={icon as any} size={26} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttons}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onCancel}
              style={[styles.button, styles.cancelButton, busy && styles.buttonDisabled]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onConfirm}
              style={[styles.button, styles.confirmButton, busy && styles.buttonDisabled]}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    overlay: {
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
      flex: 1,
      justifyContent: 'center',
    },
    card: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 20,
      gap: 10,
      marginHorizontal: 32,
      maxWidth: 320,
      paddingVertical: 28,
      paddingHorizontal: 24,
      width: '100%',
    },
    iconCircle: {
      alignItems: 'center',
      backgroundColor: colors.errorBg,
      borderRadius: 32,
      height: 56,
      justifyContent: 'center',
      marginBottom: 2,
      width: 56,
    },
    title: {
      ...font.bold,
      color: colors.text,
      fontSize: 17,
      textAlign: 'center',
    },
    message: {
      ...font.regular,
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
    buttons: {
      columnGap: 12,
      flexDirection: 'row',
      marginTop: 14,
      width: '100%',
    },
    button: {
      alignItems: 'center',
      borderRadius: 12,
      flex: 1,
      height: 44,
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    cancelButton: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border,
      borderWidth: 1,
    },
    cancelText: {
      ...font.bold,
      color: colors.textSecondary,
      fontSize: 14,
    },
    confirmButton: {
      backgroundColor: colors.error,
    },
    confirmText: {
      ...font.bold,
      color: '#FFFFFF',
      fontSize: 14,
    },
  })
