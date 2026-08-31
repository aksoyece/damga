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
  gridProgress,
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
  placesStore.addPlace(place)
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
  <div class="page">
    <header class="page-hero">
      <div class="page-hero__content">
        <span class="page-hero__badge">Kişisel gezi defteri</span>
        <h1>Gittiğin yerleri hatırla, not al, damgala</h1>
        <p>
          OpenStreetMap ve Nominatim yalnızca mekan verisi sağlar — bu bir harita
          uygulaması değil, kişisel gezi arşivinizdir. Aylar sonra
          <em>“Bursa'da ne görmek istiyordum?”</em> veya
          <em>“Geçen ay beğendiğim yerler hangileriydi?”</em> sorularının cevabı
          puanlarınız, notlarınız ve ziyaret damgalarınızda.
        </p>

        <div v-if="savedPlaces.length > 0" class="archive-stats">
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

      <MemoryCardPreview sample />
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

    <div class="grid-two">
      <aside class="sidebar">
        <section class="panel panel--search">
          <div class="panel__head">
            <div>
              <p class="panel__title">Yeni mekan ekle</p>
              <p class="panel__subtitle">Konum arama</p>
            </div>
          </div>

          <p class="panel__hint">
            Şehir veya adres arayın, keşfettiğiniz mekanları arşivinize ekleyin.
            Harita yalnızca konum bulmak içindir; asıl değer sizin listeniz ve notlarınız.
          </p>

          <SearchInput
            :loading="searchLoading"
            :error="searchError"
            :results="results"
            :selection-made="hasSearched"
            @search="handleSearch"
            @select="handleSelectResult"
            @clear="handleClearSearch"
          />

          <div v-if="!hasSearched" class="draft-card">
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

          <template v-if="hasSearched">
            <div class="location-chip">
              <span><strong>Bölge:</strong> {{ searchedLocation }}</span>
            </div>
            <CategoryFilter
              v-model="selectedCategory"
              :categories="categoryOptions"
            />
          </template>
        </section>

        <section v-if="hasSearched" class="panel panel--places">
          <div class="panel__head">
            <div>
              <p class="panel__title">Keşfedilen mekanlar</p>
              <p class="panel__subtitle">Arşive eklenecek adaylar</p>
            </div>
            <span v-if="placesLoading" class="loading-pill">Yükleniyor</span>
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

          <div v-if="placesLoading" class="panel__hint">
            <template v-if="gridProgress">
              {{ gridProgress.current }}/{{ gridProgress.total }} bölge taranıyor…
              <span v-if="places.length"> ({{ places.length }} mekan bulundu)</span>
            </template>
            <template v-else>
              Mekanlar getiriliyor…
            </template>
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
        </section>

        <p v-if="placesStore.storageError" class="alert alert--error">
          {{ placesStore.storageError }}
        </p>
      </aside>

      <section class="map-section">
        <div class="map-expandable">
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

@media (min-width: 960px) {
  .grid-two:has(.map-expandable:hover),
  .grid-two:has(.map-expandable:focus-within) {
    grid-template-columns: minmax(0, 1fr) min(580px, 50%);
  }
}

.map-expandable {
  position: relative;
  z-index: 1;
  transition: z-index 0s;
}

.map-expandable:hover,
.map-expandable:focus-within {
  z-index: 30;
}

.map-expandable:hover :deep(.map-wrapper),
.map-expandable:focus-within :deep(.map-wrapper) {
  box-shadow: var(--shadow);
  border-color: var(--primary);
}

.map-expandable:hover :deep(.map-wrapper__frame),
.map-expandable:focus-within :deep(.map-wrapper__frame),
.map-expandable:hover :deep(.map-wrapper__canvas),
.map-expandable:focus-within :deep(.map-wrapper__canvas) {
  min-height: 34rem;
}

.map-expandable:hover :deep(.map-wrapper__hint),
.map-expandable:focus-within :deep(.map-wrapper__hint) {
  opacity: 0;
}

@media (max-width: 959px) {
  .map-expandable :deep(.map-wrapper__frame),
  .map-expandable :deep(.map-wrapper__canvas) {
    min-height: 22rem;
  }
}
</style>
