const USER_AGENT = 'SehirHafizaApp/1.0 (Nuxt MVP; educational project)'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

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
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(90000),
      })

      const text = await response.text()

      if (!response.ok || text.startsWith('<?xml') || text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        lastMessage = 'Overpass geçici olarak yanıt veremedi.'
        continue
      }

      const parsed = JSON.parse(text) as { elements?: unknown[] }
      if (!Array.isArray(parsed.elements)) {
        lastMessage = 'Overpass yanıtı okunamadı.'
        continue
      }

      return parsed
    } catch {
      lastMessage = 'Mekan servisine bağlanılamadı.'
    }
  }

  throw createError({
    statusCode: 502,
    message: lastMessage,
  })
})
