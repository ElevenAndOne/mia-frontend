import { useState, useEffect, useRef, useCallback } from 'react';
import type { MetaAdAccount } from './types';
import type { Status } from '../../types';
import { onboardingService } from './onboarding-service';

type UseMetaAccountsReturn = {
  accounts: MetaAdAccount[];
  status: Status;
  error: string | null;
  refetch: () => void;
};

export function useMetaAccounts(): UseMetaAccountsReturn {
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const fetchId = ++fetchIdRef.current;

    onboardingService.getMetaAccounts().then(
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

    onboardingService.getMetaAccounts().then(
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
