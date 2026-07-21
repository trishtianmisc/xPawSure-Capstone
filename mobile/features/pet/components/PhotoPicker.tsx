import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'

import { useTheme } from '../../../src/context/ThemeContext'

interface PhotoPickerProps {
  value: string | undefined
  onChange: (uri: string | undefined) => void
}

export function PhotoPicker({ value, onChange }: PhotoPickerProps) {
  const { colors } = useTheme()
  const [loading, setLoading] = useState(false)

  const handlePick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return

    setLoading(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        onChange(result.assets[0].uri)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = () => {
    onChange(undefined)
  }

  if (value) {
    return (
      <View style={styles.previewWrap}>
        <Image source={{ uri: value }} style={styles.preview} />
        <Pressable onPress={handleRemove} style={[styles.removeBtn, { backgroundColor: colors.error }]}>
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <Pressable
      disabled={loading}
      onPress={handlePick}
      style={[styles.placeholder, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text style={[styles.placeholderIcon, { color: colors.textMuted }]}>+</Text>
      <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
        {loading ? 'Loading...' : 'Add Photo'}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  previewWrap: { alignItems: 'center', gap: 8 },
  preview: { borderRadius: 60, height: 120, width: 120 },
  removeBtn: { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4 },
  removeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  placeholder: { alignItems: 'center', alignSelf: 'center', borderRadius: 60, borderStyle: 'dashed', borderWidth: 1.5, height: 120, justifyContent: 'center', width: 120 },
  placeholderIcon: { fontSize: 28, fontWeight: '300', marginBottom: 2 },
  placeholderText: { fontSize: 12, fontWeight: '500' },
})
