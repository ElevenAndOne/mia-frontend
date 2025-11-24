import React, { createContext, useContext, useState, ReactNode } from 'react'

export interface ChatMessage {
  id: string
  type: 'question' | 'response'
  content: string
  category: string
  questionIndex?: number
  timestamp: Date
  isLoading?: boolean
}

export interface ChatSession {
  id: string
  category: string
  messages: ChatMessage[]
  currentQuestionIndex: number
  askedQuestions: number[]
  questionFlow: 'initial' | 'cycling'
}

export interface ChatState {
  sessions: Record<string, ChatSession>
  activeSessions: Record<string, string> // category -> sessionId
  isAnalyzing: boolean
}

export interface ChatActions {
  // Session management
  createSession: (category: string) => string
  getSession: (category: string) => ChatSession | null
  clearSession: (category: string) => void
  switchCategory: (category: string) => void

  // Message management
  addMessage: (category: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  updateMessage: (category: string, messageId: string, updates: Partial<ChatMessage>) => void
  clearMessages: (category: string) => void

  // Question flow management
  markQuestionAsked: (category: string, questionIndex: number) => void
  getAvailableQuestions: (category: string, totalQuestions: number) => number[]
  setQuestionFlow: (category: string, flow: 'initial' | 'cycling') => void
  setCurrentQuestionIndex: (category: string, index: number) => void

  // Analysis state
  setAnalyzing: (analyzing: boolean) => void
}

type ChatContextType = ChatState & ChatActions

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const useChat = () => {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

interface ChatProviderProps {
  children: ReactNode
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [state, setState] = useState<ChatState>({
    sessions: {},
    activeSessions: {},
    isAnalyzing: false
  })

  // Generate unique IDs
  const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Session management
  const createSession = (category: string): string => {
    const sessionId = generateId()
    const newSession: ChatSession = {
      id: sessionId,
      category,
      messages: [],
      currentQuestionIndex: 0,
      askedQuestions: [],
      questionFlow: 'initial'
    }

    setState(prev => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [sessionId]: newSession
      },
      activeSessions: {
        ...prev.activeSessions,
        [category]: sessionId
      }
    }))

    return sessionId
  }

  const getSession = (category: string): ChatSession | null => {
    const sessionId = state.activeSessions[category]
    return sessionId ? state.sessions[sessionId] || null : null
  }

  const clearSession = (category: string) => {
    const sessionId = state.activeSessions[category]
    if (sessionId) {
      setState(prev => {
        const { [sessionId]: removedSession, ...restSessions } = prev.sessions
        const { [category]: removedActiveSession, ...restActiveSessions } = prev.activeSessions
        
        return {
          ...prev,
          sessions: restSessions,
          activeSessions: restActiveSessions
        }
      })
    }
  }

  const switchCategory = (category: string) => {
    // Create session if it doesn't exist
    if (!state.activeSessions[category]) {
      createSession(category)
    }
  }

  // Message management
  const addMessage = (category: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const sessionId = state.activeSessions[category]
    if (!sessionId) return

    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date()
    }

    setState(prev => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [sessionId]: {
          ...prev.sessions[sessionId],
          messages: [...prev.sessions[sessionId].messages, newMessage]
        }
      }
    }))
  }

  const updateMessage = (category: string, messageId: string, updates: Partial<ChatMessage>) => {
    const sessionId = state.activeSessions[category]
    if (!sessionId) return

    setState(prev => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [sessionId]: {
          ...prev.sessions[sessionId],
          messages: prev.sessions[sessionId].messages.map(msg =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          )
        }
      }
    }))
  }

  const clearMessages = (category: string) => {
    const sessionId = state.activeSessions[category]
    if (!sessionId) return

    setState(prev => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [sessionId]: {
          ...prev.sessions[sessionId],
          messages: [],
          askedQuestions: [],
          questionFlow: 'initial',
          currentQuestionIndex: 0
        }
      }
    }))
  }

  // Question flow management
  const markQuestionAsked = (category: string, questionIndex: number) => {
    const sessionId = state.activeSessions[category]
    if (!sessionId) return

    setState(prev => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [sessionId]: {
          ...prev.sessions[sessionId],
          askedQuestions: [...prev.sessions[sessionId].askedQuestions, questionIndex]
        }
      }
    }))
  }

  const getAvailableQuestions = (category: string, totalQuestions: number): number[] => {
    const session = getSession(category)
    if (!session) return Array.from({ length: totalQuestions }, (_, i) => i)
    
    const allQuestions = Array.from({ length: totalQuestions }, (_, i) => i)
    return allQuestions.filter(index => !session.askedQuestions.includes(index))
  }

  const setQuestionFlow = (category: string, flow: 'initial' | 'cycling') => {
    const sessionId = state.activeSessions[category]
    if (!sessionId) return

    setState(prev => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [sessionId]: {
          ...prev.sessions[sessionId],
          questionFlow: flow
        }
      }
    }))
  }

  const setCurrentQuestionIndex = (category: string, index: number) => {
    const sessionId = state.activeSessions[category]
    if (!sessionId) return

    setState(prev => ({
      ...prev,
      sessions: {
        ...prev.sessions,
        [sessionId]: {
          ...prev.sessions[sessionId],
          currentQuestionIndex: index
        }
      }
    }))
  }

  // Analysis state
  const setAnalyzing = (analyzing: boolean) => {
    setState(prev => ({
      ...prev,
      isAnalyzing: analyzing
    }))
  }

  const contextValue: ChatContextType = {
    ...state,
    createSession,
    getSession,
    clearSession,
    switchCategory,
    addMessage,
    updateMessage,
    clearMessages,
    markQuestionAsked,
    getAvailableQuestions,
    setQuestionFlow,
    setCurrentQuestionIndex,
    setAnalyzing
  }

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  )
}
