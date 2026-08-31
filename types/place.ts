export interface Place {
  id: string
  name: string
  category: string
  latitude: number
  longitude: number
  address?: string
}

export interface SavedPlace extends Place {
  status: 'planned' | 'visited'
  rating?: number
  note?: string
  savedAt: string
  visitedAt?: string
}

export type VisitStatus = SavedPlace['status']

export interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type?: string
  class?: string
  importance?: number
  addresstype?: string
  boundingbox?: [string, string, string, string]
}

/** Seçilen noktanın etrafında mekan aranırken kullanılan sabit yarıçap (metre) */
export const NEARBY_SEARCH_RADIUS_M = 5000

/** Geniş il/bölge aramalarında grid yerine merkez + bu yarıçap (metre) */
export const LARGE_AREA_SEARCH_RADIUS_M = 12_000

/** Overpass sonuç limitleri */
export const OVERPASS_AROUND_RESULT_LIMIT = 200
export const OVERPASS_BBOX_RESULT_LIMIT = 200
export const OVERPASS_CELL_RESULT_LIMIT = 200

/** Büyük bbox'ları bölerek sorgulama */
export const GRID_CELL_SIZE_KM = 15
export const GRID_MAX_CELLS = 9
export const GRID_QUERY_BATCH_SIZE = 1
export const GRID_QUERY_BATCH_DELAY_MS = 700
export const GRID_CELL_RETRY_COUNT = 1

/** Haritada aynı anda gösterilecek maksimum pin (canvas circleMarker) */
export const MAX_MAP_PINS = 300

const KM_PER_DEG_LAT = 111.32

/** Bbox genişliğini km cinsinden hesaplar */
export function boundsSpanKm(bounds: [[number, number], [number, number]]): { latKm: number, lonKm: number } {
  const [[south, west], [north, east]] = bounds
  const midLat = (south + north) / 2
  return {
    latKm: (north - south) * KM_PER_DEG_LAT,
    lonKm: (east - west) * KM_PER_DEG_LAT * Math.cos(midLat * (Math.PI / 180)),
  }
}

/** Tek hücreden büyük alanlar ızgara sorgusuna gider */
export function shouldUseGridForBounds(bounds: [[number, number], [number, number]]): boolean {
  const { latKm, lonKm } = boundsSpanKm(bounds)
  return latKm > GRID_CELL_SIZE_KM || lonKm > GRID_CELL_SIZE_KM
}

function splitBoundsWithCellSize(
  bounds: [[number, number], [number, number]],
  cellSizeKm: number,
): [[number, number], [number, number]][] {
  const [[south, west], [north, east]] = bounds
  const midLat = (south + north) / 2
  const latStep = cellSizeKm / KM_PER_DEG_LAT
  const lonStep = cellSizeKm / (KM_PER_DEG_LAT * Math.cos(midLat * (Math.PI / 180)))

  const cells: [[number, number], [number, number]][] = []
  for (let lat = south; lat < north - 1e-9; lat += latStep) {
    for (let lon = west; lon < east - 1e-9; lon += lonStep) {
      cells.push([
        [lat, lon],
        [Math.min(lat + latStep, north), Math.min(lon + lonStep, east)],
      ])
    }
  }
  return cells
}

/** Bbox'ı hücrelere böler; çok fazla hücre oluşursa hücre boyutunu büyütür (max 12) */
export function splitBoundsIntoGrid(
  bounds: [[number, number], [number, number]],
): { cells: [[number, number], [number, number]][], cellSizeKm: number } {
  let cellSizeKm = GRID_CELL_SIZE_KM
  let cells = splitBoundsWithCellSize(bounds, cellSizeKm)

  while (cells.length > GRID_MAX_CELLS && cellSizeKm < 80) {
    cellSizeKm = Math.ceil(cellSizeKm * 1.45)
    cells = splitBoundsWithCellSize(bounds, cellSizeKm)
  }

  return { cells, cellSizeKm }
}

/** Harita görünümü için seçilen nokta + yarıçaptan sınırlayıcı kutu hesaplar */
export function boundsFromRadius(
  latitude: number,
  longitude: number,
  radiusMeters = NEARBY_SEARCH_RADIUS_M,
): [[number, number], [number, number]] {
  const latDelta = radiusMeters / 111_320
  const lonDelta = radiusMeters / (111_320 * Math.cos(latitude * (Math.PI / 180)))

  return [
    [latitude - latDelta, longitude - lonDelta],
    [latitude + latDelta, longitude + lonDelta],
  ]
}

export interface PlacesSearchArea {
  mapBounds: [[number, number], [number, number]]
  bounds?: [[number, number], [number, number]]
  radiusMeters: number
}

/**
 * Overpass araması için alan çözümü.
 * Çok geniş bbox (il düzeyi) → grid yerine merkez + LARGE_AREA_SEARCH_RADIUS_M.
 */
export function resolvePlacesSearchArea(
  latitude: number,
  longitude: number,
  bounds?: [[number, number], [number, number]],
): PlacesSearchArea {
  if (bounds && shouldUseGridForBounds(bounds)) {
    return {
      mapBounds: boundsFromRadius(latitude, longitude, LARGE_AREA_SEARCH_RADIUS_M),
      radiusMeters: LARGE_AREA_SEARCH_RADIUS_M,
    }
  }

  if (bounds) {
    return {
      mapBounds: bounds,
      bounds,
      radiusMeters: NEARBY_SEARCH_RADIUS_M,
    }
  }

  return {
    mapBounds: boundsFromRadius(latitude, longitude, NEARBY_SEARCH_RADIUS_M),
    radiusMeters: NEARBY_SEARCH_RADIUS_M,
  }
}

export interface OverpassElement {
  id: number
  type: 'node' | 'way' | 'relation'
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export interface OverpassResponse {
  elements: OverpassElement[]
}

export interface LocalStorageData {
  savedPlaces: SavedPlace[]
}

export interface SearchResult {
  id: string
  displayName: string
  latitude: number
  longitude: number
  /** Leaflet fitBounds formatı: [[güney, batı], [kuzey, doğu]] */
  bounds?: [[number, number], [number, number]]
}

export interface CategoryOption {
  value: string
  label: string
}

const CATEGORY_MAP: Record<string, string> = {
  museum: 'museum',
  gallery: 'museum',
  cafe: 'cafe',
  coffee_shop: 'cafe',
  restaurant: 'restaurant',
  fast_food: 'restaurant',
  park: 'park',
  garden: 'park',
  monument: 'monument',
  memorial: 'monument',
  artwork: 'monument',
  attraction: 'attraction',
  viewpoint: 'attraction',
  theatre: 'attraction',
  cinema: 'attraction',
  hotel: 'attraction',
}

/** OSM etiketlerinden türetilen kategori anahtarları için görüntüleme etiketleri */
export const CATEGORY_LABELS: Record<string, string> = {
  museum: 'Müze',
  cafe: 'Kafe',
  restaurant: 'Restoran',
  park: 'Park',
  monument: 'Anıt',
  attraction: 'Turistik',
  other: 'Diğer',
}

function resolveCategoryFromTags(tags: Record<string, string>): string {
  if (tags.tourism) return CATEGORY_MAP[tags.tourism] ?? 'attraction'
  if (tags.amenity) return CATEGORY_MAP[tags.amenity] ?? 'other'
  if (tags.leisure) return CATEGORY_MAP[tags.leisure] ?? 'park'
  if (tags.historic) return CATEGORY_MAP[tags.historic] ?? 'monument'
  return 'other'
}

function buildAddressFromTags(tags: Record<string, string>): string | undefined {
  const parts = [
    tags['addr:street'],
    tags['addr:housenumber'],
    tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:district'],
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' ') : undefined
}

/** Nominatim boundingbox → Leaflet sınırları ([[güney, batı], [kuzey, doğu]]) */
export function parseNominatimBounds(
  boundingbox?: [string, string, string, string],
): [[number, number], [number, number]] | undefined {
  if (!boundingbox || boundingbox.length !== 4) return undefined

  const [minLat, maxLat, minLon, maxLon] = boundingbox.map(Number)
  if ([minLat, maxLat, minLon, maxLon].some(Number.isNaN)) return undefined

  return [[minLat, minLon], [maxLat, maxLon]]
}

/** Nominatim ham sonucunu arama listesi modeline dönüştürür */
export function mapNominatimToSearchResult(result: NominatimResult): SearchResult {
  return {
    id: String(result.place_id),
    displayName: result.display_name,
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    bounds: parseNominatimBounds(result.boundingbox),
  }
}

/** Overpass OSM elemanını Place modeline dönüştürür; geçersiz kayıtlar için null döner */
export function mapOverpassElementToPlace(element: OverpassElement): Place | null {
  const tags = element.tags
  if (!tags) return null

  const name = tags.name ?? tags['name:tr'] ?? tags.brand
  if (!name) return null

  const latitude = element.lat ?? element.center?.lat
  const longitude = element.lon ?? element.center?.lon
  if (latitude == null || longitude == null) return null

  return {
    id: `${element.type}-${element.id}`,
    name,
    category: resolveCategoryFromTags(tags),
    latitude,
    longitude,
    address: buildAddressFromTags(tags),
  }
}

/** Overpass yanıtındaki eleman listesini Place[] modeline dönüştürür (OSM id ile tekilleştirir) */
export function mapOverpassResponse(elements: OverpassElement[]): Place[] {
  const seen = new Set<string>()
  const places: Place[] = []

  for (const element of elements) {
    const key = `${element.type}-${element.id}`
    if (seen.has(key)) continue

    const place = mapOverpassElementToPlace(element)
    if (!place) continue

    seen.add(key)
    places.push(place)
  }

  return places
}

/** Place modelini kayıt için SavedPlace'a dönüştürür */
export function mapPlaceToSavedPlace(place: Place, savedAt = new Date().toISOString().slice(0, 10)): SavedPlace {
  return {
    ...place,
    status: 'planned',
    savedAt,
  }
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

export function buildCategoryOptions(categories: string[]): CategoryOption[] {
  const unique = [...new Set(categories)].sort()
  return [
    { value: 'all', label: 'Tümü' },
    ...unique.map(value => ({
      value,
      label: getCategoryLabel(value),
    })),
  ]
}
