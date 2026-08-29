<script setup lang="ts">
import type { Place } from '~/types/place'
import { storeToRefs } from 'pinia'

const route = useRoute()
const router = useRouter()
const placesStore = usePlacesStore()
const { savedPlaces } = storeToRefs(placesStore)

const { fetchPlaceById, loading, error } = usePlaces()

const place = ref<Place | null>(null)
const placeId = computed(() => String(route.params.id))
const saveMessage = ref<string | null>(null)

const savedPlace = computed(() =>
  savedPlaces.value.find(item => item.id === placeId.value),
)

onMounted(async () => {
  placesStore.initialize()
  await loadPlace()
})

async function loadPlace() {
  const apiPlace = await fetchPlaceById(placeId.value)

  if (apiPlace) {
    place.value = apiPlace
    return
  }

  const saved = placesStore.getSavedPlace(placeId.value)
  if (saved) {
    place.value = {
      id: saved.id,
      name: saved.name,
      category: saved.category,
      latitude: saved.latitude,
      longitude: saved.longitude,
      address: saved.address,
    }
  }
}

function handleSave() {
  if (!place.value) return
  placesStore.addPlace(place.value)
  saveMessage.value = 'Mekan arşivinize eklendi. Artık puan ve not ekleyebilirsiniz.'
}

function handleRemove() {
  placesStore.removePlace(placeId.value)
  router.push('/saved')
}

function handleMarkVisited() {
  placesStore.markAsVisited(placeId.value)
  saveMessage.value = 'Mekan ziyaret edildi olarak işaretlendi.'
}

function handleUpdateRating(rating: number) {
  placesStore.updateRating(placeId.value, rating)
  saveMessage.value = 'Puanınız kaydedildi.'
}

function handleUpdateNote(note: string) {
  placesStore.updateNote(placeId.value, note)
  saveMessage.value = 'Notunuz kaydedildi.'
}
</script>

<template>
  <div class="page">
    <NuxtLink to="/" class="back-link">← Günlüğe dön</NuxtLink>

    <p v-if="saveMessage" class="alert alert--success">
      {{ saveMessage }}
    </p>

    <p v-if="loading && !place" class="alert alert--info">
      Mekan bilgileri yükleniyor...
    </p>

    <section v-else-if="!place" class="panel empty-state">
      <p>{{ error ?? 'Mekan bulunamadı veya yüklenemedi.' }}</p>
      <NuxtLink to="/" class="btn btn--primary" style="margin-top: 1rem;">
        Ana Sayfaya Dön
      </NuxtLink>
    </section>

    <PlaceDetails
      v-else
      :place="place"
      :saved-place="savedPlace"
      :loading="loading"
      :api-error="error"
      @save="handleSave"
      @remove="handleRemove"
      @mark-visited="handleMarkVisited"
      @update-rating="handleUpdateRating"
      @update-note="handleUpdateNote"
    />

    <p v-if="placesStore.storageError" class="alert alert--error">
      {{ placesStore.storageError }}
    </p>
  </div>
</template>

<style scoped>
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 1.25rem;
  padding: 0.5rem 0.875rem;
  border-radius: var(--radius-full);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  color: var(--primary-dark);
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition);
}

.back-link:hover {
  border-color: var(--primary);
  background: var(--primary-soft);
}
</style>
