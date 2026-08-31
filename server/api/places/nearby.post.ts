import type { NominatimResult, Place } from '~/types/place'
import { mapNominatimPoiToPlace } from '~/types/place'

const USER_AGENT = 'SehirHafizaApp/1.0 (Nuxt MVP; educational project)'
const NOMINATIM_INTERVAL_MS = 1100

const POI_SEARCHES: Record<string, string>[] = [
  { amenity: 'restaurant' },
  { amenity: 'cafe' },
  { amenity: 'museum' },
  { amenity: 'fast_food' },
]

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function viewboxFromRadius(latitude: number, longitude: number, radiusMeters: number): string {
  const latDelta = radiusMeters / 111_320
  const lonDelta = radiusMeters / (111_320 * Math.cos(latitude * (Math.PI / 180)))
  const south = latitude - latDelta
  const north = latitude + latDelta
  const west = longitude - lonDelta
  const east = longitude + lonDelta
  return `${west},${north},${east},${south}`
}

async function searchNominatimPois(
  viewbox: string,
  extra: Record<string, string>,
): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    format: 'json',
    addressdetails: '1',
    limit: '20',
    viewbox,
    bounded: '1',
    countrycodes: 'tr',
    'accept-language': 'tr',
    ...extra,
  })

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(12_000),
  })

  if (!response.ok) {
    throw new Error('nominatim_failed')
  }

  const data = await response.json()
  return Array.isArray(data) ? data as NominatimResult[] : []
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    latitude?: number
    longitude?: number
    radiusMeters?: number
  }>(event)

  const latitude = Number(body?.latitude)
  const longitude = Number(body?.longitude)
  const radiusMeters = Math.min(
    Math.max(Number(body?.radiusMeters) || 5000, 1500),
    8000,
  )

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw createError({
      statusCode: 400,
      message: 'Geçerli koordinat gerekli.',
    })
  }

  const viewbox = viewboxFromRadius(latitude, longitude, radiusMeters)
  const seen = new Set<string>()
  const places: Place[] = []

  for (const [index, search] of POI_SEARCHES.entries()) {
    if (index > 0) {
      await sleep(NOMINATIM_INTERVAL_MS)
    }

    try {
      const results = await searchNominatimPois(viewbox, search)

      for (const result of results) {
        const place = mapNominatimPoiToPlace(result)
        if (!place || seen.has(place.id)) continue

        seen.add(place.id)
        places.push(place)
      }
    } catch {
      // Tek kategori başarısız olsa bile diğerlerini dene
    }
  }

  if (places.length === 0) {
    throw createError({
      statusCode: 502,
      message: 'Bu bölgede mekan bulunamadı. Farklı bir semt aramayı deneyin.',
    })
  }

  return { places }
})
