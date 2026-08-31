import { fetchOverpassQuery } from '../utils/overpassClient'

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
    return await fetchOverpassQuery(query)
  } catch {
    throw createError({
      statusCode: 502,
      message: 'Overpass geçici olarak yanıt veremedi. Biraz sonra tekrar deneyin.',
    })
  }
})
