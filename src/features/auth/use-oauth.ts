import { useState, useCallback, useEffect, useRef } from 'react';
import type { Status } from '../../types';
import type { OAuthProvider, OAuthCallbackData } from './oauth-types';
import { oauthService } from './oauth-service';

type UseOAuthReturn = {
  status: Status;
  error: string | null;
  initiateOAuth: (provider: OAuthProvider) => void;
};

export function useOAuth(
  onSuccess: (provider: OAuthProvider) => void
): UseOAuthReturn {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentProviderRef = useRef<OAuthProvider | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  // Listen for OAuth callback message
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin in production
      if (event.data?.type !== 'oauth-callback') return;

      const data = event.data as { type: string } & OAuthCallbackData;

      if (data.error) {
        setError(data.error);
        setStatus('error');
        return;
      }

      try {
        await oauthService.exchangeCode(data.provider, data.code);
        setStatus('success');
        onSuccess(data.provider);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OAuth failed');
        setStatus('error');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess]);

  const initiateOAuth = useCallback(
    (provider: OAuthProvider) => {
      setStatus('loading');
      setError(null);
      currentProviderRef.current = provider;

      const popup = oauthService.openPopup(provider);

      if (!popup) {
        setError('Popup blocked. Please allow popups for this site.');
        setStatus('error');
        return;
      }

      popupRef.current = popup;

      // Poll to detect if popup was closed without completing
      pollIntervalRef.current = setInterval(() => {
        if (popup.closed) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          // Only set error if we haven't received success
          if (status === 'loading') {
            setError('Authentication cancelled');
            setStatus('error');
          }
        }
      }, 500);
    },
    [onSuccess, status]
  );

  return {
    status,
    error,
    initiateOAuth,
  };
}
