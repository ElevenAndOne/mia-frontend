import { useReducer, useCallback, useRef, useEffect, type ReactNode } from 'react';
import type {
  ChatState,
  ChatAction,
  ChatMessage,
  ChatMessageInput,
  MessageQueueItem,
} from './types';
import { ChatContext } from './chat-context-value';

const TYPING_DELAY_MIN = 2000;
const TYPING_DELAY_MAX = 2500;
const MESSAGE_DELAY_BASE = 800;

const initialState: ChatState = {
  messages: [],
  queue: [],
  isTyping: false,
  isProcessingQueue: false,
};

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function getTypingDelay(): number {
  return Math.random() * (TYPING_DELAY_MAX - TYPING_DELAY_MIN) + TYPING_DELAY_MIN;
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.message],
        isTyping: false,
      };

    case 'QUEUE_MESSAGES':
      return {
        ...state,
        queue: [...state.queue, ...action.items],
        isProcessingQueue: true,
      };

    case 'PROCESS_NEXT': {
      if (state.queue.length === 0) {
        return { ...state, isProcessingQueue: false, isTyping: false };
      }
      const [next, ...rest] = state.queue;
      return {
        ...state,
        messages: [...state.messages, next.message],
        queue: rest,
        isTyping: rest.length > 0,
      };
    }

    case 'SET_TYPING':
      return { ...state, isTyping: action.isTyping };

    case 'UPDATE_STREAMING_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.id && m.type === 'mia'
            ? { ...m, content: action.content }
            : m
        ),
      };

    case 'COMPLETE_STREAMING':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.id && m.type === 'mia'
            ? { ...m, isStreaming: false }
            : m
        ),
      };

    case 'CLEAR_QUEUE':
      return { ...state, queue: [], isProcessingQueue: false };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

type ChatProviderProps = {
  children: ReactNode;
};

export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const queueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Process queue with delays
  useEffect(() => {
    if (!state.isProcessingQueue || state.queue.length === 0) return;

    const nextItem = state.queue[0];
    dispatch({ type: 'SET_TYPING', isTyping: true });

    queueTimerRef.current = setTimeout(() => {
      dispatch({ type: 'PROCESS_NEXT' });
    }, nextItem.delay);

    return () => {
      if (queueTimerRef.current) {
        clearTimeout(queueTimerRef.current);
      }
    };
  }, [state.isProcessingQueue, state.queue]);

  const addMessage = useCallback((message: ChatMessageInput) => {
    dispatch({ type: 'SET_TYPING', isTyping: true });
    setTimeout(() => {
      const fullMessage = {
        ...message,
        id: generateId(),
        timestamp: Date.now(),
      } as ChatMessage;
      dispatch({ type: 'ADD_MESSAGE', message: fullMessage });
    }, getTypingDelay());
  }, []);

  const addImmediateMessage = useCallback((message: ChatMessageInput) => {
    const fullMessage = {
      ...message,
      id: generateId(),
      timestamp: Date.now(),
    } as ChatMessage;
    dispatch({ type: 'ADD_MESSAGE', message: fullMessage });
  }, []);

  const queueMessages = useCallback(
    (messages: ChatMessageInput[], baseDelay = MESSAGE_DELAY_BASE) => {
      const items: MessageQueueItem[] = messages.map((message, index) => ({
        message: {
          ...message,
          id: generateId(),
          timestamp: Date.now() + index,
        } as ChatMessage,
        delay: index === 0 ? getTypingDelay() : baseDelay + getTypingDelay(),
      }));
      dispatch({ type: 'QUEUE_MESSAGES', items });
    },
    []
  );

  const updateStreamingMessage = useCallback((id: string, content: string) => {
    dispatch({ type: 'UPDATE_STREAMING_MESSAGE', id, content });
  }, []);

  const completeStreaming = useCallback((id: string) => {
    dispatch({ type: 'COMPLETE_STREAMING', id });
  }, []);

  const clearQueue = useCallback(() => {
    dispatch({ type: 'CLEAR_QUEUE' });
  }, []);

  const reset = useCallback(() => {
    if (queueTimerRef.current) {
      clearTimeout(queueTimerRef.current);
    }
    dispatch({ type: 'RESET' });
  }, []);

  const value = {
    ...state,
    addMessage,
    addImmediateMessage,
    queueMessages,
    updateStreamingMessage,
    completeStreaming,
    clearQueue,
    reset,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
