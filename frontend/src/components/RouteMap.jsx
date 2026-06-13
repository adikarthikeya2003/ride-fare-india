import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { reverseGeocode } from '../utils/geocode'

// ── Custom SVG markers (no image assets needed — avoids Vite path issues) ──
function makeDivIcon(fillColor, letter) {
  return L.divIcon({
    className: '',
    iconSize:    [34, 46],
    iconAnchor:  [17, 46],
    popupAnchor: [0, -48],
    html: `<svg width="34" height="46" viewBox="0 0 34 46" xmlns="http://www.w3.org/2000/svg">
      <filter id="s" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00000044"/>
      </filter>
      <path d="M17 1C8.716 1 2 7.716 2 16c0 11.25 15 29 15 29S32 27.25 32 16C32 7.716 25.284 1 17 1z"
            fill="${fillColor}" stroke="white" stroke-width="2" filter="url(#s)"/>
      <text x="17" y="20" text-anchor="middle" dominant-baseline="middle"
            font-family="Inter,system-ui,sans-serif" font-size="13" font-weight="800" fill="white">
        ${letter}
      </text>
    </svg>`,
  })
}

function makeGhostIcon(letter) {
  return L.divIcon({
    className: '',
    iconSize:   [34, 46],
    iconAnchor: [17, 46],
    html: `<svg width="34" height="46" viewBox="0 0 34 46" xmlns="http://www.w3.org/2000/svg" opacity="0.45">
      <path d="M17 1C8.716 1 2 7.716 2 16c0 11.25 15 29 15 29S32 27.25 32 16C32 7.716 25.284 1 17 1z"
            fill="#6b7280" stroke="white" stroke-width="2"/>
      <text x="17" y="20" text-anchor="middle" dominant-baseline="middle"
            font-family="Inter,system-ui,sans-serif" font-size="13" font-weight="800" fill="white">
        ${letter}
      </text>
    </svg>`,
  })
}

// Created once — safe to share across instances since divIcon is just an options object
const ICON_A      = makeDivIcon('#22c55e', 'A')
const ICON_B      = makeDivIcon('#ef4444', 'B')
const ICON_GHOST_A = makeGhostIcon('A')
const ICON_GHOST_B = makeGhostIcon('B')

export default function RouteMap({ origin, destination, routeGeometry, onPinOrigin, onPinDestination }) {
  const wrapperRef      = useRef(null)   // outer <div> (relative parent for overlays)
  const containerRef    = useRef(null)   // inner <div> handed to Leaflet
  const mapRef          = useRef(null)
  const markersRef      = useRef([])
  const routeLayerRef   = useRef(null)
  const ghostMarkerRef  = useRef(null)
  const clickHandlerRef = useRef(null)

  const [pinMode,    setPinMode]    = useState(null)  // 'origin' | 'dest' | null
  const [pinLoading, setPinLoading] = useState(false)

  // ── Init Leaflet map once ─────────────────────────────────────────────────
  // useLayoutEffect fires synchronously after DOM paint — avoids the "flash"
  // you'd get with useEffect on slow connections.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || mapRef.current) return

    // React 18 Strict Mode double-invokes effects (dev only). The cleanup below
    // calls map.remove() which leaves _leaflet_id on the DOM node; Leaflet then
    // throws "container already initialized" on the second run. We clear it.
    if (el._leaflet_id) {
      try { L.map(el).remove() } catch (_) {}
      delete el._leaflet_id
    }

    const map = L.map(el, {
      zoomControl:       true,
      scrollWheelZoom:   false,
      attributionControl: true,
      fadeAnimation:      true,
      zoomAnimation:      true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:     19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    }).addTo(map)

    map.setView([20.5937, 78.9629], 5)

    // Leaflet needs an explicit size-check after the container is mounted and
    // CSS has applied the height. Without this the tiles often render grey.
    requestAnimationFrame(() => {
      map.invalidateSize({ animate: false })
    })

    mapRef.current = map

    return () => {
      // Full cleanup: remove map instance and clear the _leaflet_id so the
      // container can be reused (handles React Strict Mode and HMR)
      map.remove()
      mapRef.current = null
      if (el) delete el._leaflet_id
    }
  }, [])

  // ── Map click handler — active only in pin mode ───────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove previous handler and ghost marker
    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current)
      clickHandlerRef.current = null
    }
    ghostMarkerRef.current?.remove()
    ghostMarkerRef.current = null

    if (!pinMode) {
      map.getContainer().style.cursor = ''
      return
    }

    map.getContainer().style.cursor = 'crosshair'

    const handler = async (e) => {
      const { lat, lng: lon } = e.latlng

      // Show ghost marker immediately while reverse-geocoding
      ghostMarkerRef.current?.remove()
      ghostMarkerRef.current = L.marker([lat, lon], {
        icon: pinMode === 'origin' ? ICON_GHOST_A : ICON_GHOST_B,
        zIndexOffset: 1000,
      }).addTo(map)

      setPinLoading(true)

      try {
        const place = await reverseGeocode(lat, lon)
        if (pinMode === 'origin' && onPinOrigin) {
          onPinOrigin({ lat: place.lat, lon: place.lon }, place.display, place.name)
        } else if (pinMode === 'dest' && onPinDestination) {
          onPinDestination({ lat: place.lat, lon: place.lon }, place.display, place.name)
        }
      } catch {
        const fallback = { lat, lon }
        const label    = `${lat.toFixed(5)}, ${lon.toFixed(5)}`
        if (pinMode === 'origin' && onPinOrigin)    onPinOrigin(fallback, label, label)
        if (pinMode === 'dest'   && onPinDestination) onPinDestination(fallback, label, label)
      } finally {
        ghostMarkerRef.current?.remove()
        ghostMarkerRef.current = null
        setPinLoading(false)
        setPinMode(null)
      }
    }

    clickHandlerRef.current = handler
    map.on('click', handler)

    return () => {
      map.off('click', handler)
      ghostMarkerRef.current?.remove()
      ghostMarkerRef.current = null
      map.getContainer().style.cursor = ''
    }
  }, [pinMode, onPinOrigin, onPinDestination])

  // ── Place / update A and B markers ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    const bounds = []

    if (origin?.coords) {
      const { lat, lon } = origin.coords
      const m = L.marker([lat, lon], { icon: ICON_A, zIndexOffset: 500 })
        .addTo(map)
        .bindPopup(`<b>A — Pickup</b><br><span style="font-size:12px">${origin.short || origin.text || ''}</span>`)
      markersRef.current.push(m)
      bounds.push([lat, lon])
    }

    if (destination?.coords) {
      const { lat, lon } = destination.coords
      const m = L.marker([lat, lon], { icon: ICON_B, zIndexOffset: 500 })
        .addTo(map)
        .bindPopup(`<b>B — Drop-off</b><br><span style="font-size:12px">${destination.short || destination.text || ''}</span>`)
      markersRef.current.push(m)
      bounds.push([lat, lon])
    }

    // Only pan/zoom if there's no drawn route (fitBounds in route effect handles that)
    if (!routeGeometry && bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 14, { animate: true })
      } else {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, animate: true })
      }
    }
  }, [origin, destination, routeGeometry])

  // ── Draw route polyline ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    routeLayerRef.current?.remove()
    routeLayerRef.current = null
    if (!routeGeometry) return

    routeLayerRef.current = L.geoJSON(routeGeometry, {
      style: {
        color:    '#111827',
        weight:   5,
        opacity:  0.85,
        lineJoin: 'round',
        lineCap:  'round',
      },
    }).addTo(map)
    map.fitBounds(routeLayerRef.current.getBounds(), { padding: [60, 60], maxZoom: 15, animate: true })
  }, [routeGeometry])

  const cancelPin = useCallback(() => setPinMode(null), [])

  return (
    // Outer wrapper: relative so overlays can be absolutely positioned on top.
    // NO overflow-hidden here — that would clip Leaflet's zoom controls and
    // tile rendering. Rounded corners are applied to the map container itself
    // (Leaflet sets overflow:hidden on it when it initialises).
    <div ref={wrapperRef} className="relative border border-gray-200 rounded-2xl shadow-sm">

      {/* ── Pin control buttons — z-[2000] so they sit above all Leaflet layers ── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[2000] flex items-center gap-2 pointer-events-none">
        <button
          onClick={() => setPinMode(prev => prev === 'origin' ? null : 'origin')}
          disabled={pinLoading}
          style={{ pointerEvents: 'auto' }}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border shadow-md backdrop-blur-sm transition-all select-none
            ${pinMode === 'origin'
              ? 'bg-green-500 text-white border-green-600 scale-105 shadow-green-200'
              : 'bg-white/90 text-gray-700 border-gray-200 hover:border-green-400 hover:text-green-700'}`}
        >
          <svg width="10" height="14" viewBox="0 0 34 46" fill="currentColor" aria-hidden="true">
            <path d="M17 1C8.716 1 2 7.716 2 16c0 11.25 15 29 15 29S32 27.25 32 16C32 7.716 25.284 1 17 1z"/>
          </svg>
          Pin Pickup (A)
        </button>

        <button
          onClick={() => setPinMode(prev => prev === 'dest' ? null : 'dest')}
          disabled={pinLoading}
          style={{ pointerEvents: 'auto' }}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border shadow-md backdrop-blur-sm transition-all select-none
            ${pinMode === 'dest'
              ? 'bg-red-500 text-white border-red-600 scale-105 shadow-red-200'
              : 'bg-white/90 text-gray-700 border-gray-200 hover:border-red-400 hover:text-red-700'}`}
        >
          <svg width="10" height="14" viewBox="0 0 34 46" fill="currentColor" aria-hidden="true">
            <path d="M17 1C8.716 1 2 7.716 2 16c0 11.25 15 29 15 29S32 27.25 32 16C32 7.716 25.284 1 17 1z"/>
          </svg>
          Pin Drop-off (B)
        </button>
      </div>

      {/* ── Instruction overlay when a pin mode is active ──────────────────── */}
      {pinMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[2000] pointer-events-none">
          <div
            style={{ pointerEvents: 'auto' }}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full shadow-lg border backdrop-blur-sm
              ${pinMode === 'origin'
                ? 'bg-green-50/95 text-green-800 border-green-300'
                : 'bg-red-50/95 text-red-800 border-red-300'}`}
          >
            {pinLoading ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
                Looking up address…
              </>
            ) : (
              <>
                📍 Click anywhere to set {pinMode === 'origin' ? 'pickup (A)' : 'drop-off (B)'}
                <button
                  onClick={cancelPin}
                  className="ml-1 opacity-50 hover:opacity-100 font-black leading-none"
                  aria-label="Cancel pin"
                >✕</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Leaflet map container ─────────────────────────────────────────── */}
      {/* rounded-2xl is applied here so Leaflet's own overflow:hidden clips tiles neatly */}
      <div
        ref={containerRef}
        className="w-full rounded-2xl"
        style={{ height: '22rem' }}
      />

      {/* ── Bottom-left attribution badge ────────────────────────────────── */}
      <div className="absolute bottom-3 left-3 z-[1500] bg-white/80 backdrop-blur-sm text-[10px] text-gray-500 px-2 py-0.5 rounded-md border border-gray-200 pointer-events-none">
        Map data © OpenStreetMap contributors
      </div>
    </div>
  )
}
