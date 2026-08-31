const UA = 'SehirHafizaApp/1.0 (debug)'
const south = 39.7607759, west = 32.6940497, north = 40.0807759, east = 33.0140497
const query = `
[out:json][timeout:16];
(
  node["tourism"](${south},${west},${north},${east});
  node["historic"](${south},${west},${north},${east});
  node["leisure"](${south},${west},${north},${east});
  node["natural"="viewpoint"](${south},${west},${north},${east});
  node["amenity"~"restaurant|cafe|museum|fast_food"](${south},${west},${north},${east});
);
out body;
`

const endpoints = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
]

for (const endpoint of endpoints) {
  const start = Date.now()
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(16000),
    })
    const text = await res.text()
    const data = JSON.parse(text)
    const named = (data.elements ?? []).filter(e => e.tags?.name).length
    console.log(endpoint.split('/')[2], 'status', res.status, 'total', data.elements?.length ?? 0, 'named', named, `${Date.now() - start}ms`, data.remark ?? '')
  } catch (e) {
    console.log(endpoint.split('/')[2], 'FAIL', e.message)
  }
}
