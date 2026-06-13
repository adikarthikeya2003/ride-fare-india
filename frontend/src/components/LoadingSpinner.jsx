export default function LoadingSpinner() {
  const platforms = ['Uber', 'Ola', 'Rapido', 'Namma Yatri', 'inDrive']
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
      <div className="relative w-10 h-10 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full border-[3px] border-gray-100" />
        <div className="absolute inset-0 rounded-full border-[3px] border-t-gray-900 animate-spin" />
      </div>
      <p className="text-gray-800 font-semibold text-sm">Fetching fare estimates…</p>
      <p className="text-gray-400 text-xs mt-1">{platforms.join(' · ')}</p>
    </div>
  )
}
