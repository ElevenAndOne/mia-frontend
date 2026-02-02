import { useEffect, useRef, type RefObject } from 'react'
import type { UseFocusTrapOptions } from '../types'

// Selector for focusable elements
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Hook to trap focus within a container element
 * @param containerRef - Ref to the container element
 * @param isActive - Whether focus trapping is active
 * @param options - Configuration options
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  options: UseFocusTrapOptions = {}
): void {
  const { returnFocusOnDeactivate = true } = options
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    // Store the currently focused element for restoration
    previouslyFocusedRef.current = document.activeElement as HTMLElement

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    const firstFocusable = focusableElements[0]

    // Focus the first focusable element or the container itself
    if (firstFocusable) {
      firstFocusable.focus()
    } else {
      // Make container focusable if no focusable children
      container.setAttribute('tabindex', '-1')
      container.focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      // Re-query focusable elements in case they changed
      const currentFocusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (currentFocusables.length === 0) return

      const first = currentFocusables[0]
      const last = currentFocusables[currentFocusables.length - 1]

      if (event.shiftKey) {
        // Shift + Tab: wrap from first to last
        if (document.activeElement === first) {
          event.preventDefault()
          last.focus()
        }
      } else {
        // Tab: wrap from last to first
        if (document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      // Restore focus to previously focused element
      if (returnFocusOnDeactivate && previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus()
      }
    }
  }, [containerRef, isActive, returnFocusOnDeactivate])
}
