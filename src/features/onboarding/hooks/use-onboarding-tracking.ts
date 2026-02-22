import { useEffect, useRef } from 'react'
import { trackEvent } from '../../../utils/analytics'

interface UseOnboardingTrackingParams {
  currentProgress: number
  showMetaSelector: boolean
  showGoogleSelector: boolean
}

export const useOnboardingTracking = ({
  currentProgress,
  showMetaSelector,
  showGoogleSelector,
}: UseOnboardingTrackingParams) => {
  const previousProgressRef = useRef<number | null>(null)

  useEffect(() => {
    if (previousProgressRef.current === currentProgress) return

    trackEvent('onboarding_progress', {
      step: currentProgress,
      total_steps: 4,
    })
    previousProgressRef.current = currentProgress
  }, [currentProgress])

  useEffect(() => {
    if (!showMetaSelector) return

    trackEvent('onboarding_ui_state', {
      state: 'meta_selector_open',
    })
  }, [showMetaSelector])

  useEffect(() => {
    if (!showGoogleSelector) return

    trackEvent('onboarding_ui_state', {
      state: 'google_selector_open',
    })
  }, [showGoogleSelector])
}
