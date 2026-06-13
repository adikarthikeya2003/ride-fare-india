/**
 * Geocoding: Photon + Nominatim run IN PARALLEL, both with city-center
 * location bias. Results are merged, deduplicated, and ranked.
 *
 * Why two sources?
 *  - Photon (komoot) has better India locality name matching
 *  - Nominatim (OSM official) has broader address-level coverage
 *  Running both simultaneously maximises recall while keeping latency low.
 */

export const CITY_COORDS = {
  bangalore: { lat: 12.9716, lon: 77.5946 },
  delhi:     { lat: 28.6139, lon: 77.2090 },
  mumbai:    { lat: 19.0760, lon: 72.8777 },
  hyderabad: { lat: 17.3850, lon: 78.4867 },
  chennai:   { lat: 13.0827, lon: 80.2707 },
  pune:      { lat: 18.5204, lon: 73.8567 },
}

// Soft viewboxes for Nominatim (broad enough to include city outskirts)
const CITY_VIEWBOXES = {
  bangalore: '77.25,12.70,77.90,13.25',
  delhi:     '76.75,28.35,77.55,28.95',
  mumbai:    '72.70,18.85,73.10,19.30',
  hyderabad: '78.15,17.05,78.90,17.65',
  chennai:   '80.10,12.82,80.40,13.28',
  pune:      '73.60,18.30,74.10,18.75',
}

// ── Photon search ──────────────────────────────────────────────────────────
function buildPhotonDisplay(p) {
  const parts = []
  if (p.name) parts.push(p.name)
  if (p.housenumber && p.street) parts.push(`${p.housenumber} ${p.street}`)
  else if (p.street && p.street !== p.name) parts.push(p.street)
  if (p.suburb   && p.suburb   !== p.name) parts.push(p.suburb)
  if (p.district && p.district !== p.suburb && p.district !== p.name) parts.push(p.district)
  if (p.city     && p.city     !== p.name) parts.push(p.city)
  if (p.state    && parts.length < 5) parts.push(p.state)
  // Deduplicate adjacent identical tokens
  const out = []
  for (const x of parts) if (out[out.length - 1] !== x) out.push(x)
  return out.slice(0, 5).join(', ') || p.name || ''
}

async function photonSearch(query, city) {
  const { lat, lon } = CITY_COORDS[city] || CITY_COORDS.bangalore
  const params = new URLSearchParams({ q: query, limit: 12, lang: 'en', lat, lon })

  const res = await fetch(`https://photon.komoot.io/api/?${params}`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) return []
  const data = await res.json()

  // Accept: explicitly tagged India OR coordinates within ~200 km of city centre
  const { lat: cLat, lon: cLon } = CITY_COORDS[city] || CITY_COORDS.bangalore

  return data.features
    .filter(f => {
      const [fLon, fLat] = f.geometry.coordinates
      const isIndia = f.properties.countrycode === 'IN'
      const isNear  = Math.abs(fLat - cLat) < 2.0 && Math.abs(fLon - cLon) < 2.0
      return isIndia || isNear
    })
    .map(f => ({
      id:      `ph_${f.properties.osm_id}`,
      lat:     f.geometry.coordinates[1],
      lon:     f.geometry.coordinates[0],
      display: buildPhotonDisplay(f.properties),
      name:    f.properties.name || f.properties.street || buildPhotonDisplay(f.properties).split(',')[0],
      source:  'photon',
    }))
    .filter(r => r.display.length > 0)
}

// ── Nominatim search ───────────────────────────────────────────────────────
async function nominatimSearch(query, city) {
  const viewbox = CITY_VIEWBOXES[city] || CITY_VIEWBOXES.bangalore
  const params  = new URLSearchParams({
    q:              query,
    format:         'jsonv2',
    countrycodes:   'in',
    viewbox,
    bounded:        '0',      // soft bias, not hard boundary
    limit:          '12',
    addressdetails: '1',
    namedetails:    '1',
    layer:          'address,poi,natural,manmade,railway',
    'accept-language': 'en',
  })

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'RideFareIndia/2.0' },
    signal: AbortSignal.timeout(7000),
  })
  if (!res.ok) return []
  const data = await res.json()

  return data.map(item => {
    const parts = item.display_name.split(',').map(s => s.trim())
    return {
      id:      `nm_${item.place_id}`,
      lat:     parseFloat(item.lat),
      lon:     parseFloat(item.lon),
      display: item.display_name,
      name:    parts[0],
      source:  'nominatim',
    }
  })
}

// ── Deduplication ──────────────────────────────────────────────────────────
// If two results are within ~150 m of each other, keep the first (Photon-preferred)
function dedup(results) {
  const kept = []
  for (const r of results) {
    const dup = kept.some(k => Math.abs(k.lat - r.lat) < 0.0015 && Math.abs(k.lon - r.lon) < 0.0015)
    if (!dup) kept.push(r)
  }
  return kept
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function searchPlaces(query, city = 'bangalore') {
  const q = query.trim()
  if (q.length < 3) return []

  // Run both in parallel; if query is short also try appending city name for specificity
  const withCity = q.toLowerCase().includes(city) ? q : `${q}, ${city}`
  const [ph, nm, nmCity] = await Promise.allSettled([
    photonSearch(q, city),
    nominatimSearch(q, city),
    q.length < 12 ? nominatimSearch(withCity, city) : Promise.resolve([]),
  ])

  const photon    = ph.status === 'fulfilled' ? ph.value : []
  const nominatim = nm.status === 'fulfilled' ? nm.value : []
  const nmExtra   = nmCity.status === 'fulfilled' ? nmCity.value : []

  // Photon first (better local name bias), Nominatim fills gaps
  return dedup([...photon, ...nominatim, ...nmExtra]).slice(0, 10)
}

// ── Reverse geocoding ──────────────────────────────────────────────────────
export async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({
    lat,
    lon,
    format:         'jsonv2',
    addressdetails: '1',
    zoom:           '17',
    'accept-language': 'en',
  })

  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { 'User-Agent': 'RideFareIndia/2.0' },
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) throw new Error('Reverse geocode failed')

  const data  = await res.json()
  const parts = (data.display_name || '').split(',').map(s => s.trim())
  // Build a short 3-part display: building/road, suburb, city
  const addr  = data.address || {}
  const name  = data.name || addr.amenity || addr.building || addr.road || parts[0]
  const area  = addr.suburb || addr.neighbourhood || addr.quarter || addr.village || ''
  const city  = addr.city || addr.town || addr.state_district || ''
  const display = [name, area, city].filter(Boolean).join(', ') || data.display_name

  return {
    lat:     parseFloat(data.lat),
    lon:     parseFloat(data.lon),
    display,
    name,
  }
}
