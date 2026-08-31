import { defineStore } from 'pinia'
import type { LocalStorageData, Place, SavedPlace, VisitStatus } from '~/types/place'
import { mapPlaceToSavedPlace, resolvePlaceCity } from '~/types/place'

const STORAGE_KEY = 'sehir-hafiza'

const DEFAULT_DATA: LocalStorageData = {
  savedPlaces: [],
}

function isValidSavedPlace(value: unknown): value is SavedPlace {
  if (!value || typeof value !== 'object') return false

  const place = value as Partial<SavedPlace>
  return (
    typeof place.id === 'string'
    && typeof place.name === 'string'
    && typeof place.category === 'string'
    && typeof place.latitude === 'number'
    && typeof place.longitude === 'number'
    && (place.status === 'planned' || place.status === 'visited')
    && typeof place.savedAt === 'string'
  )
}

function parseStorage(raw: string): { data: LocalStorageData; valid: boolean } {
  try {
    const parsed = JSON.parse(raw) as Partial<LocalStorageData> | SavedPlace[]

    if (Array.isArray(parsed)) {
      return {
        data: { savedPlaces: parsed.filter(isValidSavedPlace) },
        valid: true,
      }
    }

    if (parsed && Array.isArray(parsed.savedPlaces)) {
      return {
        data: { savedPlaces: parsed.savedPlaces.filter(isValidSavedPlace) },
        valid: true,
      }
    }

    return { data: { ...DEFAULT_DATA }, valid: false }
  } catch {
    return { data: { ...DEFAULT_DATA }, valid: false }
  }
}

function readFromStorage(): { data: LocalStorageData; readError: boolean } {
  if (!import.meta.client) {
    return { data: { ...DEFAULT_DATA }, readError: false }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { data: { ...DEFAULT_DATA }, readError: false }

    const { data, valid } = parseStorage(raw)
    return { data, readError: !valid }
  } catch {
    return { data: { ...DEFAULT_DATA }, readError: true }
  }
}

function writeToStorage(data: LocalStorageData): boolean {
  if (!import.meta.client) return false

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export const usePlacesStore = defineStore('places', () => {
  const savedPlaces = ref<SavedPlace[]>([])
  const storageError = ref<string | null>(null)
  const initialized = ref(false)

  const plannedPlaces = computed(() =>
    savedPlaces.value.filter(place => place.status === 'planned'),
  )

  const visitedPlaces = computed(() =>
    savedPlaces.value.filter(place => place.status === 'visited'),
  )

  function persist() {
    if (!import.meta.client) return

    const success = writeToStorage({ savedPlaces: savedPlaces.value })
    if (!success) {
      storageError.value = 'Veriler kaydedilemedi. Tarayıcı depolama alanı dolu olabilir.'
    } else {
      storageError.value = null
    }
  }

  function initialize() {
    if (initialized.value || !import.meta.client) return

    const { data, readError } = readFromStorage()
    let migrated = false

    savedPlaces.value = data.savedPlaces.map((place) => {
      if (place.city?.trim()) return place

      const city = resolvePlaceCity(place)
      if (!city) return place

      migrated = true
      return { ...place, city }
    })
    initialized.value = true

    if (migrated) {
      persist()
    }

    if (readError) {
      storageError.value = 'Kaydedilen mekanlar okunamadı. Boş liste ile devam ediliyor.'
    }
  }

  function getSavedPlace(id: string): SavedPlace | undefined {
    return savedPlaces.value.find(place => place.id === id)
  }

  function isSaved(id: string): boolean {
    return savedPlaces.value.some(place => place.id === id)
  }

  function addPlace(place: Place): SavedPlace {
    initialize()

    const existing = getSavedPlace(place.id)
    if (existing) return existing

    const savedPlace = mapPlaceToSavedPlace(place)

    savedPlaces.value.push(savedPlace)
    persist()
    return savedPlace
  }

  function removePlace(id: string) {
    initialize()
    savedPlaces.value = savedPlaces.value.filter(place => place.id !== id)
    persist()
  }

  function updatePlace(id: string, updates: Partial<SavedPlace>) {
    initialize()

    const index = savedPlaces.value.findIndex(place => place.id === id)
    if (index === -1) return

    savedPlaces.value[index] = {
      ...savedPlaces.value[index],
      ...updates,
      id: savedPlaces.value[index].id,
    }
    persist()
  }

  function markAsVisited(id: string, visitedAt?: string) {
    initialize()

    const date = (visitedAt?.trim() || new Date().toISOString().slice(0, 10))

    updatePlace(id, {
      status: 'visited',
      visitedAt: date,
    })
  }

  function updateVisitedAt(id: string, visitedAt: string) {
    initialize()

    const place = getSavedPlace(id)
    if (!place || place.status !== 'visited') return

    const date = visitedAt.trim()
    if (!date) return

    updatePlace(id, { visitedAt: date })
  }

  function updateRating(id: string, rating: number) {
    initialize()

    const normalized = Math.min(5, Math.max(1, Math.round(rating)))
    updatePlace(id, { rating: normalized })
  }

  function updateNote(id: string, note: string) {
    initialize()
    updatePlace(id, { note: note.trim() || undefined })
  }

  function filterByStatus(status: VisitStatus | 'all'): SavedPlace[] {
    initialize()

    if (status === 'all') return [...savedPlaces.value]
    return savedPlaces.value.filter(place => place.status === status)
  }

  return {
    savedPlaces,
    storageError,
    initialized,
    plannedPlaces,
    visitedPlaces,
    initialize,
    getSavedPlace,
    isSaved,
    addPlace,
    removePlace,
    updatePlace,
    markAsVisited,
    updateVisitedAt,
    updateRating,
    updateNote,
    filterByStatus,
  }
})
