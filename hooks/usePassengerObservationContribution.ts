/**
 * usePassengerObservationContribution Hook
 * Stage 4: Passenger Observation Upload Hook for CHIGARI RIDE
 *
 * Connects foreground passenger GPS fixes to the rate-limited observation dispatcher.
 *
 * Invariants & Architectural Rules:
 * 1. Strictly Foreground: Only operates while the passenger actively has the app open
 *    and has explicitly chosen to contribute to a selected bus service.
 * 2. Privacy First: Anonymous session ID, no user ID, no tickets or profile data.
 * 3. Safe Lifecycle: Ceases dispatching and clears session state on unmount or when stopped.
 * 4. Resilient: Swallows network drops without blocking or crashing the UI.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePassengerLocation } from './usePassengerLocation';
import {
  AuthoritativeChigariService,
  isAuthoritativeServiceNumber,
  ObservationRateLimiter,
} from '../services/passengerObservation';
import {
  dispatchPassengerObservation,
  DispatchObservationResult,
} from '../services/passengerObservationUpload';
import {
  getOrCreateObservationSessionId,
  resetObservationSessionId,
} from '../services/passengerObservationSession';

export interface UseObservationContributionOptions {
  /**
   * Initial service number (e.g. '200A', '201B').
   */
  initialServiceNumber?: string;
  /**
   * Optional fleet number reported by passenger (e.g. 'CR-BUS-001').
   */
  initialReportedFleetNumber?: string | null;
}

export interface UseObservationContributionReturn {
  isContributing: boolean;
  activeServiceNumber: AuthoritativeChigariService | null;
  reportedFleetNumber: string | null;
  lastDispatchResult: DispatchObservationResult | null;
  error: string | null;
  startContributing: (serviceNumber: string, reportedFleetNumber?: string | null) => Promise<boolean>;
  stopContributing: () => void;
}

export function usePassengerObservationContribution(
  options: UseObservationContributionOptions = {}
): UseObservationContributionReturn {
  const { initialServiceNumber, initialReportedFleetNumber } = options;

  const [isContributing, setIsContributing] = useState<boolean>(false);
  const [activeServiceNumber, setActiveServiceNumber] = useState<AuthoritativeChigariService | null>(
    initialServiceNumber && isAuthoritativeServiceNumber(initialServiceNumber)
      ? initialServiceNumber
      : null
  );
  const [reportedFleetNumber, setReportedFleetNumber] = useState<string | null>(
    initialReportedFleetNumber || null
  );
  const [lastDispatchResult, setLastDispatchResult] = useState<DispatchObservationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rateLimiterRef = useRef<ObservationRateLimiter>(new ObservationRateLimiter(10_000));
  const isMountedRef = useRef<boolean>(true);

  // Acquire foreground GPS hook
  const { location, isWatching, startWatching, stopWatching } = usePassengerLocation({
    accuracy: 'high',
    timeInterval: 5000,
    distanceInterval: 10,
    autoWatch: false,
  });

  // Dispatch whenever location updates and contribution is active
  useEffect(() => {
    if (!isContributing || !activeServiceNumber || !location) {
      return;
    }

    let isCancelled = false;

    dispatchPassengerObservation(
      {
        serviceNumber: activeServiceNumber,
        location,
        reportedFleetNumber,
      },
      rateLimiterRef.current
    )
      .then((result) => {
        if (!isCancelled && isMountedRef.current) {
          setLastDispatchResult(result);
          if (result.dispatched) {
            setError(null);
          } else if (result.reason === 'upload_error') {
            setError(result.error || 'Network error');
          }
        }
      })
      .catch((err) => {
        if (!isCancelled && isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Upload failed');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [location, isContributing, activeServiceNumber, reportedFleetNumber]);

  // Start contribution
  const startContributing = useCallback(
    async (serviceNumber: string, reportedFleet?: string | null): Promise<boolean> => {
      if (!isAuthoritativeServiceNumber(serviceNumber)) {
        if (isMountedRef.current) {
          setError(`Invalid service number: "${serviceNumber}"`);
        }
        return false;
      }

      setError(null);
      setActiveServiceNumber(serviceNumber);
      setReportedFleetNumber(reportedFleet || null);
      rateLimiterRef.current.reset();

      // Ensure session ID is initialized
      getOrCreateObservationSessionId();

      // Start watching foreground GPS
      const started = await startWatching();
      if (isMountedRef.current) {
        setIsContributing(started);
      }
      return started;
    },
    [startWatching]
  );

  // Stop contribution
  const stopContributing = useCallback(() => {
    stopWatching();
    resetObservationSessionId();
    if (isMountedRef.current) {
      setIsContributing(false);
      setActiveServiceNumber(null);
      setReportedFleetNumber(null);
      setError(null);
    }
  }, [stopWatching]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopWatching();
      resetObservationSessionId();
    };
  }, [stopWatching]);

  return {
    isContributing,
    activeServiceNumber,
    reportedFleetNumber,
    lastDispatchResult,
    error,
    startContributing,
    stopContributing,
  };
}
