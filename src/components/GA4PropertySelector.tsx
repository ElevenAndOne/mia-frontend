import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../utils/api'
import { useSession } from '../contexts/SessionContext'

interface GA4Property {
  property_id: string
  display_name: string
}

interface GA4PropertySelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentAccountName?: string
  ga4Properties?: GA4Property[]  // Optional: pass pre-fetched properties
}

const GA4PropertySelector = ({ isOpen, onClose, onSuccess, currentAccountName, ga4Properties }: GA4PropertySelectorProps) => {
  const { sessionId, selectedAccount } = useSession()
  const [properties, setProperties] = useState<GA4Property[]>([])
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Use pre-fetched properties if available, otherwise fetch
  useEffect(() => {
    if (isOpen) {
      if (ga4Properties && ga4Properties.length > 0) {
        // Use pre-fetched properties
        setProperties(ga4Properties)
        // Don't auto-select - let user choose which properties to link
        setIsLoading(false)
      } else {
        // Fetch properties if not provided
        fetchGA4Properties()
      }
    }
  }, [isOpen, ga4Properties])

  const fetchGA4Properties = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiFetch('/api/accounts/available', {
        headers: {
          'X-Session-ID': sessionId || 'default'
        }
      })

      const data = await response.json()

      if (data.success && data.ga4_properties) {
        setProperties(data.ga4_properties)
        // Don't auto-select - let user choose which properties to link
      } else {
        setError('Failed to fetch GA4 properties')
      }
    } catch (err: any) {
      console.error('Error fetching GA4 properties:', err)
      setError('Failed to load GA4 properties. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePropertySelection = (propertyId: string) => {
    setSelectedPropertyIds(prev => {
      if (prev.includes(propertyId)) {
        return prev.filter(id => id !== propertyId)
      } else {
        return [...prev, propertyId]
      }
    })
  }

  const handleLinkProperties = async () => {
    if (selectedPropertyIds.length === 0) {
      setError('Please select at least one GA4 property')
      return
    }

    setIsLinking(true)
    setError(null)

    try {
      // Use selected account from context
      if (!selectedAccount) {
        throw new Error('No account selected')
      }

      const accountId = selectedAccount.id

      console.log('[GA4-PROPERTY-SELECTOR] Linking', selectedPropertyIds.length, 'properties to account', selectedAccount.name)

      // Join multiple property IDs with comma for backend storage
      const propertyIdsString = selectedPropertyIds.join(',')

      // Link GA4 properties (comma-separated)
      const response = await apiFetch('/api/accounts/link-platform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || 'default'
        },
        body: JSON.stringify({
          account_id: accountId,
          platform: 'ga4',
          platform_id: propertyIdsString
        })
      })

      if (!response.ok) {
        throw new Error('Failed to link GA4 property')
      }

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        onSuccess?.()
        handleClose()
      } else {
        setError(data.message || 'Failed to link GA4 property')
      }
    } catch (err: any) {
      console.error('GA4 property linking error:', err)
      setError('Failed to link GA4 property. Please try again.')
    } finally {
      setIsLinking(false)
    }
  }

  const handleClose = () => {
    if (!isLinking) {
      setSelectedPropertyIds([])
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <img src="/icons/google_analytics.svg" alt="GA4" className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Link GA4 Properties</h2>
                  {currentAccountName && (
                    <p className="text-sm text-gray-500">to {currentAccountName}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isLinking}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Loading State */}
              {isLoading && (
                <div className="py-8 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600">Loading your GA4 properties...</p>
                </div>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success State */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium text-green-800">GA4 property linked successfully!</p>
                  </div>
                </div>
              )}

              {/* Property Selection */}
              {!isLoading && !success && properties.length > 0 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select GA4 Properties ({selectedPropertyIds.length} selected)
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {properties.map((property) => {
                        const isSelected = selectedPropertyIds.includes(property.property_id)
                        return (
                          <button
                            key={property.property_id}
                            onClick={() => togglePropertySelection(property.property_id)}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Checkbox */}
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'bg-orange-600 border-orange-600'
                                  : 'border-gray-300 bg-white'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              {/* Property Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{property.display_name}</p>
                                <p className="text-sm text-gray-500 truncate">
                                  Property ID: {property.property_id}
                                </p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Helper Text */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-orange-800">
                      💡 Select one or more GA4 properties to link to your {currentAccountName || 'Google Ads'} account for website analytics.
                    </p>
                  </div>
                </>
              )}

              {/* No Properties Found */}
              {!isLoading && !error && properties.length === 0 && (
                <div className="py-8 text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-gray-600">No GA4 properties found</p>
                  <p className="text-sm text-gray-500 mt-2">Make sure you have access to at least one GA4 property</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {!isLoading && !success && properties.length > 0 && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleClose}
                  disabled={isLinking}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkProperties}
                  disabled={selectedPropertyIds.length === 0 || isLinking}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLinking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Applying...
                    </>
                  ) : (
                    `Apply (${selectedPropertyIds.length})`
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default GA4PropertySelector
