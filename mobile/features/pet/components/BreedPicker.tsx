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
import { useBreeds } from '../hooks/useBreeds'

interface BreedPickerProps {
  value: string
  onSelect: (breedId: string, breedName: string) => void
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
        style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={[styles.triggerText, { color: value ? colors.text : colors.textMuted }]}>
          {selectedBreed?.name || 'Select breed'}
        </Text>
      </Pressable>

      <Modal animationType="slide" transparent={false} visible={open} onRequestClose={() => setOpen(false)}>
        <View style={[styles.screen, { backgroundColor: colors.bg }]}>
          <View style={styles.header}>
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

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearch}
            placeholder="Search breeds..."
            placeholderTextColor={colors.textMuted}
            style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={search}
          />

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item.id, item.name)
                  setOpen(false)
                  setSearch('')
                }}
                style={[styles.item, item.id === value && { backgroundColor: colors.primaryLight }]}
              >
                <Text style={[styles.itemText, { color: colors.text }]}>{item.name}</Text>
                {item.id === value && <Text style={[styles.check, { color: colors.primary }]}>✓</Text>}
              </Pressable>
            )}
            style={styles.list}
          />
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: { borderRadius: 10, borderWidth: 1, height: 48, justifyContent: 'center', paddingHorizontal: 14 },
  triggerText: { fontSize: 15 },
  screen: { flex: 1, paddingTop: 60 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  cancel: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '700' },
  doneWrap: { minWidth: 50, alignItems: 'flex-end' },
  done: { fontSize: 15, fontWeight: '600' },
  search: { borderRadius: 10, borderWidth: 1, fontSize: 15, height: 40, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12 },
  list: { flex: 1, marginHorizontal: 16 },
  item: { alignItems: 'center', borderRadius: 8, flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 14 },
  itemText: { flex: 1, fontSize: 15 },
  check: { fontSize: 16, fontWeight: '700' },
})
