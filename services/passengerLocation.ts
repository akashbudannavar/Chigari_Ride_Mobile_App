/**
 * Passenger Location Service
 * Stage 3: Foreground Passenger Location Foundation for CHIGARI RIDE
 *
 * Invariants & Architectural Rules:
 * 1. Strictly Foreground: Uses Location.watchPositionAsync and Location.getCurrentPositionAsync.
 *    No background location, no expo-task-manager, no silent tracking.
 * 2. Privacy & Decoupling: Zero remote database calls, auth, user profiles, or ticketing references.
 * 3. In-Memory Only: Coordinates are never written to disk, local cache, or persistent stores.
 * 4. Clean Lifecycle: All listeners must be explicitly removable.
 */

import * as Location from 'expo-location';

export interface PassengerLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null; // meters per second
  heading: number | null; // degrees 0-360
  timestamp: number; // unix epoch ms
}

export type PassengerLocationPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'services_disabled';

export interface LocationPermissionState {
  status: PassengerLocationPermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
}

export interface WatchPassengerLocationOptions {
  /**
   * Accuracy mode: 'balanced' (battery-efficient) or 'high' (transit corridor precision)
   */
  accuracy?: 'balanced' | 'high';
  /**
   * Minimum time interval between updates in milliseconds. Default 5000ms.
   */
  timeInterval?: number;
  /**
   * Minimum distance displacement between updates in meters. Default 10m.
   */
  distanceInterval?: number;
}

/**
 * Normalizes raw Expo LocationObject into a clean PassengerLocation object.
 * Protects against NaN, undefined, or missing optional fields.
 */
export function normalizeLocationObject(raw: Location.LocationObject): PassengerLocation {
  const coords = raw.coords;
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: typeof coords.accuracy === 'number' && !isNaN(coords.accuracy) ? coords.accuracy : null,
    speed: typeof coords.speed === 'number' && !isNaN(coords.speed) && coords.speed >= 0 ? coords.speed : null,
    heading: typeof coords.heading === 'number' && !isNaN(coords.heading) && coords.heading >= 0 ? coords.heading : null,
    timestamp: typeof raw.timestamp === 'number' && !isNaN(raw.timestamp) ? raw.timestamp : Date.now(),
  };
}

/**
 * Check existing foreground location permissions and device location status.
 * Non-intrusive: does NOT present permission dialog to the user.
 */
export async function getPassengerLocationPermission(): Promise<LocationPermissionState> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        status: 'services_disabled',
        granted: false,
        canAskAgain: true,
      };
    }

    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    return {
      status: status === Location.PermissionStatus.GRANTED
        ? 'granted'
        : status === Location.PermissionStatus.DENIED
        ? 'denied'
        : 'undetermined',
      granted: status === Location.PermissionStatus.GRANTED,
      canAskAgain,
    };
  } catch {
    return {
      status: 'undetermined',
      granted: false,
      canAskAgain: true,
    };
  }
}

/**
 * Explicitly request foreground location permissions from the user.
 * Must only be called upon user action (e.g. tapping "Locate Me" or "Track Nearby Buses").
 */
export async function requestPassengerLocationPermission(): Promise<LocationPermissionState> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        status: 'services_disabled',
        granted: false,
        canAskAgain: true,
      };
    }

    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    return {
      status: status === Location.PermissionStatus.GRANTED
        ? 'granted'
        : status === Location.PermissionStatus.DENIED
        ? 'denied'
        : 'undetermined',
      granted: status === Location.PermissionStatus.GRANTED,
      canAskAgain,
    };
  } catch {
    return {
      status: 'denied',
      granted: false,
      canAskAgain: false,
    };
  }
}

/**
 * Single one-shot foreground position query.
 */
export async function getCurrentPassengerLocation(
  accuracy: 'balanced' | 'high' = 'high'
): Promise<PassengerLocation | null> {
  try {
    const perm = await getPassengerLocationPermission();
    if (!perm.granted) {
      return null;
    }

    const raw = await Location.getCurrentPositionAsync({
      accuracy: accuracy === 'high' ? Location.Accuracy.High : Location.Accuracy.Balanced,
    });

    return normalizeLocationObject(raw);
  } catch {
    return null;
  }
}

/**
 * Start watching foreground position changes.
 * Returns an unsubscription function (() => void).
 *
 * Strict Invariants:
 * - Foreground-only (Location.watchPositionAsync)
 * - NO background task registration
 * - Clean unsubscribe to prevent battery drain or memory leaks
 */
export async function startPassengerLocationWatch(
  onLocation: (location: PassengerLocation) => void,
  onError?: (error: Error) => void,
  options: WatchPassengerLocationOptions = {}
): Promise<() => void> {
  const perm = await getPassengerLocationPermission();
  if (!perm.granted) {
    const err = new Error(
      perm.status === 'services_disabled'
        ? 'Location services are disabled on this device'
        : 'Foreground location permission not granted'
    );
    onError?.(err);
    return () => {};
  }

  try {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: options.accuracy === 'balanced' ? Location.Accuracy.Balanced : Location.Accuracy.High,
        timeInterval: options.timeInterval ?? 5000,
        distanceInterval: options.distanceInterval ?? 10,
      },
      (loc) => {
        onLocation(normalizeLocationObject(loc));
      }
    );

    return () => {
      subscription.remove();
    };
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return () => {};
  }
}
