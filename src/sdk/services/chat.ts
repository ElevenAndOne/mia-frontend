/**
 * Chat Service
 * 
 * Handles chat interactions, conversations, and messaging.
 */

import { APIClient } from '../client'
import { APIResponse, MarketingAccount } from '../types'

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: string
  session_id?: string
  user_id?: string
}

export interface ChatRequest {
  message: string
  session_id?: string
  user_id?: string
  context?: string
  selected_account?: MarketingAccount
  conversation_id?: string
}

export interface ChatResponse {
  success: boolean
  response?: string
  message_id?: string
  conversation_id?: string
  data?: unknown
  claude_response?: string
  error?: string
}

export interface ConversationHistory {
  id: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
  title?: string
}

export class ChatService {
  constructor(private client: APIClient) {}

  // ============= Chat Operations =============

  /**
   * Send a chat message and get response
   */
  async sendMessage(request: ChatRequest): Promise<APIResponse<ChatResponse>> {
    const sessionId = this.client.getSessionId()
    
    return this.client.post<ChatResponse>('/api/chat', {
      ...request,
      session_id: request.session_id || sessionId
    })
  }

  /**
   * Send a simple chat message with automatic session context
   */
  async chat(
    message: string,
    options: {
      userId?: string
      context?: string
      selectedAccount?: MarketingAccount
      conversationId?: string
    } = {}
  ): Promise<APIResponse<ChatResponse>> {
    const sessionId = this.client.getSessionId()
    
    if (!sessionId) {
      return {
        success: false,
        error: 'No active session found'
      }
    }

    return this.sendMessage({
      message,
      session_id: sessionId,
      user_id: options.userId,
      context: options.context,
      selected_account: options.selectedAccount,
      conversation_id: options.conversationId
    })
  }

  // ============= Conversation Management =============

  /**
   * Get conversation history
   */
  async getConversationHistory(conversationId: string): Promise<APIResponse<ConversationHistory>> {
    return this.client.get<ConversationHistory>(`/api/chat/conversations/${conversationId}`)
  }

  /**
   * Get all conversations for current session
   */
  async getConversations(): Promise<APIResponse<ConversationHistory[]>> {
    return this.client.get<ConversationHistory[]>('/api/chat/conversations')
  }

  /**
   * Create new conversation
   */
  async createConversation(title?: string): Promise<APIResponse<{ conversation_id: string }>> {
    return this.client.post('/api/chat/conversations', {
      title: title || 'New Conversation'
    })
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<APIResponse<void>> {
    return this.client.delete(`/api/chat/conversations/${conversationId}`)
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(conversationId: string, title: string): Promise<APIResponse<void>> {
    return this.client.put(`/api/chat/conversations/${conversationId}`, {
      title
    })
  }

  // ============= Message Operations =============

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, limit: number = 50): Promise<APIResponse<ChatMessage[]>> {
    return this.client.get<ChatMessage[]>(`/api/chat/conversations/${conversationId}/messages`, {
      params: { limit: limit.toString() }
    })
  }

  /**
   * Delete a specific message
   */
  async deleteMessage(messageId: string): Promise<APIResponse<void>> {
    return this.client.delete(`/api/chat/messages/${messageId}`)
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, content: string): Promise<APIResponse<ChatMessage>> {
    return this.client.put(`/api/chat/messages/${messageId}`, {
      content
    })
  }

  // ============= Streaming Chat =============

  /**
   * Send a streaming chat message (returns EventSource for SSE)
   * Note: This would need special handling for streaming responses
   */
  async chatStream(
    message: string,
    _options: {
      userId?: string
      context?: string
      selectedAccount?: MarketingAccount
      conversationId?: string
      onMessage?: (chunk: string) => void
      onComplete?: (response: ChatResponse) => void
      onError?: (error: string) => void
    } = {}
  ): Promise<APIResponse<EventSource>> {
    const sessionId = this.client.getSessionId()
    
    if (!sessionId) {
      return {
        success: false,
        error: 'No active session found'
      }
    }

    // For now, return a placeholder - streaming would need special implementation
    return {
      success: false,
      error: 'Streaming chat not yet implemented in SDK'
    }
  }

  // ============= Utility Methods =============

  /**
   * Clear conversation history for current session
   */
  async clearHistory(): Promise<APIResponse<void>> {
    return this.client.delete('/api/chat/history')
  }

  /**
   * Export conversation to different formats
   */
  async exportConversation(
    conversationId: string,
    format: 'json' | 'txt' | 'pdf' = 'json'
  ): Promise<APIResponse<{ download_url: string }>> {
    return this.client.post(`/api/chat/conversations/${conversationId}/export`, {
      format
    })
  }

  /**
   * Search messages across all conversations
   */
  async searchMessages(query: string, limit: number = 20): Promise<APIResponse<ChatMessage[]>> {
    return this.client.get<ChatMessage[]>('/api/chat/search', {
      params: { 
        q: query,
        limit: limit.toString()
      }
    })
  }
}
