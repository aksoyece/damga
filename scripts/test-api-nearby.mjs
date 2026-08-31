const USER_AGENT = 'SehirHafizaApp/1.0 (api test)'

async function nominatimSearch(query) {
  const params = new URLSearchParams({ format: 'json', q: query, limit: '1', countrycodes: 'tr' })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  })
  return (await res.json())[0]
}

function parseBounds(boundingbox) {
  const [minLat, maxLat, minLon, maxLon] = boundingbox.map(Number)
  return [[minLat, minLon], [maxLat, maxLon]]
}

async function testApi(city) {
  const r = await nominatimSearch(city)
  const lat = parseFloat(r.lat)
  const lon = parseFloat(r.lon)
  const bounds = parseBounds(r.boundingbox)
  const start = Date.now()
  const res = await fetch('http://localhost:3000/api/places/nearby', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lon, bounds }),
  })
  const elapsed = Date.now() - start
  const data = await res.json()
  const count = data.places?.length ?? 0
  console.log(`${city}: HTTP ${res.status}, ${count} mekan, ${elapsed}ms${res.status !== 200 ? ' - ' + data.message : ''}`)
}

await testApi('Bursa, Türkiye')
await testApi('İstanbul, Türkiye')
