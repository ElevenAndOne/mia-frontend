import { useEffect } from 'react'

/**
 * Hook to handle Escape key press
 * @param handler - Callback to invoke when Escape is pressed
 * @param isActive - Whether the listener is active
 */
export function useEscapeKey(handler: () => void, isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        handler()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handler, isActive])
}
