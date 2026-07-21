import { MaterialCommunityIcons } from '@expo/vector-icons'
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

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) return

    setLoading(true)
    try {
      const result = await ImagePicker.launchCameraAsync({
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

  if (value) {
    return (
      <View style={styles.previewWrap}>
        <Image source={{ uri: value }} style={styles.preview} />
        <View style={styles.actionRow}>
          <Pressable onPress={handlePick} style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Change Photo</Text>
          </Pressable>
          <Pressable onPress={() => onChange(undefined)} style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.error }]}>
            <Text style={[styles.actionBtnText, { color: colors.error }]}>Remove</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        disabled={loading}
        onPress={handlePick}
        style={[styles.uploadArea, { borderColor: colors.border }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <MaterialCommunityIcons color={colors.primary} name="dog" size={28} />
        </View>
        <Text style={[styles.uploadTitle, { color: colors.text }]}>Add Pet Photo</Text>
        <Text style={[styles.uploadHint, { color: colors.textMuted }]}>
          {loading ? 'Loading...' : 'Tap to upload from gallery'}
        </Text>
      </Pressable>
      <Pressable onPress={handleTakePhoto} style={styles.cameraRow}>
        <MaterialCommunityIcons color={colors.link} name="camera" size={14} />
        <Text style={[styles.cameraLink, { color: colors.link }]}>  Take a photo instead</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingTop: 16 },
  uploadArea: {
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderRadius: 20,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 28,
    width: '80%',
  },
  iconCircle: { borderRadius: 32, height: 64, justifyContent: 'center', width: 64, alignItems: 'center' },
  uploadTitle: { fontSize: 15, fontWeight: '700' },
  uploadHint: { fontSize: 12, fontWeight: '500', marginTop: -2 },
  cameraRow: { alignItems: 'center', flexDirection: 'row', marginTop: 10 },
  cameraLink: { fontSize: 13, fontWeight: '600' },
  previewWrap: { alignItems: 'center', gap: 12, paddingTop: 20 },
  preview: { borderRadius: 75, height: 150, width: 150 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
})
