/**
 * Bursa ve İstanbul için bbox tabanlı Overpass taraması testi.
 * Kullanım: node scripts/test-bbox-nearby.mjs
 */

const USER_AGENT = 'SehirHafizaApp/1.0 (test script)'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
]

const CLAMP_THRESHOLD_KM = 40
const CLAMP_MAX_SPAN_KM = 20
const FALLBACK_RADIUS_M = 8000
const ENDPOINT_TIMEOUT_MS = 16_000

const KM_PER_DEG_LAT = 111.32

function boundsSpanKm(bounds) {
  const [[south, west], [north, east]] = bounds
  const midLat = (south + north) / 2
  return {
    latKm: (north - south) * KM_PER_DEG_LAT,
    lonKm: (east - west) * KM_PER_DEG_LAT * Math.cos(midLat * (Math.PI / 180)),
  }
}

function boundsFromRadius(lat, lon, radiusM = FALLBACK_RADIUS_M) {
  const latDelta = radiusM / 111_320
  const lonDelta = radiusM / (111_320 * Math.cos(lat * (Math.PI / 180)))
  return [[lat - latDelta, lon - lonDelta], [lat + latDelta, lon + lonDelta]]
}

function clampBoundsForOverpass(bounds, centerLat, centerLon) {
  const { latKm, lonKm } = boundsSpanKm(bounds)
  if (Math.max(latKm, lonKm) <= CLAMP_THRESHOLD_KM) return bounds
  return boundsFromRadius(centerLat, centerLon, (CLAMP_MAX_SPAN_KM / 2) * 1000)
}

function parseNominatimBounds(boundingbox) {
  if (!boundingbox || boundingbox.length !== 4) return undefined
  const [minLat, maxLat, minLon, maxLon] = boundingbox.map(Number)
  if ([minLat, maxLat, minLon, maxLon].some(Number.isNaN)) return undefined
  return [[minLat, minLon], [maxLat, maxLon]]
}

function buildOverpassBboxQuery(south, west, north, east) {
  return `
[out:json][timeout:16];
(
  node["tourism"](${south},${west},${north},${east});
  node["historic"](${south},${west},${north},${east});
  node["leisure"](${south},${west},${north},${east});
  node["natural"="viewpoint"](${south},${west},${north},${east});
  node["amenity"~"restaurant|cafe|museum|fast_food"](${south},${west},${north},${east});
);
out body;
`
}

async function nominatimSearch(query) {
  const params = new URLSearchParams({
    format: 'json',
    q: query,
    limit: '1',
    countrycodes: 'tr',
    'accept-language': 'tr',
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  })
  const data = await res.json()
  return data[0]
}

async function queryOverpass(query) {
  const attempts = OVERPASS_ENDPOINTS.map(async (endpoint) => {
    const start = Date.now()
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(ENDPOINT_TIMEOUT_MS),
    })
    const text = await response.text()
    const elapsed = Date.now() - start
    if (!response.ok || text.startsWith('<?xml') || text.startsWith('<!')) {
      throw new Error(`HTTP ${response.status} (${elapsed}ms)`)
    }
    const parsed = JSON.parse(text)
    return { elements: parsed.elements ?? [], elapsed, endpoint }
  })

  return Promise.any(attempts)
}

function countNamedElements(elements) {
  const seen = new Set()
  let named = 0
  for (const el of elements) {
    if (!el.tags?.name) continue
    const id = `${el.type}-${el.id}`
    if (seen.has(id)) continue
    seen.add(id)
    named++
  }
  return { total: elements.length, uniqueNamed: named }
}

async function testCity(cityName) {
  console.log(`\n=== ${cityName} ===`)
  const result = await nominatimSearch(cityName)
  if (!result) {
    console.log('Nominatim sonuç yok')
    return
  }

  const lat = parseFloat(result.lat)
  const lon = parseFloat(result.lon)
  const rawBounds = parseNominatimBounds(result.boundingbox)
  const rawSpan = rawBounds ? boundsSpanKm(rawBounds) : null
  const bounds = rawBounds
    ? clampBoundsForOverpass(rawBounds, lat, lon)
    : boundsFromRadius(lat, lon)
  const clampSpan = boundsSpanKm(bounds)
  const clamped = rawBounds && Math.max(rawSpan.latKm, rawSpan.lonKm) > CLAMP_THRESHOLD_KM

  console.log(`Merkez: ${lat.toFixed(4)}, ${lon.toFixed(4)}`)
  if (rawSpan) {
    console.log(`Ham bbox: ${rawSpan.latKm.toFixed(1)} x ${rawSpan.lonKm.toFixed(1)} km`)
  }
  console.log(`Sorgu bbox: ${clampSpan.latKm.toFixed(1)} x ${clampSpan.lonKm.toFixed(1)} km${clamped ? ' (clamp uygulandı)' : ''}`)

  const [[south, west], [north, east]] = bounds
  const query = buildOverpassBboxQuery(south, west, north, east)

  const totalStart = Date.now()
  try {
    const { elements, elapsed, endpoint } = await queryOverpass(query)
    const { total, uniqueNamed } = countNamedElements(elements)
    const totalElapsed = Date.now() - totalStart
    const timedOut = totalElapsed >= ENDPOINT_TIMEOUT_MS - 100

    console.log(`Overpass: ${endpoint.split('/')[2]}`)
    console.log(`Süre: ${elapsed}ms (toplam ${totalElapsed}ms)`)
    console.log(`Sonuç: ${total} element, ${uniqueNamed} isimli benzersiz mekan`)
    console.log(`Timeout: ${timedOut ? 'EVET veya sınırda' : 'HAYIR'}`)
  } catch (err) {
    const totalElapsed = Date.now() - totalStart
    console.log(`HATA (${totalElapsed}ms): ${err.message ?? err}`)
    console.log('Timeout: EVET (tüm sunucular başarısız)')
  }
}

console.log('BBox tabanlı Overpass testi (4 sunucu paralel, 16sn timeout)')
await testCity('Bursa, Türkiye')
await testCity('İstanbul, Türkiye')
