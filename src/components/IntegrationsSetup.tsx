import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSession, AccountMapping } from '../contexts/SessionContext'
import { apiFetch } from '../utils/api'

interface GA4Property {
  property_id: string
  display_name: string
}

interface IntegrationsSetupProps {
  selectedAccount: AccountMapping
  onComplete: () => void
  onBack?: () => void
}

const IntegrationsSetup = ({ selectedAccount, onComplete, onBack }: IntegrationsSetupProps) => {
  const { sessionId } = useSession()
  const [ga4Properties, setGA4Properties] = useState<GA4Property[]>([])
  const [selectedGA4, setSelectedGA4] = useState<string | null>(
    selectedAccount.ga4_property_id || null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available GA4 properties
  useEffect(() => {
    fetchGA4Properties()
  }, [])

  const fetchGA4Properties = async () => {
    try {
      setIsLoading(true)
      const response = await apiFetch('/api/accounts/available', {
        headers: {
          'X-Session-ID': sessionId || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('[INTEGRATIONS-SETUP] Available GA4 properties:', data.ga4_properties)
        setGA4Properties(data.ga4_properties || [])
      } else {
        console.error('[INTEGRATIONS-SETUP] Failed to fetch GA4 properties')
      }
    } catch (err) {
      console.error('[INTEGRATIONS-SETUP] Error fetching GA4 properties:', err)
      setError('Failed to load GA4 properties')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGA4Select = (propertyId: string) => {
    if (propertyId === 'none') {
      setSelectedGA4(null)
    } else {
      setSelectedGA4(propertyId)
    }
  }

  const handleLinkGA4 = async () => {
    if (!selectedGA4) {
      return true // No GA4 selected, skip linking
    }

    try {
      const response = await apiFetch('/api/accounts/link-platform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || ''
        },
        body: JSON.stringify({
          account_id: selectedAccount.id,
          platform: 'ga4',
          platform_id: selectedGA4
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('[INTEGRATIONS-SETUP] GA4 linked successfully:', data)
        return true
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to link GA4 property')
        return false
      }
    } catch (err) {
      console.error('[INTEGRATIONS-SETUP] Error linking GA4:', err)
      setError('Failed to link GA4 property')
      return false
    }
  }

  const handleContinue = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Link GA4 if selected
      const success = await handleLinkGA4()

      if (success) {
        // Small delay for UX feedback
        setTimeout(() => {
          onComplete()
        }, 500)
      }
    } catch (err) {
      console.error('[INTEGRATIONS-SETUP] Error during save:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  if (isLoading) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center" style={{ maxWidth: '393px', margin: '0 auto' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading platform options...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-y-auto" style={{ maxWidth: '393px', margin: '0 auto' }}>
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors mb-4"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-semibold text-black mb-3">
            Setup Your Platforms
          </h1>
          <p className="text-gray-600">
            Connect your marketing platforms to get started
          </p>
        </motion.div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <p className="text-red-600 text-sm">{error}</p>
          </motion.div>
        </div>
      )}

      {/* Platform Cards */}
      <div className="px-6 flex-1 space-y-6 pb-32">
        {/* Google Ads - Already Connected */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border-2 border-green-200 rounded-xl p-5 bg-green-50"
        >
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-white">
              <span>✅</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Google Ads</h3>
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                  Connected
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                {selectedAccount.name}
              </p>
              <p className="text-xs text-gray-500">
                Account ID: {selectedAccount.google_ads_id}
              </p>
            </div>
          </div>
        </motion.div>

        {/* GA4 - Select from Dropdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border-2 border-gray-200 rounded-xl p-5"
        >
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-blue-50">
              <span>📊</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Google Analytics 4</h3>
                <span className="text-xs text-gray-500">(Optional)</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Link a GA4 property to see website analytics
              </p>

              {/* GA4 Dropdown */}
              <select
                value={selectedGA4 || ''}
                onChange={(e) => handleGA4Select(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors text-sm"
                disabled={isSaving}
              >
                <option value="">Select GA4 Property...</option>
                {ga4Properties.map((prop) => (
                  <option key={prop.property_id} value={prop.property_id}>
                    {prop.display_name} ({prop.property_id})
                  </option>
                ))}
                <option value="none">None (skip GA4 for now)</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Meta - Coming Soon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border-2 border-gray-200 rounded-xl p-5 opacity-60"
        >
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-blue-50">
              <span>📘</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Meta/Facebook Ads</h3>
                <span className="text-xs text-gray-500">(Coming Soon)</span>
              </div>
              <p className="text-sm text-gray-600">
                Facebook & Instagram ad performance
              </p>
            </div>
          </div>
        </motion.div>

        {/* Brevo - Coming Soon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="border-2 border-gray-200 rounded-xl p-5 opacity-60"
        >
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-purple-50">
              <span>📧</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Brevo</h3>
                <span className="text-xs text-gray-500">(Coming Soon)</span>
              </div>
              <p className="text-sm text-gray-600">
                Email campaign performance
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Fixed Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4" style={{ maxWidth: '393px', margin: '0 auto' }}>
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            disabled={isSaving}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip for Now
          </button>
          <button
            onClick={handleContinue}
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Continue to Mia'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default IntegrationsSetup
