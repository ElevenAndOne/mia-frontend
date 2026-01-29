import { useState, useEffect, useRef, useCallback } from 'react';
import type { MetaCampaign } from './types';
import type { Status } from '../../types';
import { onboardingService } from './onboarding-service';

type UseMetaCampaignsReturn = {
  campaigns: MetaCampaign[];
  status: Status;
  error: string | null;
  refetch: () => void;
};

export function useMetaCampaigns(accountId: string | null): UseMetaCampaignsReturn {
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [status, setStatus] = useState<Status>(accountId ? 'loading' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!accountId) {
      setCampaigns([]);
      setStatus('idle');
      setError(null);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setStatus('loading');

    onboardingService.getMetaCampaigns(accountId).then(
      data => {
        if (mountedRef.current && fetchId === fetchIdRef.current) {
          setCampaigns(data);
          setStatus('success');
        }
      },
      err => {
        if (mountedRef.current && fetchId === fetchIdRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
          setStatus('error');
        }
      }
    );

    return () => {
      mountedRef.current = false;
    };
  }, [accountId]);

  const refetch = useCallback(() => {
    if (!accountId) return;

    const fetchId = ++fetchIdRef.current;
    setStatus('loading');
    setError(null);

    onboardingService.getMetaCampaigns(accountId).then(
      data => {
        if (fetchId === fetchIdRef.current) {
          setCampaigns(data);
          setStatus('success');
        }
      },
      err => {
        if (fetchId === fetchIdRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
          setStatus('error');
        }
      }
    );
  }, [accountId]);

  return {
    campaigns,
    status,
    error,
    refetch,
  };
}
