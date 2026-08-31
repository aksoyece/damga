export interface Place {
  id: string
  name: string
  category: string
  latitude: number
  longitude: number
  address?: string
  /** Şehir / ilçe — kayıt ve arşiv filtresi için */
  city?: string
}

export interface SavedPlace extends Place {
  status: 'planned' | 'visited'
  rating?: number
  note?: string
  savedAt: string
  visitedAt?: string
  city?: string
}

export type VisitStatus = SavedPlace['status']

export type VisitDatePreset = 'all' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom'

export interface NominatimAddress {
  city?: string
  town?: string
  village?: string
  municipality?: string
  county?: string
  state?: string
  province?: string
  region?: string
  city_district?: string
  suburb?: string
  [key: string]: string | undefined
}

export interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  name?: string
  osm_type?: string
  osm_id?: number
  type?: string
  class?: string
  importance?: number
  addresstype?: string
  boundingbox?: [string, string, string, string]
  address?: NominatimAddress
}

/** Overpass bbox clamp: bu eşiği aşan alanlar merkeze göre küçültülür */
export const OVERPASS_BBOX_CLAMP_THRESHOLD_KM = 40

/** Clamp sonrası hedef maksimum kenar uzunluğu (km) */
export const OVERPASS_BBOX_CLAMP_MAX_SPAN_KM = 20

/** Bbox yoksa kullanılan yedek yarıçap (metre) */
export const NEARBY_FALLBACK_RADIUS_M = 8_000

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
  radiusMeters = NEARBY_FALLBACK_RADIUS_M,
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
  /** Overpass sorgusuna gidecek (clamp uygulanmış) bbox */
  bounds: [[number, number], [number, number]]
}

/**
 * Nominatim boundingbox → Overpass tarama alanı.
 * Bbox yoksa merkez etrafında yedek yarıçap kullanılır.
 */
export function resolvePlacesSearchArea(
  latitude: number,
  longitude: number,
  bounds?: [[number, number], [number, number]],
): PlacesSearchArea {
  const searchBounds = bounds
    ? clampBoundsForOverpass(bounds, latitude, longitude)
    : boundsFromRadius(latitude, longitude, NEARBY_FALLBACK_RADIUS_M)

  return {
    mapBounds: searchBounds,
    bounds: searchBounds,
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
  /** Arama yapılan bölgenin şehir/il adı */
  city?: string
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
  if (tags.natural) return CATEGORY_MAP[tags.natural] ?? 'attraction'
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

/** Nominatim addressdetails nesnesinden şehir / il adı */
export function extractCityFromNominatimAddress(address?: NominatimAddress): string | undefined {
  if (!address) return undefined

  const candidates = [
    address.city,
    address.town,
    address.municipality,
    address.village,
    address.county,
    address.state,
    address.province,
    address.region,
  ]

  for (const value of candidates) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }

  return undefined
}

/** Overpass OSM etiketlerinden şehir */
export function extractCityFromOsmTags(tags: Record<string, string>): string | undefined {
  const candidates = [
    tags['addr:city'],
    tags['addr:town'],
    tags['addr:municipality'],
    tags['addr:province'],
    tags['addr:state'],
    tags['is_in:city'],
    tags['is_in:province'],
  ]

  for (const value of candidates) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }

  return undefined
}

/**
 * Eski kayıtlarda city yoksa display_name / address string'inden yedek çıkarım.
 * Yeni kayıtlarda tercih edilmez; Nominatim/OSM alanları önceliklidir.
 */
export function extractCityFromAddressFallback(address?: string): string | undefined {
  if (!address?.trim()) return undefined

  const parts = address.split(',').map(part => part.trim()).filter(Boolean)
  if (parts.length < 2) return undefined

  // Nominatim TR: "yer, mahalle, ilçe, il, ülke" — il genelde sondan 2. parça
  if (parts.length >= 3) {
    const candidate = parts[parts.length - 2]
    if (candidate && !/^\d/.test(candidate) && candidate.length > 1) {
      return candidate
    }
  }

  return parts[1]
}

export function resolvePlaceCity(place: Pick<Place, 'city' | 'address'>): string | undefined {
  return place.city?.trim() || extractCityFromAddressFallback(place.address)
}

/** Nominatim boundingbox → Leaflet [[güney, batı], [kuzey, doğu]] */
export function parseNominatimBounds(
  boundingbox?: [string, string, string, string],
): [[number, number], [number, number]] | undefined {
  if (!boundingbox || boundingbox.length !== 4) return undefined

  const [minLat, maxLat, minLon, maxLon] = boundingbox.map(Number)
  if ([minLat, maxLat, minLon, maxLon].some(Number.isNaN)) return undefined

  return [[minLat, minLon], [maxLat, maxLon]]
}

/**
 * Geniş şehir bbox'larını Overpass performansı için merkeze göre sınırlar.
 * max(latKm, lonKm) > thresholdKm ise maxSpanKm kutu oluşturulur.
 */
export function clampBoundsForOverpass(
  bounds: [[number, number], [number, number]],
  centerLat?: number,
  centerLon?: number,
  thresholdKm = OVERPASS_BBOX_CLAMP_THRESHOLD_KM,
  maxSpanKm = OVERPASS_BBOX_CLAMP_MAX_SPAN_KM,
): [[number, number], [number, number]] {
  const [[south, west], [north, east]] = bounds
  const lat = centerLat ?? (south + north) / 2
  const lon = centerLon ?? (west + east) / 2

  const { latKm, lonKm } = boundsSpanKm(bounds)
  if (Math.max(latKm, lonKm) <= thresholdKm) {
    return bounds
  }

  const radiusM = (maxSpanKm / 2) * 1000
  return boundsFromRadius(lat, lon, radiusM)
}

/** Nominatim POI sonucunu Place modeline dönüştürür */
export function mapNominatimPoiToPlace(result: NominatimResult): Place | null {
  if (!result.osm_type || result.osm_id == null) return null

  const latitude = parseFloat(result.lat)
  const longitude = parseFloat(result.lon)
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null

  const name = result.name?.trim()
    ?? result.display_name.split(',')[0]?.trim()
  if (!name) return null

  return {
    id: `${result.osm_type}-${result.osm_id}`,
    name,
    category: resolveCategoryFromNominatim(result),
    latitude,
    longitude,
    address: result.display_name,
    city: extractCityFromNominatimAddress(result.address),
  }
}

function resolveCategoryFromNominatim(result: NominatimResult): string {
  if (result.class === 'amenity' && result.type) {
    return CATEGORY_MAP[result.type] ?? 'other'
  }
  if (result.class === 'tourism' && result.type) {
    return CATEGORY_MAP[result.type] ?? 'attraction'
  }
  if (result.class === 'leisure' && result.type) {
    return CATEGORY_MAP[result.type] ?? 'park'
  }
  if (result.class === 'historic') {
    return 'monument'
  }
  return 'other'
}

function nominatimViewboxFromRadius(
  latitude: number,
  longitude: number,
  radiusMeters: number,
): string {
  const [[south, west], [north, east]] = boundsFromRadius(latitude, longitude, radiusMeters)
  return `${west},${north},${east},${south}`
}

/** Nominatim ile yakın POI araması için viewbox string */
export function buildNominatimPoiViewbox(
  latitude: number,
  longitude: number,
  radiusMeters = NEARBY_FALLBACK_RADIUS_M,
): string {
  return nominatimViewboxFromRadius(latitude, longitude, radiusMeters)
}

export function viewboxFromBounds(bounds: [[number, number], [number, number]]): string {
  const [[south, west], [north, east]] = bounds
  return `${west},${north},${east},${south}`
}

export function resolveSearchRegionCity(result: Pick<NominatimResult, 'address' | 'name' | 'display_name'>): string | undefined {
  const fromAddress = extractCityFromNominatimAddress(result.address)
  if (fromAddress) return fromAddress

  const name = result.name?.trim()
  if (name) return name

  return result.display_name.split(',')[0]?.trim() || undefined
}

/** Nominatim ham sonucunu arama listesi modeline dönüştürür */
export function mapNominatimToSearchResult(result: NominatimResult): SearchResult {
  const city = resolveSearchRegionCity(result)

  return {
    id: String(result.place_id),
    displayName: result.display_name,
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    bounds: parseNominatimBounds(result.boundingbox),
    ...(city ? { city } : {}),
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
    city: extractCityFromOsmTags(tags),
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
export function mapPlaceToSavedPlace(
  place: Place,
  savedAt = new Date().toISOString().slice(0, 10),
  cityOverride?: string,
): SavedPlace {
  const city = cityOverride?.trim() || resolvePlaceCity(place)

  return {
    ...place,
    status: 'planned',
    savedAt,
    ...(city ? { city } : {}),
  }
}

/** visitedAt ISO tarihinin (YYYY-MM-DD) verilen aralıkta olup olmadığını kontrol eder */
export function isVisitedInDateRange(
  visitedAt: string | undefined,
  fromISO: string,
  toISO: string,
): boolean {
  if (!visitedAt) return false
  return visitedAt >= fromISO && visitedAt <= toISO
}

export function getVisitDateRange(preset: VisitDatePreset, customFrom?: string, customTo?: string): {
  from: string
  to: string
} | null {
  if (preset === 'all') return null

  const today = new Date()
  const toISO = (date: Date) => date.toISOString().slice(0, 10)

  if (preset === 'custom') {
    const from = customFrom?.trim()
    const to = customTo?.trim()
    if (!from || !to) return null
    return from <= to ? { from, to } : { from: to, to: from }
  }

  if (preset === 'last30') {
    const from = new Date(today)
    from.setDate(from.getDate() - 30)
    return { from: toISO(from), to: toISO(today) }
  }

  if (preset === 'thisMonth') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: toISO(from), to: toISO(today) }
  }

  // lastMonth
  const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const to = new Date(today.getFullYear(), today.getMonth(), 0)
  return { from: toISO(from), to: toISO(to) }
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
