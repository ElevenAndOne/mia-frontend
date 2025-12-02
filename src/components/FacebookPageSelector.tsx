import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../utils/api'
import { useSession } from '../contexts/SessionContext'

interface FacebookPage {
  id: string
  name: string
  access_token: string
  fan_count: number
  link: string
  category: string
}

interface FacebookPageSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentAccountName?: string
  currentAccountData?: any  // Fresh account data from IntegrationsPage
}

const FacebookPageSelector = ({ isOpen, onClose, onSuccess, currentAccountName, currentAccountData }: FacebookPageSelectorProps) => {
  const { sessionId, selectedAccount } = useSession()
  // Use currentAccountData if provided (fresh data), otherwise fall back to selectedAccount
  const accountToUse = currentAccountData || selectedAccount
  const [pages, setPages] = useState<FacebookPage[]>([])
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch Facebook Pages when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchFacebookPages()
    }
  }, [isOpen])

  const fetchFacebookPages = async (forceRefresh: boolean = false) => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch pages from backend (uses PostgreSQL cache with 7-day TTL)
      // Pass refresh=true to bypass cache and fetch fresh from Meta API
      const url = forceRefresh
        ? '/api/oauth/meta/api/organic/facebook-pages?refresh=true'
        : '/api/oauth/meta/api/organic/facebook-pages'

      const response = await apiFetch(url, {
        headers: {
          'X-Session-ID': sessionId || 'default'
        }
      })

      const data = await response.json()

      if (data.success && data.facebook_pages) {
        // Sort pages alphabetically by name (A-Z)
        const sortedPages = data.facebook_pages.sort((a: FacebookPage, b: FacebookPage) =>
          a.name.localeCompare(b.name)
        )

        setPages(sortedPages)

        // Pre-select currently linked page if exists
        if (accountToUse?.facebook_page_id) {
          setSelectedPageId(accountToUse.facebook_page_id)
          console.log('[FACEBOOK-PAGE-SELECTOR] Pre-selected page:', accountToUse.facebook_page_id)
        }
      } else {
        setError('Failed to fetch Facebook Pages')
      }
    } catch (err: any) {
      console.error('Error fetching Facebook Pages:', err)
      setError('Failed to load Facebook Pages. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLinkPage = async () => {
    setIsLinking(true)
    setError(null)

    try {
      if (!accountToUse) {
        throw new Error('No account selected')
      }

      if (selectedPageId) {
        const selectedPage = pages.find(p => p.id === selectedPageId)
        if (!selectedPage) {
          throw new Error('Selected page not found')
        }
        console.log('[FACEBOOK-PAGE-SELECTOR] Linking page', selectedPage.name, 'to account', accountToUse.name)
      } else {
        console.log('[FACEBOOK-PAGE-SELECTOR] Unlinking Facebook Page from account', accountToUse.name)
      }

      // Link Facebook Page to account (or unlink if selectedPageId is null)
      const response = await apiFetch('/api/oauth/meta/api/organic/link-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || 'default'
        },
        body: JSON.stringify({
          page_id: selectedPageId || '',
          page_name: selectedPageId ? pages.find(p => p.id === selectedPageId)?.name || '' : '',
          page_access_token: selectedPageId ? pages.find(p => p.id === selectedPageId)?.access_token || '' : '',
          account_id: accountToUse.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to link Facebook Page')
      }

      const data = await response.json()

      if (data.success) {
        setSuccess(true)

        setTimeout(() => {
          onSuccess?.()
          handleClose()
        }, 1500)
      } else {
        setError(data.message || 'Failed to link Facebook Page')
      }
    } catch (err: any) {
      console.error('Facebook Page linking error:', err)
      setError('Failed to link Facebook Page. Please try again.')
    } finally {
      setIsLinking(false)
    }
  }

  const handleClose = () => {
    if (!isLinking) {
      setSelectedPageId(null)
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
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <img src="/icons/facebook.png" alt="Facebook" className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Link Facebook Page</h2>
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
                  <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600">Loading your Facebook Pages...</p>
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
                    <p className="text-sm font-medium text-green-800">Facebook Page linked successfully!</p>
                  </div>
                </div>
              )}

              {/* Page Selection */}
              {!isLoading && !success && pages.length > 0 && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Select a Facebook Page
                      </label>
                      <button
                        onClick={() => fetchFacebookPages(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        Refresh list
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {pages.map((page) => {
                        const isSelected = selectedPageId === page.id
                        return (
                          <div
                            key={page.id}
                            onClick={() => setSelectedPageId(isSelected ? null : page.id)}
                            className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Square Checkbox */}
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600'
                                  : 'border-gray-300'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              {/* Page Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{page.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-gray-500 truncate">{page.category}</p>
                                  {page.fan_count > 0 && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <p className="text-xs text-gray-500">
                                        {page.fan_count.toLocaleString()} followers
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Helper Text */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      💡 Select a Facebook Page to enable organic social insights for your {currentAccountName || 'account'}.
                    </p>
                  </div>
                </>
              )}

              {/* No Pages Found */}
              {!isLoading && !error && pages.length === 0 && (
                <div className="py-8 text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600">No Facebook Pages found</p>
                  <p className="text-sm text-gray-500 mt-2">Make sure you have access to at least one Facebook Page</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {!isLoading && !success && pages.length > 0 && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleClose}
                  disabled={isLinking}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkPage}
                  disabled={isLinking}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLinking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Applying...
                    </>
                  ) : (
                    `Apply (${selectedPageId ? '1' : '0'})`
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

export default FacebookPageSelector
