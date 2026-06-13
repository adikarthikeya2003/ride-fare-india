export default function DisclaimerBanner() {
  return (
    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
      <span className="text-base leading-none mt-0.5">⚠️</span>
      <p>
        <strong>Estimated fares — not live data.</strong> Figures use published fare structures
        (base + per-km + per-min × surge range). Actual fares vary with real-time surge, traffic,
        and platform promotions. Always verify in-app before booking.
      </p>
    </div>
  )
}
