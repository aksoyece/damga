const USER_AGENT = 'SehirHafizaApp/1.0 (Nuxt MVP; educational project)'

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const ENDPOINT_TIMEOUT_MS = 22_000

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

export function buildOverpassAroundQuery(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  selectors: string,
  resultLimit = 120,
  timeoutSec = 20,
): string {
  const filledSelectors = selectors
    .replace(/\${radius}/g, String(radiusMeters))
    .replace(/\${lat}/g, String(latitude))
    .replace(/\${lon}/g, String(longitude))

  return `
    [out:json][timeout:${timeoutSec}];
    (
      ${filledSelectors}
    );
    out center ${resultLimit};
  `
}

export const OVERPASS_TAG_GROUPS = [
  {
    key: 'tourism',
    selectors: `
      node["tourism"](around:\${radius},\${lat},\${lon});
      way["tourism"](around:\${radius},\${lat},\${lon});
    `,
  },
  {
    key: 'historic',
    selectors: `
      node["historic"](around:\${radius},\${lat},\${lon});
      way["historic"](around:\${radius},\${lat},\${lon});
    `,
  },
  {
    key: 'leisure',
    selectors: `
      node["leisure"~"park|garden"](around:\${radius},\${lat},\${lon});
      way["leisure"~"park|garden"](around:\${radius},\${lat},\${lon});
    `,
  },
  {
    key: 'amenity',
    selectors: `
      node["amenity"~"restaurant|cafe|museum|fast_food"](around:\${radius},\${lat},\${lon});
      way["amenity"~"restaurant|cafe|museum|fast_food"](around:\${radius},\${lat},\${lon});
    `,
  },
] as const

export async function fetchOverpassNearbyPlaces(
  latitude: number,
  longitude: number,
  radiusMeters: number,
): Promise<unknown[]> {
  const results = await Promise.allSettled(
    OVERPASS_TAG_GROUPS.map(group =>
      fetchOverpassQuery(
        buildOverpassAroundQuery(latitude, longitude, radiusMeters, group.selectors),
      ),
    ),
  )

  const elements: unknown[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      elements.push(...result.value.elements)
    }
  }

  return elements
}
