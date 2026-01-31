import { useState } from 'react'
import { Icon } from '../../../components/icon'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export const ChatMessage = ({ role, content, isStreaming = false }: ChatMessageProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] md:max-w-[60%] bg-tertiary rounded-3xl px-4 py-3">
          <p className="paragraph-md text-primary whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      {/* Assistant message */}
      <div className="prose prose-gray max-w-none">
        <div className="text-primary leading-relaxed whitespace-pre-wrap font-mono paragraph-sm bg-secondary rounded-lg p-4 border border-tertiary">
          {content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-quaternary animate-pulse ml-1" />
          )}
        </div>
      </div>

      {/* Action buttons */}
      {!isStreaming && (
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-tertiary text-quaternary hover:text-secondary transition-colors"
            title={copied ? 'Copied!' : 'Copy'}
          >
            {copied ? (
              <Icon.check size={16} />
            ) : (
              <Icon.copy_01 size={16} />
            )}
          </button>

          {/* <button
            className="p-2 rounded-lg hover:bg-tertiary text-quaternary hover:text-secondary transition-colors"
            title="Good response"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          </button>

          <button
            className="p-2 rounded-lg hover:bg-tertiary text-quaternary hover:text-secondary transition-colors"
            title="Bad response"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
            </svg>
          </button>

          <button
            className="p-2 rounded-lg hover:bg-tertiary text-quaternary hover:text-secondary transition-colors"
            title="Share"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>

          <button
            className="p-2 rounded-lg hover:bg-tertiary text-quaternary hover:text-secondary transition-colors"
            title="Regenerate"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>

          <button
            className="p-2 rounded-lg hover:bg-tertiary text-quaternary hover:text-secondary transition-colors"
            title="More options"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button> */}
        </div>
      )}
    </div>
  )
}

export default ChatMessage
