import type { OverpassResponse, Place } from '~/types/place'
import {
  LARGE_AREA_SEARCH_RADIUS_M,
  NEARBY_SEARCH_RADIUS_M,
  OVERPASS_AROUND_RESULT_LIMIT,
  OVERPASS_BBOX_RESULT_LIMIT,
  shouldUseGridForBounds,
  mapOverpassResponse,
} from '~/types/place'

const OVERPASS_FETCH_TIMEOUT_MS = 35_000

function buildPoiSelectorsBbox(south: number, west: number, north: number, east: number): string {
  return `
      nwr["tourism"](${south},${west},${north},${east});
      nwr["amenity"~"cafe|restaurant|museum|fast_food"](${south},${west},${north},${east});
      nwr["leisure"~"park|garden"](${south},${west},${north},${east});
      nwr["historic"](${south},${west},${north},${east});
  `
}

function buildPoiSelectorsAround(latitude: number, longitude: number, radiusMeters: number): string {
  return `
      nwr["tourism"](around:${radiusMeters},${latitude},${longitude});
      nwr["amenity"~"cafe|restaurant|museum|fast_food"](around:${radiusMeters},${latitude},${longitude});
      nwr["leisure"~"park|garden"](around:${radiusMeters},${latitude},${longitude});
      nwr["historic"](around:${radiusMeters},${latitude},${longitude});
  `
}

function buildNearbyQueryAround(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  resultLimit = OVERPASS_AROUND_RESULT_LIMIT,
  timeoutSec = 25,
): string {
  return `
    [out:json][timeout:${timeoutSec}];
    (
      ${buildPoiSelectorsAround(latitude, longitude, radiusMeters)}
    );
    out center ${resultLimit};
  `
}

function buildNearbyQueryFromBounds(
  bounds: [[number, number], [number, number]],
  resultLimit = OVERPASS_BBOX_RESULT_LIMIT,
  timeoutSec = 25,
): string {
  const [[south, west], [north, east]] = bounds

  return `
    [out:json][timeout:${timeoutSec}];
    (
      ${buildPoiSelectorsBbox(south, west, north, east)}
    );
    out center ${resultLimit};
  `
}

function logOverpassStats(
  mode: string,
  rawCount: number,
  mappedCount: number,
  extra?: Record<string, number | string>,
) {
  if (!import.meta.dev) return

  console.info(`[Overpass] ${mode}: ham=${rawCount}, haritaya=${mappedCount}`, extra ?? '')
}

function normalizeError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const data = (err as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }

  if (err instanceof Error) {
    if (err.message === 'Failed to fetch') {
      return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.'
    }
    return err.message
  }

  return fallback
}

async function fetchFromOverpass(query: string): Promise<OverpassResponse> {
  return $fetch<OverpassResponse>('/api/overpass', {
    method: 'POST',
    body: { query },
    timeout: OVERPASS_FETCH_TIMEOUT_MS,
    retry: 0,
  })
}

interface NearbyFetchPlan {
  mode: 'around-capped' | 'bbox' | 'around'
  query: string
  logExtra?: Record<string, number | string>
}

function buildNearbyFetchPlans(
  latitude: number,
  longitude: number,
  options: FetchNearbyOptions,
  radiusMeters: number,
): NearbyFetchPlan[] {
  const plans: NearbyFetchPlan[] = []

  if (options.bounds && shouldUseGridForBounds(options.bounds)) {
    const radii = [
      Math.max(radiusMeters, LARGE_AREA_SEARCH_RADIUS_M),
      NEARBY_SEARCH_RADIUS_M,
      3000,
    ]

    for (const radius of [...new Set(radii)]) {
      plans.push({
        mode: 'around-capped',
        query: buildNearbyQueryAround(latitude, longitude, radius, 120, 20),
        logExtra: { yarıçapKm: Math.round(radius / 100) / 10 },
      })
    }
    return plans
  }

  if (options.bounds) {
    plans.push({
      mode: 'bbox',
      query: buildNearbyQueryFromBounds(options.bounds, 120, 20),
    })
    plans.push({
      mode: 'around',
      query: buildNearbyQueryAround(latitude, longitude, radiusMeters, 100, 18),
    })
    return plans
  }

  plans.push({
    mode: 'around',
    query: buildNearbyQueryAround(latitude, longitude, radiusMeters, 150, 22),
  })
  plans.push({
    mode: 'around',
    query: buildNearbyQueryAround(latitude, longitude, Math.min(radiusMeters, 3500), 80, 15),
  })

  return plans
}

export interface FetchNearbyOptions {
  bounds?: [[number, number], [number, number]]
  radiusMeters?: number
}

export interface GridProgress {
  current: number
  total: number
}

export interface FetchPlaceByIdOptions {
  /** Yerel veri zaten gösteriliyorsa API çağrısını arka planda tut */
  silent?: boolean
}

export function usePlaces() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const places = useState<Place[]>('places-cache', () => [])
  const gridProgress = ref<GridProgress | null>(null)

  async function fetchNearbyPlaces(
    latitude: number,
    longitude: number,
    options: FetchNearbyOptions = {},
  ): Promise<Place[]> {
    loading.value = true
    error.value = null
    gridProgress.value = null

    const radiusMeters = options.radiusMeters ?? NEARBY_SEARCH_RADIUS_M
    const plans = buildNearbyFetchPlans(latitude, longitude, options, radiusMeters)
    let lastError: unknown = null

    try {
      for (const plan of plans) {
        try {
          const data = await fetchFromOverpass(plan.query)
          places.value = mapOverpassResponse(data.elements)
          logOverpassStats(plan.mode, data.elements.length, places.value.length, plan.logExtra)

          if (places.value.length > 0) {
            return places.value
          }
        } catch (err) {
          lastError = err
        }
      }

      if (lastError) {
        throw lastError
      }

      return places.value
    } catch (err) {
      error.value = normalizeError(err, 'Mekanlar yüklenirken bir hata oluştu.')
      places.value = []
      return []
    } finally {
      loading.value = false
      gridProgress.value = null
    }
  }

  async function fetchPlaceById(
    placeId: string,
    options: FetchPlaceByIdOptions = {},
  ): Promise<Place | null> {
    const cached = places.value.find(place => place.id === placeId)
    if (cached) return cached

    const [type, osmId] = placeId.split('-')
    if (!type || !osmId) return null

    const silent = options.silent ?? false

    if (!silent) {
      loading.value = true
      error.value = null
    }

    const query = `
      [out:json][timeout:10];
      ${type}(${osmId});
      out center;
    `

    try {
      const data = await fetchFromOverpass(query)
      const mapped = mapOverpassResponse(data.elements)
      const place = mapped[0] ?? null

      if (place && !places.value.some(item => item.id === place.id)) {
        places.value.push(place)
      }

      return place
    } catch (err) {
      if (!silent) {
        error.value = normalizeError(err, 'Mekan detayı yüklenirken bir hata oluştu.')
      }
      return null
    } finally {
      if (!silent) {
        loading.value = false
      }
    }
  }

  function filterByCategory(category: string): Place[] {
    if (category === 'all') return places.value
    return places.value.filter(place => place.category === category)
  }

  function clearPlaces() {
    places.value = []
    error.value = null
    gridProgress.value = null
  }

  return {
    loading,
    error,
    places,
    gridProgress,
    fetchNearbyPlaces,
    fetchPlaceById,
    filterByCategory,
    clearPlaces,
  }
}
