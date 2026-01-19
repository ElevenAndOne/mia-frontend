import { useState, useEffect, ReactNode, useCallback } from 'react'
import * as Dialog from './dialog'
import { Alert } from './alert'
import { SelectableList, SelectableItem } from './selectable-list'
import { Spinner } from './spinner'
import { Button } from './button'
import { cn } from '@/utils/utils'

export interface AccountSelectorConfig<T extends SelectableItem> {
  // Modal configuration
  title: string
  subtitle?: string
  icon: ReactNode
  iconBgColor?: string
  accentColor?: 'blue' | 'orange' | 'green' | 'black'

  // Data fetching
  fetchAccounts: () => Promise<T[]>

  // Selection behavior
  mode?: 'single' | 'multiple'
  getPreSelectedIds?: (accounts: T[]) => (string | number)[]

  // Actions
  onSubmit: (selectedIds: (string | number)[]) => Promise<void>
  submitLabel?: string | ((count: number) => string)

  // Optional callbacks
  onRemove?: (item: T) => Promise<void>
  onRefresh?: () => Promise<T[]>

  // Custom rendering
  renderItem?: (item: T, isSelected: boolean) => ReactNode
  renderBadge?: (item: T) => ReactNode

  // Messages
  loadingMessage?: string
  emptyMessage?: string
  emptyAction?: { label: string; onClick: () => void }
  successMessage?: string
  helperText?: string
}

export interface AccountSelectorModalProps<T extends SelectableItem> {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  config: AccountSelectorConfig<T>
}

export function AccountSelectorModal<T extends SelectableItem>({
  isOpen,
  onClose,
  onSuccess,
  config,
}: AccountSelectorModalProps<T>) {
  const [accounts, setAccounts] = useState<T[]>([])
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAccounts()
    }
  }, [isOpen, loadAccounts])

  const loadAccounts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await config.fetchAccounts()
      setAccounts(data)

      // Pre-select accounts if configured
      if (config.getPreSelectedIds) {
        const preSelected = config.getPreSelectedIds(data)
        setSelectedIds(preSelected)
      } else if (data.length === 1 && config.mode !== 'multiple') {
        // Auto-select if only one account
        setSelectedIds([data[0].id])
      }
    } catch (err) {
      console.error('Error fetching accounts:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load accounts. Please try again.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [config])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      await config.onSubmit(selectedIds)
      setSuccess(true)

      setTimeout(() => {
        onSuccess?.()
        handleClose()
      }, 1000)
    } catch (err) {
      console.error('Submit error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Action failed. Please try again.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRefresh = async () => {
    if (config.onRefresh) {
      setIsLoading(true)
      try {
        const data = await config.onRefresh()
        setAccounts(data)
      } catch (err) {
        console.error('Refresh error:', err)
      } finally {
        setIsLoading(false)
      }
    } else {
      await loadAccounts()
    }
  }

  const handleRemove = async (item: T) => {
    if (!config.onRemove) return

    if (!confirm(`Remove ${item.label} from this account?`)) {
      return
    }

    try {
      await config.onRemove(item)
      await loadAccounts()
    } catch (err) {
      console.error('Remove error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove. Please try again.'
      setError(errorMessage)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedIds([])
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  const getSubmitLabel = () => {
    if (typeof config.submitLabel === 'function') {
      return config.submitLabel(selectedIds.length)
    }
    return config.submitLabel || `Apply (${selectedIds.length})`
  }

  return (
    <Dialog.Root isOpen={isOpen} onClose={handleClose} disabled={isSubmitting}>
      <Dialog.Overlay>
        <Dialog.Content size="md">
          {/* Header */}
          <Dialog.Header
            icon={config.icon}
            iconClassName={config.iconBgColor || 'bg-blue-100'}
          >
            <Dialog.Title>{config.title}</Dialog.Title>
            {config.subtitle && (
              <Dialog.Description>{config.subtitle}</Dialog.Description>
            )}
          </Dialog.Header>

          {/* Body */}
          <Dialog.Body className="space-y-4">
            {/* Loading State */}
            {isLoading && (
              <div className="py-8 text-center">
                <Spinner size="lg" className="mx-auto" />
                <p className="mt-4 text-gray-600">{config.loadingMessage || 'Loading accounts...'}</p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <Alert variant="error">{error}</Alert>
            )}

            {/* Success State */}
            {success && (
              <Alert variant="success">
                {config.successMessage || 'Action completed successfully!'}
              </Alert>
            )}

            {/* Empty State */}
            {!isLoading && !success && accounts.length === 0 && !error && (
              <div className="py-8 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-600">{config.emptyMessage || 'No accounts found'}</p>
                {config.emptyAction && (
                  <button
                    onClick={config.emptyAction.onClick}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {config.emptyAction.label}
                  </button>
                )}
              </div>
            )}

            {/* Account Selection */}
            {!isLoading && !success && accounts.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {config.mode === 'multiple'
                      ? `Select accounts (${selectedIds.length} selected)`
                      : 'Select an account'}
                  </label>
                  {config.onRefresh && (
                    <button
                      onClick={handleRefresh}
                      className={cn(
                        'text-xs hover:underline',
                        config.accentColor === 'orange' ? 'text-orange-600 hover:text-orange-700' :
                        config.accentColor === 'green' ? 'text-green-600 hover:text-green-700' :
                        config.accentColor === 'black' ? 'text-gray-600 hover:text-gray-700' :
                        'text-blue-600 hover:text-blue-700'
                      )}
                    >
                      Refresh list
                    </button>
                  )}
                </div>

                <SelectableList
                  items={accounts}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  mode={config.mode || 'single'}
                  accentColor={config.accentColor || 'blue'}
                  renderItem={config.renderItem}
                  renderBadge={config.renderBadge}
                  renderAction={config.onRemove ? (item) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(item)
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Remove this account"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  ) : undefined}
                  emptyMessage={config.emptyMessage}
                />

                {/* Helper Text */}
                {config.helperText && (
                  <div className={cn(
                    'border rounded-lg p-3',
                    config.accentColor === 'orange' ? 'bg-orange-50 border-orange-200' :
                    config.accentColor === 'green' ? 'bg-green-50 border-green-200' :
                    config.accentColor === 'black' ? 'bg-gray-50 border-gray-200' :
                    'bg-blue-50 border-blue-200'
                  )}>
                    <p className={cn(
                      'text-xs',
                      config.accentColor === 'orange' ? 'text-orange-800' :
                      config.accentColor === 'green' ? 'text-green-800' :
                      config.accentColor === 'black' ? 'text-gray-800' :
                      'text-blue-800'
                    )}>
                      {config.helperText}
                    </p>
                  </div>
                )}
              </>
            )}
          </Dialog.Body>

          {/* Footer */}
          {!isLoading && !success && accounts.length > 0 && (
            <Dialog.Footer>
              <Dialog.Close disabled={isSubmitting}>Cancel</Dialog.Close>
              <Button
                onClick={handleSubmit}
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className={cn(
                  'flex-1',
                  config.accentColor === 'orange' ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' :
                  config.accentColor === 'green' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' :
                  config.accentColor === 'black' ? 'bg-black hover:bg-gray-800 focus:ring-gray-700' :
                  ''
                )}
              >
                {getSubmitLabel()}
              </Button>
            </Dialog.Footer>
          )}
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  )
}
