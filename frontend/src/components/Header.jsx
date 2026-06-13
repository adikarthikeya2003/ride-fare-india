export default function Header() {
  return (
    <header className="bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none">🛺</span>
          <div>
            <span className="font-black text-base tracking-tight">RideFare</span>
            <span className="text-gray-400 font-semibold text-base tracking-tight"> India</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="hidden sm:flex items-center gap-1.5 text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Estimates only · not live pricing
          </span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition text-xs font-medium"
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </header>
  )
}
