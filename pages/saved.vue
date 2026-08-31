<script setup lang="ts">
import type { VisitDatePreset, VisitStatus } from '~/types/place'
import { getVisitDateRange, isVisitedInDateRange, resolvePlaceCity } from '~/types/place'
import { storeToRefs } from 'pinia'

const router = useRouter()
const placesStore = usePlacesStore()
const { savedPlaces, plannedPlaces, visitedPlaces } = storeToRefs(placesStore)

const statusFilter = ref<VisitStatus | 'all'>('all')
const cityFilter = ref<string>('all')
const datePreset = ref<VisitDatePreset>('all')
const customFrom = ref('')
const customTo = ref('')

onMounted(() => {
  placesStore.initialize()
})

const archiveCities = computed(() => {
  const cities = new Set<string>()
  for (const place of savedPlaces.value) {
    const city = resolvePlaceCity(place)
    if (city) cities.add(city)
  }
  return [...cities].sort((a, b) => a.localeCompare(b, 'tr'))
})

const dateRange = computed(() =>
  getVisitDateRange(datePreset.value, customFrom.value, customTo.value),
)

const filteredPlaces = computed(() => {
  return savedPlaces.value.filter((place) => {
    if (statusFilter.value !== 'all' && place.status !== statusFilter.value) {
      return false
    }

    if (cityFilter.value !== 'all') {
      if (resolvePlaceCity(place) !== cityFilter.value) return false
    }

    if (dateRange.value) {
      if (place.status !== 'visited') return false
      if (!isVisitedInDateRange(place.visitedAt, dateRange.value.from, dateRange.value.to)) {
        return false
      }
    }

    return true
  })
})

const notedCount = computed(() =>
  savedPlaces.value.filter(place => place.note && place.note.length > 0).length,
)

const hasActiveFilters = computed(() =>
  statusFilter.value !== 'all'
  || cityFilter.value !== 'all'
  || datePreset.value !== 'all',
)

function clearFilters() {
  statusFilter.value = 'all'
  cityFilter.value = 'all'
  datePreset.value = 'all'
  customFrom.value = ''
  customTo.value = ''
}

watch(datePreset, (preset) => {
  if (preset !== 'custom') {
    customFrom.value = ''
    customTo.value = ''
  }
})
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

    <section v-if="savedPlaces.length > 0" class="panel archive-filters">
      <div class="archive-filters__row">
        <p class="panel__title">Durum</p>
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
      </div>

      <div v-if="archiveCities.length > 0" class="archive-filters__row">
        <p class="panel__title">Şehir</p>
        <div class="filter-tabs">
          <button
            type="button"
            class="filter-tabs__btn"
            :class="{ 'filter-tabs__btn--active': cityFilter === 'all' }"
            @click="cityFilter = 'all'"
          >
            Tüm şehirler
          </button>
          <button
            v-for="city in archiveCities"
            :key="city"
            type="button"
            class="filter-tabs__btn"
            :class="{ 'filter-tabs__btn--active': cityFilter === city }"
            @click="cityFilter = city"
          >
            {{ city }}
          </button>
        </div>
      </div>

      <div class="archive-filters__row">
        <p class="panel__title">Ziyaret tarihi</p>
        <p class="archive-filters__hint">
          Yalnızca damgalı (ziyaret edilmiş) kayıtlara uygulanır.
        </p>
        <div class="filter-tabs">
          <button
            type="button"
            class="filter-tabs__btn"
            :class="{ 'filter-tabs__btn--active': datePreset === 'all' }"
            @click="datePreset = 'all'"
          >
            Tümü
          </button>
          <button
            type="button"
            class="filter-tabs__btn"
            :class="{ 'filter-tabs__btn--active': datePreset === 'last30' }"
            @click="datePreset = 'last30'"
          >
            Son 30 gün
          </button>
          <button
            type="button"
            class="filter-tabs__btn"
            :class="{ 'filter-tabs__btn--active': datePreset === 'thisMonth' }"
            @click="datePreset = 'thisMonth'"
          >
            Bu ay
          </button>
          <button
            type="button"
            class="filter-tabs__btn"
            :class="{ 'filter-tabs__btn--active': datePreset === 'lastMonth' }"
            @click="datePreset = 'lastMonth'"
          >
            Geçen ay
          </button>
          <button
            type="button"
            class="filter-tabs__btn"
            :class="{ 'filter-tabs__btn--active': datePreset === 'custom' }"
            @click="datePreset = 'custom'"
          >
            Özel aralık
          </button>
        </div>

        <div v-if="datePreset === 'custom'" class="archive-filters__dates">
          <label class="archive-filters__date-field">
            <span>Başlangıç</span>
            <input v-model="customFrom" type="date" class="archive-filters__date-input">
          </label>
          <label class="archive-filters__date-field">
            <span>Bitiş</span>
            <input v-model="customTo" type="date" class="archive-filters__date-input">
          </label>
        </div>
      </div>

      <button
        v-if="hasActiveFilters"
        type="button"
        class="btn btn--ghost btn--sm archive-filters__clear"
        @click="clearFilters"
      >
        Filtreleri temizle
      </button>
    </section>

    <p v-if="placesStore.storageError" class="alert alert--error">
      {{ placesStore.storageError }}
    </p>

    <section v-if="filteredPlaces.length === 0" class="archive-empty-wrap">
      <MemoryCardPreview v-if="savedPlaces.length === 0" sample />
      <p class="archive-empty">
        <template v-if="savedPlaces.length === 0">
          Arşiviniz henüz boş. Günlük sayfasından mekan arayıp ilk kaydınızı oluşturun.
        </template>
        <template v-else>
          Bu filtre kombinasyonunda kayıt bulunamadı.
        </template>
      </p>
      <NuxtLink v-if="savedPlaces.length === 0" to="/" class="btn btn--primary">
        İlk kaydı oluştur
      </NuxtLink>
      <button
        v-else
        type="button"
        class="btn btn--ghost"
        @click="clearFilters"
      >
        Filtreleri temizle
      </button>
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
.archive-filters {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.archive-filters__row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.archive-filters__hint {
  margin: 0 0 0.35rem;
  color: var(--text-subtle);
  font-size: 0.75rem;
  line-height: 1.45;
}

.archive-filters__dates {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.archive-filters__date-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-subtle);
}

.archive-filters__date-input {
  min-width: 10.5rem;
  padding: 0.5rem 0.65rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.archive-filters__date-input:focus {
  border-color: var(--primary);
  outline: none;
}

.archive-filters__clear {
  align-self: flex-start;
}

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
