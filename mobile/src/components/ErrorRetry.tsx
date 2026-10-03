import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../context/ThemeContext'

interface ErrorRetryProps {
  message: string
  onRetry: () => void
  isRetrying?: boolean
}

export function ErrorRetry({ message, onRetry, isRetrying = false }: ErrorRetryProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={34} />
      <Text style={styles.message}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={isRetrying}
        onPress={onRetry}
        style={[styles.button, isRetrying && styles.buttonDisabled]}
      >
        {isRetrying ? (
          <ActivityIndicator color={colors.inverse} size="small" />
        ) : (
          <Text style={styles.buttonText}>Try again</Text>
        )}
      </Pressable>
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: { alignItems: 'center', gap: 10, justifyContent: 'center', minHeight: 140, paddingHorizontal: 24 },
  message: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 10, justifyContent: 'center', minHeight: 40, minWidth: 120, paddingHorizontal: 18 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.inverse, fontSize: 14, fontWeight: '700' },
})
