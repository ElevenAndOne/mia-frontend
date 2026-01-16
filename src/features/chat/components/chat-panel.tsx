import { useState, useCallback } from 'react'
import { useSession } from '../../../contexts/session-context'
import { apiFetch } from '../../../utils/api'

interface ChatPanelProps {
  selectedPlatforms: string[]
  dateRange: string
  onClose: () => void
}

const ChatPanel = ({ selectedPlatforms, dateRange, onClose }: ChatPanelProps) => {
  const { sessionId, selectedAccount, user } = useSession()
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [isChatLoading, setIsChatLoading] = useState(false)

  const handleChatSubmit = useCallback(async (message: string) => {
    if (!message.trim()) return

    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: message }])

    // Set loading state and scroll to show loading indicator
    setIsChatLoading(true)

    // Auto-scroll after user message is added
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages-container')
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight
      }
    }, 100)

    try {

      const response = await apiFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || 'default',
        },
        body: JSON.stringify({
          message: message,
          session_id: sessionId,
          user_id: user?.google_user_id || '',
          google_ads_id: selectedAccount?.google_ads_id,
          ga4_property_id: selectedAccount?.ga4_property_id,
          date_range: dateRange
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      setIsChatLoading(false) // Remove loading state

      if (result.success && result.claude_response) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: result.claude_response }])
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble processing your question. Please try again.' }])
      }

      // Auto-scroll to show the top of Mia's response
      setTimeout(() => {
        const chatContainer = document.querySelector('.chat-messages-container')
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight - 100 // Show top of message
        }
      }, 100)

    } catch (error) {
      console.error('[CHAT] Error:', error)
      setIsChatLoading(false)
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your connection and try again.' }])
    }
  }, [sessionId, selectedAccount?.google_ads_id, selectedAccount?.ga4_property_id, dateRange, user?.google_user_id])

  return (
    <div className="w-full h-full flex flex-col" style={{ maxWidth: '393px' }}>
      {/* Chat Messages - Scrollable area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 chat-messages-container">
        {chatMessages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl ${
              message.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-50 text-gray-800 border border-gray-100'
            }`}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed select-text">{message.content}</p>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 max-w-[85%]">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm">Mia is analyzing...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input - Fixed at bottom and centered */}
      <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white flex justify-center" style={{ paddingBottom: '5rem' }}>
        <div className="flex gap-2" style={{ maxWidth: '393px', width: '100%' }}>
          <input
            type="text"
            placeholder="Ask about your marketing performance..."
            className="flex-1 px-4 py-3.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLInputElement
                handleChatSubmit(target.value)
                target.value = ''
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.querySelector('input[type="text"]') as HTMLInputElement
              if (input?.value.trim()) {
                handleChatSubmit(input.value)
                input.value = ''
              }
            }}
            className="px-5 py-3.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm font-medium"
            disabled={isChatLoading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatPanel
