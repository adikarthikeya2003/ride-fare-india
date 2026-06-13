export default function FareCard({ category, conditionActive, conditionMult, delay = 0 }) {
  const noSurge = category.surge_immune

  return (
    <div
      className="card-enter relative flex flex-col bg-white rounded-xl border border-gray-100
                 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Platform colour accent — top bar */}
      <div className="h-1 rounded-t-xl" style={{ background: category.color }} />

      <div className="p-4 flex flex-col flex-1">
        {/* Best value badge */}
        {category.is_best_value && (
          <div className="absolute -top-2.5 right-3 bg-emerald-500 text-white text-[10px] font-black
                          px-2 py-0.5 rounded-full shadow-sm tracking-wide uppercase">
            ★ Best Value
          </div>
        )}

        {/* Icon + name */}
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-2xl leading-none">{category.icon}</span>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">{category.name}</p>
            <p className="text-xs text-gray-400 capitalize">{category.type}</p>
          </div>
        </div>

        {/* Fare range — the headline number */}
        <div className="mb-1">
          <span className="text-[22px] font-black text-gray-950 tabular-nums">₹{category.fare_low}</span>
          <span className="text-gray-300 mx-1.5 font-light text-lg">–</span>
          <span className="text-[22px] font-black text-gray-950 tabular-nums">₹{category.fare_high}</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Mid-estimate <span className="font-semibold text-gray-600">₹{category.fare_estimate}</span>
        </p>

        {/* Tags row */}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3 border-t border-gray-50">
          {noSurge ? (
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
              🔒 No surge
            </span>
          ) : (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{
                background:   `${category.color}18`,
                color:        category.color,
                borderColor:  `${category.color}40`,
              }}
            >
              {conditionActive
                ? `⚡ ×${conditionMult?.toFixed(2) ?? '?'} surge applied`
                : `${category.surge_range[0]}x–${category.surge_range[1]}x surge`}
            </span>
          )}
          {category.booking_fee > 0 && (
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
              +₹{category.booking_fee} fee
            </span>
          )}
        </div>

        {category.note && (
          <p className="text-[10px] text-blue-600 mt-2 leading-relaxed">{category.note}</p>
        )}
      </div>
    </div>
  )
}
