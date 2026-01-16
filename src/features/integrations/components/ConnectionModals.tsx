import { useState } from 'react'
import MetaAccountSelector from './MetaAccountSelector'
import FacebookPageSelector from './FacebookPageSelector'
import GA4PropertySelector from './GA4PropertySelector'
import GoogleAccountSelector from './GoogleAccountSelector'
import BrevoAccountSelector from './BrevoAccountSelector'
import HubSpotAccountSelector from './HubSpotAccountSelector'
import MailchimpAccountSelector from './MailchimpAccountSelector'

export interface ConnectionModalsProps {
  modals: {
    showBrevoModal: boolean
    showGoogleAccountSelector: boolean
    showMetaAccountSelector: boolean
    showBrevoAccountSelector: boolean
    showHubSpotAccountSelector: boolean
    showMailchimpAccountSelector: boolean
    showFacebookPageSelector: boolean
    showGA4PropertySelector: boolean
  }
  handlers: {
    onBrevoSubmit: (apiKey: string) => Promise<{ success: boolean; error?: string }>
    onBrevoUnlink: () => Promise<{ success: boolean; error?: string }>
    brevoSubmitting: boolean
  }
  onClose: {
    setShowBrevoModal: (show: boolean) => void
    setShowGoogleAccountSelector: (show: boolean) => void
    setShowMetaAccountSelector: (show: boolean) => void
    setShowBrevoAccountSelector: (show: boolean) => void
    setShowHubSpotAccountSelector: (show: boolean) => void
    setShowMailchimpAccountSelector: (show: boolean) => void
    setShowFacebookPageSelector: (show: boolean) => void
    setShowGA4PropertySelector: (show: boolean) => void
  }
  onSuccess: () => void
  currentAccountData?: any
  selectedAccount?: { id: string; name: string }
  ga4Properties?: any[]
  linkedGA4Properties?: any[]
}

/**
 * Renders all integration connection modals conditionally based on state.
 * Centralizes modal rendering logic to reduce duplication.
 */
const ConnectionModals = ({
  modals,
  handlers,
  onClose,
  onSuccess,
  currentAccountData,
  selectedAccount,
  ga4Properties,
  linkedGA4Properties
}: ConnectionModalsProps) => {
  // Local state for Brevo API Key form
  const [brevoApiKey, setBrevoApiKey] = useState('')
  const [brevoError, setBrevoError] = useState('')

  const handleBrevoSubmit = async () => {
    setBrevoError('')
    const result = await handlers.onBrevoSubmit(brevoApiKey)

    if (result.success) {
      onClose.setShowBrevoModal(false)
      setBrevoApiKey('')
      onSuccess()
    } else {
      setBrevoError(result.error || 'Failed to save API key')
    }
  }

  const handleBrevoUnlink = async () => {
    if (!confirm(`Disconnect Brevo from ${selectedAccount?.name || 'this account'}?`)) {
      return
    }

    setBrevoError('')
    const result = await handlers.onBrevoUnlink()

    if (result.success) {
      onClose.setShowBrevoModal(false)
      onSuccess()
    } else {
      setBrevoError(result.error || 'Failed to disconnect Brevo')
    }
  }

  return (
    <>
      {/* Brevo API Key Modal */}
      {modals.showBrevoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <img src="/icons/brevo.jpeg" alt="Brevo" className="w-10 h-10" />
                <h2 className="text-xl font-bold text-gray-900">
                  {currentAccountData?.brevo_api_key ? 'Manage Brevo Connection' : 'Connect Brevo'}
                </h2>
              </div>
              <p className="text-sm text-gray-600">
                {currentAccountData?.brevo_api_key
                  ? `Connected to ${currentAccountData.brevo_account_name || 'your Brevo account'} for ${selectedAccount?.name || 'this account'}`
                  : `Enter your Brevo API key to connect email marketing for ${selectedAccount?.name || 'this account'}.`
                }
              </p>
            </div>

            {/* Instructions - only show when NOT connected */}
            {!currentAccountData?.brevo_api_key && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">How to get your API key:</h3>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Log in to your Brevo account</li>
                  <li>Go to Settings → SMTP & API → API Keys</li>
                  <li>Click "Generate a new API key"</li>
                  <li>Copy the key and paste it below</li>
                </ol>
                <a
                  href="https://app.brevo.com/settings/keys/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Open Brevo API Settings
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            {/* API Key Input - only show when NOT connected */}
            {!currentAccountData?.brevo_api_key && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="text"
                  value={brevoApiKey}
                  onChange={(e) => setBrevoApiKey(e.target.value)}
                  placeholder="xkeysib-..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  disabled={handlers.brevoSubmitting}
                />
                {brevoError && (
                  <p className="mt-2 text-xs text-red-600">{brevoError}</p>
                )}
              </div>
            )}

            {/* Connected Account Display - show when connected */}
            {currentAccountData?.brevo_api_key && (
              <div className="mb-4 space-y-3">
                {/* Account Name */}
                {currentAccountData.brevo_account_name && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-green-900">{currentAccountData.brevo_account_name}</p>
                        <p className="text-xs text-green-700">Connected Brevo account</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Masked API Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono text-gray-600">
                    {currentAccountData.brevo_api_key.substring(0, 10)}...
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  onClose.setShowBrevoModal(false)
                  setBrevoApiKey('')
                  setBrevoError('')
                }}
                disabled={handlers.brevoSubmitting}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {currentAccountData?.brevo_api_key ? 'Close' : 'Cancel'}
              </button>
              {currentAccountData?.brevo_api_key ? (
                <button
                  onClick={handleBrevoUnlink}
                  disabled={handlers.brevoSubmitting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {handlers.brevoSubmitting ? 'Unlinking...' : 'Unlink'}
                </button>
              ) : (
                <button
                  onClick={handleBrevoSubmit}
                  disabled={handlers.brevoSubmitting || !brevoApiKey.trim()}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-medium text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {handlers.brevoSubmitting ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Google Account Selector Modal */}
      <GoogleAccountSelector
        isOpen={modals.showGoogleAccountSelector}
        onClose={() => onClose.setShowGoogleAccountSelector(false)}
        onSuccess={onSuccess}
      />

      {/* Meta Account Selector Modal */}
      <MetaAccountSelector
        isOpen={modals.showMetaAccountSelector}
        onClose={() => onClose.setShowMetaAccountSelector(false)}
        onSuccess={onSuccess}
        currentGoogleAccountName={selectedAccount?.name}
        currentAccountData={currentAccountData}
      />

      {/* Brevo Account Selector Modal */}
      <BrevoAccountSelector
        isOpen={modals.showBrevoAccountSelector}
        onClose={() => onClose.setShowBrevoAccountSelector(false)}
        onSuccess={onSuccess}
      />

      {/* HubSpot Account Selector Modal */}
      <HubSpotAccountSelector
        isOpen={modals.showHubSpotAccountSelector}
        onClose={() => onClose.setShowHubSpotAccountSelector(false)}
        onSuccess={onSuccess}
      />

      {/* Mailchimp Account Selector Modal */}
      <MailchimpAccountSelector
        isOpen={modals.showMailchimpAccountSelector}
        onClose={() => onClose.setShowMailchimpAccountSelector(false)}
        onSuccess={onSuccess}
      />

      {/* Facebook Page Selector Modal */}
      <FacebookPageSelector
        isOpen={modals.showFacebookPageSelector}
        onClose={() => onClose.setShowFacebookPageSelector(false)}
        onSuccess={onSuccess}
        currentAccountName={selectedAccount?.name}
        currentAccountData={currentAccountData}
      />

      {/* GA4 Property Selector Modal */}
      <GA4PropertySelector
        isOpen={modals.showGA4PropertySelector}
        onClose={() => onClose.setShowGA4PropertySelector(false)}
        onSuccess={onSuccess}
        currentAccountName={selectedAccount?.name}
        ga4Properties={ga4Properties}
        linkedProperties={linkedGA4Properties}
      />
    </>
  )
}

export default ConnectionModals
