import { useState, useEffect, useRef, useCallback } from 'react';
import type { OnboardingStatus } from './types';
import type { Status } from '../../types';
import { onboardingApiService } from './onboarding-api-service';

type UseOnboardingStatusReturn = {
  status: OnboardingStatus | null;
  fetchStatus: Status;
  error: string | null;
  refetch: () => void;
};

export function useOnboardingStatus(): UseOnboardingStatusReturn {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [fetchStatus, setFetchStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setFetchStatus('loading');
    setError(null);

    try {
      const data = await onboardingApiService.getStatus();
      if (mountedRef.current && fetchId === fetchIdRef.current) {
        setStatus(data);
        setFetchStatus('success');
      }
    } catch (err) {
      if (mountedRef.current && fetchId === fetchIdRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
        setFetchStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  return {
    status,
    fetchStatus,
    error,
    refetch: fetchData,
  };
}
