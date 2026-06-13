import { useState, useEffect } from 'react'

/**
 * Tracks the bottom-left corner of an input element so a portal-rendered
 * dropdown can be pinned to it. Re-calculates on scroll and resize.
 */
export function useDropdownPosition(inputRef, open) {
  const [style, setStyle] = useState(null)

  useEffect(() => {
    if (!open) { setStyle(null); return }

    const calc = () => {
      if (!inputRef.current) return
      const r = inputRef.current.getBoundingClientRect()
      setStyle({
        position: 'fixed',
        top:   r.bottom + 4,
        left:  r.left,
        width: r.width,
        zIndex: 99999,
      })
    }

    calc()
    window.addEventListener('scroll', calc, true)
    window.addEventListener('resize', calc)
    return () => {
      window.removeEventListener('scroll', calc, true)
      window.removeEventListener('resize', calc)
    }
  }, [open, inputRef])

  return style
}
