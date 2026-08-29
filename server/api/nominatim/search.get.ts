const USER_AGENT = 'SehirHafizaApp/1.0 (Nuxt MVP; educational project)'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q ?? '').trim()

  if (q.length < 2) {
    return []
  }

  const params = new URLSearchParams({
    q,
    format: 'json',
    addressdetails: '1',
    limit: '10',
    'accept-language': 'tr',
    countrycodes: 'tr',
  })

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  })

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      message: 'Konum servisine ulaşılamadı.',
    })
  }

  return response.json()
})
