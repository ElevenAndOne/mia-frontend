import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlatform } from '../../hooks/useMiaSDK'
import { useSession } from '../../contexts/session-context'
import type { MarketingAccount, LinkedGA4Property } from '../../sdk/types'

interface GA4Property {
  property_id: string
  display_name: string
}

interface GA4PropertySelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentAccountName?: string
  currentAccountData?: {
    id: string
    name?: string
    ga4?: GA4Property[]
    linkedProperties?: LinkedGA4Property[]
  }
  ga4Properties?: GA4Property[]
  linkedProperties?: LinkedGA4Property[]
}

const GA4PropertySelector = ({ isOpen, onClose, onSuccess, currentAccountName, currentAccountData }: GA4PropertySelectorProps) => {
  const { selectedAccount } = useSession()
  const { getAvailableAccounts, linkGA4Properties, isLoading: sdkLoading, error: sdkError, clearError } = usePlatform()
  
  const [properties, setProperties] = useState<GA4Property[]>([])
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [primaryPropertyId, setPrimaryPropertyId] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  const [success, setSuccess] = useState(false)

  // Use currentAccountData directly or fetch if needed
  const accountToUse = (currentAccountData || selectedAccount) as (MarketingAccount | GA4PropertySelectorProps['currentAccountData']) | null

  const fetchGA4Properties = useCallback(async () => {
    clearError()
    
    const result = await getAvailableAccounts()
    
    if (result.success && result.data) {
      const ga4Data = result.data as { ga4?: GA4Property[]; ga4_properties?: GA4Property[] }
      const ga4List = ga4Data.ga4 || ga4Data.ga4_properties

      if (ga4List && Array.isArray(ga4List)) {
        const sortedProperties = ga4List.sort((a: GA4Property, b: GA4Property) =>
          a.display_name.localeCompare(b.display_name)
        )
        setProperties(sortedProperties)
      }
    }
  }, [clearError, getAvailableAccounts])

  useEffect(() => {
    if (isOpen) {
      if (currentAccountData && currentAccountData.ga4) {
        const sortedProperties = [...currentAccountData.ga4].sort((a, b) =>
          a.display_name.localeCompare(b.display_name)
        )
        setProperties(sortedProperties)

        if (currentAccountData.linkedProperties && currentAccountData.linkedProperties.length > 0) {
          const linkedIds = currentAccountData.linkedProperties.map((p) => p.property_id)
          setSelectedPropertyIds(linkedIds)

          const primary = currentAccountData.linkedProperties.find((p) => p.is_primary)
          if (primary) {
            setPrimaryPropertyId(primary.property_id)
          }
        }
      } else {
        fetchGA4Properties()
      }
    }
  }, [currentAccountData, fetchGA4Properties, isOpen])

  const togglePropertySelection = (propertyId: string) => {
    setSelectedPropertyIds(prev => {
      const newSelection = prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]

      if (!newSelection.includes(propertyId) && primaryPropertyId === propertyId) {
        setPrimaryPropertyId(newSelection[0] || null)
      }

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
    if (!accountToUse) {
      return
    }

    setIsLinking(true)
    console.log('[GA4-PROPERTY-SELECTOR] Linking GA4 properties:', selectedPropertyIds)
    console.log('[GA4-PROPERTY-SELECTOR] Primary property ID:', primaryPropertyId)

    // If primaryPropertyId is set, ensure it's first in the array
    let orderedPropertyIds = selectedPropertyIds
    if (primaryPropertyId && selectedPropertyIds.includes(primaryPropertyId)) {
      orderedPropertyIds = [primaryPropertyId, ...selectedPropertyIds.filter(id => id !== primaryPropertyId)]
    }

    const result = await linkGA4Properties(orderedPropertyIds, accountToUse.id)

    if (result.success) {
      setSuccess(true)
      onSuccess?.()
      handleClose()
    }

    setIsLinking(false)
  }

  const handleClose = () => {
    if (!isLinking) {
      setSelectedPropertyIds([])
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
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Link GA4 Properties</h2>
                  <p className="text-sm text-gray-600">{currentAccountName ? `For ${currentAccountName}` : 'Select properties to connect'}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isLinking}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col p-6">
              {/* Loading State */}
              {sdkLoading ? (
                <div className="py-8 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600">Loading your GA4 properties...</p>
                </div>
              ) : sdkError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">{sdkError}</p>
                    </div>
                  </div>
                </div>
              ) : (
                properties.length > 0 && (
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select GA4 Properties ({selectedPropertyIds.length} selected)
                      </label>
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
                                  disabled={isLinking}
                                  className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'border-orange-500 bg-orange-500'
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
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {property.display_name}
                                  </p>
                                  <p className="text-xs text-gray-500 font-mono">
                                    {property.property_id}
                                  </p>
                                </div>

                                {/* Primary Button */}
                                {isSelected && selectedPropertyIds.length > 1 && (
                                  <button
                                    onClick={() => setPrimary(property.property_id)}
                                    disabled={isLinking}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                                      isPrimary
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    {isPrimary ? 'Primary' : 'Set Primary'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium text-green-800">GA4 properties linked successfully!</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!sdkLoading && properties.length > 0 && (
              <div className="flex justify-between items-center p-6 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={handleClose}
                  disabled={isLinking}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkProperties}
                  disabled={isLinking || selectedPropertyIds.length === 0}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLinking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Linking...
                    </>
                  ) : (
                    <>Link {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? 'Property' : 'Properties'}</>
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
