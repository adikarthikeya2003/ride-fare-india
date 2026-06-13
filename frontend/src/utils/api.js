const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function estimateFares(distanceKm, durationMin, city, conditions = {}) {
  const res = await fetch(`${API_BASE}/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      distance_km: distanceKm,
      duration_min: durationMin,
      city,
      weather: conditions.weather || 'clear',
      time_slot: conditions.time_slot || 'midday',
      special: conditions.special || 'none',
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Server error (${res.status}). Is the backend running?`)
  }

  return res.json()
}

export async function getCities() {
  const res = await fetch(`${API_BASE}/cities`)
  if (!res.ok) throw new Error('Could not load city list.')
  return res.json()
}
