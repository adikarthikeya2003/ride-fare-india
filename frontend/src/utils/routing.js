export async function getRoute(originCoords, destCoords) {
  const { lat: oLat, lon: oLon } = originCoords
  const { lat: dLat, lon: dLon } = destCoords

  // overview=full + geometries=geojson gives us the actual road path for the map
  const url = `https://router.project-osrm.org/route/v1/driving/${oLon},${oLat};${dLon},${dLat}?overview=full&geometries=geojson`

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error('Route calculation failed. Please try again.')

  const data = await res.json()

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('No road route found between these locations.')
  }

  const route = data.routes[0]
  const distance_km = route.distance / 1000
  const duration_min = route.duration / 60

  return {
    distance_km,
    duration_min,
    distance_display: `${distance_km.toFixed(1)} km`,
    duration_display: `${Math.round(duration_min)} min`,
    geometry: route.geometry, // GeoJSON LineString for map display
  }
}
