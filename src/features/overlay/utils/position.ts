import type { OverlayPlacement, OverlayPosition, PositionOptions, OverlayOffset } from '../types'

/**
 * Get the viewport dimensions
 */
export function getViewportRect(): { width: number; height: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

/**
 * Get the opposite placement for flip behavior
 */
function getOppositePlacement(placement: OverlayPlacement): OverlayPlacement {
  const opposites: Record<string, OverlayPlacement> = {
    top: 'bottom',
    'top-start': 'bottom-start',
    'top-end': 'bottom-end',
    bottom: 'top',
    'bottom-start': 'top-start',
    'bottom-end': 'top-end',
    left: 'right',
    'left-start': 'right-start',
    'left-end': 'right-end',
    right: 'left',
    'right-start': 'left-start',
    'right-end': 'left-end',
  }
  return opposites[placement] || placement
}

/**
 * Get transform origin for animation based on placement
 */
function getTransformOrigin(placement: OverlayPlacement): string {
  const origins: Record<string, string> = {
    top: 'bottom center',
    'top-start': 'bottom left',
    'top-end': 'bottom right',
    bottom: 'top center',
    'bottom-start': 'top left',
    'bottom-end': 'top right',
    left: 'right center',
    'left-start': 'right top',
    'left-end': 'right bottom',
    right: 'left center',
    'right-start': 'left top',
    'right-end': 'left bottom',
    center: 'center center',
  }
  return origins[placement] || 'center center'
}

/**
 * Calculate the base position coordinates for a placement
 */
function getBasePosition(
  anchor: DOMRect,
  floating: { width: number; height: number },
  placement: OverlayPlacement,
  offset: OverlayOffset
): { x: number; y: number } {
  const mainAxisOffset = offset.mainAxis ?? 8
  const crossAxisOffset = offset.crossAxis ?? 0

  let x = 0
  let y = 0

  // Determine main axis position
  switch (placement) {
    case 'top':
    case 'top-start':
    case 'top-end':
      y = anchor.top - floating.height - mainAxisOffset
      break
    case 'bottom':
    case 'bottom-start':
    case 'bottom-end':
      y = anchor.bottom + mainAxisOffset
      break
    case 'left':
    case 'left-start':
    case 'left-end':
      x = anchor.left - floating.width - mainAxisOffset
      break
    case 'right':
    case 'right-start':
    case 'right-end':
      x = anchor.right + mainAxisOffset
      break
    case 'center':
      // Center positioning (for modals)
      x = (window.innerWidth - floating.width) / 2
      y = (window.innerHeight - floating.height) / 2
      return { x, y }
  }

  // Determine cross axis position
  switch (placement) {
    case 'top':
    case 'bottom':
      // Center horizontally
      x = anchor.left + anchor.width / 2 - floating.width / 2 + crossAxisOffset
      break
    case 'top-start':
    case 'bottom-start':
      // Align to start (left)
      x = anchor.left + crossAxisOffset
      break
    case 'top-end':
    case 'bottom-end':
      // Align to end (right)
      x = anchor.right - floating.width + crossAxisOffset
      break
    case 'left':
    case 'right':
      // Center vertically
      y = anchor.top + anchor.height / 2 - floating.height / 2 + crossAxisOffset
      break
    case 'left-start':
    case 'right-start':
      // Align to start (top)
      y = anchor.top + crossAxisOffset
      break
    case 'left-end':
    case 'right-end':
      // Align to end (bottom)
      y = anchor.bottom - floating.height + crossAxisOffset
      break
  }

  return { x, y }
}

/**
 * Check if position overflows viewport and return the overflow amount
 */
function getOverflow(
  x: number,
  y: number,
  floating: { width: number; height: number },
  viewport: { width: number; height: number },
  padding: number
): { top: number; right: number; bottom: number; left: number } {
  return {
    top: Math.max(0, padding - y),
    right: Math.max(0, x + floating.width - viewport.width + padding),
    bottom: Math.max(0, y + floating.height - viewport.height + padding),
    left: Math.max(0, padding - x),
  }
}

/**
 * Determine if the floating element should flip to the opposite side
 */
function shouldFlip(
  placement: OverlayPlacement,
  overflow: { top: number; right: number; bottom: number; left: number }
): boolean {
  switch (placement) {
    case 'top':
    case 'top-start':
    case 'top-end':
      return overflow.top > 0
    case 'bottom':
    case 'bottom-start':
    case 'bottom-end':
      return overflow.bottom > 0
    case 'left':
    case 'left-start':
    case 'left-end':
      return overflow.left > 0
    case 'right':
    case 'right-start':
    case 'right-end':
      return overflow.right > 0
    default:
      return false
  }
}

/**
 * Apply shift to keep floating element within viewport
 */
function applyShift(
  x: number,
  y: number,
  floating: { width: number; height: number },
  viewport: { width: number; height: number },
  padding: number
): { x: number; y: number } {
  // Constrain horizontally
  const minX = padding
  const maxX = viewport.width - floating.width - padding
  const shiftedX = Math.max(minX, Math.min(x, maxX))

  // Constrain vertically
  const minY = padding
  const maxY = viewport.height - floating.height - padding
  const shiftedY = Math.max(minY, Math.min(y, maxY))

  return { x: shiftedX, y: shiftedY }
}

/**
 * Calculate the final position for a floating element
 */
export function calculatePosition(options: PositionOptions): OverlayPosition {
  const {
    anchor,
    floating,
    placement,
    offset = {},
    viewport,
    flip = true,
    shift = true,
    padding = 8,
  } = options

  // Calculate initial position
  let { x, y } = getBasePosition(anchor, floating, placement, offset)
  let finalPlacement = placement

  // Check for overflow and potentially flip
  if (flip && placement !== 'center') {
    const overflow = getOverflow(x, y, floating, viewport, padding)

    if (shouldFlip(placement, overflow)) {
      const flippedPlacement = getOppositePlacement(placement)
      const flippedPosition = getBasePosition(anchor, floating, flippedPlacement, offset)

      // Check if flipped position is better
      const flippedOverflow = getOverflow(
        flippedPosition.x,
        flippedPosition.y,
        floating,
        viewport,
        padding
      )

      // Use flipped position if it has less overflow
      const currentOverflowSum =
        overflow.top + overflow.right + overflow.bottom + overflow.left
      const flippedOverflowSum =
        flippedOverflow.top +
        flippedOverflow.right +
        flippedOverflow.bottom +
        flippedOverflow.left

      if (flippedOverflowSum < currentOverflowSum) {
        x = flippedPosition.x
        y = flippedPosition.y
        finalPlacement = flippedPlacement
      }
    }
  }

  // Apply shift to stay within viewport
  if (shift && placement !== 'center') {
    const shifted = applyShift(x, y, floating, viewport, padding)
    x = shifted.x
    y = shifted.y
  }

  return {
    x,
    y,
    placement: finalPlacement,
    transformOrigin: getTransformOrigin(finalPlacement),
  }
}
