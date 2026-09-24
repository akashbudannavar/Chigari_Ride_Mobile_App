/**
 * Passenger Observation Validation & Dispatch Service
 * Stage 4: Anonymous Passenger Observation Upload Foundation for CHIGARI RIDE
 *
 * Provides:
 * 1. Strict observation validation & normalization before upload.
 * 2. Conservative GPS accuracy filtering suitable for BRTS transit.
 * 3. Rate limiting and duplicate prevention.
 *
 * Privacy Invariants:
 * - Zero references to user identity, profiles, tickets, wallets, or auth accounts.
 * - Rejects any observation payload containing unauthorized personal fields.
 */

import { PassengerLocation } from './passengerLocation';
import {
  getOrCreateObservationSessionId,
  isValidSessionId,
} from './passengerObservationSession';

/**
 * Authoritative HDBRTS Bus Service Numbers
 * Strictly restricted to official project routes.
 */
export const AUTHORITATIVE_CHIGARI_SERVICES = [
  '200A',
  '201B',
  '100D',
  '202C',
  '202D',
] as const;

export type AuthoritativeChigariService = typeof AUTHORITATIVE_CHIGARI_SERVICES[number];

/**
 * Accuracy Threshold for Transit Contribution
 * Observations with GPS accuracy worse than 50 meters are rejected to prevent
 * placing buses on parallel arterial roads or skipping stations.
 */
export const MAX_OBSERVATION_ACCURACY_METERS = 50;

/**
 * Maximum acceptable age of an observation (5 minutes).
 * Stale observations are discarded rather than queued.
 */
export const MAX_OBSERVATION_AGE_MS = 5 * 60 * 1000;

/**
 * Maximum clock drift tolerance into the future (1 minute).
 */
export const MAX_FUTURE_DRIFT_MS = 60 * 1000;

/**
 * Minimum interval between successive observation uploads (10 seconds).
 */
export const MIN_UPLOAD_INTERVAL_MS = 10_000;

/**
 * Raw input format accepted by the validation service.
 */
export interface RawObservationInput {
  serviceNumber: string;
  location: PassengerLocation;
  sessionId?: string;
  reportedFleetNumber?: string | null;
}

/**
 * Sanitized, validated payload ready for public.passenger_observations insert.
 */
export interface PassengerObservationPayload {
  session_id: string;
  service_number: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  reported_fleet_number: string | null;
  observed_at: string; // ISO-8601 string
}

export interface ObservationValidationResult {
  isValid: boolean;
  error?: string;
  payload?: PassengerObservationPayload;
}

/**
 * Validates whether a given service number is an authoritative CHIGARI service.
 */
export function isAuthoritativeServiceNumber(
  service: unknown
): service is AuthoritativeChigariService {
  if (typeof service !== 'string') return false;
  return (AUTHORITATIVE_CHIGARI_SERVICES as readonly string[]).includes(service.trim().toUpperCase());
}

/**
 * Validates and normalizes raw observation input before uploading to the database.
 * Never throws uncontrolled errors into the UI.
 */
export function validatePassengerObservation(
  input: Partial<RawObservationInput>
): ObservationValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Missing observation input' };
  }

  // 1. Validate service number
  const serviceNumber = input.serviceNumber;
  if (!serviceNumber || !isAuthoritativeServiceNumber(serviceNumber)) {
    return {
      isValid: false,
      error: `Invalid service number: "${serviceNumber}". Must be one of [${AUTHORITATIVE_CHIGARI_SERVICES.join(', ')}]`,
    };
  }

  // 2. Validate location object
  const loc = input.location;
  if (!loc || typeof loc !== 'object') {
    return { isValid: false, error: 'Missing location data in observation' };
  }

  // 3. Validate latitude (-90 to +90)
  if (
    typeof loc.latitude !== 'number' ||
    !Number.isFinite(loc.latitude) ||
    isNaN(loc.latitude) ||
    loc.latitude < -90 ||
    loc.latitude > 90
  ) {
    return { isValid: false, error: `Invalid latitude: ${loc.latitude}` };
  }

  // 4. Validate longitude (-180 to +180)
  if (
    typeof loc.longitude !== 'number' ||
    !Number.isFinite(loc.longitude) ||
    isNaN(loc.longitude) ||
    loc.longitude < -180 ||
    loc.longitude > 180
  ) {
    return { isValid: false, error: `Invalid longitude: ${loc.longitude}` };
  }

  // 5. Validate accuracy (positive, <= MAX_OBSERVATION_ACCURACY_METERS)
  if (
    typeof loc.accuracy !== 'number' ||
    !Number.isFinite(loc.accuracy) ||
    isNaN(loc.accuracy) ||
    loc.accuracy <= 0
  ) {
    return { isValid: false, error: `Invalid or missing GPS accuracy: ${loc.accuracy}` };
  }

  if (loc.accuracy > MAX_OBSERVATION_ACCURACY_METERS) {
    return {
      isValid: false,
      error: `GPS accuracy too poor for transit tracking (${Math.round(loc.accuracy)}m > ${MAX_OBSERVATION_ACCURACY_METERS}m limit)`,
    };
  }

  // 6. Validate observed timestamp
  const now = Date.now();
  const timestamp = typeof loc.timestamp === 'number' && Number.isFinite(loc.timestamp)
    ? loc.timestamp
    : now;

  if (timestamp > now + MAX_FUTURE_DRIFT_MS) {
    return { isValid: false, error: 'Observation timestamp is too far in the future' };
  }

  if (now - timestamp > MAX_OBSERVATION_AGE_MS) {
    return { isValid: false, error: 'Observation timestamp is too old (expired fix)' };
  }

  // 7. Normalize speed (optional, >= 0, convert to rounded km/h if m/s provided or keep non-negative)
  let normalizedSpeed: number | null = null;
  if (
    typeof loc.speed === 'number' &&
    Number.isFinite(loc.speed) &&
    !isNaN(loc.speed) &&
    loc.speed >= 0
  ) {
    // If speed is from Expo Location, it is in m/s. Convert to km/h: speed * 3.6
    normalizedSpeed = Math.round(loc.speed * 3.6 * 10) / 10;
  }

  // 8. Normalize heading (optional, [0, 360])
  let normalizedHeading: number | null = null;
  if (
    typeof loc.heading === 'number' &&
    Number.isFinite(loc.heading) &&
    !isNaN(loc.heading) &&
    loc.heading >= 0 &&
    loc.heading <= 360
  ) {
    normalizedHeading = Math.round(loc.heading * 10) / 10;
  }

  // 9. Session ID
  const sessionId = input.sessionId || getOrCreateObservationSessionId();
  if (!isValidSessionId(sessionId)) {
    return { isValid: false, error: 'Invalid anonymous session identifier' };
  }

  // 10. Optional reported fleet number (sanitized)
  let normalizedFleetNumber: string | null = null;
  if (typeof input.reportedFleetNumber === 'string') {
    const trimmed = input.reportedFleetNumber.trim();
    if (trimmed.length > 0 && trimmed.length <= 32) {
      normalizedFleetNumber = trimmed;
    }
  }

  const payload: PassengerObservationPayload = {
    session_id: sessionId,
    service_number: serviceNumber.trim().toUpperCase(),
    lat: Math.round(loc.latitude * 1e7) / 1e7,
    lng: Math.round(loc.longitude * 1e7) / 1e7,
    accuracy: Math.round(loc.accuracy * 10) / 10,
    speed: normalizedSpeed,
    heading: normalizedHeading,
    reported_fleet_number: normalizedFleetNumber,
    observed_at: new Date(timestamp).toISOString(),
  };

  return {
    isValid: true,
    payload,
  };
}

/**
 * Rate Limiter and Dispatch Controller
 * Ensures observations are uploaded at controlled intervals (e.g. ~10 seconds)
 * and prevents duplicate transmissions.
 */
export class ObservationRateLimiter {
  private lastUploadTime: number = 0;
  private lastLat: number | null = null;
  private lastLng: number | null = null;
  private minIntervalMs: number;

  constructor(minIntervalMs: number = MIN_UPLOAD_INTERVAL_MS) {
    this.minIntervalMs = minIntervalMs;
  }

  /**
   * Checks whether an observation is permitted to be uploaded at this time.
   */
  canUpload(lat?: number, lng?: number, now: number = Date.now()): boolean {
    // Check time interval
    if (now - this.lastUploadTime < this.minIntervalMs) {
      return false;
    }

    // Check for stationary duplicate (exact same location to 6 decimal places)
    if (
      lat !== undefined &&
      lng !== undefined &&
      this.lastLat !== null &&
      this.lastLng !== null
    ) {
      const latDiff = Math.abs(lat - this.lastLat);
      const lngDiff = Math.abs(lng - this.lastLng);
      // If moved less than ~1 meter and less than 30s passed, skip redundant upload
      if (latDiff < 0.00001 && lngDiff < 0.00001 && now - this.lastUploadTime < 30_000) {
        return false;
      }
    }

    return true;
  }

  /**
   * Records a successful or initiated upload time.
   */
  recordUpload(lat?: number, lng?: number, now: number = Date.now()): void {
    this.lastUploadTime = now;
    if (lat !== undefined) this.lastLat = lat;
    if (lng !== undefined) this.lastLng = lng;
  }

  /**
   * Resets rate limiter state (e.g. when beginning a new service contribution).
   */
  reset(): void {
    this.lastUploadTime = 0;
    this.lastLat = null;
    this.lastLng = null;
  }
}

// Global default rate limiter instance
export const defaultObservationRateLimiter = new ObservationRateLimiter();
