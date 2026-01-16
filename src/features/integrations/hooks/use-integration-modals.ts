import { useState, useMemo } from 'react'

type ModalType =
  | 'brevo'
  | 'google'
  | 'meta'
  | 'brevo-selector'
  | 'hubspot'
  | 'mailchimp'
  | 'facebook'
  | 'ga4'
  | null

export interface IntegrationModals {
  showBrevoModal: boolean
  showGoogleAccountSelector: boolean
  showMetaAccountSelector: boolean
  showBrevoAccountSelector: boolean
  showHubSpotAccountSelector: boolean
  showMailchimpAccountSelector: boolean
  showFacebookPageSelector: boolean
  showGA4PropertySelector: boolean
  setShowBrevoModal: (show: boolean) => void
  setShowGoogleAccountSelector: (show: boolean) => void
  setShowMetaAccountSelector: (show: boolean) => void
  setShowBrevoAccountSelector: (show: boolean) => void
  setShowHubSpotAccountSelector: (show: boolean) => void
  setShowMailchimpAccountSelector: (show: boolean) => void
  setShowFacebookPageSelector: (show: boolean) => void
  setShowGA4PropertySelector: (show: boolean) => void
  openModal: ModalType
  closeModal: () => void
}

/**
 * Manages modal state for all integration-related modals.
 * Uses a single state variable to track which modal is open, ensuring only one modal is open at a time.
 */
export const useIntegrationModals = (): IntegrationModals => {
  const [openModal, setOpenModal] = useState<ModalType>(null)

  // Computed boolean flags for each modal
  const showBrevoModal = openModal === 'brevo'
  const showGoogleAccountSelector = openModal === 'google'
  const showMetaAccountSelector = openModal === 'meta'
  const showBrevoAccountSelector = openModal === 'brevo-selector'
  const showHubSpotAccountSelector = openModal === 'hubspot'
  const showMailchimpAccountSelector = openModal === 'mailchimp'
  const showFacebookPageSelector = openModal === 'facebook'
  const showGA4PropertySelector = openModal === 'ga4'

  // Setter functions for each modal
  const setShowBrevoModal = (show: boolean) => setOpenModal(show ? 'brevo' : null)
  const setShowGoogleAccountSelector = (show: boolean) => setOpenModal(show ? 'google' : null)
  const setShowMetaAccountSelector = (show: boolean) => setOpenModal(show ? 'meta' : null)
  const setShowBrevoAccountSelector = (show: boolean) => setOpenModal(show ? 'brevo-selector' : null)
  const setShowHubSpotAccountSelector = (show: boolean) => setOpenModal(show ? 'hubspot' : null)
  const setShowMailchimpAccountSelector = (show: boolean) => setOpenModal(show ? 'mailchimp' : null)
  const setShowFacebookPageSelector = (show: boolean) => setOpenModal(show ? 'facebook' : null)
  const setShowGA4PropertySelector = (show: boolean) => setOpenModal(show ? 'ga4' : null)

  const closeModal = () => setOpenModal(null)

  return {
    showBrevoModal,
    showGoogleAccountSelector,
    showMetaAccountSelector,
    showBrevoAccountSelector,
    showHubSpotAccountSelector,
    showMailchimpAccountSelector,
    showFacebookPageSelector,
    showGA4PropertySelector,
    setShowBrevoModal,
    setShowGoogleAccountSelector,
    setShowMetaAccountSelector,
    setShowBrevoAccountSelector,
    setShowHubSpotAccountSelector,
    setShowMailchimpAccountSelector,
    setShowFacebookPageSelector,
    setShowGA4PropertySelector,
    openModal,
    closeModal
  }
}
