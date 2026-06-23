import { useState } from 'react'
import { ChatMarkdown } from '../../../components/chat-markdown'
import { Icon } from '../../../components/icon'
import { useClipboard } from '../../../hooks/use-clipboard'
import { shareViaWhatsApp } from '../../../utils/whatsapp-share'
import ActionConfirmCard from './action-confirm-card'
import type { PendingAction } from '../services/chat-service'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  pendingAction?: PendingAction
  actionStatus?: 'pending' | 'confirmed' | 'running' | 'completed' | 'failed'
  actionResult?: Record<string, unknown>
  onConfirmAction?: (overrideParams?: Record<string, unknown>) => void
  onCancelAction?: () => void
  skillWorkspaces?: string[]
  onFeedback?: (feedback: 1 | -1, skillWorkspaces: string[]) => void
  images?: string[]
}

export const ChatMessage = ({
  role,
  content,
  isStreaming = false,
  pendingAction,
  actionStatus,
  actionResult,
  onConfirmAction,
  onCancelAction,
  skillWorkspaces = [],
  onFeedback,
  images = [],
}: ChatMessageProps) => {
  const { copied, copy } = useClipboard()
  const [feedbackGiven, setFeedbackGiven] = useState<1 | -1 | null>(null)

  const handleFeedback = (value: 1 | -1) => {
    if (feedbackGiven !== null) return
    setFeedbackGiven(value)
    onFeedback?.(value, skillWorkspaces)
  }

  if (role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] md:max-w-[60%]">
          {images.length > 0 && (
            <div className="flex gap-1.5 mb-1.5 justify-end flex-wrap">
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`image ${i + 1}`}
                  className="w-20 h-20 object-cover rounded-xl border border-tertiary"
                />
              ))}
            </div>
          )}
          <div className="bg-tertiary rounded-3xl px-4 py-3">
            <p className="paragraph-md text-primary whitespace-pre-wrap">{content}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      {/* Assistant message */}
      <div className="prose prose-gray max-w-none">
        <div className="text-primary leading-relaxed paragraph-sm bg-secondary rounded-lg p-4 border border-tertiary select-text">
          <ChatMarkdown content={content} className="text-secondary" />
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-quaternary animate-pulse mt-1" />
          )}
        </div>

        {/* Action confirmation card */}
        {pendingAction && actionStatus && onConfirmAction && onCancelAction && (
          <ActionConfirmCard
            action={pendingAction}
            status={actionStatus}
            result={actionResult}
            onConfirm={onConfirmAction}
            onCancel={onCancelAction}
          />
        )}
      </div>

      {/* Action buttons */}
      {!isStreaming && (
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => copy(content)}
            className="p-2 rounded-lg hover:bg-tertiary text-quaternary hover:text-secondary transition-colors"
            title={copied ? 'Copied!' : 'Copy'}
          >
            {copied ? <Icon.check size={16} /> : <Icon.copy_01 size={16} />}
          </button>

          <button
            onClick={() => shareViaWhatsApp(content)}
            className="p-2 rounded-lg hover:bg-tertiary text-quaternary hover:text-secondary transition-colors"
            title="Share via WhatsApp"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </button>

          {onFeedback && (
            <>
              <button
                onClick={() => handleFeedback(1)}
                disabled={feedbackGiven !== null}
                className={[
                  'p-2 rounded-lg transition-colors',
                  feedbackGiven === 1
                    ? 'text-success bg-success-subtle'
                    : 'hover:bg-tertiary text-quaternary hover:text-secondary',
                ].join(' ')}
                title="Good response"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
              </button>

              <button
                onClick={() => handleFeedback(-1)}
                disabled={feedbackGiven !== null}
                className={[
                  'p-2 rounded-lg transition-colors',
                  feedbackGiven === -1
                    ? 'text-error bg-error-primary'
                    : 'hover:bg-tertiary text-quaternary hover:text-secondary',
                ].join(' ')}
                title="Bad response"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ChatMessage
