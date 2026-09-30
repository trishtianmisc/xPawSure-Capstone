import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'

type EmptyAction = {
  label: string
  onPress: () => void
}

interface PetRecordSectionProps {
  title: string
  isLoading: boolean
  isError: boolean
  itemCount: number
  emptyIcon: ComponentProps<typeof MaterialCommunityIcons>['name']
  emptyText: string
  emptyAction?: EmptyAction
  headerAction?: EmptyAction
  seeAllLabel?: string
  onSeeAll?: () => void
  children?: ReactNode
}

export function PetRecordSection({
  title,
  isLoading,
  isError,
  itemCount,
  emptyIcon,
  emptyText,
  emptyAction,
  headerAction,
  seeAllLabel,
  onSeeAll,
  children,
}: PetRecordSectionProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const showSeeAll = itemCount > 0 && !!seeAllLabel && !!onSeeAll

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.statusState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )
    }

    if (isError) {
      return (
        <Text style={styles.statusText}>
          We couldn&apos;t load your {title.toLowerCase()}. Please try again.
        </Text>
      )
    }

    if (itemCount === 0) {
      return (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons color={colors.textMuted} name={emptyIcon} size={24} />
          <Text style={styles.emptyText}>{emptyText}</Text>
          {emptyAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={emptyAction.onPress}
              style={styles.emptyButton}
            >
              <Text style={styles.emptyButtonText}>{emptyAction.label}</Text>
            </Pressable>
          ) : null}
        </View>
      )
    }

    return <View style={styles.rows}>{children}</View>
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerActions}>
          {headerAction ? (
            <Pressable
              accessibilityLabel={headerAction.label}
              accessibilityRole="button"
              hitSlop={8}
              onPress={headerAction.onPress}
              style={styles.headerAction}
            >
              <MaterialCommunityIcons color={colors.primary} name="plus" size={16} />
              <Text style={styles.headerActionText}>{headerAction.label}</Text>
            </Pressable>
          ) : null}
          {showSeeAll ? (
            <Pressable
              accessibilityLabel={`See all ${title.toLowerCase()}`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onSeeAll}
            >
              <Text style={styles.seeAll}>{seeAllLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {renderBody()}
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  seeAll: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  headerAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  headerActionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  rows: {
    gap: 10,
  },

  statusState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
})
