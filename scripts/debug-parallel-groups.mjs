const UA = 'SehirHafizaApp/1.0 (debug)'
const bbox = '39.7607759,32.6940497,40.0807759,33.0140497'
const endpoint = 'https://overpass.openstreetmap.fr/api/interpreter'

const groups = [
  `node["tourism"](${bbox}); way["tourism"](${bbox});`,
  `node["historic"](${bbox}); way["historic"](${bbox});`,
  `node["leisure"](${bbox}); way["leisure"](${bbox});`,
  `node["natural"="viewpoint"](${bbox}); way["natural"="viewpoint"](${bbox}); node["amenity"~"restaurant|cafe|museum|fast_food"](${bbox}); way["amenity"~"restaurant|cafe|museum|fast_food"](${bbox});`,
]

async function runGroup(selectors) {
  const q = `[out:json][timeout:16];(${selectors});out center;`
  const start = Date.now()
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: `data=${encodeURIComponent(q)}`,
    signal: AbortSignal.timeout(16000),
  })
  const data = await res.json()
  return { n: data.elements?.length ?? 0, ms: Date.now() - start }
}

const start = Date.now()
const results = await Promise.all(groups.map(runGroup))
console.log(results)
console.log('total', results.reduce((s, r) => s + r.n, 0), 'ms', Date.now() - start)
