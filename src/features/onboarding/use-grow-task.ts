import { useState, useEffect, useRef, useCallback } from 'react';
import type { Status } from '../../types';
import { onboardingApiService } from './onboarding-api-service';

type UseGrowTaskReturn = {
  isReady: boolean;
  progress: number;
  status: Status;
  error: string | null;
};

const POLL_INTERVAL = 3000; // 3 seconds

export function useGrowTask(taskId: string | null): UseGrowTaskReturn {
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status>(taskId ? 'loading' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const checkStatus = useCallback(async () => {
    if (!taskId) return;

    try {
      const result = await onboardingApiService.getGrowTaskStatus(taskId);
      if (mountedRef.current) {
        setProgress(result.progress);
        if (result.ready) {
          setIsReady(true);
          setStatus('success');
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof Error ? err.message : 'Failed to check task status'
        );
        setStatus('error');
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    }
  }, [taskId]);

  useEffect(() => {
    mountedRef.current = true;

    if (!taskId) {
      setStatus('idle');
      setIsReady(false);
      setProgress(0);
      return;
    }

    setStatus('loading');
    checkStatus();

    pollRef.current = setInterval(checkStatus, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [taskId, checkStatus]);

  return {
    isReady,
    progress,
    status,
    error,
  };
}
