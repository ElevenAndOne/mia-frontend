import type { PendingAction } from '../services/chat-service'

interface ActionConfirmCardProps {
  action: PendingAction
  status: 'pending' | 'confirmed' | 'running' | 'completed' | 'failed'
  result?: Record<string, unknown>
  onConfirm: () => void
  onCancel: () => void
}

const platformIcons: Record<string, string> = {
  brevo: '/icons/brevo.jpeg',
  hubspot: '/icons/hubspot.svg',
  linkedin: '/icons/linkedin.svg',
  meta: '/icons/meta-color.svg',
  google: '/icons/google-ads.svg',
}

const statusConfig = {
  pending: {
    label: 'Review Action',
    color: 'bg-utility-warning-100 border-utility-warning-300',
    textColor: 'text-utility-warning-700',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-50 border-blue-300',
    textColor: 'text-blue-700',
  },
  running: {
    label: 'Executing...',
    color: 'bg-blue-50 border-blue-300',
    textColor: 'text-blue-700',
  },
  completed: {
    label: 'Completed',
    color: 'bg-success-secondary border-success',
    textColor: 'text-success',
  },
  failed: { label: 'Failed', color: 'bg-error-secondary border-error', textColor: 'text-error' },
}

export const ActionConfirmCard = ({
  action,
  status,
  result,
  onConfirm,
  onCancel,
}: ActionConfirmCardProps) => {
  const config = statusConfig[status]
  const icon = platformIcons[action.platform] || '/icons/settings.svg'

  return (
    <div className={`mt-3 rounded-xl border-2 p-4 ${config.color}`}>
      <div className="flex items-start gap-3">
        <img src={icon} alt={action.platform} className="w-8 h-8 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${config.textColor} ${config.color}`}
            >
              {config.label}
            </span>
            <span className="text-xs text-quaternary capitalize">{action.platform}</span>
          </div>

          <p className="paragraph-sm text-primary font-medium mb-2">{action.summary}</p>

          {/* Show params preview */}
          {status === 'pending' && action.params && Object.keys(action.params).length > 0 && (
            <div className="bg-primary/50 rounded-lg p-2 mb-3 text-xs font-mono text-tertiary">
              {Object.entries(action.params).map(([key, value]) => (
                <div key={key}>
                  <span className="text-quaternary">{key}:</span>{' '}
                  <span>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons — only when pending */}
          {status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={onConfirm}
                className="px-4 py-1.5 rounded-lg subheading-sm bg-brand-solid text-primary-onbrand hover:bg-brand-solid-hover transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-1.5 rounded-lg subheading-sm bg-secondary text-secondary hover:bg-tertiary transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Running spinner */}
          {status === 'running' && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Executing action...</span>
            </div>
          )}

          {/* Completed result */}
          {status === 'completed' && result && (
            <p className="text-sm text-success">
              {((result as Record<string, unknown>).message as string) ||
                'Action completed successfully.'}
            </p>
          )}

          {/* Failed result */}
          {status === 'failed' && (
            <p className="text-sm text-error">
              {result
                ? ((result as Record<string, unknown>).error as string) || 'Action failed.'
                : 'Action failed. Please try again.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActionConfirmCard
