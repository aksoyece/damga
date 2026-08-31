<script setup lang="ts">

import type { Place, SavedPlace } from '~/types/place'

import { storeToRefs } from 'pinia'



const route = useRoute()

const router = useRouter()

const placesStore = usePlacesStore()

const { savedPlaces } = storeToRefs(placesStore)



const { fetchPlaceById, places, loading, error } = usePlaces()



const place = ref<Place | null>(null)

const placeId = computed(() => String(route.params.id))

const saveMessage = ref<string | null>(null)



const savedPlace = computed(() =>

  savedPlaces.value.find(item => item.id === placeId.value),

)



if (import.meta.client) {

  placesStore.initialize()

}



function toPlace(source: Place | SavedPlace): Place {
  return {
    id: source.id,
    name: source.name,
    category: source.category,
    latitude: source.latitude,
    longitude: source.longitude,
    address: source.address,
    city: source.city,
  }
}



function resolveLocalPlace(id: string): Place | null {

  const saved = placesStore.getSavedPlace(id)

  if (saved) return toPlace(saved)



  const cached = places.value.find(item => item.id === id)

  return cached ?? null

}



async function loadPlace() {

  const id = placeId.value

  const local = resolveLocalPlace(id)



  if (local) {

    place.value = local

    fetchPlaceById(id, { silent: true }).then((apiPlace) => {

      if (apiPlace && placeId.value === id) {

        place.value = apiPlace

      }

    })

    return

  }



  const apiPlace = await fetchPlaceById(id)

  if (apiPlace) {

    place.value = apiPlace

  }

}



watch(placeId, () => {

  place.value = resolveLocalPlace(placeId.value)

  loadPlace()

}, { immediate: true })



function handleSave() {

  if (!place.value) return

  placesStore.addPlace(place.value)

  saveMessage.value = 'Mekan arşivinize eklendi. Artık puan ve not ekleyebilirsiniz.'

}



function handleRemove() {

  placesStore.removePlace(placeId.value)

  router.push('/saved')

}



function handleMarkVisited(visitedAt: string) {
  placesStore.markAsVisited(placeId.value, visitedAt)
  saveMessage.value = 'Ziyaret damgası basıldı.'
}

function handleUpdateVisitedAt(visitedAt: string) {
  placesStore.updateVisitedAt(placeId.value, visitedAt)
  saveMessage.value = 'Ziyaret tarihi güncellendi.'
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

      @update-visited-at="handleUpdateVisitedAt"

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

