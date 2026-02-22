import { useRef } from 'react'

interface DashboardChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
}

interface DashboardChatPanelProps {
  messages: DashboardChatMessage[]
  isLoading: boolean
  onSubmitMessage: (message: string) => void
}

export const DashboardChatPanel = ({ messages, isLoading, onSubmitMessage }: DashboardChatPanelProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    if (inputRef.current?.value.trim()) {
      onSubmitMessage(inputRef.current.value)
      inputRef.current.value = ''
    }
  }

  return (
    <div className="w-full h-full flex flex-col" style={{ maxWidth: '393px' }}>
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-4 space-y-4 chat-messages-container">
        {messages.map((message, index) => (
          <div key={message.id ?? `${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl ${
              message.role === 'user'
                ? 'bg-brand-solid text-primary-onbrand'
                : 'bg-secondary text-primary border border-tertiary'
            }`}>
              <p className="paragraph-sm whitespace-pre-wrap leading-relaxed select-text">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary border border-tertiary rounded-2xl p-3 max-w-[85%]">
              <div className="flex items-center gap-2 text-tertiary">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="paragraph-sm">Mia is analyzing...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 p-4 border-t border-tertiary bg-primary flex justify-center safe-bottom">
        <div className="flex gap-2" style={{ maxWidth: '393px', width: '100%' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask about your marketing performance..."
            className="flex-1 px-4 py-3.5 border border-primary rounded-full focus:outline-none focus:ring-2 focus:ring-utility-info-500 focus:border-transparent paragraph-sm"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleSubmit()
              }
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            data-track-id="dashboard-chat-send-message"
            className="px-5 py-3.5 bg-brand-solid text-primary-onbrand rounded-full hover:bg-brand-solid-hover transition-colors subheading-md"
            disabled={isLoading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
