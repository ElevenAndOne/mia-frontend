import { useEffect, type RefObject } from 'react'

/**
 * Hook to detect clicks outside of specified elements
 * @param refs - Array of refs to elements that should not trigger the handler
 * @param handler - Callback to invoke when clicking outside
 * @param isActive - Whether the listener is active
 */
export function useClickOutside(
  refs: RefObject<HTMLElement | null>[],
  handler: () => void,
  isActive: boolean
): void {
  useEffect(() => {
    if (!isActive) return

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node

      // Check if click is inside any of the refs
      const isInsideAnyRef = refs.some((ref) => {
        return ref.current?.contains(target)
      })

      if (!isInsideAnyRef) {
        handler()
      }
    }

    // Use mousedown for immediate response (before focus changes)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [refs, handler, isActive])
}
