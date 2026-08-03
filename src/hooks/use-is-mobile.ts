import { useEffect, useState } from 'react'

// Matches Tailwind's md breakpoint (and OverlayProvider's MOBILE_BREAKPOINT).
const QUERY = '(max-width: 767px)'

/** True below the md breakpoint; tracks live resizes/rotation. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
