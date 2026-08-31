<script setup lang="ts">
import type { Place, SavedPlace } from '~/types/place'
import { getCategoryLabel } from '~/types/place'
import type { LatLngExpression } from 'leaflet'

const props = withDefaults(defineProps<{
  center: LatLngExpression
  zoom?: number
  fitBounds?: [[number, number], [number, number]] | null
  places?: Place[]
  placesTotal?: number
  savedLookup?: Record<string, SavedPlace>
  selectedPlaceId?: string | null
  error?: string | null
  compact?: boolean
  /** Detay sayfası: başlıksız, küçük gömülü harita */
  minimal?: boolean
}>(), {
  compact: false,
  minimal: false,
})

const emit = defineEmits<{
  selectPlace: [place: Place]
}>()

const mapContainer = ref<HTMLElement | null>(null)
const mapError = ref<string | null>(null)
const isReady = ref(false)

let map: import('leaflet').Map | null = null
let markersLayer: import('leaflet').LayerGroup | null = null
let canvasRenderer: import('leaflet').Canvas | null = null
let L: typeof import('leaflet') | null = null
let renderFrame: number | null = null
let renderTimer: ReturnType<typeof setTimeout> | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let resizeObserver: ResizeObserver | null = null
let lastPlacesSignature = ''

const leafletPromise = import.meta.client ? import('leaflet') : null

const PIN_COLORS: Record<string, string> = {
  museum: '#1A1A2E',
  cafe: '#FF5A1F',
  restaurant: '#E04E1A',
  park: '#2DD4BF',
  monument: '#5C5C6E',
  attraction: '#FF5A1F',
  other: '#8B8B9A',
}

function pinColor(place: Place): string {
  const saved = props.savedLookup?.[place.id]
  if (saved?.status === 'visited') return '#1A1A2E'
  if (saved) return '#FF5A1F'
  return PIN_COLORS[place.category] ?? PIN_COLORS.other
}

function formatStampDate(iso?: string): string {
  if (!iso) return '✓'
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}

function buildPopupContent(place: Place): string {
  const category = getCategoryLabel(place.category)
  const address = place.address ?? 'Adres bilgisi yok'
  const saved = props.savedLookup?.[place.id]
  const stamp = saved?.status === 'visited'
    ? `<div class="map-popup__stamp">Ziyaret · ${formatStampDate(saved.visitedAt)}</div>`
    : ''

  return `
    <div class="map-popup">
      <strong>${place.name}</strong>
      <div><em>${category}</em></div>
      <div>${address}</div>
      ${stamp}
    </div>
  `
}

function placesSignature(places: Place[]): string {
  // Avoid full redraw when progressive grid only appends identical set
  if (places.length === 0) return '0'
  const head = places[0]
  const tail = places[places.length - 1]
  return `${places.length}:${head?.id}:${tail?.id}:${props.selectedPlaceId ?? ''}`
}

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

function createBasemapLayer(leaflet: typeof import('leaflet')) {
  return leaflet.tileLayer(OSM_TILE_URL, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    keepBuffer: 1,
    updateWhenIdle: true,
    updateWhenZooming: false,
  })
}

async function initMap() {
  if (!mapContainer.value || map || !leafletPromise) return

  try {
    L = await leafletPromise

    map = L.map(mapContainer.value, {
      preferCanvas: true,
      zoomControl: true,
      scrollWheelZoom: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      zoomAnimation: false,
      inertia: false,
    }).setView(props.center, props.zoom ?? 6)

    createBasemapLayer(L).addTo(map)

    canvasRenderer = L.canvas({ padding: 0.5 })
    markersLayer = L.layerGroup().addTo(map)

    isReady.value = true
    mapError.value = null

    map.whenReady(() => {
      map?.invalidateSize({ animate: false })
      if (props.fitBounds) {
        map?.fitBounds(props.fitBounds, { animate: false, padding: [24, 24] })
      }
      scheduleMarkerRender(true)
      observeResize()
    })
  } catch {
    mapError.value = 'Konum referansı yüklenemedi.'
  }
}

function scheduleMarkerRender(immediate = false) {
  if (renderTimer) {
    clearTimeout(renderTimer)
    renderTimer = null
  }
  if (renderFrame) {
    cancelAnimationFrame(renderFrame)
    renderFrame = null
  }

  if (immediate) {
    renderFrame = requestAnimationFrame(() => renderMarkers())
    return
  }

  // Progressive grid updates: debounce redraw
  renderTimer = setTimeout(() => {
    renderFrame = requestAnimationFrame(() => renderMarkers())
  }, 180)
}

function renderMarkers() {
  if (!map || !markersLayer || !L) return

  const places = props.places ?? []
  const signature = placesSignature(places)
  if (signature === lastPlacesSignature && markersLayer.getLayers().length > 0) {
    return
  }
  lastPlacesSignature = signature

  markersLayer.clearLayers()
  if (places.length === 0) return

  for (const place of places) {
    const isSelected = props.selectedPlaceId === place.id
    const visited = props.savedLookup?.[place.id]?.status === 'visited'
    const color = pinColor(place)

    const marker = L.circleMarker([place.latitude, place.longitude], {
      renderer: canvasRenderer ?? undefined,
      radius: isSelected ? 8 : visited ? 7 : 5,
      weight: isSelected ? 2 : 1,
      color: isSelected ? '#3D2B1F' : '#F7F3EA',
      fillColor: color,
      fillOpacity: 0.9,
      opacity: 1,
    })

    marker.on('click', () => {
      marker.bindPopup(buildPopupContent(place), { maxWidth: 220 }).openPopup()
      emit('selectPlace', place)
    })

    marker.addTo(markersLayer)
  }
}

function observeResize() {
  if (!mapContainer.value || resizeObserver) return

  resizeObserver = new ResizeObserver(() => {
    // Hover büyütme animasyonu sırasında sürekli invalidateSize çağırma
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      map?.invalidateSize({ animate: false, pan: false })
    }, 280)
  })
  resizeObserver.observe(mapContainer.value)
}

watch(
  () => props.center,
  (center) => {
    if (map && !props.fitBounds) {
      map.setView(center, props.zoom ?? map.getZoom(), { animate: false })
    }
  },
  { deep: true },
)

watch(
  () => props.fitBounds,
  (bounds) => {
    if (!map || !bounds) return
    map.fitBounds(bounds, { animate: false, padding: [24, 24] })
  },
  { deep: true },
)

watch(
  () => props.zoom,
  (zoom) => {
    if (map && zoom != null) {
      map.setZoom(zoom, { animate: false })
    }
  },
)

watch(
  () => props.places,
  () => {
    if (isReady.value) scheduleMarkerRender()
  },
)

watch(
  () => props.selectedPlaceId,
  (id) => {
    if (!map || !id) return
    lastPlacesSignature = ''
    scheduleMarkerRender(true)
    const place = props.places?.find(item => item.id === id)
    if (place) {
      map.setView([place.latitude, place.longitude], Math.max(map.getZoom(), 15), { animate: false })
    }
  },
)

onMounted(async () => {
  await nextTick()
  initMap()
})

onUnmounted(() => {
  if (renderFrame) cancelAnimationFrame(renderFrame)
  if (renderTimer) clearTimeout(renderTimer)
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeObserver?.disconnect()
  resizeObserver = null
  map?.remove()
  map = null
  markersLayer = null
  canvasRenderer = null
})
</script>

<template>
  <div
    class="map-wrapper"
    :class="{
      'map-wrapper--compact': compact,
      'map-wrapper--minimal': minimal,
    }"
  >
    <div v-if="!minimal" class="map-wrapper__header">
      <div>
        <span class="map-wrapper__title">Konum referansı</span>
        <p class="map-wrapper__subtitle">
          Konum referansı — mekan bulmak için
        </p>
      </div>
      <span v-if="places?.length" class="map-wrapper__count">
        <template v-if="placesTotal && placesTotal > places.length">
          {{ places.length }} / {{ placesTotal }} nokta
        </template>
        <template v-else>
          {{ places.length }} nokta
        </template>
      </span>
    </div>

    <div class="map-wrapper__frame">
      <div v-if="!isReady && !mapError && !error" class="map-wrapper__loading">
        <p>Yükleniyor…</p>
      </div>

      <p v-if="error || mapError" class="map-wrapper__error">
        {{ error || mapError }}
      </p>

      <div
        v-if="isReady && !places?.length && !error && !mapError && !minimal"
        class="map-wrapper__empty"
      >
        <p>Henüz pin yok</p>
        <span>Yukarıdan şehir arayın veya mekan kaydedin</span>
      </div>

      <div ref="mapContainer" class="map-wrapper__canvas" />
    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: box-shadow 0.22s ease, border-color 0.22s ease;
}

.map-wrapper__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-hover);
}

.map-wrapper__title {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-subtle);
}

.map-wrapper__subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.6875rem;
  color: var(--text-muted);
}

.map-wrapper__count {
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--bg-card);
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.map-wrapper__frame {
  position: relative;
  min-height: 18rem;
  background: #EDE8DF;
  transition: min-height 0.28s ease;
}

.map-wrapper--compact .map-wrapper__frame,
.map-wrapper--compact .map-wrapper__canvas {
  min-height: 18rem;
}

.map-wrapper--minimal {
  border-radius: var(--radius);
  box-shadow: none;
}

.map-wrapper--minimal .map-wrapper__frame,
.map-wrapper--minimal .map-wrapper__canvas {
  min-height: 12rem;
}

.map-wrapper__canvas {
  width: 100%;
  min-height: 18rem;
  transition: min-height 0.28s ease;
}

.map-wrapper__loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-content: center;
  background: #EDE8DF;
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.map-wrapper__error {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  right: 0.75rem;
  z-index: 3;
  margin: 0;
  padding: 0.625rem 0.875rem;
  border: 1px solid rgba(139, 30, 43, 0.25);
  border-radius: var(--radius);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 0.8125rem;
}

.map-wrapper__empty {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-content: center;
  gap: 0.25rem;
  padding: 1rem;
  text-align: center;
  pointer-events: none;
  background: rgba(237, 232, 223, 0.55);
}

.map-wrapper__empty p {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text);
}

.map-wrapper__empty span {
  font-size: 0.75rem;
  color: var(--text-muted);
}
</style>

<style>
.map-popup__stamp {
  margin-top: 0.375rem;
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--danger);
}
</style>
