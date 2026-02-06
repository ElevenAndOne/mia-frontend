import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface OverlayPortalProps {
  children: ReactNode
}

/**
 * Portal component that renders children to document.body
 * Used by overlay components to escape parent stacking contexts
 */
export function OverlayPortal({ children }: OverlayPortalProps) {
  // Render to document.body to escape any overflow:hidden or stacking context issues
  return createPortal(children, document.body)
}
