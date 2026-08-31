<script setup lang="ts">
import type { Place, SavedPlace } from '~/types/place'
import type { SearchResult } from '~/types/place'
import { MAX_MAP_PINS, buildCategoryOptions, getCategoryLabel, resolvePlacesSearchArea } from '~/types/place'
import { storeToRefs } from 'pinia'

const router = useRouter()
const placesStore = usePlacesStore()
const { savedPlaces, visitedPlaces } = storeToRefs(placesStore)

const { search, results, loading: searchLoading, error: searchError, clearResults } = useNominatim()
const {
  places,
  loading: placesLoading,
  error: placesError,
  fetchNearbyPlaces,
  clearPlaces,
} = usePlaces()

const mapCenter = ref<[number, number]>([39.0, 35.0])
const mapZoom = ref(6)
const mapBounds = ref<[[number, number], [number, number]] | null>(null)
const selectedCategory = ref('all')
const selectedPlaceId = ref<string | null>(null)
const saveMessage = ref<string | null>(null)
const hasSearched = ref(false)
const searchedLocation = ref<string | null>(null)
const searchedCity = ref<string | null>(null)

const PLACES_PAGE_SIZE = 10
const visiblePlacesCount = ref(PLACES_PAGE_SIZE)
const lastNearbySearch = ref<{
  latitude: number
  longitude: number
  options: { bounds?: [[number, number], [number, number]] }
} | null>(null)

const savedIds = computed(() => new Set(savedPlaces.value.map(place => place.id)))

const discoveredPlaces = computed(() =>
  places.value.filter(place => !savedIds.value.has(place.id)),
)

const filteredPlaces = computed(() => {
  if (selectedCategory.value === 'all') {
    return discoveredPlaces.value
  }
  return discoveredPlaces.value.filter(place => place.category === selectedCategory.value)
})

const visiblePlaces = computed(() =>
  filteredPlaces.value.slice(0, visiblePlacesCount.value),
)

const placesRemaining = computed(() =>
  Math.max(0, filteredPlaces.value.length - visiblePlaces.value.length),
)

function showMorePlaces() {
  visiblePlacesCount.value += PLACES_PAGE_SIZE
}

watch(selectedCategory, () => {
  visiblePlacesCount.value = PLACES_PAGE_SIZE
})

watch(filteredPlaces, () => {
  if (visiblePlacesCount.value < PLACES_PAGE_SIZE) {
    visiblePlacesCount.value = PLACES_PAGE_SIZE
  }
})

const categoryOptions = computed(() =>
  buildCategoryOptions(discoveredPlaces.value.map(place => place.category)),
)

const selectedPlace = computed(() =>
  filteredPlaces.value.find(place => place.id === selectedPlaceId.value)
  ?? places.value.find(place => place.id === selectedPlaceId.value)
  ?? null,
)

const notedCount = computed(() =>
  savedPlaces.value.filter(place => place.note && place.note.length > 0).length,
)

const savedLookup = computed(() => {
  const lookup: Record<string, SavedPlace> = {}
  for (const place of savedPlaces.value) {
    lookup[place.id] = place
  }
  return lookup
})

const recentArchive = computed(() =>
  [...savedPlaces.value]
    .sort((a, b) => {
      const aKey = [a.visitedAt, a.savedAt].filter(Boolean).sort().at(-1) ?? a.savedAt
      const bKey = [b.visitedAt, b.savedAt].filter(Boolean).sort().at(-1) ?? b.savedAt
      return bKey.localeCompare(aKey)
    })
    .slice(0, 3),
)

const archiveRemaining = computed(() =>
  Math.max(0, savedPlaces.value.length - recentArchive.value.length),
)

const searchBarMode = computed(() => {
  if (hasSearched.value) return 'discover'
  if (savedPlaces.value.length === 0) return 'featured'
  return 'compact'
})

const searchInputClass = computed(() => {
  if (searchBarMode.value === 'featured') return 'search-input--featured'
  if (searchBarMode.value === 'compact') return 'search-input--compact'
  return undefined
})

const mapPlacesAll = computed(() => {
  const byId = new Map<string, Place>()

  for (const place of savedPlaces.value) {
    byId.set(place.id, place)
  }

  if (hasSearched.value) {
    for (const place of filteredPlaces.value) {
      byId.set(place.id, place)
    }
  }

  return [...byId.values()]
})

const mapPlacesTotal = computed(() => mapPlacesAll.value.length)

const mapPlaces = computed(() => {
  const all = mapPlacesAll.value
  if (all.length <= MAX_MAP_PINS) return all

  const savedIds = new Set(savedPlaces.value.map(place => place.id))
  const saved = all.filter(place => savedIds.has(place.id))
  const discovered = all.filter(place => !savedIds.has(place.id))
  const room = MAX_MAP_PINS - saved.length

  return [...saved, ...discovered.slice(0, Math.max(0, room))]
})

const placesFoundSummary = computed(() => {
  const total = places.value.length
  const newOnes = discoveredPlaces.value.length
  const shown = filteredPlaces.value.length

  if (placesLoading.value) {
    return total > 0 ? `${total} mekan bulundu…` : null
  }

  if (total === 0 || placesError.value) return null

  if (selectedCategory.value !== 'all') {
    const label = getCategoryLabel(selectedCategory.value)
    return `${shown} mekan · ${label}`
  }

  if (newOnes < total) {
    return `${total} mekan bulundu · ${newOnes} yeni`
  }

  return `${total} mekan bulundu`
})

const landingMapBounds = computed<[[number, number], [number, number]] | null>(() => {
  if (hasSearched.value || savedPlaces.value.length < 2) return null

  const lats = savedPlaces.value.map(place => place.latitude)
  const lons = savedPlaces.value.map(place => place.longitude)

  return [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ]
})

onMounted(() => {
  placesStore.initialize()
})

async function handleSearch(query: string) {
  if (query.trim().length < 2) {
    clearResults()
    return
  }
  await search(query)
}

async function handleSelectResult(result: SearchResult) {
  hasSearched.value = true
  searchedLocation.value = result.displayName
  searchedCity.value = result.city ?? null
  mapCenter.value = [result.latitude, result.longitude]
  const searchArea = resolvePlacesSearchArea(result.latitude, result.longitude, result.bounds)
  mapBounds.value = searchArea.mapBounds
  mapZoom.value = 14
  selectedCategory.value = 'all'
  selectedPlaceId.value = null
  clearResults()
  visiblePlacesCount.value = PLACES_PAGE_SIZE
  const fetchOptions = {
    bounds: searchArea.bounds,
  }
  lastNearbySearch.value = {
    latitude: result.latitude,
    longitude: result.longitude,
    options: fetchOptions,
  }
  await fetchNearbyPlaces(result.latitude, result.longitude, fetchOptions)
}

async function retryNearbySearch() {
  if (!lastNearbySearch.value) return
  const { latitude, longitude, options } = lastNearbySearch.value
  await fetchNearbyPlaces(latitude, longitude, options)
}

function handleClearSearch() {
  clearResults()
  hasSearched.value = false
  searchedLocation.value = null
  searchedCity.value = null
  selectedPlaceId.value = null
  selectedCategory.value = 'all'
  clearPlaces()
  lastNearbySearch.value = null
  visiblePlacesCount.value = PLACES_PAGE_SIZE
  mapCenter.value = [39.0, 35.0]
  mapBounds.value = null
  mapZoom.value = 6
}

function handleSelectPlace(place: Place) {
  selectedPlaceId.value = place.id
}

function handleSavePlace(place: Place) {
  if (placesStore.isSaved(place.id)) {
    saveMessage.value = 'Bu mekan zaten arşivinizde.'
    return
  }
  placesStore.addPlace(place, { city: searchedCity.value ?? undefined })
  saveMessage.value = `"${place.name}" arşivinize eklendi — not ve puan ekleyebilirsiniz.`
}

function handleRemovePlace(id: string) {
  placesStore.removePlace(id)
  saveMessage.value = 'Mekan arşivinizden kaldırıldı.'
}

function openPlace(id: string) {
  router.push(`/place/${id}`)
}

function formatStampDate(iso?: string): string | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y.slice(2)}`
}
</script>

<template>
  <div class="journal-page" :class="{ 'journal-page--discover': hasSearched }">
    <section
      class="journal-search"
      :class="`journal-search--${searchBarMode}`"
      aria-label="Konum arama"
    >
      <div class="journal-search__inner">
        <p class="journal-search__label">
          {{ hasSearched ? 'Bölge arama' : 'Şehir veya adres ara' }}
        </p>
        <p v-if="searchBarMode === 'featured'" class="journal-search__hint">
          Örneğin Bursa, Kadıköy veya tam bir adres yazın — ardından mekanları keşfedip arşivinize ekleyin.
        </p>
        <SearchInput
          :class="searchInputClass"
          :autofocus="!hasSearched"
          :loading="searchLoading"
          :error="searchError"
          :results="results"
          :selection-made="hasSearched"
          @search="handleSearch"
          @select="handleSelectResult"
          @clear="handleClearSearch"
        />
      </div>
    </section>

    <section v-if="!hasSearched" class="journal-map" aria-label="Harita">
      <div class="journal-map__inner">
        <div class="journal-map__frame discover-map">
          <ClientOnly>
            <Map
              :center="mapCenter"
              :zoom="mapZoom"
              :fit-bounds="landingMapBounds"
              :places="mapPlaces"
              :places-total="mapPlacesTotal"
              :saved-lookup="savedLookup"
              compact
              @select-place="(place) => openPlace(place.id)"
            />
            <template #fallback>
              <div class="panel panel__hint">Konum referansı yükleniyor…</div>
            </template>
          </ClientOnly>
        </div>
        <p class="journal-map__hint">
          <template v-if="savedPlaces.length > 0">
            Arşivinizdeki {{ savedPlaces.length }} mekan haritada — bir pini seçerek günlük sayfasına gidebilirsiniz.
          </template>
          <template v-else>
            Bir şehir veya adres arayın; keşfettiğiniz mekanlar bu haritada görünecek.
          </template>
        </p>
      </div>
    </section>

    <div class="page">
    <header class="page-hero" :class="{ 'page-hero--compact': hasSearched }">
      <div class="page-hero__content">
        <span class="page-hero__badge">Kişisel gezi defteri</span>
        <h1>Gittiğin yerleri hatırla, not al, damgala</h1>
        <p v-if="!hasSearched">
          Harita uygulaması değil; kişisel gezi defterin.
          Planladıkların, gittiklerin ve notların hep burada.
        </p>
        <p v-else class="page-hero__search-hint">
          {{ searchedCity ? `${searchedCity} — keşfedilen mekanlar` : 'Keşfedilen mekanlar' }}
        </p>

        <div v-if="savedPlaces.length > 0 && !hasSearched" class="archive-stats">
          <div class="archive-stats__item">
            <span class="archive-stats__value">{{ savedPlaces.length }}</span>
            <span class="archive-stats__label">Kayıtlı mekan</span>
          </div>
          <div class="archive-stats__item">
            <span class="archive-stats__value">{{ visitedPlaces.length }}</span>
            <span class="archive-stats__label">Damgalı ziyaret</span>
          </div>
          <div class="archive-stats__item">
            <span class="archive-stats__value">{{ notedCount }}</span>
            <span class="archive-stats__label">Yazılı not</span>
          </div>
        </div>
      </div>

      <div v-if="!hasSearched && savedPlaces.length === 0" class="page-hero__aside">
        <MemoryCardPreview sample />

        <div class="draft-card draft-card--hero">
          <p class="draft-card__label">Böyle görünecek</p>
          <div class="draft-card__inner">
            <article class="draft-entry">
              <div class="draft-entry__head">
                <div>
                  <h4>Uludağ Teleferik</h4>
                  <span class="draft-entry__tag">TURİSTİK</span>
                </div>
                <PassportStamp label="PLAN" variant="planned" size="sm" />
              </div>
              <p class="draft-entry__note">“Manzara için kesinlikle tekrar…”</p>
              <span class="draft-entry__meta">KAYIT · BEKLEMEDE</span>
            </article>
          </div>
        </div>
      </div>
    </header>

    <p v-if="saveMessage" class="alert alert--success">
      {{ saveMessage }}
    </p>

    <section v-if="recentArchive.length > 0 && !hasSearched" class="panel panel--archive">
      <div class="panel__head">
        <div>
          <p class="panel__title">Son kayıtlarınız</p>
          <p class="panel__subtitle">Arşivinizden</p>
        </div>
        <div class="archive-head-actions">
          <NuxtLink to="/saved" class="btn btn--ghost btn--sm">Tüm arşiv →</NuxtLink>
          <p v-if="archiveRemaining > 0" class="archive-remaining">
            +{{ archiveRemaining }} mekan daha
          </p>
        </div>
      </div>
      <div class="stack stack--archive">
        <PlaceCard
          v-for="place in recentArchive"
          :key="place.id"
          :place="place"
          saved
          compact
          show-actions
          @open="openPlace(place.id)"
          @remove="handleRemovePlace(place.id)"
          @mark-visited="placesStore.markAsVisited(place.id)"
        />
      </div>
    </section>

    <div v-if="hasSearched" class="discover-layout">
      <div class="discover-layout__region location-chip">
        <span><strong>Bölge:</strong> {{ searchedLocation }}</span>
        <span v-if="placesFoundSummary" class="places-found-pill">{{ placesFoundSummary }}</span>
        <span v-else-if="placesLoading" class="loading-pill">Mekanlar taranıyor</span>
      </div>

      <div class="discover-layout__filters">
        <CategoryFilter
          v-model="selectedCategory"
          :categories="categoryOptions"
        />
      </div>

      <section class="discover-layout__map map-section">
        <div class="discover-map">
          <ClientOnly>
            <Map
              :center="mapCenter"
              :zoom="mapZoom"
              :fit-bounds="mapBounds"
              :places="mapPlaces"
              :places-total="mapPlacesTotal"
              :saved-lookup="savedLookup"
              :selected-place-id="selectedPlaceId"
              :error="placesError"
              compact
              @select-place="handleSelectPlace"
            />
            <template #fallback>
              <div class="panel panel__hint">Konum referansı yükleniyor…</div>
            </template>
          </ClientOnly>
        </div>

        <section v-if="selectedPlace" class="panel selected-place">
          <p class="selected-place__label">Seçili kayıt</p>
          <h2>{{ selectedPlace.name }}</h2>
          <dl class="selected-place__info">
            <div>
              <dt>
                <svg class="selected-place__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2 8.5V2.5h6l5.5 5.5-5.5 5.5L2 8.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                  <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
                </svg>
                Kategori
              </dt>
              <dd>{{ getCategoryLabel(selectedPlace.category) }}</dd>
            </div>
            <div>
              <dt>
                <svg class="selected-place__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 14s5-4.5 5-8a5 5 0 1 0-10 0c0 3.5 5 8 5 8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                  <circle cx="8" cy="6" r="1.25" fill="currentColor" />
                </svg>
                Adres
              </dt>
              <dd>{{ selectedPlace.address ?? '—' }}</dd>
            </div>
          </dl>
          <div v-if="savedLookup[selectedPlace.id]?.status === 'visited'" class="selected-place__stamp">
            <PassportStamp
              :date="formatStampDate(savedLookup[selectedPlace.id]?.visitedAt)"
            />
          </div>
          <div class="selected-place__actions">
            <button type="button" class="btn btn--ghost btn--sm" @click="openPlace(selectedPlace.id)">
              Günlük sayfası
            </button>
            <button
              v-if="!placesStore.isSaved(selectedPlace.id)"
              type="button"
              class="btn btn--primary btn--sm"
              @click="handleSavePlace(selectedPlace)"
            >
              Arşive ekle
            </button>
            <button
              v-else-if="savedLookup[selectedPlace.id]?.status === 'planned'"
              type="button"
              class="btn btn--primary btn--sm"
              @click="placesStore.markAsVisited(selectedPlace.id)"
            >
              Ziyaret damgası bas
            </button>
            <button
              v-else
              type="button"
              class="btn btn--danger btn--sm"
              @click="handleRemovePlace(selectedPlace.id)"
            >
              Kaldır
            </button>
          </div>
        </section>
      </section>

      <section class="discover-layout__places panel panel--places discover-places-panel">
        <div class="panel__head">
          <div>
            <p class="panel__title">Keşfedilen mekanlar</p>
            <p class="panel__subtitle">
              <template v-if="placesFoundSummary">{{ placesFoundSummary }}</template>
              <template v-else-if="placesLoading">Mekanlar getiriliyor…</template>
              <template v-else>Arşive eklenecek adaylar</template>
            </p>
          </div>
          <span v-if="placesLoading && !placesFoundSummary" class="loading-pill">Yükleniyor</span>
          <span v-else-if="placesFoundSummary" class="places-found-pill places-found-pill--head">{{ placesFoundSummary }}</span>
        </div>

        <div v-if="placesError" class="alert alert--error places-error">
          <p>{{ placesError }}</p>
          <button
            v-if="lastNearbySearch"
            type="button"
            class="btn btn--ghost btn--sm"
            :disabled="placesLoading"
            @click="retryNearbySearch"
          >
            Tekrar dene
          </button>
        </div>

        <div class="places-list">
          <div v-if="placesLoading" class="panel__hint">
            Mekanlar getiriliyor…
            <span v-if="places.length"> ({{ places.length }} bulundu)</span>
          </div>

          <div v-if="!placesLoading && places.length === 0 && !placesError" class="panel__hint">
            Bu bölgede kaydedilebilecek mekan bulunamadı.
          </div>

          <div v-else-if="!placesLoading && places.length > 0 && discoveredPlaces.length === 0" class="panel__hint">
            Bu bölgedeki mekanların tümü zaten arşivinizde.
          </div>

          <div v-else-if="!placesLoading && discoveredPlaces.length > 0 && filteredPlaces.length === 0" class="panel__hint">
            Seçilen kategoride yeni mekan yok.
          </div>

          <div v-if="!placesLoading && filteredPlaces.length > 0" class="stack stack--places">
            <PlaceCard
              v-for="place in visiblePlaces"
              :key="place.id"
              :place="placesStore.getSavedPlace(place.id) ?? place"
              :saved="placesStore.isSaved(place.id)"
              :highlighted="selectedPlaceId === place.id"
              show-actions
              @save="handleSavePlace(place)"
              @remove="handleRemovePlace(place.id)"
              @open="openPlace(place.id)"
              @mark-visited="placesStore.markAsVisited(place.id)"
              @select="handleSelectPlace(place)"
            />
            <button
              v-if="placesRemaining > 0"
              type="button"
              class="btn btn--ghost places-show-more"
              @click="showMorePlaces"
            >
              Daha fazla göster (+{{ placesRemaining }})
            </button>
          </div>
        </div>
      </section>

      <p v-if="placesStore.storageError" class="discover-layout__storage-error alert alert--error">
        {{ placesStore.storageError }}
      </p>
    </div>
    </div>
  </div>
</template>

<style scoped>
.panel--archive {
  margin-bottom: 1.25rem;
}

.archive-head-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.archive-remaining {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-subtle);
}

.stack--archive {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 0.25rem 0 0.15rem;
}

.places-show-more {
  align-self: stretch;
  margin-top: 0.25rem;
  width: 100%;
}

.panel--places {
  flex: 1;
}

.draft-entry__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.draft-entry h4 {
  margin: 0 0 0.25rem;
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-muted);
}

.draft-entry__tag {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--text-subtle);
}

.draft-entry__note {
  margin: 0 0 0.5rem;
  font-family: var(--font-display);
  font-size: 0.8125rem;
  font-style: italic;
  color: var(--text-subtle);
}

.draft-entry__meta {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--text-subtle);
}

.selected-place__stamp {
  margin-bottom: 1rem;
}

.places-error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.places-error p {
  margin: 0;
  flex: 1 1 12rem;
}

.discover-map :deep(.map-wrapper__frame),
.discover-map :deep(.map-wrapper__canvas),
.journal-map__frame :deep(.map-wrapper__frame),
.journal-map__frame :deep(.map-wrapper__canvas) {
  height: 320px;
  min-height: 320px;
  max-height: 320px;
}

@media (max-width: 480px) {
  .discover-map :deep(.map-wrapper__frame),
  .discover-map :deep(.map-wrapper__canvas),
  .journal-map__frame :deep(.map-wrapper__frame),
  .journal-map__frame :deep(.map-wrapper__canvas) {
    height: 280px;
    min-height: 280px;
    max-height: 280px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .discover-map :deep(.map-wrapper__frame),
  .discover-map :deep(.map-wrapper__canvas),
  .journal-map__frame :deep(.map-wrapper__frame),
  .journal-map__frame :deep(.map-wrapper__canvas) {
    height: 400px;
    min-height: 400px;
    max-height: 400px;
  }
}

@media (min-width: 1025px) {
  .discover-map :deep(.map-wrapper__frame),
  .discover-map :deep(.map-wrapper__canvas),
  .journal-map__frame :deep(.map-wrapper__frame),
  .journal-map__frame :deep(.map-wrapper__canvas) {
    height: 24rem;
    min-height: 24rem;
    max-height: 24rem;
  }
}
</style>
