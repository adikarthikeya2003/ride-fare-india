import FareCard from './FareCard'

function SummaryBar({ results }) {
  const allCats = results.flatMap(p =>
    p.categories.map(c => ({ ...c, platformName: p.display_name }))
  )
  const cheapest = allCats.reduce((a, b) => a.fare_low <= b.fare_low ? a : b)
  const cabs     = allCats.filter(c => c.type === 'cab')
  const bestCab  = cabs.length ? cabs.reduce((a, b) => a.fare_estimate <= b.fare_estimate ? a : b) : null
  const premium  = allCats.filter(c => c.type === 'cab').reduce((a, b) => a.fare_estimate >= b.fare_estimate ? a : b, allCats[0])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-0.5">Cheapest</p>
        <p className="text-lg font-black text-emerald-800">₹{cheapest.fare_low}–₹{cheapest.fare_high}</p>
        <p className="text-xs text-emerald-600">{cheapest.icon} {cheapest.name} · {cheapest.platformName}</p>
      </div>
      {bestCab && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-0.5">Best Cab</p>
          <p className="text-lg font-black text-blue-800">₹{bestCab.fare_low}–₹{bestCab.fare_high}</p>
          <p className="text-xs text-blue-600">{bestCab.icon} {bestCab.name} · {bestCab.platformName}</p>
        </div>
      )}
      {premium && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-0.5">Premium</p>
          <p className="text-lg font-black text-purple-800">₹{premium.fare_low}+</p>
          <p className="text-xs text-purple-600">{premium.icon} {premium.name} · {premium.platformName}</p>
        </div>
      )}
    </div>
  )
}

export default function FareGrid({ results, condition }) {
  if (!results?.length) return null

  const conditionActive = condition && !condition.is_default

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-black text-gray-900 text-base tracking-tight">All Platforms</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {conditionActive && (
            <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200
                             px-2.5 py-1 rounded-full font-semibold">
              ⚡ {condition.condition_summary}
            </span>
          )}
          <span className="text-xs text-gray-400">sorted cheapest first</span>
        </div>
      </div>

      {/* Quick summary */}
      <SummaryBar results={results} />

      {/* Per-platform sections */}
      {results.map((platform, pi) => (
        <div
          key={platform.platform}
          className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm"
        >
          {/* Platform header */}
          <div
            className="px-5 py-3.5 flex items-center gap-3"
            style={{ backgroundColor: platform.brand_color }}
          >
            <span className="text-xl leading-none">{platform.logo_emoji}</span>
            <h3 className="font-black text-base tracking-tight" style={{ color: platform.text_color }}>
              {platform.display_name}
            </h3>
            <div className="ml-auto">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.18)', color: platform.text_color }}
              >
                from ₹{Math.min(...platform.categories.map(c => c.fare_low))}
              </span>
            </div>
          </div>

          {/* Cards */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {platform.categories.map((cat, ci) => (
              <FareCard
                key={cat.name}
                category={cat}
                conditionActive={conditionActive}
                conditionMult={condition?.combined}
                delay={pi * 70 + ci * 40}
              />
            ))}
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-400 text-center pb-1">
        Formula-based estimates from published fare structures ·
        Surge shown as a platform range, not a guaranteed value ·
        Not affiliated with any platform
      </p>
    </div>
  )
}
