const UA = 'SehirHafizaApp/1.0 (debug)'

const south = 39.7607759
const west = 32.6940497
const north = 40.0807759
const east = 33.0140497
const mid = (south + north) / 2

function band(lat) {
  if (lat >= mid + 0.05) return 'north'
  if (lat <= mid - 0.05) return 'south'
  return 'center'
}

function stats(elements) {
  const named = elements.filter(e => e.tags?.name)
  const bands = { north: 0, center: 0, south: 0 }
  for (const e of named) {
    const lat = e.lat ?? e.center?.lat
    if (lat == null) continue
    bands[band(lat)]++
  }
  return { total: elements.length, named: named.length, bands }
}

async function run(label, query) {
  const start = Date.now()
  const res = await fetch('https://overpass.openstreetmap.fr/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(20000),
  })
  const data = await res.json()
  console.log(label, stats(data.elements), `${Date.now() - start}ms`)
}

const bbox = `${south},${west},${north},${east}`

await run('nodes-only', `
[out:json][timeout:16];
(
  node["tourism"](${bbox});
  node["historic"](${bbox});
  node["leisure"](${bbox});
  node["natural"="viewpoint"](${bbox});
  node["amenity"~"restaurant|cafe|museum|fast_food"](${bbox});
);
out body;
`)

await run('nodes+ways center', `
[out:json][timeout:20];
(
  node["tourism"](${bbox});
  way["tourism"](${bbox});
  node["historic"](${bbox});
  way["historic"](${bbox});
  node["leisure"](${bbox});
  way["leisure"](${bbox});
  node["natural"="viewpoint"](${bbox});
  way["natural"="viewpoint"](${bbox});
  node["amenity"~"restaurant|cafe|museum|fast_food"](${bbox});
  way["amenity"~"restaurant|cafe|museum|fast_food"](${bbox});
);
out center;
`)
