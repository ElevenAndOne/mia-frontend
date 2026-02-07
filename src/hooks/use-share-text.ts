import { useCallback } from 'react'

export const useShareText = () => {
  const share = useCallback(async (text: string) => {
    if (typeof navigator === 'undefined') {
      return false
    }

    if ('share' in navigator) {
      try {
        await navigator.share({ text })
        return true
      } catch {
        return false
      }
    }

    return false
  }, [])

  return { share }
}
