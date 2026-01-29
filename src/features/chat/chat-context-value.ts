import { createContext } from 'react';
import type { ChatContextValue } from './types';

const defaultChatContext: ChatContextValue = {
  messages: [],
  queue: [],
  isTyping: false,
  isProcessingQueue: false,
  addMessage: () => {},
  addImmediateMessage: () => {},
  queueMessages: () => {},
  updateStreamingMessage: () => {},
  completeStreaming: () => {},
  clearQueue: () => {},
  reset: () => {},
};

export const ChatContext = createContext<ChatContextValue>(defaultChatContext);
