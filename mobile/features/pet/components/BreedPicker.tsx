import { useMemo, useState } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { useTheme } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { useBreeds } from '../hooks/useBreeds'

interface BreedPickerProps {
  value: string
  onSelect: (breedId: string) => void
}

export function BreedPicker({ value, onSelect }: BreedPickerProps) {
  const { colors } = useTheme()
  const { data: breeds } = useBreeds()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedBreed = breeds?.find((b) => b.id === value)

  const filtered = useMemo(() => {
    if (!breeds) return []
    if (!search.trim()) return breeds
    return breeds.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase()),
    )
  }, [breeds, search])

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { backgroundColor: colors.bg, borderColor: colors.border }]}
      >
        <Text style={[styles.triggerText, { color: value ? colors.text : colors.textMuted }]}>
          {selectedBreed?.name || 'Select a breed'}
        </Text>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>⌵</Text>
      </Pressable>

      <Modal animationType="slide" transparent={false} visible={open} onRequestClose={() => setOpen(false)}>
        <View style={[styles.screen, { backgroundColor: colors.bg }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setOpen(false); setSearch('') }}>
              <Text style={[styles.cancel, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.title, { color: colors.text }]}>Select Breed</Text>
            <Pressable
              onPress={() => { setOpen(false); setSearch('') }}
              style={styles.doneWrap}
            >
              <Text style={[styles.done, { color: colors.primary }]}>Done</Text>
            </Pressable>
          </View>

          <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.searchIcon, { color: colors.textMuted }]}>🔍</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearch}
              placeholder="Search breeds..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
              value={search}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Text style={[styles.clearBtn, { color: colors.textMuted }]}>✕</Text>
              </Pressable>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item.id)
                  setOpen(false)
                  setSearch('')
                }}
                style={[styles.item, item.id === value && { backgroundColor: colors.primaryLight }]}
              >
                <View style={styles.itemLeft}>
                  <Text style={[styles.itemEmoji, { color: colors.textMuted }]}>🐾</Text>
                  <Text style={[styles.itemText, { color: colors.text }]}>{item.name}</Text>
                </View>
                {item.id === value && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                )}
              </Pressable>
            )}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    height: 50,
    paddingHorizontal: 16,
  },
  triggerText: { ...font.regular, flex: 1, fontSize: 15 },
  chevron: { ...font.bold, fontSize: 18 },
  screen: { flex: 1, paddingTop: 60 },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  cancel: { ...font.semibold, fontSize: 15 },
  title: { ...font.bold, fontSize: 17 },
  doneWrap: { minWidth: 50, alignItems: 'flex-end' },
  done: { ...font.semibold, fontSize: 15 },
  searchWrap: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    height: 44,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchIcon: { ...font.regular, fontSize: 14 },
  searchInput: { ...font.regular, flex: 1, fontSize: 15, height: '100%', padding: 0 },
  clearBtn: { ...font.semibold, fontSize: 16, paddingLeft: 4 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  item: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  itemLeft: { alignItems: 'center', flexDirection: 'row', gap: 10, flex: 1 },
  itemEmoji: { ...font.regular, fontSize: 16 },
  itemText: { ...font.regular, flex: 1, fontSize: 15 },
  checkCircle: {
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
    alignItems: 'center',
  },
  checkMark: { ...font.extrabold, color: '#FFFFFF', fontSize: 13 },
})
