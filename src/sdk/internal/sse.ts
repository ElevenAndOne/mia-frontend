/**
 * SSE Streaming Utilities - Internal Only
 *
 * Server-Sent Events handling with async generator pattern.
 * Returns an async iterator that yields chunks as they arrive.
 */

import type { StorageAdapter } from './storage';

export interface SSEConfig {
  baseUrl: string;
  storage: StorageAdapter;
  timeout?: number;
}

export interface SSEChunk {
  type: 'text' | 'done' | 'error';
  text?: string;
  error?: string;
}

export interface SSEStreamOptions {
  onStart?: () => void;
  skipAuth?: boolean;
}

/**
 * Create an SSE stream as an async generator
 *
 * @example
 * ```typescript
 * const stream = createSSEStream(config, '/api/insights/grow/stream', body);
 * for await (const chunk of stream) {
 *   if (chunk.type === 'text') {
 *     fullText += chunk.text;
 *   } else if (chunk.type === 'done') {
 *     // Stream complete
 *   } else if (chunk.type === 'error') {
 *     // Handle error
 *   }
 * }
 * ```
 */
export async function* createSSEStream(
  config: SSEConfig,
  path: string,
  body: unknown,
  options: SSEStreamOptions = {}
): AsyncGenerator<SSEChunk, void, unknown> {
  const { baseUrl, storage, timeout = 120000 } = config;
  const { onStart, skipAuth = false } = options;

  // Validate session
  const sessionId = storage.getSessionId();
  if (!sessionId && !skipAuth) {
    yield { type: 'error', error: 'No active session' };
    return;
  }

  // Build URL
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const url = `${baseUrl}/${cleanPath}`;

  // Setup abort controller with timeout
  const controller = new AbortController();
  const timeoutId =
    timeout > 0 ? setTimeout(() => controller.abort(), timeout) : undefined;

  try {
    onStart?.();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (sessionId && !skipAuth) {
      headers['X-Session-ID'] = sessionId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      yield {
        type: 'error',
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', error: 'No response body' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        yield { type: 'done' };
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || '';

      for (const message of messages) {
        if (message.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(message.slice(6));

            if (parsed.text) {
              yield { type: 'text', text: parsed.text };
            } else if (parsed.done) {
              yield { type: 'done' };
              return;
            } else if (parsed.error) {
              yield { type: 'error', error: parsed.error };
              return;
            }
          } catch {
            // Ignore JSON parse errors - continue processing
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      yield { type: 'error', error: 'Request timed out' };
    } else {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Create a controllable SSE stream that can be aborted
 */
export function createControllableSSEStream(
  config: SSEConfig,
  path: string,
  body: unknown,
  options: SSEStreamOptions = {}
): {
  stream: AsyncGenerator<SSEChunk, void, unknown>;
  abort: () => void;
} {
  const controller = new AbortController();
  const { baseUrl, storage, timeout = 120000 } = config;
  const { onStart, skipAuth = false } = options;

  const sessionId = storage.getSessionId();

  async function* generateStream(): AsyncGenerator<SSEChunk, void, unknown> {
    if (!sessionId && !skipAuth) {
      yield { type: 'error', error: 'No active session' };
      return;
    }

    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = `${baseUrl}/${cleanPath}`;

    const timeoutId =
      timeout > 0 ? setTimeout(() => controller.abort(), timeout) : undefined;

    try {
      onStart?.();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (sessionId && !skipAuth) {
        headers['X-Session-ID'] = sessionId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        yield {
          type: 'error',
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          yield { type: 'done' };
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

        for (const message of messages) {
          if (message.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(message.slice(6));

              if (parsed.text) {
                yield { type: 'text', text: parsed.text };
              } else if (parsed.done) {
                yield { type: 'done' };
                return;
              } else if (parsed.error) {
                yield { type: 'error', error: parsed.error };
                return;
              }
            } catch {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        yield { type: 'error', error: 'Stream aborted' };
      } else {
        yield {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  return {
    stream: generateStream(),
    abort: () => controller.abort(),
  };
}
