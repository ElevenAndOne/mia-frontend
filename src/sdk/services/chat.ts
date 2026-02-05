/**
 * Chat Service
 * mia.chat - Chat functionality
 */

import type { Transport } from '../internal/transport';
import type { StorageAdapter } from '../internal/storage';

export interface ChatMessage {
  message: string;
  dateRange?: string;
  platforms?: string[];
  googleAdsId?: string;
  ga4PropertyId?: string;
  metaAdsId?: string;
}

export interface ChatResponse {
  success: boolean;
  claudeResponse?: string;
  response?: string;
  error?: string;
}

export class ChatService {
  private transport: Transport;
  private storage: StorageAdapter;

  constructor(transport: Transport, storage: StorageAdapter) {
    this.transport = transport;
    this.storage = storage;
  }

  /**
   * Send a chat message
   *
   * @example
   * ```typescript
   * try {
   *   const response = await mia.chat.send({
   *     message: 'How did my campaigns perform last week?',
   *     dateRange: '7_days',
   *     platforms: ['google_ads', 'meta'],
   *   });
   *   if (response.success) {
   *     setAIResponse(response.claudeResponse);
   *   }
   * } catch (error) {
   *   if (isMiaSDKError(error)) {
   *     toast.error('Failed to send message');
   *   }
   * }
   * ```
   */
  async send(message: ChatMessage): Promise<ChatResponse> {
    const userId = this.storage.getUserId();

    const response = await this.transport.request<{
      success: boolean;
      claude_response?: string;
      response?: string;
      error?: string;
    }>('/api/chat', {
      method: 'POST',
      body: {
        message: message.message,
        user_id: userId || '',
        date_range: message.dateRange || '30_days',
        selected_platforms: message.platforms,
        google_ads_id: message.googleAdsId,
        ga4_property_id: message.ga4PropertyId,
        meta_ads_id: message.metaAdsId,
      },
    });

    return {
      success: response.success,
      claudeResponse: response.claude_response || response.response,
      error: response.error,
    };
  }

  /**
   * Send a quick question (simplified chat)
   */
  async quickQuestion(
    question: string,
    context?: {
      dateRange?: string;
      platforms?: string[];
    }
  ): Promise<string> {
    const response = await this.send({
      message: question,
      dateRange: context?.dateRange,
      platforms: context?.platforms,
    });

    if (!response.success || !response.claudeResponse) {
      throw new Error(response.error || 'Failed to get response');
    }

    return response.claudeResponse;
  }
}
