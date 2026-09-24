/**
 * usePassengerLocation Hook
 * Stage 3: Foreground Passenger Location Hook for CHIGARI RIDE
 *
 * Provides reactive access to foreground GPS coordinates for the passenger UI.
 *
 * Invariants & Architectural Rules:
 * 1. Strictly User-Controlled: Never forces auto-tracking unless explicitly requested.
 * 2. Foreground-Only: Does not perform background location or register tasks.
 * 3. In-Memory: Coordinates live solely in component state; no disk or remote persistence.
 * 4. Safe Cleanup: Automatically stops watch and frees native subscriptions on unmount.
 * 5. Zero external backend / auth dependencies.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PassengerLocation,
  PassengerLocationPermissionStatus,
  LocationPermissionState,
  WatchPassengerLocationOptions,
  getPassengerLocationPermission,
  requestPassengerLocationPermission,
  getCurrentPassengerLocation,
  startPassengerLocationWatch,
} from '../services/passengerLocation';

export interface UsePassengerLocationOptions extends WatchPassengerLocationOptions {
  /**
   * Whether to automatically start watching if permission is already granted.
   * STRICT DEFAULT: false (respects battery and privacy by avoiding auto-start).
   */
  autoWatch?: boolean;
}

export interface UsePassengerLocationReturn {
  location: PassengerLocation | null;
  isWatching: boolean;
  permissionStatus: PassengerLocationPermissionStatus;
  canAskAgain: boolean;
  error: string | null;
  checkPermission: () => Promise<LocationPermissionState>;
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<PassengerLocation | null>;
  startWatching: () => Promise<boolean>;
  stopWatching: () => void;
}

export function usePassengerLocation(
  options: UsePassengerLocationOptions = {}
): UsePassengerLocationReturn {
  const {
    autoWatch = false,
    accuracy = 'high',
    timeInterval = 5000,
    distanceInterval = 10,
  } = options;

  const [location, setLocation] = useState<PassengerLocation | null>(null);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<PassengerLocationPermissionStatus>('undetermined');
  const [canAskAgain, setCanAskAgain] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Stop watching helper
  const stopWatching = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (isMountedRef.current) {
      setIsWatching(false);
    }
  }, []);

  // Check current permission without prompting
  const checkPermission = useCallback(async (): Promise<LocationPermissionState> => {
    const res = await getPassengerLocationPermission();
    if (isMountedRef.current) {
      setPermissionStatus(res.status);
      setCanAskAgain(res.canAskAgain);
      if (res.status === 'services_disabled') {
        setError('Location services are turned off on this device.');
      } else if (res.status === 'denied') {
        setError('Location permission was denied.');
      } else {
        setError(null);
      }
    }
    return res;
  }, []);

  // Explicitly prompt user for permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const res = await requestPassengerLocationPermission();
    if (isMountedRef.current) {
      setPermissionStatus(res.status);
      setCanAskAgain(res.canAskAgain);
      if (!res.granted) {
        setError(res.status === 'services_disabled' ? 'Location services are disabled.' : 'Location permission denied.');
      } else {
        setError(null);
      }
    }
    return res.granted;
  }, []);

  // Get current one-shot location
  const getCurrentLocation = useCallback(async (): Promise<PassengerLocation | null> => {
    setError(null);
    let perm = await getPassengerLocationPermission();
    if (!perm.granted && perm.canAskAgain) {
      perm = await requestPassengerLocationPermission();
    }

    if (!perm.granted) {
      if (isMountedRef.current) {
        setPermissionStatus(perm.status);
        setError(perm.status === 'services_disabled' ? 'Location services are disabled.' : 'Location permission not granted.');
      }
      return null;
    }

    try {
      const loc = await getCurrentPassengerLocation(accuracy);
      if (isMountedRef.current) {
        if (loc) {
          setLocation(loc);
        } else {
          setError('Failed to acquire current location fix.');
        }
      }
      return loc;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown location error';
      if (isMountedRef.current) {
        setError(msg);
      }
      return null;
    }
  }, [accuracy]);

  // Start watching foreground updates
  const startWatching = useCallback(async (): Promise<boolean> => {
    stopWatching();
    setError(null);

    let perm = await getPassengerLocationPermission();
    if (!perm.granted && perm.canAskAgain) {
      perm = await requestPassengerLocationPermission();
    }

    if (!perm.granted) {
      if (isMountedRef.current) {
        setPermissionStatus(perm.status);
        setError(perm.status === 'services_disabled' ? 'Location services are disabled.' : 'Location permission not granted.');
      }
      return false;
    }

    if (isMountedRef.current) {
      setPermissionStatus('granted');
    }

    const unsub = await startPassengerLocationWatch(
      (loc) => {
        if (isMountedRef.current) {
          setLocation(loc);
          setError(null);
        }
      },
      (err) => {
        if (isMountedRef.current) {
          setError(err.message);
        }
      },
      { accuracy, timeInterval, distanceInterval }
    );

    cleanupRef.current = unsub;
    if (isMountedRef.current) {
      setIsWatching(true);
    }
    return true;
  }, [accuracy, distanceInterval, stopWatching, timeInterval]);

  // Mount/unmount lifecycle
  useEffect(() => {
    isMountedRef.current = true;

    // Check permission on mount
    checkPermission().then((res) => {
      if (autoWatch && res.granted) {
        startWatching();
      }
    });

    return () => {
      isMountedRef.current = false;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [autoWatch, checkPermission, startWatching]);

  return {
    location,
    isWatching,
    permissionStatus,
    canAskAgain,
    error,
    checkPermission,
    requestPermission,
    getCurrentLocation,
    startWatching,
    stopWatching,
  };
}
