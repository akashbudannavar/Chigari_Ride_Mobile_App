/**
 * Passenger Observation Upload Service
 * Stage 4: Anonymous Passenger Observation Upload Foundation for CHIGARI RIDE
 *
 * Privacy & Architectural Invariants:
 * 1. Anonymity: Inserts only anonymous payload (session_id, service_number, lat, lng,
 *    accuracy, speed, heading, reported_fleet_number, observed_at).
 * 2. Zero User Identity: Never attaches user_id, auth.users.id, email, phone, ticket ID.
 * 3. Write-Only Telemetry: Strictly inserts into public.passenger_observations.
 *    Never queries (SELECT) passenger_observations; never exposes raw observation history.
 * 4. Isolation: Never writes to public.live_positions (reserved for server-side aggregation).
 * 5. Transient: In case of network failure, stale observations are discarded rather than
 *    accumulated into an unbounded persistent offline queue.
 */

import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import {
  PassengerObservationPayload,
  RawObservationInput,
  validatePassengerObservation,
  ObservationRateLimiter,
  defaultObservationRateLimiter,
} from './passengerObservation';

type ObservationInsert = Database['public']['Tables']['passenger_observations']['Insert'];

export interface UploadObservationResult {
  success: boolean;
  error?: string;
}

export interface DispatchObservationResult {
  dispatched: boolean;
  reason?: 'rate_limited' | 'validation_failed' | 'upload_error' | 'success';
  error?: string;
  payload?: PassengerObservationPayload;
}

/**
 * Uploads a validated, anonymous passenger observation directly into public.passenger_observations.
 *
 * Invariants:
 * - Uses existing Supabase client
 * - Writes ONLY to public.passenger_observations
 * - Never touches public.live_positions
 * - Never performs client SELECT queries on passenger_observations
 * - Graceful error handling (never throws uncaught exceptions)
 */
export async function uploadPassengerObservation(
  payload: PassengerObservationPayload
): Promise<UploadObservationResult> {
  try {
    const insertRow: ObservationInsert = {
      session_id: payload.session_id,
      service_number: payload.service_number,
      lat: payload.lat,
      lng: payload.lng,
      accuracy: payload.accuracy,
      speed: payload.speed,
      heading: payload.heading,
      reported_fleet_number: payload.reported_fleet_number,
      observed_at: payload.observed_at,
    };

    const { error } = await supabase
      .from('passenger_observations')
      .insert(insertRow);

    if (error) {
      console.warn('[PassengerObservationUpload] Supabase insert failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown network failure';
    console.warn('[PassengerObservationUpload] Network error during upload:', message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Validates, rate-limits, and uploads an observation from a raw GPS fix.
 *
 * Invariants:
 * - Drops redundant or excessive fixes (>1 per 10s)
 * - Drops poor accuracy fixes (>50m)
 * - Drops invalid coordinates or unauthorized service numbers
 * - Discards on network failure without building an infinite offline queue
 */
export async function dispatchPassengerObservation(
  input: RawObservationInput,
  rateLimiter: ObservationRateLimiter = defaultObservationRateLimiter
): Promise<DispatchObservationResult> {
  // 1. Validate observation
  const validation = validatePassengerObservation(input);
  if (!validation.isValid || !validation.payload) {
    return {
      dispatched: false,
      reason: 'validation_failed',
      error: validation.error || 'Validation failed',
    };
  }

  const payload = validation.payload;

  // 2. Check rate limiter
  if (!rateLimiter.canUpload(payload.lat, payload.lng)) {
    return {
      dispatched: false,
      reason: 'rate_limited',
    };
  }

  // 3. Attempt upload to Supabase
  const uploadResult = await uploadPassengerObservation(payload);
  if (!uploadResult.success) {
    return {
      dispatched: false,
      reason: 'upload_error',
      error: uploadResult.error,
    };
  }

  // 4. Record successful dispatch in rate limiter
  rateLimiter.recordUpload(payload.lat, payload.lng);

  return {
    dispatched: true,
    reason: 'success',
    payload,
  };
}
