import { boundsSpanKm, splitBoundsIntoGrid } from '~/types/place'

const USER_AGENT = 'SehirHafizaApp/1.0 (Nuxt MVP; educational project)'

export const OVERPASS_ENDPOINTS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
]

const ENDPOINT_TIMEOUT_MS = 14_000
const GRID_BATCH_SIZE = 3

const TAG_SELECTORS = `
  node["tourism"](\${bbox});
  way["tourism"](\${bbox});
  node["historic"](\${bbox});
  way["historic"](\${bbox});
  node["leisure"](\${bbox});
  way["leisure"](\${bbox});
  node["natural"="viewpoint"](\${bbox});
  way["natural"="viewpoint"](\${bbox});
  node["amenity"~"restaurant|cafe|museum|fast_food"](\${bbox});
  way["amenity"~"restaurant|cafe|museum|fast_food"](\${bbox});
`

const TAG_GROUPS = [
  `node["tourism"](\${bbox}); way["tourism"](\${bbox});`,
  `node["historic"](\${bbox}); way["historic"](\${bbox});`,
  `node["leisure"](\${bbox}); way["leisure"](\${bbox});`,
  `node["natural"="viewpoint"](\${bbox}); way["natural"="viewpoint"](\${bbox}); node["amenity"~"restaurant|cafe|museum|fast_food"](\${bbox}); way["amenity"~"restaurant|cafe|museum|fast_food"](\${bbox});`,
] as const

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

/** En zengin yanıtı seç — en hızlı ama eksik cevap yerine */
export async function fetchOverpassQuery(query: string): Promise<{ elements: unknown[] }> {
  const attempts = await Promise.allSettled(
    OVERPASS_ENDPOINTS.map(endpoint => queryEndpoint(endpoint, query)),
  )

  let best: { elements: unknown[] } | null = null
  for (const attempt of attempts) {
    if (attempt.status !== 'fulfilled') continue
    if (!best || attempt.value.elements.length > best.elements.length) {
      best = attempt.value
    }
  }

  if (!best) {
    throw new Error('overpass_failed')
  }

  return best
}

function bboxString(bounds: [[number, number], [number, number]]): string {
  const [[south, west], [north, east]] = bounds
  return `${south},${west},${north},${east}`
}

export function buildOverpassBboxQuery(
  bounds: [[number, number], [number, number]],
  selectors: string,
  timeoutSec = 16,
): string {
  const bbox = bboxString(bounds)
  const filled = selectors.replace(/\$\{bbox\}/g, bbox)
  return `
[out:json][timeout:${timeoutSec}];
(
  ${filled}
);
out center;
`
}

async function fetchSelectorsOnBounds(
  bounds: [[number, number], [number, number]],
  selectors: string,
): Promise<unknown[]> {
  const query = buildOverpassBboxQuery(bounds, selectors)
  const result = await fetchOverpassQuery(query)
  return result.elements
}

async function runInBatches<T>(tasks: (() => Promise<T>)[], batchSize: number): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize)
    const settled = await Promise.allSettled(batch.map(run => run()))
    for (const item of settled) {
      if (item.status === 'fulfilled') {
        results.push(item.value)
      }
    }
  }
  return results
}

function shouldUseGrid(bounds: [[number, number], [number, number]]): boolean {
  const { latKm, lonKm } = boundsSpanKm(bounds)
  return Math.max(latKm, lonKm) > 22
}

function mergeElements(chunks: unknown[][]): unknown[] {
  const seen = new Set<string>()
  const merged: unknown[] = []

  for (const chunk of chunks) {
    for (const element of chunk) {
      const el = element as { type?: string; id?: number }
      if (!el.type || el.id == null) continue
      const key = `${el.type}-${el.id}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(element)
    }
  }

  return merged
}

export async function fetchOverpassBboxPlaces(
  bounds: [[number, number], [number, number]],
): Promise<unknown[]> {
  if (shouldUseGrid(bounds)) {
    const { cells } = splitBoundsIntoGrid(bounds)
    const tasks = cells.map(cell => () => fetchSelectorsOnBounds(cell, TAG_SELECTORS))
    const chunks = await runInBatches(tasks, GRID_BATCH_SIZE)
    return mergeElements(chunks)
  }

  const groupTasks = TAG_GROUPS.map(
    selectors => () => fetchSelectorsOnBounds(bounds, selectors),
  )
  const chunks = await Promise.allSettled(groupTasks.map(run => run()))
  const elements = chunks
    .filter((r): r is PromiseFulfilledResult<unknown[]> => r.status === 'fulfilled')
    .map(r => r.value)

  if (elements.length === 0) {
    throw new Error('overpass_failed')
  }

  return mergeElements(elements)
}
