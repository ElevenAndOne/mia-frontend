import { useCallback, type KeyboardEvent } from 'react'

interface UseRovingFocusParams {
  selector: string
}

export const useRovingFocus = ({ selector }: UseRovingFocusParams) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent, index: number) => {
      const items = Array.from(document.querySelectorAll<HTMLElement>(selector))
      if (!items.length) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          items[(index + 1) % items.length]?.focus()
          break
        case 'ArrowUp':
          event.preventDefault()
          items[(index - 1 + items.length) % items.length]?.focus()
          break
        case 'Home':
          event.preventDefault()
          items[0]?.focus()
          break
        case 'End':
          event.preventDefault()
          items[items.length - 1]?.focus()
          break
        default:
          break
      }
    },
    [selector]
  )

  return { handleKeyDown }
}
