import { Modal } from '../features/overlay'

interface IntegrationPromptModalProps {
  isOpen: boolean
  title: string
  message: string
  missing: string[]
  primaryActionLabel: string
  onPrimaryAction: () => void
  onClose: () => void
}

export const IntegrationPromptModal = ({
  isOpen,
  title,
  message,
  missing,
  primaryActionLabel,
  onPrimaryAction,
  onClose,
}: IntegrationPromptModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" showCloseButton={false} panelClassName="p-6" aria-labelledby="integration-prompt-title">
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-col items-start gap-3">
          <div className="w-10 h-10 bg-utility-info-100 rounded-full flex items-center justify-center" aria-hidden="true">
            <svg className="w-5 h-5 text-utility-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 id="integration-prompt-title" className="title-h6 text-primary">{title}</h2>
            <p className="paragraph-sm text-tertiary">{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-tertiary flex items-center justify-center transition-colors shrink-0"
          aria-label="Close modal"
        >
          <svg
            className="w-5 h-5 text-tertiary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {missing.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {missing.map((item) => (
            <span
              key={item}
              className="px-3 py-1 rounded-full bg-utility-info-100 text-utility-info-700 paragraph-xs"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 subheading-md text-secondary bg-tertiary rounded-lg hover:bg-quaternary transition-colors"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={onPrimaryAction}
          className="flex-1 px-4 py-2 bg-brand-solid text-primary-onbrand rounded-lg hover:bg-brand-solid-hover transition-colors subheading-md"
        >
          {primaryActionLabel}
        </button>
      </div>
    </Modal>
  )
}

export default IntegrationPromptModal
