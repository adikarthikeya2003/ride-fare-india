import { useEffect, useState, useRef, useCallback } from 'react'
import { Zap, Wifi, Clock, Thermometer } from 'lucide-react'
import { fetchLiveWeather } from '../utils/weather'

const WEATHER = [
  { key: 'clear',       icon: '☀️', label: 'Clear',        mult: 1.00 },
  { key: 'light_rain',  icon: '🌦', label: 'Light Rain',   mult: 1.30 },
  { key: 'medium_rain', icon: '🌧', label: 'Medium Rain',  mult: 1.65 },
  { key: 'heavy_rain',  icon: '⛈', label: 'Heavy Rain',   mult: 2.10 },
  { key: 'storm',       icon: '🌩', label: 'Storm',        mult: 2.70 },
  { key: 'disaster',    icon: '🌊', label: 'Flooding',     mult: 3.50 },
]

const TIME = [
  { key: 'early_morning', icon: '🌅', label: '4–7 AM',    mult: 0.85 },
  { key: 'morning_peak',  icon: '🚦', label: '7–10 AM',   mult: 1.35 },
  { key: 'midday',        icon: '☀️', label: '10AM–4PM',  mult: 1.00 },
  { key: 'evening_peak',  icon: '🚗', label: '4–9 PM',    mult: 1.30 },
  { key: 'night',         icon: '🌙', label: '9PM–12AM',  mult: 1.50 },
  { key: 'late_night',    icon: '🌃', label: '12–4 AM',   mult: 1.75 },
]

const SPECIAL = [
  { key: 'none',          icon: '✓',  label: 'None',              mult: 1.00 },
  { key: 'festival',      icon: '🎉', label: 'Festival / Holiday', mult: 1.40 },
  { key: 'new_year',      icon: '🎆', label: "New Year's Eve",     mult: 2.20 },
  { key: 'airport_zone',  icon: '✈️', label: 'Airport / Station',  mult: 1.20 },
  { key: 'cricket_match', icon: '🏏', label: 'Cricket Match',      mult: 1.35 },
]

// Returns current hour (0-23) in IST regardless of browser's local timezone
function getISTHour() {
  const raw = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false,
  })
  // 'en-US' + hour12:false returns '24' at midnight in some environments
  const h = parseInt(raw, 10)
  return h === 24 ? 0 : h
}

function getTimeSlot(istHour) {
  if (istHour >= 4  && istHour < 7)  return 'early_morning'
  if (istHour >= 7  && istHour < 10) return 'morning_peak'
  if (istHour >= 10 && istHour < 16) return 'midday'
  if (istHour >= 16 && istHour < 21) return 'evening_peak'
  if (istHour >= 21)                 return 'night'
  return 'late_night'
}

function getCombinedMult(c) {
  const w = WEATHER.find(o => o.key === c.weather)?.mult ?? 1
  const t = TIME.find(o => o.key === c.time_slot)?.mult ?? 1
  const s = SPECIAL.find(o => o.key === c.special)?.mult ?? 1
  return Math.min(w * t * s, 5.0)
}

// IST display strings — always shows Indian time regardless of user's local timezone
function istTimeString(date) {
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function istDateString(date) {
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function LiveBadge({ label }) {
  return (
    <span className="inline-flex items-center gap-1 ml-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      {label}
    </span>
  )
}

function ToggleRow({ options, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onSelect(opt.key)}
          title={opt.label}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150
            ${selected === opt.key
              ? 'bg-gray-950 text-white border-gray-950 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}
        >
          <span className="text-sm leading-none">{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * @param conditions  current conditions state
 * @param onChange    state setter
 * @param city        selected city key (fallback for weather coords)
 * @param weatherCoords  {lat, lon} of the pinned pickup, or null to use city
 */
export default function ConditionsPanel({ conditions, onChange, city, weatherCoords }) {
  const [liveWeather,    setLiveWeather]    = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [clock,          setClock]          = useState(new Date())
  const autoTimeRef    = useRef(true)
  const autoWeatherRef = useRef(true)
  // Track last-fetched coords key to avoid refetching identical location
  const lastFetchKey   = useRef(null)

  // ── Live IST clock — ticks every second ──────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date()
      setClock(now)
      if (autoTimeRef.current) {
        const slot = getTimeSlot(getISTHour())
        onChange(prev => {
          if (prev._autoTime && prev.time_slot !== slot)
            return { ...prev, time_slot: slot }
          return prev
        })
      }
    }, 1000)
    return () => clearInterval(id)
  }, [onChange])

  // On mount: set time slot using IST hour
  useEffect(() => {
    const slot = getTimeSlot(getISTHour())
    onChange(prev => ({ ...prev, time_slot: slot, _autoTime: true }))
    autoTimeRef.current = true
  }, [])

  // ── Weather fetch — re-runs when weatherCoords OR city changes ───────────
  useEffect(() => {
    // Build a stable key to avoid refetching same location
    const key = weatherCoords
      ? `${weatherCoords.lat.toFixed(4)},${weatherCoords.lon.toFixed(4)}`
      : city || 'bangalore'

    if (key === lastFetchKey.current) return
    lastFetchKey.current = key

    const target = weatherCoords ?? city ?? 'bangalore'

    setWeatherLoading(true)
    autoWeatherRef.current = true

    fetchLiveWeather(target)
      .then(w => {
        setLiveWeather(w)
        if (autoWeatherRef.current) {
          onChange(prev => ({ ...prev, weather: w.condition, _autoWeather: true }))
        }
      })
      .catch(() => {
        // Silent failure — keep whatever weather was selected
        setLiveWeather(null)
      })
      .finally(() => setWeatherLoading(false))
  }, [city, weatherCoords])

  const setWeather = useCallback(val => {
    autoWeatherRef.current = false
    onChange(prev => ({ ...prev, weather: val, _autoWeather: false }))
  }, [onChange])

  const setTimeSlot = useCallback(val => {
    autoTimeRef.current = false
    onChange(prev => ({ ...prev, time_slot: val, _autoTime: false }))
  }, [onChange])

  const setSpecial = useCallback(val => {
    onChange(prev => ({ ...prev, special: val }))
  }, [onChange])

  // ── Derived values ────────────────────────────────────────────────────────
  const mult      = getCombinedMult(conditions)
  const isNormal  = mult >= 0.9 && mult <= 1.1
  const multColor = mult <= 1.0 ? '#16a34a' : mult <= 1.5 ? '#d97706' : mult <= 2.5 ? '#ea580c' : '#dc2626'

  const wMult  = WEATHER.find(o => o.key === conditions.weather)?.mult ?? 1
  const tMult  = TIME.find(o => o.key === conditions.time_slot)?.mult ?? 1
  const sMult  = SPECIAL.find(o => o.key === conditions.special)?.mult ?? 1
  const wLabel = WEATHER.find(o => o.key === conditions.weather)?.label ?? ''
  const tLabel = TIME.find(o => o.key === conditions.time_slot)?.label ?? ''
  const sLabel = SPECIAL.find(o => o.key === conditions.special)?.label ?? ''

  // Always display IST
  const timeStr = istTimeString(clock)
  const dateStr = istDateString(clock)

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Conditions</span>
          <span className="text-xs text-gray-400">· affects surge estimate</span>
        </div>
        <div className="flex items-center gap-3">
          {/* IST clock */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3 h-3 text-blue-400" />
            <span className="font-mono font-semibold text-gray-700">{timeStr}</span>
            <span className="text-gray-400 font-medium">IST</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400">{dateStr}</span>
          </div>
          {!isNormal && (
            <span className="text-xs font-black" style={{ color: multColor }}>
              ~{mult.toFixed(1)}× surge
            </span>
          )}
          {isNormal && <span className="text-xs text-gray-400">Normal conditions</span>}
        </div>
      </div>

      {/* ── Live weather info bar ──────────────────────────────────────────── */}
      {(liveWeather || weatherLoading) && (
        <div className="px-5 py-2.5 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 to-transparent flex items-center gap-4 flex-wrap">
          {weatherLoading && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Wifi className="w-3 h-3 animate-pulse text-blue-400" />
              Fetching live weather…
            </span>
          )}
          {liveWeather && !weatherLoading && (
            <>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-lg leading-none">{liveWeather.icon}</span>
                <span className="font-semibold text-gray-800">{liveWeather.description}</span>
                <LiveBadge label="LIVE" />
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-orange-400" />
                  {liveWeather.temperature}°C
                </span>
                {liveWeather.precipitation > 0 && (
                  <span>💧 {liveWeather.precipitation} mm/h</span>
                )}
                <span>💨 {liveWeather.windSpeed} km/h</span>
                <span className="text-gray-400">· Updated {liveWeather.fetchedAt} IST</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 space-y-4">

        {/* Weather */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center">
            Weather
            {conditions._autoWeather && liveWeather && (
              <LiveBadge label={`Auto · ${liveWeather.description}`} />
            )}
          </p>
          <ToggleRow options={WEATHER} selected={conditions.weather} onSelect={setWeather} />
        </div>

        {/* Time of booking */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center">
            Time of booking
            {conditions._autoTime && (
              <LiveBadge label={`Auto · ${timeStr} IST`} />
            )}
          </p>
          <ToggleRow options={TIME} selected={conditions.time_slot} onSelect={setTimeSlot} />
        </div>

        {/* Special event */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Special event</p>
          <ToggleRow options={SPECIAL} selected={conditions.special} onSelect={setSpecial} />
        </div>

        {/* ── Surge breakdown ────────────────────────────────────────────────── */}
        {!isNormal && (
          <div className="pt-2 border-t border-gray-100">
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 space-y-2">
              <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Why fares may be higher right now
              </p>
              <div className="space-y-1">
                {wMult !== 1.0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {WEATHER.find(o => o.key === conditions.weather)?.icon} {wLabel}
                    </span>
                    <span className="font-bold text-amber-700">×{wMult.toFixed(2)}</span>
                  </div>
                )}
                {tMult !== 1.0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {TIME.find(o => o.key === conditions.time_slot)?.icon} {tLabel}
                    </span>
                    <span className="font-bold text-amber-700">×{tMult.toFixed(2)}</span>
                  </div>
                )}
                {sMult !== 1.0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {SPECIAL.find(o => o.key === conditions.special)?.icon} {sLabel}
                    </span>
                    <span className="font-bold text-amber-700">×{sMult.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-amber-200">
                <span className="text-xs font-black text-amber-900">Combined surge</span>
                <span className="text-sm font-black" style={{ color: multColor }}>×{mult.toFixed(2)}</span>
              </div>
              <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(((mult - 0.85) / 4.15) * 100, 100)}%`,
                    backgroundColor: multColor,
                  }}
                />
              </div>
              <p className="text-[10px] text-amber-600">
                {mult >= 3   && 'Extremely high demand — prices may be 3× or more than usual.'}
                {mult >= 2   && mult < 3   && 'High surge — consider waiting or booking a surge-immune option.'}
                {mult >= 1.5 && mult < 2   && 'Moderate surge — Namma Yatri & UberAuto are surge-immune options.'}
                {mult >= 1.1 && mult < 1.5 && 'Mild surge — slightly higher than base fares.'}
                {mult < 1.0  && 'Off-peak discount — fares below base rate.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
