import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallPrompt() {
  const [prompt,    setPrompt]    = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  // Only show on Android (beforeinstallprompt fires); iOS users see Safari hint instead
  if (!prompt || dismissed || installed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-gray-950 text-white rounded-2xl shadow-2xl px-4 py-3.5 flex items-center gap-3 border border-gray-700">
        <div className="text-2xl leading-none select-none">🛺</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold">Add RideFare to Home Screen</p>
          <p className="text-[11px] text-gray-400">Works offline · No App Store needed</p>
        </div>
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 bg-white text-gray-950 text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 hover:bg-gray-100 transition"
        >
          <Download className="w-3 h-3" />
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-500 hover:text-gray-300 transition shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
