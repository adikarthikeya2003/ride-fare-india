export default function RouteInfo({ route, city, originShort, destShort }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
      <span className="font-bold text-gray-900">{route.distance_display}</span>
      <span className="text-gray-400">·</span>
      <span className="font-semibold text-gray-600">{route.duration_display}</span>
      <span className="text-gray-400">·</span>
      <span className="text-gray-500 capitalize">{city}</span>
      {originShort && destShort && (
        <>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500 text-xs truncate max-w-xs">
            {originShort} → {destShort}
          </span>
        </>
      )}
    </div>
  )
}
