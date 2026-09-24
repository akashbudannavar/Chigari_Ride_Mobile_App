/**
 * Tracking Confidence Decay Engine
 * Stage 6B-1: Client-Side Confidence Decay & Tracking State Engine for CHIGARI RIDE
 *
 * Implements deterministic client-side display confidence based on:
 * 1. Elapsed time since last observation (local device clock).
 * 2. Server-side confidence tier (LIVE, RECENT, ESTIMATED, STALE, OFFLINE).
 * 3. Movement state (moving, stopped, at_station, offline).
 * 4. Clock drift / skew tolerance.
 *
 * Threshold Semantics (Ground in Stage 5B 45s Aggregation Window):
 * - Δt < 25s: Retain server tier (LIVE / RECENT / ESTIMATED / STALE / OFFLINE)
 * - 25s <= Δt < 60s: Degrades to RECENT (if previously LIVE)
 * - 60s <= Δt < 120s: Degrades to ESTIMATED
 * - 120s <= Δt < 300s: Degrades to STALE
 * - Δt >= 300s (5 minutes): Marked as OFFLINE
 *
 * Strict Invariants:
 * - Read-only: Zero writes to Supabase.
 * - Zero local persistence of GPS/state (no AsyncStorage/SecureStore/SQLite).
 * - Physical bus independence: Evaluated per individual physical bus (bus_id / physicalBusId).
 * - Monotonic decay: Telemetry age only degrades confidence, while fresh telemetry restores it.
 */

import type { ChigariBus, ConfidenceTier, MovementState } from '../types/transit';

/**
 * Standard confidence thresholds in milliseconds.
 */
export const CONFIDENCE_THRESHOLDS = {
  RECENT_MS: 25 * 1000,           // 25 seconds
  ESTIMATED_MS: 60 * 1000,        // 60 seconds (1 minute)
  STALE_MS: 120 * 1000,           // 120 seconds (2 minutes)
  OFFLINE_MS: 300 * 1000,         // 300 seconds (5 minutes)
  MAX_FUTURE_TOLERANCE_MS: 10 * 1000, // 10 seconds tolerance for client-server clock skew
} as const;

/**
 * Confidence tier rank (lower = fresher, higher = more degraded).
 */
export const CONFIDENCE_RANK: Record<ConfidenceTier, number> = {
  LIVE: 0,
  RECENT: 1,
  ESTIMATED: 2,
  STALE: 3,
  OFFLINE: 4,
};

export const RANK_TO_CONFIDENCE: ConfidenceTier[] = [
  'LIVE',
  'RECENT',
  'ESTIMATED',
  'STALE',
  'OFFLINE',
];

export interface ComputeConfidenceParams {
  serverTier?: ConfidenceTier | null;
  lastObservationAt?: string | number | Date | null;
  movementState?: MovementState | null;
  nowMs?: number;
}

/**
 * Parses any timestamp representation (ISO string, unix epoch ms, Date) into milliseconds.
 * Returns null if missing, invalid, or NaN.
 */
export function parseObservationTimestamp(
  rawTimestamp?: string | number | Date | null
): number | null {
  if (rawTimestamp === null || rawTimestamp === undefined) {
    return null;
  }

  if (typeof rawTimestamp === 'number') {
    return isNaN(rawTimestamp) || !isFinite(rawTimestamp) ? null : rawTimestamp;
  }

  if (rawTimestamp instanceof Date) {
    const t = rawTimestamp.getTime();
    return isNaN(t) ? null : t;
  }

  if (typeof rawTimestamp === 'string') {
    const trimmed = rawTimestamp.trim();
    if (!trimmed || trimmed === 'Just now') {
      return null;
    }
    const t = new Date(trimmed).getTime();
    return isNaN(t) ? null : t;
  }

  return null;
}

/**
 * Computes client-side display confidence tier based on telemetry age and server baseline.
 * Pure deterministic calculation.
 */
export function computeClientConfidenceTier(params: ComputeConfidenceParams): ConfidenceTier {
  const { serverTier, lastObservationAt, nowMs } = params;

  // If server already determined OFFLINE, vehicle remains OFFLINE
  if (serverTier === 'OFFLINE') {
    return 'OFFLINE';
  }

  const obsMs = parseObservationTimestamp(lastObservationAt);

  // If timestamp is not available or unparseable, safely fall back to serverTier (or LIVE)
  if (obsMs === null) {
    return serverTier || 'LIVE';
  }

  const currentMs = typeof nowMs === 'number' && !isNaN(nowMs) ? nowMs : Date.now();
  let elapsedMs = currentMs - obsMs;

  // Clock drift / skew protection: clamp future timestamps within tolerance to 0
  if (elapsedMs < 0) {
    elapsedMs = 0;
  }

  // Derive time-based tier from elapsed milliseconds
  let timeTier: ConfidenceTier;
  if (elapsedMs < CONFIDENCE_THRESHOLDS.RECENT_MS) {
    timeTier = 'LIVE';
  } else if (elapsedMs < CONFIDENCE_THRESHOLDS.ESTIMATED_MS) {
    timeTier = 'RECENT';
  } else if (elapsedMs < CONFIDENCE_THRESHOLDS.STALE_MS) {
    timeTier = 'ESTIMATED';
  } else if (elapsedMs < CONFIDENCE_THRESHOLDS.OFFLINE_MS) {
    timeTier = 'STALE';
  } else {
    timeTier = 'OFFLINE';
  }

  // Monotonic degradation: Effective confidence is max(serverRank, timeRank)
  const baseTier: ConfidenceTier = serverTier || 'LIVE';
  const serverRank = CONFIDENCE_RANK[baseTier] ?? 0;
  const timeRank = CONFIDENCE_RANK[timeTier] ?? 0;

  const effectiveRank = Math.max(serverRank, timeRank);
  return RANK_TO_CONFIDENCE[effectiveRank] || 'OFFLINE';
}

/**
 * Determines effective movement state based on existing state and computed confidence.
 * Note: 'stopped' or 'at_station' buses do NOT become 'offline' just because speed is 0.
 * They only transition to 'offline' once telemetry age reaches OFFLINE_MS (>= 300s).
 */
export function getEffectiveMovementState(
  currentState: MovementState | undefined,
  computedTier: ConfidenceTier
): MovementState {
  if (computedTier === 'OFFLINE') {
    return 'offline';
  }

  if (!currentState || currentState === 'offline') {
    // If telemetry is fresh but previous state was offline, default to moving
    return 'moving';
  }

  return currentState;
}

/**
 * Applies confidence decay and movement state transitions to an individual physical bus.
 * Evaluates bus independently using its own observation timestamp.
 */
export function applyConfidenceDecayToBus(bus: ChigariBus, nowMs?: number): ChigariBus {
  if (!bus) return bus;

  const timestamp = bus.lastObservationAt || bus.lastUpdated;

  const newTier = computeClientConfidenceTier({
    serverTier: bus.confidenceTier,
    lastObservationAt: timestamp,
    movementState: bus.movementState,
    nowMs,
  });

  const effectiveMovement = getEffectiveMovementState(bus.movementState, newTier);

  // Return same reference if unchanged to avoid unnecessary React re-renders
  if (newTier === bus.confidenceTier && effectiveMovement === bus.movementState) {
    return bus;
  }

  return {
    ...bus,
    confidenceTier: newTier,
    movementState: effectiveMovement,
  };
}

/**
 * Batch processes an array of ChigariBus instances with confidence decay.
 * Each physical bus is processed independently by its physical identity.
 */
export function applyConfidenceDecayToBuses(
  buses: ChigariBus[],
  nowMs?: number
): ChigariBus[] {
  if (!Array.isArray(buses)) return [];
  const currentNow = typeof nowMs === 'number' && !isNaN(nowMs) ? nowMs : Date.now();
  let changed = false;
  const result = buses.map((bus) => {
    const updated = applyConfidenceDecayToBus(bus, currentNow);
    if (updated !== bus) {
      changed = true;
    }
    return updated;
  });
  return changed ? result : buses;
}

/**
 * Returns accessible color hex for a given confidence tier.
 */
export function getConfidenceBadgeColor(tier: ConfidenceTier): string {
  switch (tier) {
    case 'LIVE':
      return '#2E7D32'; // Fresh Forest Green
    case 'RECENT':
      return '#1565C0'; // Informative Blue
    case 'ESTIMATED':
      return '#F57C00'; // Amber Warning
    case 'STALE':
      return '#757575'; // Neutral Grey
    case 'OFFLINE':
      return '#9E9E9E'; // Muted Grey
    default:
      return '#757575';
  }
}

/**
 * Returns human-readable label for a given confidence tier.
 */
export function getConfidenceLabel(tier: ConfidenceTier): string {
  switch (tier) {
    case 'LIVE':
      return 'Live GPS';
    case 'RECENT':
      return 'Recent GPS';
    case 'ESTIMATED':
      return 'Estimated';
    case 'STALE':
      return 'Delayed Signal';
    case 'OFFLINE':
      return 'Offline';
    default:
      return 'Unknown';
  }
}
