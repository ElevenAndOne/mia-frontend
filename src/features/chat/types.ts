// Message types for the chat system
export type MessageType =
  | 'mia'
  | 'user'
  | 'bronze-card'
  | 'explainer-box'
  | 'choice-buttons';

export type ChoiceAction =
  | 'connect-google'
  | 'connect-meta'
  | 'continue'
  | 'skip'
  | 'view-insights'
  | 'start-chat'
  | 'show-explainers'
  | 'grow'
  | 'optimise'
  | 'protect';

export type ChoiceButton = {
  id: string;
  label: string;
  action: ChoiceAction;
  variant?: 'primary' | 'secondary' | 'outline';
};

type BaseMessage = {
  id: string;
  timestamp: number;
};

export type MiaMessage = BaseMessage & {
  type: 'mia';
  content: string;
  isStreaming?: boolean;
};

export type UserMessage = BaseMessage & {
  type: 'user';
  content: string;
};

export type BronzeCardMessage = BaseMessage & {
  type: 'bronze-card';
  title: string;
  highlight: string;
  metric?: string;
  trend?: 'up' | 'down' | 'neutral';
};

export type ExplainerBoxMessage = BaseMessage & {
  type: 'explainer-box';
  title: string;
  content: string;
  icon?: 'info' | 'tip' | 'warning' | 'grow' | 'optimise' | 'protect';
};

export type ChoiceButtonsMessage = BaseMessage & {
  type: 'choice-buttons';
  buttons: ChoiceButton[];
};

export type ChatMessage =
  | MiaMessage
  | UserMessage
  | BronzeCardMessage
  | ExplainerBoxMessage
  | ChoiceButtonsMessage;

// Input types for creating messages (without id/timestamp)
export type MiaMessageInput = Omit<MiaMessage, 'id' | 'timestamp'>;
export type UserMessageInput = Omit<UserMessage, 'id' | 'timestamp'>;
export type BronzeCardMessageInput = Omit<BronzeCardMessage, 'id' | 'timestamp'>;
export type ExplainerBoxMessageInput = Omit<ExplainerBoxMessage, 'id' | 'timestamp'>;
export type ChoiceButtonsMessageInput = Omit<ChoiceButtonsMessage, 'id' | 'timestamp'>;

export type ChatMessageInput =
  | MiaMessageInput
  | UserMessageInput
  | BronzeCardMessageInput
  | ExplainerBoxMessageInput
  | ChoiceButtonsMessageInput;

// Queue management
export type MessageQueueItem = {
  message: ChatMessage;
  delay: number;
};

// Chat state
export type ChatState = {
  messages: ChatMessage[];
  queue: MessageQueueItem[];
  isTyping: boolean;
  isProcessingQueue: boolean;
};

export type ChatAction =
  | { type: 'ADD_MESSAGE'; message: ChatMessage }
  | { type: 'QUEUE_MESSAGES'; items: MessageQueueItem[] }
  | { type: 'PROCESS_NEXT' }
  | { type: 'SET_TYPING'; isTyping: boolean }
  | { type: 'UPDATE_STREAMING_MESSAGE'; id: string; content: string }
  | { type: 'COMPLETE_STREAMING'; id: string }
  | { type: 'CLEAR_QUEUE' }
  | { type: 'RESET' };

export type ChatContextValue = ChatState & {
  addMessage: (message: ChatMessageInput) => void;
  addImmediateMessage: (message: ChatMessageInput) => void;
  queueMessages: (messages: ChatMessageInput[], baseDelay?: number) => void;
  updateStreamingMessage: (id: string, content: string) => void;
  completeStreaming: (id: string) => void;
  clearQueue: () => void;
  reset: () => void;
};
