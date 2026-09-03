import { useEffect, useState, type RefObject } from 'react'

/**
 * Live pixel width of a DOM element (0 until measured). Backs responsive SVG
 * charts that need real pixel geometry rather than a scaled viewBox.
 */
export const useElementWidth = <T extends HTMLElement>(ref: RefObject<T | null>): number => {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const measure = () => setWidth(element.getBoundingClientRect().width)
    measure()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return width
}
