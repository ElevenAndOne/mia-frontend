import { useContext, createContext } from 'react'
import type { OverlayContextType } from '../types'

// Create the context here so it can be imported by both the provider and the hook
export const OverlayContext = createContext<OverlayContextType | null>(null)

/**
 * Hook to access the overlay context
 * @throws Error if used outside of OverlayProvider
 */
export function useOverlayContext(): OverlayContextType {
  const context = useContext(OverlayContext)

  if (!context) {
    throw new Error('useOverlayContext must be used within an OverlayProvider')
  }

  return context
}

/**
 * Hook to check if device is mobile
 * Safe to use outside of OverlayProvider (returns false if no provider)
 */
export function useIsMobile(): boolean {
  const context = useContext(OverlayContext)
  return context?.isMobile ?? false
}
