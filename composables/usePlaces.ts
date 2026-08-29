import type { OverpassElement, OverpassResponse, Place } from '~/types/place'
import {
  GRID_CELL_RETRY_COUNT,
  GRID_QUERY_BATCH_DELAY_MS,
  NEARBY_SEARCH_RADIUS_M,
  OVERPASS_AROUND_RESULT_LIMIT,
  OVERPASS_BBOX_RESULT_LIMIT,
  OVERPASS_CELL_RESULT_LIMIT,
  shouldUseGridForBounds,
  splitBoundsIntoGrid,
  mapOverpassResponse,
} from '~/types/place'

const OVERPASS_FETCH_TIMEOUT_MS = 35_000

function buildPoiSelectorsBbox(south: number, west: number, north: number, east: number): string {
  return `
      node["tourism"](${south},${west},${north},${east});
      way["tourism"](${south},${west},${north},${east});
      node["amenity"~"cafe|restaurant|museum|fast_food"](${south},${west},${north},${east});
      way["amenity"~"cafe|restaurant|museum|fast_food"](${south},${west},${north},${east});
      node["leisure"~"park|garden"](${south},${west},${north},${east});
      way["leisure"~"park|garden"](${south},${west},${north},${east});
      node["historic"](${south},${west},${north},${east});
      way["historic"](${south},${west},${north},${east});
  `
}

function buildPoiSelectorsAround(latitude: number, longitude: number, radiusMeters: number): string {
  return `
      node["tourism"](around:${radiusMeters},${latitude},${longitude});
      way["tourism"](around:${radiusMeters},${latitude},${longitude});
      node["amenity"~"cafe|restaurant|museum|fast_food"](around:${radiusMeters},${latitude},${longitude});
      way["amenity"~"cafe|restaurant|museum|fast_food"](around:${radiusMeters},${latitude},${longitude});
      node["leisure"~"park|garden"](around:${radiusMeters},${latitude},${longitude});
      way["leisure"~"park|garden"](around:${radiusMeters},${latitude},${longitude});
      node["historic"](around:${radiusMeters},${latitude},${longitude});
      way["historic"](around:${radiusMeters},${latitude},${longitude});
  `
}

/** Izgara hücreleri için hafif sorgu — yalnızca node, daha hızlı */
function buildGridCellQuery(
  bounds: [[number, number], [number, number]],
  resultLimit = OVERPASS_CELL_RESULT_LIMIT,
): string {
  const [[south, west], [north, east]] = bounds

  return `
    [out:json][timeout:20];
    (
      node["tourism"](${south},${west},${north},${east});
      node["amenity"~"cafe|restaurant|museum|fast_food"](${south},${west},${north},${east});
      node["leisure"~"park|garden"](${south},${west},${north},${east});
      node["historic"](${south},${west},${north},${east});
    );
    out body ${resultLimit};
  `
}

function buildNearbyQueryAround(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  resultLimit = OVERPASS_AROUND_RESULT_LIMIT,
): string {
  return `
    [out:json][timeout:30];
    (
      ${buildPoiSelectorsAround(latitude, longitude, radiusMeters)}
    );
    out center ${resultLimit};
  `
}

function buildNearbyQueryFromBounds(
  bounds: [[number, number], [number, number]],
  resultLimit = OVERPASS_BBOX_RESULT_LIMIT,
  timeoutSec = 45,
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

function mergeElements(
  target: Map<string, OverpassElement>,
  elements: OverpassElement[],
): void {
  for (const element of elements) {
    target.set(`${element.type}-${element.id}`, element)
  }
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
  })
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchCellElements(
  cell: [[number, number], [number, number]],
): Promise<OverpassElement[] | null> {
  const query = buildGridCellQuery(cell)

  for (let attempt = 0; attempt <= GRID_CELL_RETRY_COUNT; attempt++) {
    try {
      const data = await fetchFromOverpass(query)
      return data.elements
    } catch {
      if (attempt < GRID_CELL_RETRY_COUNT) {
        await delay(1500 * (attempt + 1))
      }
    }
  }

  return null
}

interface GridFetchResult {
  places: Place[]
  failedCells: number
  totalCells: number
}

async function fetchFromGrid(
  bounds: [[number, number], [number, number]],
  onProgress: (places: Place[], current: number, total: number) => void,
): Promise<GridFetchResult> {
  const { cells, cellSizeKm } = splitBoundsIntoGrid(bounds)
  const elementMap = new Map<string, OverpassElement>()
  let rawTotal = 0
  let failedCells = 0

  for (let i = 0; i < cells.length; i++) {
    const elements = await fetchCellElements(cells[i]!)

    if (elements === null) {
      failedCells++
    } else {
      rawTotal += elements.length
      mergeElements(elementMap, elements)
    }

    const places = mapOverpassResponse([...elementMap.values()])
    onProgress(places, i + 1, cells.length)

    if (import.meta.dev) {
      console.info(
        `[Overpass] grid: ${i + 1}/${cells.length} hücre (${cellSizeKm}km), mekan=${places.length}, hata=${failedCells}`,
      )
    }

    if (i + 1 < cells.length) {
      await delay(GRID_QUERY_BATCH_DELAY_MS)
    }
  }

  const places = mapOverpassResponse([...elementMap.values()])
  logOverpassStats('grid', rawTotal, places.length, {
    hücre: cells.length,
    hücreKm: cellSizeKm,
    hata: failedCells,
    benzersiz: elementMap.size,
  })

  return { places, failedCells, totalCells: cells.length }
}

export interface FetchNearbyOptions {
  bounds?: [[number, number], [number, number]]
  radiusMeters?: number
}

export interface GridProgress {
  current: number
  total: number
}

export function usePlaces() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const places = ref<Place[]>([])
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

    try {
      if (options.bounds && shouldUseGridForBounds(options.bounds)) {
        const gridResult = await fetchFromGrid(options.bounds, (partial, current, total) => {
          places.value = partial
          gridProgress.value = { current, total }
        })

        places.value = gridResult.places

        if (places.value.length === 0) {
          error.value = gridResult.failedCells > 0
            ? 'Overpass geçici olarak yanıt veremedi. Lütfen biraz sonra tekrar deneyin.'
            : 'Bu bölgede kaydedilebilecek mekan bulunamadı.'
          return []
        }

        return places.value
      }

      const query = options.bounds
        ? buildNearbyQueryFromBounds(options.bounds)
        : buildNearbyQueryAround(latitude, longitude, radiusMeters)

      const mode = options.bounds ? 'bbox' : 'around'
      const data = await fetchFromOverpass(query)
      places.value = mapOverpassResponse(data.elements)
      logOverpassStats(mode, data.elements.length, places.value.length)
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

  async function fetchPlaceById(placeId: string): Promise<Place | null> {
    const cached = places.value.find(place => place.id === placeId)
    if (cached) return cached

    const [type, osmId] = placeId.split('-')
    if (!type || !osmId) return null

    loading.value = true
    error.value = null

    const query = `
      [out:json][timeout:20];
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
      error.value = normalizeError(err, 'Mekan detayı yüklenirken bir hata oluştu.')
      return null
    } finally {
      loading.value = false
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
