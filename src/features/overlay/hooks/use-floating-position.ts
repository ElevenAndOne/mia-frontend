import { useState, useCallback, useEffect, type RefObject } from 'react'
import type { OverlayPosition, UseFloatingPositionOptions } from '../types'
import { calculatePosition, getViewportRect } from '../utils/position'

/**
 * Hook to calculate and update floating element position
 * @param anchorRef - Ref to the anchor/trigger element
 * @param floatingRef - Ref to the floating/overlay element
 * @param options - Positioning options
 */
export function useFloatingPosition(
  anchorRef: RefObject<HTMLElement | null>,
  floatingRef: RefObject<HTMLElement | null>,
  options: UseFloatingPositionOptions
): { position: OverlayPosition | null; update: () => void } {
  const { placement, offset = 8, flip = true, shift = true, isOpen } = options
  const [position, setPosition] = useState<OverlayPosition | null>(null)

  const update = useCallback(() => {
    if (!anchorRef.current || !floatingRef.current || !isOpen) {
      setPosition(null)
      return
    }

    const anchor = anchorRef.current.getBoundingClientRect()
    const floating = floatingRef.current.getBoundingClientRect()
    const viewport = getViewportRect()

    const result = calculatePosition({
      anchor,
      floating: { width: floating.width, height: floating.height },
      placement,
      offset: { mainAxis: offset },
      viewport,
      flip,
      shift,
    })

    setPosition(result)
  }, [anchorRef, floatingRef, placement, offset, flip, shift, isOpen])

  // Update position on open and when dependencies change
  useEffect(() => {
    if (!isOpen) {
      setPosition(null)
      return
    }

    // Initial position calculation (use requestAnimationFrame to ensure element is rendered)
    const rafId = requestAnimationFrame(update)

    // Update on scroll and resize
    const handleScrollOrResize = () => {
      requestAnimationFrame(update)
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen, update])

  return { position, update }
}
