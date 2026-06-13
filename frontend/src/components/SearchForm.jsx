import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Navigation, ArrowUpDown, X, Loader2 } from 'lucide-react'
import { searchPlaces } from '../utils/geocode'
import { useDebounce } from '../hooks/useDebounce'
import { useDropdownPosition } from '../hooks/useDropdownPosition'

/* ─── Portal dropdown — renders into document.body so no parent
       overflow:hidden can clip it ─── */
function SuggestionsPortal({ inputRef, open, suggestions, noResults, searching, query, onSelect, onClose }) {
  const style = useDropdownPosition(inputRef, open)

  if (!open || !style) return null

  return createPortal(
    <div
      data-suggestions-portal="true"
      className="bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden"
      style={style}
    >
      {suggestions.length > 0 && (
        <ul className="max-h-64 overflow-y-auto divide-y divide-gray-50">
          {suggestions.map((s, i) => {
            const parts     = s.display.split(',')
            const primary   = parts[0]?.trim() || s.display
            const secondary = parts.slice(1, 4).join(',').trim()
            return (
              <li
                key={s.id ?? i}
                onMouseDown={e => {
                  e.preventDefault()    // keep input focused
                  e.stopPropagation()   // stop document mousedown → prevents premature setOpen(false)
                  onSelect(s)
                  onClose()
                }}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-indigo-50 active:bg-indigo-100 transition-colors"
              >
                <MapPin className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{primary}</p>
                  {secondary && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{secondary}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {noResults && !searching && (
        <div className="px-5 py-4 text-center">
          <p className="text-sm font-semibold text-gray-700 mb-1">No results found</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Try a more specific name — add the area or city.<br />
            e.g. <em>"Indiranagar Bangalore"</em> or <em>"Bandra West Mumbai"</em>
          </p>
        </div>
      )}

      {searching && (
        <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Searching…
        </div>
      )}
    </div>,
    document.body
  )
}

/* ─── Single location input ─── */
function PlaceInput({ id, label, Icon, accentColor, value, onChange, city, placeholder }) {
  const [query,       setQuery]       = useState(value.text || '')
  const [suggestions, setSuggestions] = useState([])
  const [open,        setOpen]        = useState(false)
  const [searching,   setSearching]   = useState(false)
  const [noResults,   setNoResults]   = useState(false)

  const inputRef     = useRef(null)
  const wrapperRef   = useRef(null)
  const debounced    = useDebounce(query, 340)

  // Sync when parent clears value
  useEffect(() => { if (!value.text) setQuery('') }, [value.text])

  // Run search after debounce
  useEffect(() => {
    const q = debounced.trim()
    if (q.length < 3) { setSuggestions([]); setNoResults(false); return }
    setSearching(true)
    setNoResults(false)
    searchPlaces(q, city).then(res => {
      setSuggestions(res)
      setNoResults(res.length === 0)
      setOpen(true)
    }).finally(() => setSearching(false))
  }, [debounced, city])

  // Close on outside click
  useEffect(() => {
    const fn = e => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target) &&
        !e.target.closest('[data-suggestions-portal]')
      ) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const handleSelect = useCallback(s => {
    setQuery(s.display)
    setSuggestions([])
    setNoResults(false)
    onChange({ text: s.display, short: s.name, coords: { lat: s.lat, lon: s.lon } })
  }, [onChange])

  const clear = () => {
    setQuery('')
    setSuggestions([])
    setOpen(false)
    setNoResults(false)
    onChange({ text: '', coords: null })
    inputRef.current?.focus()
  }

  const confirmed = !!value.coords
  const showDropdown = open && (suggestions.length > 0 || noResults || searching)

  return (
    <div ref={wrapperRef} className="relative">
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={query}
          autoComplete="off"
          spellCheck="false"
          placeholder={placeholder}
          onChange={e => {
            setQuery(e.target.value)
            if (!e.target.value) onChange({ text: '', coords: null })
          }}
          onFocus={() => { if (suggestions.length > 0 || noResults) setOpen(true) }}
          className={`input-field pr-10 transition-all ${
            confirmed
              ? 'border-green-400 bg-green-50/50 focus:ring-green-300 focus:border-green-500'
              : 'border-gray-200'
          }`}
        />

        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {searching && <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />}
          {!searching && (confirmed || query) && (
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={clear}
              className="text-gray-300 hover:text-gray-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </span>
      </div>

      {confirmed && (
        <p className="text-xs text-green-600 mt-1 font-semibold truncate flex items-center gap-1">
          <span>✓</span>
          <span>{value.short || value.text?.split(',')[0]}</span>
        </p>
      )}

      {/* Portal — immune to overflow:hidden */}
      <SuggestionsPortal
        inputRef={inputRef}
        open={showDropdown}
        suggestions={suggestions}
        noResults={noResults}
        searching={searching}
        query={debounced}
        onSelect={handleSelect}
        onClose={() => setOpen(false)}
      />
    </div>
  )
}

/* ─── Main exported component ─── */
export default function SearchForm({ origin, destination, onOriginChange, onDestinationChange, city }) {
  const handleSwap = () => {
    const t = { ...origin }
    onOriginChange({ ...destination })
    onDestinationChange(t)
  }

  return (
    <div className="space-y-4">
      <PlaceInput
        id="pickup"
        label="Pickup"
        Icon={Navigation}
        accentColor="#22c55e"
        value={origin}
        onChange={onOriginChange}
        city={city}
        placeholder="Type any area, landmark, or street…"
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-100" />
        <button
          onClick={handleSwap}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700
                     border border-gray-200 hover:border-gray-400 bg-white
                     px-3 py-1.5 rounded-full transition shadow-sm"
        >
          <ArrowUpDown className="w-3 h-3" />
          Swap
        </button>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <PlaceInput
        id="dropoff"
        label="Drop-off"
        Icon={MapPin}
        accentColor="#ef4444"
        value={destination}
        onChange={onDestinationChange}
        city={city}
        placeholder="Type any area, landmark, or street…"
      />

      <p className="text-xs text-gray-400 text-center pt-1">
        Powered by OpenStreetMap · Type 3+ characters · Select from the list to confirm
      </p>
    </div>
  )
}
