import { useState, useEffect } from 'react'
import { apiFetch } from '../../../utils/api'
import { useSession } from '../../../contexts/session-context'
import { ModalShell } from '../../../components/modal-shell'

interface GA4Property {
  property_id: string
  display_name: string
}

interface LinkedGA4Property {
  property_id: string
  display_name: string
  is_primary: boolean
  sort_order: number
}

interface GA4PropertySelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentAccountName?: string
  ga4Properties?: GA4Property[]  // Optional: pass pre-fetched properties
  linkedProperties?: LinkedGA4Property[]  // Already linked properties
}

const GA4PropertySelector = ({ isOpen, onClose, onSuccess, currentAccountName, ga4Properties, linkedProperties }: GA4PropertySelectorProps) => {
  const { sessionId, selectedAccount } = useSession()
  const [properties, setProperties] = useState<GA4Property[]>([])
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [primaryPropertyId, setPrimaryPropertyId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Use pre-fetched properties if available, otherwise fetch
  useEffect(() => {
    if (isOpen) {
      if (ga4Properties && ga4Properties.length > 0) {
        // Sort pre-fetched properties alphabetically by display name (A-Z)
        const sortedProperties = [...ga4Properties].sort((a, b) =>
          a.display_name.localeCompare(b.display_name)
        )
        setProperties(sortedProperties)

        // Pre-select already linked properties
        if (linkedProperties && linkedProperties.length > 0) {
          const linkedIds = linkedProperties.map(p => p.property_id)
          setSelectedPropertyIds(linkedIds)

          // Set primary property
          const primary = linkedProperties.find(p => p.is_primary)
          if (primary) {
            setPrimaryPropertyId(primary.property_id)
          }
        }

        setIsLoading(false)
      } else {
        // Fetch properties if not provided
        fetchGA4Properties()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchGA4Properties is intentionally omitted to prevent re-fetching on every render
  }, [isOpen, ga4Properties, linkedProperties])

  const fetchGA4Properties = async (forceRefresh: boolean = false) => {
    setIsLoading(true)
    setError(null)

    try {
      // Pass refresh=true to bypass cache and fetch fresh from Google API
      const url = forceRefresh
        ? '/api/accounts/available?refresh=true'
        : '/api/accounts/available'

      const response = await apiFetch(url, {
        headers: {
          'X-Session-ID': sessionId || 'default'
        }
      })

      const data = await response.json()

      if (data.success && data.ga4_properties) {
        // Sort properties alphabetically by display name (A-Z)
        const sortedProperties = data.ga4_properties.sort((a: GA4Property, b: GA4Property) =>
          a.display_name.localeCompare(b.display_name)
        )
        setProperties(sortedProperties)
        // Don't auto-select - let user choose which properties to link
      } else {
        setError('Failed to fetch GA4 properties')
      }
    } catch (err) {
      console.error('Error fetching GA4 properties:', err)
      setError('Failed to load GA4 properties. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePropertySelection = (propertyId: string) => {
    setSelectedPropertyIds(prev => {
      const newSelection = prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]

      // If deselecting the primary, clear primary
      if (!newSelection.includes(propertyId) && primaryPropertyId === propertyId) {
        setPrimaryPropertyId(newSelection[0] || null)
      }

      // If this is the first selection, make it primary
      if (newSelection.length === 1 && !primaryPropertyId) {
        setPrimaryPropertyId(newSelection[0])
      }

      return newSelection
    })
  }

  const setPrimary = (propertyId: string) => {
    setPrimaryPropertyId(propertyId)
  }

  const handleLinkProperties = async () => {
    setIsLinking(true)
    setError(null)

    try {
      // Use selected account from context
      if (!selectedAccount) {
        throw new Error('No account selected')
      }

      const accountId = selectedAccount.id

      if (selectedPropertyIds.length === 0) {
        console.log('[GA4-PROPERTY-SELECTOR] Unlinking all GA4 properties from account', selectedAccount.name)
      } else {
        console.log('[GA4-PROPERTY-SELECTOR] Linking', selectedPropertyIds.length, 'properties to account', selectedAccount.name)
        console.log('[GA4-PROPERTY-SELECTOR] Primary property:', primaryPropertyId)
      }

      // Order properties with primary first (or empty string if unlinking)
      const orderedPropertyIds = selectedPropertyIds.length > 0
        ? (primaryPropertyId
          ? [primaryPropertyId, ...selectedPropertyIds.filter(id => id !== primaryPropertyId)]
          : selectedPropertyIds)
        : []

      // Join multiple property IDs with comma for backend storage (primary first)
      // Empty string if unlinking all properties
      const propertyIdsString = orderedPropertyIds.join(',')

      // Link GA4 properties (comma-separated, primary first) or unlink if empty
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
    } catch (err) {
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
    <ModalShell isOpen={isOpen} onClose={handleClose} panelClassName="max-w-md p-6">
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
                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Select GA4 Properties ({selectedPropertyIds.length} selected)
                      </label>
                      <button
                        onClick={() => fetchGA4Properties(true)}
                        className="text-xs text-orange-600 hover:text-orange-700 hover:underline"
                      >
                        Refresh list
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {properties.map((property) => {
                        const isSelected = selectedPropertyIds.includes(property.property_id)
                        const isPrimary = primaryPropertyId === property.property_id
                        return (
                          <div
                            key={property.property_id}
                            className={`relative p-4 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Checkbox */}
                              <button
                                onClick={() => togglePropertySelection(property.property_id)}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-orange-600 border-orange-600'
                                    : 'border-gray-300 bg-white hover:border-gray-400'
                                }`}
                              >
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                              {/* Property Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 truncate">{property.display_name}</p>
                                  {isPrimary && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 truncate">
                                  Property ID: {property.property_id}
                                </p>
                              </div>
                              {/* Set as Primary Button */}
                              {isSelected && !isPrimary && (
                                <button
                                  onClick={() => setPrimary(property.property_id)}
                                  className="px-3 py-1 text-xs font-medium text-orange-700 bg-white border border-orange-300 rounded hover:bg-orange-50 transition-colors"
                                >
                                  Set as Primary
                                </button>
                              )}
                            </div>
                          </div>
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
                  disabled={isLinking}
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
    </ModalShell>
  )
}

export default GA4PropertySelector
