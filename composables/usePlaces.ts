import type { OverpassElement, Place } from '~/types/place'
import { mapOverpassResponse } from '~/types/place'

const NEARBY_FETCH_TIMEOUT_MS = 50_000

function normalizeError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const data = (err as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg === 'failed to fetch') {
      return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.'
    }
    if (msg.includes('timeout') || msg.includes('aborted')) {
      return 'Mekan servisi yanıt vermedi. Birkaç saniye bekleyip tekrar deneyin.'
    }
    return err.message
  }

  return fallback
}

export interface FetchNearbyOptions {
  bounds?: [[number, number], [number, number]]
}

export interface GridProgress {
  current: number
  total: number
}

export interface FetchPlaceByIdOptions {
  silent?: boolean
}

async function fetchFromOverpass(query: string): Promise<{ elements: unknown[] }> {
  return $fetch('/api/overpass', {
    method: 'POST',
    body: { query },
    timeout: 22_000,
    retry: 0,
  })
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
    places.value = []

    try {
      const data = await $fetch<{ places: Place[] }>('/api/places/nearby', {
        method: 'POST',
        body: {
          latitude,
          longitude,
          ...(options.bounds ? { bounds: options.bounds } : {}),
        },
        timeout: NEARBY_FETCH_TIMEOUT_MS,
        retry: 0,
      })

      places.value = data.places

      if (import.meta.dev) {
        console.info(`[Places] yakın: ${places.value.length} mekan`)
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
      const mapped = mapOverpassResponse(data.elements as OverpassElement[])
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
