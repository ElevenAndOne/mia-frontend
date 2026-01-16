/**
 * usePlatformConnection - Platform connection modal state management
 *
 * Manages the state for Meta and Google account selector modals during onboarding.
 * Handles opening/closing of connection modals and provides callbacks for success.
 */

import { useState, useCallback, useEffect } from 'react'

export const usePlatformConnection = () => {
  // Modal state
  const [showMetaSelector, setShowMetaSelector] = useState(false)
  const [showGoogleSelector, setShowGoogleSelector] = useState(false)

  // Debug: Log when selector modals change
  useEffect(() => {
    console.log('[ONBOARDING] showGoogleSelector changed to:', showGoogleSelector)
  }, [showGoogleSelector])

  useEffect(() => {
    console.log('[ONBOARDING] showMetaSelector changed to:', showMetaSelector)
  }, [showMetaSelector])

  // Open Meta account selector
  const openMetaSelector = useCallback(() => {
    setShowMetaSelector(true)
  }, [])

  // Open Google account selector
  const openGoogleSelector = useCallback(() => {
    console.log('[ONBOARDING] Setting showGoogleSelector to true')
    setShowGoogleSelector(true)
  }, [])

  // Close Meta selector
  const closeMetaSelector = useCallback(() => {
    setShowMetaSelector(false)
  }, [])

  // Close Google selector
  const closeGoogleSelector = useCallback(() => {
    setShowGoogleSelector(false)
  }, [])

  // Close all platform selectors
  const closePlatformSelectors = useCallback(() => {
    setShowMetaSelector(false)
    setShowGoogleSelector(false)
  }, [])

  return {
    showMetaSelector,
    showGoogleSelector,
    openMetaSelector,
    openGoogleSelector,
    closeMetaSelector,
    closeGoogleSelector,
    closePlatformSelectors,
  }
}
