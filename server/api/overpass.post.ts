const USER_AGENT = 'SehirHafizaApp/1.0 (Nuxt MVP; educational project)'

const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
]

const RETRIES_PER_ENDPOINT = 2
const RETRY_DELAY_MS = 1200
const REQUEST_TIMEOUT_MS = 45_000

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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

async function queryEndpoint(endpoint: string, query: string): Promise<{ elements: unknown[] } | null> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  const text = await response.text()

  if (isFailedOverpassBody(text, response.status)) {
    return null
  }

  return parseOverpassResponse(text)
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

  let lastMessage = 'Mekan verileri alınamadı.'

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < RETRIES_PER_ENDPOINT; attempt++) {
      if (attempt > 0) {
        await sleep(RETRY_DELAY_MS * attempt)
      }

      try {
        const result = await queryEndpoint(endpoint, query)
        if (result) return result

        lastMessage = 'Overpass geçici olarak yanıt veremedi. Biraz sonra tekrar deneyin.'
      } catch {
        lastMessage = 'Mekan servisine bağlanılamadı.'
      }
    }
  }

  throw createError({
    statusCode: 502,
    message: lastMessage,
  })
})
