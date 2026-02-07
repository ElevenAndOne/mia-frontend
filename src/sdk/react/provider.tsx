/**
 * MiaProvider - React Context for SDK
 *
 * Initializes the MiaClient and provides it via context.
 * This is the bridge between the SDK and React components.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createMiaClient, type MiaClient, type MiaClientConfig } from '../client';

const MiaClientContext = createContext<MiaClient | null>(null);

export interface MiaProviderProps {
  /**
   * SDK configuration
   */
  config: MiaClientConfig;

  /**
   * React children
   */
  children: ReactNode;
}

/**
 * Provider component that initializes the SDK and makes it available to children
 *
 * @example
 * ```tsx
 * import { MiaProvider } from '@/sdk/react';
 *
 * function App() {
 *   return (
 *     <MiaProvider
 *       config={{
 *         baseUrl: import.meta.env.VITE_API_BASE_URL,
 *         onSessionExpired: () => navigate('/login'),
 *       }}
 *     >
 *       <YourApp />
 *     </MiaProvider>
 *   );
 * }
 * ```
 */
export function MiaProvider({ config, children }: MiaProviderProps) {
  // Create client and memoize by config object identity.
  const client = useMemo(() => createMiaClient(config), [config]);

  return (
    <MiaClientContext.Provider value={client}>
      {children}
    </MiaClientContext.Provider>
  );
}

/**
 * Hook to access the MiaClient
 *
 * @throws Error if used outside of MiaProvider
 *
 * @example
 * ```tsx
 * import { useMiaClient, isMiaSDKError } from '@/sdk';
 *
 * function MyComponent() {
 *   const mia = useMiaClient();
 *
 *   const handleLogin = async () => {
 *     try {
 *       const result = await mia.auth.google.connect();
 *       if (result.success) {
 *         // Handle success
 *       }
 *     } catch (error) {
 *       if (isMiaSDKError(error)) {
 *         // Handle SDK error
 *       }
 *     }
 *   };
 *
 *   return <button onClick={handleLogin}>Login</button>;
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useMiaClient(): MiaClient {
  const client = useContext(MiaClientContext);

  if (!client) {
    throw new Error('useMiaClient must be used within a MiaProvider');
  }

  return client;
}
