import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { OverlayContext } from './hooks/use-overlay-context'
import type { OverlayContextType } from './types'

// Mobile breakpoint (matches Tailwind's md breakpoint)
const MOBILE_BREAKPOINT = 768

// Base z-index for overlay stacking
const BASE_Z_INDEX = 1000
const Z_INDEX_INCREMENT = 10

interface OverlayProviderProps {
  children: ReactNode
}

export function OverlayProvider({ children }: OverlayProviderProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [activeOverlays, setActiveOverlays] = useState<string[]>([])

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Register an overlay in the stack
  const registerOverlay = useCallback((id: string) => {
    setActiveOverlays((prev) => {
      if (prev.includes(id)) return prev
      return [...prev, id]
    })
  }, [])

  // Unregister an overlay from the stack
  const unregisterOverlay = useCallback((id: string) => {
    setActiveOverlays((prev) => prev.filter((overlayId) => overlayId !== id))
  }, [])

  // Get z-index for an overlay based on its position in the stack
  const getZIndex = useCallback(
    (id: string) => {
      const index = activeOverlays.indexOf(id)
      if (index === -1) return BASE_Z_INDEX
      return BASE_Z_INDEX + index * Z_INDEX_INCREMENT
    },
    [activeOverlays]
  )

  const contextValue: OverlayContextType = {
    isMobile,
    activeOverlays,
    registerOverlay,
    unregisterOverlay,
    getZIndex,
  }

  return <OverlayContext.Provider value={contextValue}>{children}</OverlayContext.Provider>
}
