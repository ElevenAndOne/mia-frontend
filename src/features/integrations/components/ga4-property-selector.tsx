import { useState, useEffect, useCallback } from 'react'
import * as Dialog from '@/components/ui/dialog'
import { Alert, Spinner, Button } from '@/components/ui'
import { apiFetch } from '@/utils/api'
import { useSession } from '@/contexts/session-context-shim'
import { cn } from '@/utils/utils'

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
  ga4Properties?: GA4Property[]
  linkedProperties?: LinkedGA4Property[]
}

const GA4PropertySelector = ({
  isOpen,
  onClose,
  onSuccess,
  currentAccountName,
  ga4Properties,
  linkedProperties,
}: GA4PropertySelectorProps) => {
  const { sessionId, selectedAccount } = useSession()
  const [properties, setProperties] = useState<GA4Property[]>([])
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [primaryPropertyId, setPrimaryPropertyId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fetchGA4Properties = useCallback(async (forceRefresh = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const url = forceRefresh ? '/api/accounts/available?refresh=true' : '/api/accounts/available'
      const response = await apiFetch(url, {
        headers: { 'X-Session-ID': sessionId || 'default' },
      })
      const data = await response.json()

      if (data.success && data.ga4_properties) {
        const sorted = data.ga4_properties.sort((a: GA4Property, b: GA4Property) =>
          a.display_name.localeCompare(b.display_name)
        )
        setProperties(sorted)
      } else {
        setError('Failed to fetch GA4 properties')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GA4 properties')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (isOpen) {
      if (ga4Properties?.length) {
        const sorted = [...ga4Properties].sort((a, b) => a.display_name.localeCompare(b.display_name))
        setProperties(sorted)

        if (linkedProperties?.length) {
          setSelectedPropertyIds(linkedProperties.map((p) => p.property_id))
          const primary = linkedProperties.find((p) => p.is_primary)
          if (primary) setPrimaryPropertyId(primary.property_id)
        }
        setIsLoading(false)
      } else {
        fetchGA4Properties()
      }
    }
  }, [isOpen, ga4Properties, linkedProperties, fetchGA4Properties])

  const toggleProperty = (propertyId: string) => {
    setSelectedPropertyIds((prev) => {
      const isDeselecting = prev.includes(propertyId)
      const newSelection = isDeselecting
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]

      if (isDeselecting && primaryPropertyId === propertyId) {
        setPrimaryPropertyId(newSelection[0] || null)
      }
      if (newSelection.length === 1 && !primaryPropertyId) {
        setPrimaryPropertyId(newSelection[0])
      }

      return newSelection
    })
  }

  const handleSubmit = async () => {
    setIsLinking(true)
    setError(null)

    try {
      if (!selectedAccount) throw new Error('No account selected')

      const orderedIds = selectedPropertyIds.length > 0
        ? primaryPropertyId
          ? [primaryPropertyId, ...selectedPropertyIds.filter((id) => id !== primaryPropertyId)]
          : selectedPropertyIds
        : []

      const response = await apiFetch('/api/accounts/link-platform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || 'default',
        },
        body: JSON.stringify({
          account_id: selectedAccount.id,
          platform: 'ga4',
          platform_id: orderedIds.join(','),
        }),
      })

      if (!response.ok) throw new Error('Failed to link GA4 property')

      const data = await response.json()
      if (data.success) {
        setSuccess(true)
        onSuccess?.()
        handleClose()
      } else {
        setError(data.message || 'Failed to link GA4 property')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link GA4 property')
    } finally {
      setIsLinking(false)
    }
  }

  const handleClose = () => {
    if (!isLinking) {
      setSelectedPropertyIds([])
      setPrimaryPropertyId(null)
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  return (
    <Dialog.Root isOpen={isOpen} onClose={handleClose} disabled={isLinking}>
      <Dialog.Overlay>
        <Dialog.Content size="md">
          <Dialog.Header
            icon={<img src="/icons/google_analytics.svg" alt="GA4" className="w-6 h-6" />}
            iconClassName="bg-orange-100"
          >
            <Dialog.Title>Link GA4 Properties</Dialog.Title>
            {currentAccountName && <Dialog.Description>to {currentAccountName}</Dialog.Description>}
          </Dialog.Header>

          <Dialog.Body className="space-y-4">
            {isLoading && (
              <div className="py-8 text-center">
                <Spinner size="lg" className="mx-auto text-orange-600" />
                <p className="mt-4 text-gray-600">Loading your GA4 properties...</p>
              </div>
            )}

            {error && !isLoading && <Alert variant="error">{error}</Alert>}
            {success && <Alert variant="success">GA4 property linked successfully!</Alert>}

            {!isLoading && !success && properties.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
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
                        className={cn(
                          'p-4 rounded-lg border-2 transition-all',
                          isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleProperty(property.property_id)}
                            className={cn(
                              'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                              isSelected ? 'bg-orange-600 border-orange-600' : 'border-gray-300 hover:border-gray-400'
                            )}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">{property.display_name}</p>
                              {isPrimary && (
                                <span className="px-2 py-0.5 rounded-sm text-xs font-medium bg-green-100 text-green-800">
                                  Primary
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">Property ID: {property.property_id}</p>
                          </div>

                          {isSelected && !isPrimary && (
                            <button
                              onClick={() => setPrimaryPropertyId(property.property_id)}
                              className="px-3 py-1 text-xs font-medium text-orange-700 bg-white border border-orange-300 rounded-sm hover:bg-orange-50"
                            >
                              Set as Primary
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-xs text-orange-800">
                    💡 Select one or more GA4 properties to link to your {currentAccountName || 'Google Ads'} account for website analytics.
                  </p>
                </div>
              </>
            )}

            {!isLoading && !error && properties.length === 0 && (
              <div className="py-8 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-600">No GA4 properties found</p>
                <p className="text-sm text-gray-500 mt-2">Make sure you have access to at least one GA4 property</p>
              </div>
            )}
          </Dialog.Body>

          {!isLoading && !success && properties.length > 0 && (
            <Dialog.Footer>
              <Dialog.Close disabled={isLinking}>Cancel</Dialog.Close>
              <Button
                onClick={handleSubmit}
                isLoading={isLinking}
                disabled={isLinking}
                className="flex-1 bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
              >
                {`Apply (${selectedPropertyIds.length})`}
              </Button>
            </Dialog.Footer>
          )}
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  )
}

export default GA4PropertySelector
