import { useState, useEffect, useRef, useCallback } from 'react';
import type { GoogleAccount } from './types';
import type { Status } from '../../types';
import { onboardingService } from './onboarding-service';

type UseGoogleAccountsReturn = {
  accounts: GoogleAccount[];
  status: Status;
  error: string | null;
  refetch: () => void;
};

export function useGoogleAccounts(): UseGoogleAccountsReturn {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const fetchId = ++fetchIdRef.current;

    onboardingService.getGoogleAccounts().then(
      data => {
        if (mountedRef.current && fetchId === fetchIdRef.current) {
          setAccounts(data);
          setStatus('success');
        }
      },
      err => {
        if (mountedRef.current && fetchId === fetchIdRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
          setStatus('error');
        }
      }
    );

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(() => {
    const fetchId = ++fetchIdRef.current;
    setStatus('loading');
    setError(null);

    onboardingService.getGoogleAccounts().then(
      data => {
        if (fetchId === fetchIdRef.current) {
          setAccounts(data);
          setStatus('success');
        }
      },
      err => {
        if (fetchId === fetchIdRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
          setStatus('error');
        }
      }
    );
  }, []);

  return {
    accounts,
    status,
    error,
    refetch,
  };
}
