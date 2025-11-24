import React, { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { useChat, ChatMessage } from '../../contexts/ChatContext'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { clsx } from 'clsx'

export interface ChatInterfaceProps {
  category: string
  className?: string
  showTypingIndicator?: boolean
  maxHeight?: string
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  category,
  className,
  showTypingIndicator = true,
  maxHeight = 'max-h-96'
}) => {
  const { getSession, isAnalyzing } = useChat()
  const chatAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const session = getSession(category)
  const messages = session?.messages || []

  // Auto-scroll functionality
  const scrollToLatestMessage = () => {
    if (messagesEndRef.current && chatAreaRef.current) {
      const chatArea = chatAreaRef.current
      const messagesEnd = messagesEndRef.current
      const lastMessageElement = messagesEnd.previousElementSibling as HTMLElement
      
      if (lastMessageElement) {
        const offsetTop = lastMessageElement.offsetTop - chatArea.offsetTop
        chatArea.scrollTo({ top: offsetTop, behavior: 'smooth' })
      }
    }
  }

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Smart auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      
      if (lastMessage.type === 'response' && !lastMessage.isLoading) {
        setTimeout(() => scrollToLatestMessage(), 100)
      } else {
        setTimeout(() => scrollToBottom(), 100)
      }
    }
  }, [messages])

  if (!session) {
    return (
      <div className={clsx('flex items-center justify-center p-8', className)}>
        <p className="text-gray-500">No chat session active</p>
      </div>
    )
  }

  return (
    <div className={clsx('flex flex-col', className)}>
      {/* Messages Container */}
      <div 
        ref={chatAreaRef}
        className={clsx(
          'flex-1 overflow-y-auto p-4 space-y-4',
          maxHeight
        )}
      >
        {messages.map((message) => (
          <ChatMessageComponent 
            key={message.id} 
            message={message} 
          />
        ))}

        {/* Typing indicator */}
        {isAnalyzing && showTypingIndicator && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-gray-500"
          >
            <LoadingSpinner size="sm" />
            <span className="text-sm">Mia is analyzing...</span>
          </motion.div>
        )}

        {/* Scroll target */}
        <div ref={messagesEndRef} />
      </div>

      {/* Empty state */}
      {messages.length === 0 && !isAnalyzing && (
        <div className="flex items-center justify-center p-8 text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">💭</div>
            <p>Ask a question to get started</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Individual message component
interface ChatMessageComponentProps {
  message: ChatMessage
}

const ChatMessageComponent: React.FC<ChatMessageComponentProps> = ({ message }) => {
  const isQuestion = message.type === 'question'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'flex',
        isQuestion ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={clsx(
          'max-w-[80%] rounded-lg px-4 py-3',
          isQuestion
            ? 'bg-blue-600 text-white ml-4'
            : 'bg-gray-100 text-gray-900 mr-4'
        )}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <LoadingSpinner 
              size="sm" 
              color={isQuestion ? 'white' : 'primary'} 
            />
            <span className="text-sm">Analyzing...</span>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            {isQuestion ? (
              <p className="text-white m-0">{message.content}</p>
            ) : (
              <div className="text-gray-900">
                <ReactMarkdown 
                  components={{
                    p: ({ children }) => <p className="m-0 first:mt-0 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="mt-2 mb-0 pl-4">{children}</ul>,
                    ol: ({ children }) => <ol className="mt-2 mb-0 pl-4">{children}</ol>,
                    li: ({ children }) => <li className="mt-1">{children}</li>
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
