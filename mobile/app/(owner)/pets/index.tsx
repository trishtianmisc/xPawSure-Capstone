import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { useAuth } from '../../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { usePets } from '../../../features/pet/hooks/usePets'
import type { Pet } from '../../../features/pet/types'

function PetRow({ pet, onPress }: { pet: Pet; onPress: () => void }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.petRow}>
      {pet.profile_picture ? (
        <Image accessibilityLabel={`${pet.name}'s photo`} source={{ uri: pet.profile_picture }} style={styles.petPhoto} />
      ) : (
        <View accessibilityLabel={`${pet.name}'s profile image placeholder`} style={styles.petPhotoPlaceholder}>
          <MaterialCommunityIcons color={colors.primary} name="dog" size={25} />
        </View>
      )}
      <View style={styles.petInfo}>
        <Text numberOfLines={1} style={styles.petName}>{pet.name}</Text>
        <Text numberOfLines={1} style={styles.petBreed}>{pet.breed_name || 'Breed not specified'}</Text>
      </View>
      <Ionicons color={colors.text} name="chevron-forward" size={18} />
    </Pressable>
  )
}

export default function PetsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [search, setSearch] = useState('')
  const [sortDescending, setSortDescending] = useState(false)
  const { data: pets = [], isError, isLoading } = usePets(user?.id)

  const filteredPets = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matchingPets = pets.filter((pet) => `${pet.name} ${pet.breed_name}`.toLowerCase().includes(query))

    return matchingPets.sort((firstPet, secondPet) => {
      const order = firstPet.name.localeCompare(secondPet.name)
      return sortDescending ? -order : order
    })
  }, [pets, search, sortDescending])

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>My Pets</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/(owner)/pets/new')} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add pet</Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <TextInput
              accessibilityLabel="Search pets"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearch}
              placeholder="Search"
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={styles.searchInput}
              value={search}
            />
          </View>
          <Pressable
            accessibilityHint="Sorts pets by name"
            accessibilityLabel="Sort pets"
            accessibilityRole="button"
            onPress={() => setSortDescending((current) => !current)}
            style={[styles.sortButton, sortDescending && styles.sortButtonActive]}
          >
            <MaterialCommunityIcons color={colors.primary} name={sortDescending ? 'sort-alphabetical-descending' : 'sort-alphabetical-ascending'} size={20} />
          </Pressable>
        </View>

        <View style={styles.list}>
          {isLoading ? (
            <View style={styles.statusState}><ActivityIndicator color={colors.primary} /></View>
          ) : isError ? (
            <Text style={styles.statusText}>We couldn&apos;t load your pets. Please try again.</Text>
          ) : filteredPets.length > 0 ? (
            filteredPets.map((pet) => <PetRow key={pet.id} pet={pet} onPress={() => router.push(`/(owner)/pets/${pet.id}`)} />)
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons color={colors.textMuted} name="paw-outline" size={26} />
              <Text style={styles.statusText}>{search ? 'No pets match your search.' : 'No pets yet. Add your first pet to get started.'}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  titleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  addButton: { backgroundColor: colors.primary, borderRadius: 10, minHeight: 36, paddingHorizontal: 16, justifyContent: 'center' },
  addButtonText: { color: colors.inverse, fontSize: 14, fontWeight: '700' },
  searchRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 20 },
  searchField: { borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, height: 42, justifyContent: 'center' },
  searchInput: { color: colors.text, fontSize: 15, height: '100%', paddingHorizontal: 16, paddingVertical: 0 },
  sortButton: { alignItems: 'center', borderRadius: 12, height: 42, justifyContent: 'center', width: 42 },
  sortButtonActive: { backgroundColor: colors.primaryLight },
  list: { gap: 12, marginTop: 20 },
  petRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', minHeight: 72, paddingHorizontal: 16 },
  petPhoto: { borderRadius: 12, height: 50, width: 50 },
  petPhotoPlaceholder: { alignItems: 'center', backgroundColor: colors.iconBg, borderRadius: 12, height: 50, justifyContent: 'center', width: 50 },
  petInfo: { flex: 1, marginLeft: 14 },
  petName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  petBreed: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  statusState: { alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  emptyState: { alignItems: 'center', borderColor: colors.border, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, gap: 12, minHeight: 120, justifyContent: 'center', paddingHorizontal: 24 },
  statusText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
})
