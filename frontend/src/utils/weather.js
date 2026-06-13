/**
 * Open-Meteo — completely free, no API key, returns live weather.
 * Accepts either a city key string OR a {lat, lon} object directly.
 * https://open-meteo.com/
 */
import { CITY_COORDS } from './geocode'

// WMO weather code → our condition + label
const WMO = [
  [[0, 0],   'clear',       'Clear sky',          '☀️'],
  [[1, 3],   'clear',       'Partly cloudy',       '🌤'],
  [[45, 48], 'light_rain',  'Foggy',              '🌫'],
  [[51, 53], 'light_rain',  'Light drizzle',       '🌦'],
  [[55, 55], 'medium_rain', 'Moderate drizzle',    '🌧'],
  [[56, 57], 'light_rain',  'Freezing drizzle',    '🌨'],
  [[61, 61], 'light_rain',  'Light rain',          '🌦'],
  [[63, 63], 'medium_rain', 'Moderate rain',       '🌧'],
  [[65, 65], 'heavy_rain',  'Heavy rain',          '⛈'],
  [[66, 67], 'medium_rain', 'Freezing rain',       '🌧'],
  [[71, 77], 'clear',       'Snow',                '❄️'],
  [[80, 80], 'light_rain',  'Light showers',       '🌦'],
  [[81, 81], 'medium_rain', 'Moderate showers',    '🌧'],
  [[82, 82], 'heavy_rain',  'Violent showers',     '⛈'],
  [[85, 86], 'light_rain',  'Snow showers',        '🌨'],
  [[95, 95], 'storm',       'Thunderstorm',        '🌩'],
  [[96, 99], 'storm',       'Severe thunderstorm', '🌩'],
]

function decodeWMO(code, precipMm = 0) {
  const entry = WMO.find(([r]) => code >= r[0] && code <= r[1])
  if (!entry) return { condition: 'clear', description: 'Unknown', icon: '🌤' }
  let [, condition, description, icon] = entry
  // Override with actual measured precipitation
  if (precipMm > 0 && condition !== 'clear') {
    if      (precipMm >= 10) { condition = 'storm';       description = 'Very heavy rain'; icon = '⛈' }
    else if (precipMm >= 5)  { condition = 'heavy_rain';  description = 'Heavy rain';      icon = '⛈' }
    else if (precipMm >= 2)  { condition = 'medium_rain'; description = 'Moderate rain';   icon = '🌧' }
    else                     { condition = 'light_rain';  description = 'Light rain';      icon = '🌦' }
  }
  return { condition, description, icon }
}

// Returns current time string in IST (India Standard Time = UTC+5:30)
function istTimeStr() {
  return new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * @param {string | {lat: number, lon: number}} cityOrCoords
 *   City key like 'bangalore', or exact {lat, lon} coordinates
 */
export async function fetchLiveWeather(cityOrCoords) {
  let lat, lon, locationLabel

  if (typeof cityOrCoords === 'string') {
    const c   = CITY_COORDS[cityOrCoords] || CITY_COORDS.bangalore
    lat       = c.lat
    lon       = c.lon
    locationLabel = cityOrCoords
  } else {
    lat           = cityOrCoords.lat
    lon           = cityOrCoords.lon
    locationLabel = `${lat.toFixed(3)},${lon.toFixed(3)}`
  }

  const params = new URLSearchParams({
    latitude:      lat,
    longitude:     lon,
    current:       'weather_code,precipitation,temperature_2m,wind_speed_10m,cloud_cover,relative_humidity_2m',
    timezone:      'Asia/Kolkata',   // always request IST from Open-Meteo
    forecast_days: '1',
  })

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Weather API ${res.status}`)

  const data = await res.json()
  const c    = data.current
  const { condition, description, icon } = decodeWMO(c.weather_code, c.precipitation ?? 0)

  return {
    condition,
    description,
    icon,
    temperature:   Math.round(c.temperature_2m ?? 0),
    humidity:      Math.round(c.relative_humidity_2m ?? 0),
    windSpeed:     Math.round(c.wind_speed_10m ?? 0),
    precipitation: +(c.precipitation ?? 0).toFixed(1),
    wmoCode:       c.weather_code,
    isLive:        true,
    locationLabel,
    fetchedAt:     istTimeStr(),   // always IST
  }
}
