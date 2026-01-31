import { Modal } from '../../../overlay'
import { Alert } from '../../../../components/alert'
import { Spinner } from '../../../../components/spinner'
import { CloseButton } from '../../../../components/close-button'

type AccentColor = 'blue' | 'green' | 'orange' | 'black'

interface AccountSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon: React.ReactNode
  iconBgColor?: string
  isLoading: boolean
  loadingMessage?: string
  error: string | null
  success: boolean
  successMessage?: string
  isEmpty: boolean
  emptyMessage?: string
  emptySubMessage?: string
  emptyIcon?: React.ReactNode
  isSubmitting: boolean
  onSubmit: () => void
  submitLabel: string
  submitLoadingLabel?: string
  submitDisabled?: boolean
  accentColor?: AccentColor
  children: React.ReactNode
  headerExtra?: React.ReactNode
}

const ACCENT_BUTTON_CLASSES: Record<AccentColor, string> = {
  blue: 'bg-blue-600 hover:bg-blue-700',
  green: 'bg-green-600 hover:bg-green-700',
  orange: 'bg-orange-600 hover:bg-orange-700',
  black: 'bg-black hover:bg-gray-800',
}

function DefaultEmptyIcon() {
  return (
    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  )
}

export function AccountSelectorModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconBgColor = 'bg-blue-100',
  isLoading,
  loadingMessage = 'Loading...',
  error,
  success,
  successMessage = 'Success!',
  isEmpty,
  emptyMessage = 'No items found',
  emptySubMessage,
  emptyIcon,
  isSubmitting,
  onSubmit,
  submitLabel,
  submitLoadingLabel,
  submitDisabled = false,
  accentColor = 'blue',
  children,
  headerExtra,
}: AccountSelectorModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" showCloseButton={false} panelClassName="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 ${iconBgColor} rounded-full flex items-center justify-center`}>
            {icon}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        <CloseButton onClick={onClose} disabled={isSubmitting} />
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="py-8 text-center">
            <Spinner className="mx-auto" />
            <p className="mt-4 text-gray-600">{loadingMessage}</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && <Alert variant="error">{error}</Alert>}

        {/* Success State */}
        {success && <Alert variant="success">{successMessage}</Alert>}

        {/* Empty State */}
        {!isLoading && !success && isEmpty && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4">{emptyIcon || <DefaultEmptyIcon />}</div>
            <p className="text-gray-600">{emptyMessage}</p>
            {emptySubMessage && <p className="text-sm text-gray-500 mt-2">{emptySubMessage}</p>}
          </div>
        )}

        {/* Content (when not loading, not success, not empty) */}
        {!isLoading && !success && !isEmpty && (
          <>
            {headerExtra}
            {children}
          </>
        )}
      </div>

      {/* Actions */}
      {!isLoading && !success && !isEmpty && (
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting || submitDisabled}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${ACCENT_BUTTON_CLASSES[accentColor]}`}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" variant="light" className="mr-2" />
                {submitLoadingLabel || submitLabel}
              </>
            ) : (
              submitLabel
            )}
          </button>
        </div>
      )}
    </Modal>
  )
}
