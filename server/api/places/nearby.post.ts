import type { NominatimResult, OverpassElement, Place } from '~/types/place'
import {
  clampBoundsForOverpass,
  mapNominatimPoiToPlace,
  mapOverpassResponse,
  resolvePlacesSearchArea,
  viewboxFromBounds,
} from '~/types/place'
import { fetchOverpassBboxPlaces } from '../../utils/overpassClient'

const USER_AGENT = 'SehirHafizaApp/1.0 (Nuxt MVP; educational project)'
const NOMINATIM_INTERVAL_MS = 1100

const POI_SEARCHES: Record<string, string>[] = [
  { amenity: 'restaurant' },
  { amenity: 'cafe' },
  { amenity: 'museum' },
  { amenity: 'fast_food' },
  { tourism: 'attraction' },
  { tourism: 'museum' },
  { historic: 'monument' },
  { leisure: 'park' },
]

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function searchNominatimPois(
  viewbox: string,
  extra: Record<string, string>,
): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    format: 'json',
    addressdetails: '1',
    limit: '25',
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

async function fetchFromNominatim(bounds: [[number, number], [number, number]]): Promise<Place[]> {
  const viewbox = viewboxFromBounds(bounds)
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
      // Kategori başarısız olsa devam et
    }
  }

  return places
}

function parseBounds(body: unknown): [[number, number], [number, number]] | undefined {
  if (!Array.isArray(body) || body.length !== 2) return undefined
  const [[south, west], [north, east]] = body as [[number, number], [number, number]]
  if (![south, west, north, east].every(Number.isFinite)) return undefined
  if (south >= north || west >= east) return undefined
  return [[south, west], [north, east]]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    latitude?: number
    longitude?: number
    bounds?: [[number, number], [number, number]]
  }>(event)

  const latitude = Number(body?.latitude)
  const longitude = Number(body?.longitude)
  const rawBounds = parseBounds(body?.bounds)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw createError({
      statusCode: 400,
      message: 'Geçerli koordinat gerekli.',
    })
  }

  const searchArea = rawBounds
    ? {
        mapBounds: rawBounds,
        bounds: clampBoundsForOverpass(rawBounds, latitude, longitude),
      }
    : resolvePlacesSearchArea(latitude, longitude)

  let places: Place[] = []

  try {
    const elements = await fetchOverpassBboxPlaces(searchArea.bounds)
    places = mapOverpassResponse(elements as OverpassElement[])
  } catch {
    places = []
  }

  if (places.length === 0) {
    places = await fetchFromNominatim(searchArea.bounds)
  }

  if (places.length === 0) {
    throw createError({
      statusCode: 502,
      message: 'Bu bölgede mekan bulunamadı. Farklı bir semt aramayı deneyin.',
    })
  }

  return { places }
})
