/**
 * useLiveBusTracking Hook
 * Stage 6A: Supabase Realtime Live Position Hook for CHIGARI RIDE
 *
 * Connects the live tracking map to public.live_positions using Supabase Realtime.
 *
 * Features:
 * 1. Initial snapshot load of public.live_positions and public.buses.
 * 2. Realtime postgres_changes subscription (INSERT, UPDATE, DELETE).
 * 3. Physical bus identity preservation (physicalBusId / fleetNumber).
 * 4. Fallback coordination: Falls back to demo buses when Supabase has no live positions.
 * 5. Lifecycle protection: Automatically unregisters subscriptions on unmount.
 * 6. Read-Only: Never writes to live_positions from mobile client.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Coordinates, ChigariBus, ChigariRoute } from '../types/transit';
import {
  CHIGARI_CORRIDOR_ROUTE,
  INITIAL_CHIGARI_BUSES,
  DEMO_USER_LOCATION,
} from '../data/chigariRoute';
import {
  fetchLiveBusesSnapshot,
  subscribeToLivePositions,
} from '../services/liveTrackingService';
import { applyConfidenceDecayToBuses } from '../services/trackingConfidenceEngine';

export interface UseLiveBusTrackingReturn {
  buses: ChigariBus[];
  selectedBus: ChigariBus | null;
  activeRoute: ChigariRoute;
  userLocation: Coordinates & { title: string; subtitle: string };
  selectBus: (busOrIdOrNumber: ChigariBus | string | null) => void;
  isRealtimeConnected: boolean;
  isLoading: boolean;
  error: string | null;
  trackingSource: 'supabase' | 'fallback_demo';
}

export function useLiveBusTracking(): UseLiveBusTrackingReturn {
  const [buses, setBuses] = useState<ChigariBus[]>(INITIAL_CHIGARI_BUSES);
  const [selectedBusId, setSelectedBusId] = useState<string | null>('CR-BUS-001');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingSource, setTrackingSource] = useState<'supabase' | 'fallback_demo'>('fallback_demo');

  const isMountedRef = useRef<boolean>(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const activeRoute: ChigariRoute = CHIGARI_CORRIDOR_ROUTE;
  const userLocation = DEMO_USER_LOCATION;

  // Selected bus derivation
  const selectedBus = selectedBusId
    ? buses.find((b) => b.physicalBusId === selectedBusId || b.id === selectedBusId) ?? null
    : null;

  // Select bus handler (supports physicalBusId, id, or busNumber)
  const selectBus = useCallback((busOrIdOrNumber: ChigariBus | string | null) => {
    if (!busOrIdOrNumber) {
      setSelectedBusId(null);
      setBuses((prev) => prev.map((b) => ({ ...b, isSelected: false })));
      return;
    }

    setBuses((prev) => {
      let targetBus: ChigariBus | undefined;

      if (typeof busOrIdOrNumber === 'object' && busOrIdOrNumber !== null) {
        targetBus = busOrIdOrNumber;
      } else {
        // Priority 1: Match physicalBusId or id
        targetBus = prev.find(
          (b) => b.physicalBusId === busOrIdOrNumber || b.id === busOrIdOrNumber
        );
        // Priority 2: Match service number
        if (!targetBus) {
          targetBus = prev.find((b) => b.busNumber === busOrIdOrNumber);
        }
      }

      const chosenId = targetBus ? (targetBus.physicalBusId || targetBus.id) : null;
      setSelectedBusId(chosenId);

      return prev.map((b) => ({
        ...b,
        isSelected: chosenId !== null && (b.physicalBusId === chosenId || b.id === chosenId),
      }));
    });
  }, []);

  // Main lifecycle: fetch initial snapshot and subscribe to Realtime
  useEffect(() => {
    isMountedRef.current = true;
    setIsLoading(true);

    // 1. Initial snapshot fetch
    fetchLiveBusesSnapshot()
      .then(({ buses: liveBuses, error: snapError }) => {
        if (!isMountedRef.current) return;

        if (snapError) {
          setError(snapError);
        }

        if (liveBuses && liveBuses.length > 0) {
          const decayed = applyConfidenceDecayToBuses(liveBuses);
          setBuses(decayed);
          setTrackingSource('supabase');
          // Select first available live bus if no bus selected
          setSelectedBusId((prev) => prev || decayed[0].physicalBusId || decayed[0].id);
        } else {
          // Fall back gracefully to existing demo buses so the screen is never blank
          setBuses(INITIAL_CHIGARI_BUSES);
          setTrackingSource('fallback_demo');
        }

        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMountedRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setBuses(INITIAL_CHIGARI_BUSES);
        setTrackingSource('fallback_demo');
        setIsLoading(false);
      });

    // 2. Realtime postgres_changes subscription
    const unsubscribe = subscribeToLivePositions(
      (updatedBuses) => {
        if (!isMountedRef.current) return;

        if (updatedBuses && updatedBuses.length > 0) {
          const decayed = applyConfidenceDecayToBuses(updatedBuses);
          setBuses(decayed);
          setTrackingSource('supabase');
          setIsRealtimeConnected(true);
        } else {
          // If all buses deleted from live_positions, fall back to demo
          setBuses(INITIAL_CHIGARI_BUSES);
          setTrackingSource('fallback_demo');
        }
      },
      (subError) => {
        if (!isMountedRef.current) return;
        console.warn('[useLiveBusTracking] Realtime connection issue:', subError.message);
        setIsRealtimeConnected(false);
      }
    );

    unsubscribeRef.current = unsubscribe;
    setIsRealtimeConnected(true);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // 3. Periodic confidence decay timer (updates local confidence tier every 5 seconds)
  useEffect(() => {
    const decayTimer = setInterval(() => {
      if (!isMountedRef.current) return;
      setBuses((prev) => applyConfidenceDecayToBuses(prev));
    }, 5000);

    return () => clearInterval(decayTimer);
  }, []);

  return {
    buses,
    selectedBus,
    activeRoute,
    userLocation,
    selectBus,
    isRealtimeConnected,
    isLoading,
    error,
    trackingSource,
  };
}
