<script setup lang="ts">
import type { VisitStatus } from '~/types/place'
import { storeToRefs } from 'pinia'

const router = useRouter()
const placesStore = usePlacesStore()
const { savedPlaces, plannedPlaces, visitedPlaces } = storeToRefs(placesStore)

const statusFilter = ref<VisitStatus | 'all'>('all')

onMounted(() => {
  placesStore.initialize()
})

const filteredPlaces = computed(() => {
  if (statusFilter.value === 'all') return [...savedPlaces.value]
  return savedPlaces.value.filter(place => place.status === statusFilter.value)
})

const notedCount = computed(() =>
  savedPlaces.value.filter(place => place.note && place.note.length > 0).length,
)
</script>

<template>
  <div class="page">
    <header class="page-hero page-hero--compact">
      <div class="page-hero__content">
        <span class="page-hero__badge">Kişisel arşiv</span>
        <h1>Gezi günlüğünüz</h1>
        <p>
          Kaydettiğiniz mekanlar, notlarınız ve ziyaret damgalarınız — hesap gerektirmeden,
          yalnızca tarayıcınızda saklanan kişisel veriniz. Planladıklarınızı ve
          gittiğiniz yerleri buradan hatırlayın.
        </p>

        <div v-if="savedPlaces.length > 0" class="archive-stats">
          <div class="archive-stats__item">
            <span class="archive-stats__value">{{ savedPlaces.length }}</span>
            <span class="archive-stats__label">Toplam kayıt</span>
          </div>
          <div class="archive-stats__item">
            <span class="archive-stats__value">{{ visitedPlaces.length }}</span>
            <span class="archive-stats__label">Damgalı</span>
          </div>
          <div class="archive-stats__item">
            <span class="archive-stats__value">{{ notedCount }}</span>
            <span class="archive-stats__label">Notlu</span>
          </div>
        </div>
      </div>
    </header>

    <section class="panel">
      <p class="panel__title">Filtre</p>
      <div class="filter-tabs">
        <button
          type="button"
          class="filter-tabs__btn"
          :class="{ 'filter-tabs__btn--active': statusFilter === 'all' }"
          @click="statusFilter = 'all'"
        >
          Tümü ({{ savedPlaces.length }})
        </button>
        <button
          type="button"
          class="filter-tabs__btn"
          :class="{ 'filter-tabs__btn--active': statusFilter === 'planned' }"
          @click="statusFilter = 'planned'"
        >
          Planlanan ({{ plannedPlaces.length }})
        </button>
        <button
          type="button"
          class="filter-tabs__btn"
          :class="{ 'filter-tabs__btn--active': statusFilter === 'visited' }"
          @click="statusFilter = 'visited'"
        >
          Damgalı ({{ visitedPlaces.length }})
        </button>
      </div>
    </section>

    <p v-if="placesStore.storageError" class="alert alert--error">
      {{ placesStore.storageError }}
    </p>

    <section v-if="filteredPlaces.length === 0" class="archive-empty-wrap">
      <MemoryCardPreview sample />
      <p class="archive-empty">
        <template v-if="savedPlaces.length === 0">
          Arşiviniz henüz boş. Günlük sayfasından mekan arayıp ilk kaydınızı oluşturun.
        </template>
        <template v-else>
          Bu filtrede kayıt bulunamadı.
        </template>
      </p>
      <NuxtLink to="/" class="btn btn--primary">
        İlk kaydı oluştur
      </NuxtLink>
    </section>

    <div v-else class="saved-list">
      <PlaceCard
        v-for="place in filteredPlaces"
        :key="place.id"
        :place="place"
        saved
        show-actions
        @open="router.push(`/place/${place.id}`)"
        @remove="placesStore.removePlace(place.id)"
        @mark-visited="placesStore.markAsVisited(place.id)"
      />
    </div>
  </div>
</template>

<style scoped>
.archive-empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1.5rem 1rem 2rem;
}

.archive-empty {
  margin: 0;
  max-width: 26rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.6;
  text-align: center;
}
</style>
