import { useState, useRef, useCallback, useEffect } from 'react';
import type { UseStreamingReturn, StreamEvent } from './streaming-types';

const TYPING_SPEED_MS = 14; // 14ms per character for typing effect

export function useStreaming(): UseStreamingReturn {
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const bufferRef = useRef('');
  const displayIndexRef = useRef(0);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTypingEffect = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  }, []);

  const startTypingEffect = useCallback(() => {
    stopTypingEffect();

    typingIntervalRef.current = setInterval(() => {
      if (displayIndexRef.current < bufferRef.current.length) {
        displayIndexRef.current++;
        setStreamedText(bufferRef.current.slice(0, displayIndexRef.current));
      } else if (!eventSourceRef.current) {
        // Buffer exhausted and stream closed
        stopTypingEffect();
        setIsComplete(true);
        setIsStreaming(false);
      }
    }, TYPING_SPEED_MS);
  }, [stopTypingEffect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTypingEffect();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [stopTypingEffect]);

  const startStreaming = useCallback(
    (endpoint: string) => {
      // Reset state
      setStreamedText('');
      setIsStreaming(true);
      setIsComplete(false);
      setError(null);
      bufferRef.current = '';
      displayIndexRef.current = 0;

      startTypingEffect();

      const eventSource = new EventSource(endpoint, { withCredentials: true });
      eventSourceRef.current = eventSource;

      eventSource.onmessage = event => {
        try {
          const data: StreamEvent = JSON.parse(event.data);

          switch (data.type) {
            case 'chunk':
              bufferRef.current += data.content;
              break;
            case 'complete':
              eventSource.close();
              eventSourceRef.current = null;
              break;
            case 'error':
              eventSource.close();
              eventSourceRef.current = null;
              setError(data.message);
              setIsStreaming(false);
              stopTypingEffect();
              break;
          }
        } catch {
          // Handle non-JSON messages (raw text chunks)
          bufferRef.current += event.data;
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;
        setError('Connection lost');
        setIsStreaming(false);
        stopTypingEffect();
      };
    },
    [startTypingEffect, stopTypingEffect]
  );

  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    stopTypingEffect();
    // Display all buffered content
    setStreamedText(bufferRef.current);
    setIsStreaming(false);
    setIsComplete(true);
  }, [stopTypingEffect]);

  const reset = useCallback(() => {
    stopStreaming();
    setStreamedText('');
    setIsComplete(false);
    setError(null);
    bufferRef.current = '';
    displayIndexRef.current = 0;
  }, [stopStreaming]);

  return {
    streamedText,
    isStreaming,
    isComplete,
    error,
    startStreaming,
    stopStreaming,
    reset,
  };
}
