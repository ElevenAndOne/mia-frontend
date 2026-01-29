export type StreamingState = {
  streamedText: string;
  isStreaming: boolean;
  isComplete: boolean;
  error: string | null;
};

export type UseStreamingReturn = StreamingState & {
  startStreaming: (endpoint: string) => void;
  stopStreaming: () => void;
  reset: () => void;
};

// SSE event types from backend
export type StreamEvent =
  | { type: 'start'; id: string }
  | { type: 'chunk'; content: string }
  | { type: 'complete' }
  | { type: 'error'; message: string };
