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
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for HTTP contexts (e.g. LAN IP testing)
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    clearTimer()
    timeoutRef.current = window.setTimeout(() => setCopied(false), resetDelay)
  }, [clearTimer, resetDelay])

  useEffect(() => clearTimer, [clearTimer])

  return { copied, copy }
}
