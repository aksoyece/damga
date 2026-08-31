/** Yerel API ile Ankara grid taraması testi — node .output/server/index.mjs sonrası çalıştır */
const UA = 'SehirHafizaApp/1.0 (test)'

async function nominatimSearch(query) {
  const params = new URLSearchParams({ format: 'json', q: query, limit: '1', countrycodes: 'tr' })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  })
  return (await res.json())[0]
}

async function testCity(city, baseUrl) {
  const r = await nominatimSearch(city)
  const lat = parseFloat(r.lat)
  const lon = parseFloat(r.lon)
  const bounds = [[parseFloat(r.boundingbox[0]), parseFloat(r.boundingbox[2])], [parseFloat(r.boundingbox[1]), parseFloat(r.boundingbox[3])]]
  const mid = (bounds[0][0] + bounds[1][0]) / 2
  const start = Date.now()
  const res = await fetch(`${baseUrl}/api/places/nearby`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lon, bounds }),
  })
  const data = await res.json()
  const places = data.places ?? []
  const bands = { north: 0, center: 0, south: 0 }
  for (const p of places) {
    if (p.latitude >= mid + 0.05) bands.north++
    else if (p.latitude <= mid - 0.05) bands.south++
    else bands.center++
  }
  console.log(`${city}: ${places.length} mekan, ${Date.now() - start}ms`, bands, res.status === 200 ? 'OK' : data.message)
}

const base = process.argv[2] ?? 'http://localhost:3000'
await testCity('Ankara, Türkiye', base)
