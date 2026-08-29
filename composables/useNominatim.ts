import type { NominatimResult, SearchResult } from '~/types/place'
import { mapNominatimToSearchResult } from '~/types/place'

let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1100

function rankSearchResult(result: NominatimResult): number {
  let score = result.importance ?? 0

  if (result.class === 'place') {
    if (result.type === 'city') score += 2
    else if (result.type === 'town') score += 1.5
    else if (result.type === 'village') score += 1
  }

  if (result.addresstype === 'province') score += 1.75
  if (result.addresstype === 'city') score += 1.5
  if (result.addresstype === 'county' || result.addresstype === 'municipality') score += 1

  return score
}

function sortSearchResults(results: NominatimResult[]): NominatimResult[] {
  return [...results].sort((a, b) => rankSearchResult(b) - rankSearchResult(a))
}

const EXCLUDED_ADDRESS_TYPES = new Set([
  'region',
  'country',
  'continent',
])

function isUsefulSearchResult(result: NominatimResult): boolean {
  // Yalnızca bölge/ülke/kıta gibi çok geniş sonuçları ele (ör. "Marmara Bölgesi, Türkiye")
  if (result.addresstype && EXCLUDED_ADDRESS_TYPES.has(result.addresstype)) {
    return false
  }

  return true
}

function prepareSearchResults(results: NominatimResult[]): NominatimResult[] {
  return sortSearchResults(results.filter(isUsefulSearchResult))
}

async function waitForRateLimit() {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - elapsed))
  }
  lastRequestTime = Date.now()
}

function normalizeError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const data = (err as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }

  if (err instanceof Error) {
    if (err.message === 'Failed to fetch') {
      return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.'
    }
    return err.message
  }

  return fallback
}

export function useNominatim() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const results = ref<SearchResult[]>([])

  async function search(query: string): Promise<SearchResult[]> {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      results.value = []
      error.value = null
      return []
    }

    loading.value = true
    error.value = null

    try {
      await waitForRateLimit()

      const data = await $fetch<NominatimResult[]>('/api/nominatim/search', {
        query: { q: trimmed },
      })

      results.value = prepareSearchResults(data).map(mapNominatimToSearchResult)
      return results.value
    } catch (err) {
      error.value = normalizeError(err, 'Arama sırasında bir hata oluştu.')
      results.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  function clearResults() {
    results.value = []
    error.value = null
  }

  return {
    loading,
    error,
    results,
    search,
    clearResults,
  }
}
