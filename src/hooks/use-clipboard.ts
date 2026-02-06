import { useCallback, useEffect, useRef, useState } from 'react'

interface UseClipboardOptions {
  resetDelay?: number
}

export const useClipboard = ({ resetDelay = 2000 }: UseClipboardOptions = {}) => {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const copy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    clearTimer()
    timeoutRef.current = window.setTimeout(() => setCopied(false), resetDelay)
  }, [clearTimer, resetDelay])

  useEffect(() => clearTimer, [clearTimer])

  return { copied, copy }
}
