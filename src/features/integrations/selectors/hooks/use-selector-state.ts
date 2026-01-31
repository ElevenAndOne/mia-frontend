import { useState, useCallback } from 'react'

interface UseSelectorStateOptions {
  onSuccess?: () => void
  onClose: () => void
  successDelay?: number
}

interface SelectorState<TId> {
  selectedId: TId | null
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
  success: boolean
}

interface SelectorActions<TId> {
  setSelectedId: (id: TId | null) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  handleSuccess: () => void
  handleClose: () => void
  resetState: () => void
  withSubmitting: <R>(fn: () => Promise<R>) => Promise<R | undefined>
}

export function useSelectorState<TId extends string | number = string>({
  onSuccess,
  onClose,
  successDelay = 1000,
}: UseSelectorStateOptions): [SelectorState<TId>, SelectorActions<TId>] {
  const [selectedId, setSelectedId] = useState<TId | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSuccess = useCallback(() => {
    setSuccess(true)
    setTimeout(() => {
      onSuccess?.()
      onClose()
    }, successDelay)
  }, [onSuccess, onClose, successDelay])

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setSelectedId(null)
      setError(null)
      setSuccess(false)
      onClose()
    }
  }, [isSubmitting, onClose])

  const resetState = useCallback(() => {
    setSelectedId(null)
    setIsLoading(true)
    setError(null)
    setSuccess(false)
  }, [])

  const withSubmitting = useCallback(async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await fn()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return undefined
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return [
    { selectedId, isLoading, isSubmitting, error, success },
    { setSelectedId, setIsLoading, setError, handleSuccess, handleClose, resetState, withSubmitting },
  ]
}
