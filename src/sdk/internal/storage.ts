/**
 * Storage Adapter - Internal Only
 *
 * Pluggable storage for session persistence.
 * Supports localStorage, sessionStorage, or in-memory storage.
 */

export interface StorageAdapter {
  getSessionId(): string | null;
  setSessionId(id: string): void;
  clearSession(): void;
  getUserId(): string | null;
  setUserId(id: string): void;
}

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_KEYS = {
  SESSION_ID: 'mia_session_id',
  USER_ID: 'mia_last_user_id',
  APP_STATE: 'mia_app_state',
  OAUTH_PENDING: 'mia_oauth_pending',
  OAUTH_RETURN_URL: 'mia_oauth_return_url',
} as const;

/**
 * Create a storage adapter from a storage backend
 */
export function createStorageAdapter(backend: StorageBackend): StorageAdapter {
  return {
    getSessionId() {
      return backend.getItem(STORAGE_KEYS.SESSION_ID);
    },

    setSessionId(id: string) {
      backend.setItem(STORAGE_KEYS.SESSION_ID, id);
    },

    clearSession() {
      backend.removeItem(STORAGE_KEYS.SESSION_ID);
      backend.removeItem(STORAGE_KEYS.USER_ID);
      backend.removeItem(STORAGE_KEYS.APP_STATE);
      backend.removeItem(STORAGE_KEYS.OAUTH_PENDING);
      backend.removeItem(STORAGE_KEYS.OAUTH_RETURN_URL);
    },

    getUserId() {
      return backend.getItem(STORAGE_KEYS.USER_ID);
    },

    setUserId(id: string) {
      backend.setItem(STORAGE_KEYS.USER_ID, id);
    },
  };
}

/**
 * In-memory storage for SSR/testing environments
 */
export function createMemoryStorage(): StorageBackend {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
}

/**
 * Get the default storage backend for the current environment
 */
export function getDefaultStorageBackend(): StorageBackend {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return createMemoryStorage();
}
