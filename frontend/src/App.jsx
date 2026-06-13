import { useState, useCallback } from 'react'
import { ArrowRight, RefreshCw } from 'lucide-react'
import Header from './components/Header'
import InstallPrompt from './components/InstallPrompt'
import CitySelector from './components/CitySelector'
import SearchForm from './components/SearchForm'
import ConditionsPanel from './components/ConditionsPanel'
import RouteMap from './components/RouteMap'
import RouteInfo from './components/RouteInfo'
import FareGrid from './components/FareGrid'
import LoadingSpinner from './components/LoadingSpinner'
import DisclaimerBanner from './components/DisclaimerBanner'
import { getRoute } from './utils/routing'
import { estimateFares } from './utils/api'
import { CITY_COORDS } from './utils/geocode'

const emptyPlace = { text: '', coords: null }

// Use IST hour for initial time slot, not the browser's local timezone
function getInitTimeSlot() {
  const raw = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false,
  })
  const h = parseInt(raw, 10) === 24 ? 0 : parseInt(raw, 10)
  if (h >= 4  && h < 7)  return 'early_morning'
  if (h >= 7  && h < 10) return 'morning_peak'
  if (h >= 10 && h < 16) return 'midday'
  if (h >= 16 && h < 21) return 'evening_peak'
  if (h >= 21)           return 'night'
  return 'late_night'
}

export default function App() {
  const [city, setCity]           = useState('bangalore')
  const [origin, setOrigin]       = useState(emptyPlace)
  const [dest, setDest]           = useState(emptyPlace)
  const [conditions, setConditions] = useState({
    weather: 'clear', time_slot: getInitTimeSlot(), special: 'none', _autoTime: true,
  })
  const [routeInfo, setRouteInfo] = useState(null)
  const [fareData, setFareData]   = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const canCompare = origin.coords && dest.coords && !loading

  // Map pin handlers — reverse-geocode result comes from RouteMap
  const handlePinOrigin = useCallback((coords, display, name) => {
    setOrigin({ text: display, short: name, coords })
  }, [])

  const handlePinDest = useCallback((coords, display, name) => {
    setDest({ text: display, short: name, coords })
  }, [])

  // Show map always (users can pin from it immediately)
  const showMap = true

  const handleCompare = useCallback(async () => {
    if (!canCompare) return
    setLoading(true)
    setError(null)
    setFareData(null)
    setRouteInfo(null)
    try {
      const route = await getRoute(origin.coords, dest.coords)
      setRouteInfo(route)
      const data  = await estimateFares(route.distance_km, route.duration_min, city, conditions)
      setFareData(data)
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [canCompare, origin, dest, city, conditions])

  const handleReset = () => {
    setOrigin(emptyPlace)
    setDest(emptyPlace)
    setFareData(null)
    setRouteInfo(null)
    setError(null)
  }

  const handleCityChange = c => {
    setCity(c)
    setFareData(null)
    setRouteInfo(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      {/* Hero sub-bar */}
      <div className="bg-gray-950 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5">
          <p className="text-gray-400 text-xs">
            Compare Uber · Ola · Rapido · Namma Yatri · inDrive across 6 Indian cities —
            with weather &amp; time surge estimation
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* ─── Top section: city + search ─── */}
        {/* NOTE: no overflow-hidden here — the portal dropdown must not be clipped */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          {/* City bar */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
            <CitySelector city={city} onChange={handleCityChange} />
          </div>

          {/* Search inputs */}
          <div className="p-5">
            <SearchForm
              origin={origin}
              destination={dest}
              onOriginChange={setOrigin}
              onDestinationChange={setDest}
              city={city}
            />
          </div>
        </div>

        {/* ─── Conditions ─── */}
        {/* weatherCoords: use pinned pickup location if available, else city center */}
        <ConditionsPanel
          conditions={conditions}
          onChange={setConditions}
          city={city}
          weatherCoords={origin.coords ?? CITY_COORDS[city] ?? CITY_COORDS.bangalore}
        />

        {/* ─── Compare button ─── */}
        <div className="space-y-2">
          <button onClick={handleCompare} disabled={!canCompare} className="btn-primary">
            {loading
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Comparing fares…</>
              : <><ArrowRight className="w-4 h-4" /> Compare Fares</>}
          </button>

          {!origin.coords && !dest.coords && (
            <p className="text-xs text-gray-400 text-center">
              Start typing a location — pick from the dropdown to confirm
            </p>
          )}
          {(origin.coords || dest.coords) && !canCompare && !loading && (
            <p className="text-xs text-amber-600 text-center">
              {!origin.coords ? 'Select a pickup from the dropdown ↑' : 'Select a drop-off from the dropdown ↑'}
            </p>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* ─── Map — always visible for pinning; route drawn after compare ─── */}
        {showMap && (
          <RouteMap
            origin={origin}
            destination={dest}
            routeGeometry={routeInfo?.geometry ?? null}
            onPinOrigin={handlePinOrigin}
            onPinDestination={handlePinDest}
          />
        )}

        {/* ─── Loading ─── */}
        {loading && <LoadingSpinner />}

        {/* ─── Results ─── */}
        {fareData && !loading && (
          <div className="space-y-4">
            {/* Route summary bar */}
            <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
              {routeInfo && (
                <RouteInfo
                  route={routeInfo}
                  city={city}
                  originShort={origin.short}
                  destShort={dest.short}
                />
              )}
              <button
                onClick={handleReset}
                className="text-xs text-gray-400 hover:text-gray-700 underline transition ml-auto"
              >
                New search
              </button>
            </div>

            <DisclaimerBanner />
            <FareGrid results={fareData.results} condition={fareData.condition} />
          </div>
        )}

        {/* ─── Landing hero ─── */}
        {!fareData && !loading && !error && !showMap && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-10 text-center">
            <div className="text-6xl mb-5 select-none">🛺</div>
            <h2 className="text-xl font-black text-gray-950 mb-2 tracking-tight">
              One search. Every ride app.
            </h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-8 leading-relaxed">
              Enter any origin and destination in India and get side-by-side fare
              estimates across Uber, Ola, Rapido, Namma Yatri, and inDrive —
              adjusted for rain, time of day, and special events.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl mx-auto mb-8">
              {[
                { e: '⚫', n: 'Uber',        s: 'Go · Auto · Premier' },
                { e: '🟢', n: 'Ola',         s: 'Mini · Sedan · Auto' },
                { e: '🟠', n: 'Rapido',      s: 'Bike · Auto · Cab'   },
                { e: '🔵', n: 'Namma Yatri', s: 'ONDC Auto'           },
                { e: '🟩', n: 'inDrive',     s: 'Bid-based Cab'       },
              ].map(p => (
                <div key={p.n} className="flex flex-col items-center gap-1.5 bg-gray-50
                                          border border-gray-100 rounded-xl p-3.5 hover:bg-gray-100
                                          transition cursor-default">
                  <span className="text-2xl leading-none">{p.e}</span>
                  <span className="text-xs font-bold text-gray-900">{p.n}</span>
                  <span className="text-[10px] text-gray-400 text-center leading-snug">{p.s}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-2 text-xs">
              {['🌧 Rain surge estimation', '🌙 Time-of-day surge', '🎉 Festival pricing',
                '📍 6 major cities', '🗺 Live route map'].map(f => (
                <span key={f} className="bg-gray-50 border border-gray-200 text-gray-500
                                         px-3 py-1.5 rounded-full">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 py-8 border-t border-gray-100 mt-6">
        Built with React · FastAPI · OpenStreetMap · Leaflet ·
        Formula-based fare estimation · Not affiliated with any platform
      </footer>

      <InstallPrompt />
    </div>
  )
}
