const USER_AGENT = 'SehirHafizaApp/1.0 (Nuxt MVP; educational project)'

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
]

const ENDPOINT_TIMEOUT_MS = 16_000

function isFailedOverpassBody(text: string, status: number): boolean {
  if (status === 429 || status === 502 || status === 503 || status === 504) return true
  if (text.startsWith('<?xml') || text.startsWith('<!DOCTYPE') || text.startsWith('<html')) return true
  if (/rate.?limit|too many requests|server busy|dispatcher/i.test(text)) return true
  return false
}

function parseOverpassResponse(text: string): { elements: unknown[] } | null {
  try {
    const parsed = JSON.parse(text) as { elements?: unknown[]; remark?: string }
    if (parsed.remark && !Array.isArray(parsed.elements)) return null
    if (!Array.isArray(parsed.elements)) return null
    return { elements: parsed.elements }
  } catch {
    return null
  }
}

async function queryEndpoint(endpoint: string, query: string): Promise<{ elements: unknown[] }> {
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

  if (isFailedOverpassBody(text, response.status)) {
    throw new Error('overpass_unavailable')
  }

  const parsed = parseOverpassResponse(text)
  if (!parsed) {
    throw new Error('overpass_invalid')
  }

  return parsed
}

export async function fetchOverpassQuery(query: string): Promise<{ elements: unknown[] }> {
  const attempts = OVERPASS_ENDPOINTS.map(endpoint => queryEndpoint(endpoint, query))

  try {
    return await Promise.any(attempts)
  } catch {
    throw new Error('overpass_failed')
  }
}

/** Overpass bbox: (south, west, north, east) */
export function buildOverpassBboxQuery(
  south: number,
  west: number,
  north: number,
  east: number,
  timeoutSec = 16,
): string {
  return `
[out:json][timeout:${timeoutSec}];
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

export async function fetchOverpassBboxPlaces(
  bounds: [[number, number], [number, number]],
): Promise<unknown[]> {
  const [[south, west], [north, east]] = bounds
  const query = buildOverpassBboxQuery(south, west, north, east)
  const result = await fetchOverpassQuery(query)
  return result.elements
}
