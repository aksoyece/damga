const USER_AGENT = 'SehirHafizaApp/1.0 (Nuxt MVP; educational project)'

const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]

/** Tek uç nokta denemesi — istemci zaman aşımından kısa tutulmalı */
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

async function fetchFromAnyEndpoint(query: string): Promise<{ elements: unknown[] }> {
  const attempts = OVERPASS_ENDPOINTS.map(endpoint =>
    queryEndpoint(endpoint, query),
  )

  try {
    return await Promise.any(attempts)
  } catch {
    throw createError({
      statusCode: 502,
      message: 'Overpass geçici olarak yanıt veremedi. Biraz sonra tekrar deneyin.',
    })
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ query?: string }>(event)
  const query = body?.query?.trim()

  if (!query) {
    throw createError({
      statusCode: 400,
      message: 'Overpass sorgusu gerekli.',
    })
  }

  try {
    return await fetchFromAnyEndpoint(query)
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err
    }

    throw createError({
      statusCode: 502,
      message: 'Mekan servisine bağlanılamadı.',
    })
  }
})
