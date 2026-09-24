/**
 * Passenger Observation Session Service
 * Stage 4: Anonymous Passenger Observation Upload Foundation for CHIGARI RIDE
 *
 * Privacy & Architectural Invariants:
 * 1. Strictly Anonymous: Uses a random UUIDv4 session identifier.
 * 2. Zero User Identity: Never includes, derives from, or links to auth.users.id,
 *    email, phone, profile, ticket ID, wallet ID, or advertising ID.
 * 3. Ephemeral: In-memory only for the active trip/contribution lifecycle.
 *    No persistent tracking identifier is stored across long-term device use.
 * 4. Decoupled: Zero dependency on Supabase Auth, SecureStore, or AsyncStorage.
 */

import * as Crypto from 'expo-crypto';

// Ephemeral in-memory session identifier
let activeSessionId: string | null = null;

// UUIDv4 validation regular expression (standard 8-4-4-4-12 hex)
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generate a cryptographically secure random UUIDv4.
 * Uses expo-crypto with safe fallback for Node.js test execution.
 */
export function generateAnonymousSessionId(): string {
  try {
    if (typeof Crypto !== 'undefined' && typeof Crypto.randomUUID === 'function') {
      return Crypto.randomUUID();
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback for Node.js unit tests or web environments without Crypto module
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Pure Math.random fallback adhering to UUIDv4 bitwise specification
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validates whether a given string is a valid UUID (version 4).
 */
export function isValidSessionId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return UUID_V4_REGEX.test(id);
}

/**
 * Retrieves the current ephemeral session ID, or generates a new random
 * anonymous UUIDv4 if one does not yet exist.
 */
export function getOrCreateObservationSessionId(): string {
  if (!activeSessionId || !isValidSessionId(activeSessionId)) {
    activeSessionId = generateAnonymousSessionId();
  }
  return activeSessionId;
}

/**
 * Returns the currently active observation session ID without creating one.
 */
export function getObservationSessionId(): string | null {
  return activeSessionId;
}

/**
 * Resets the active observation session ID.
 * Call this when a passenger ends their contribution, exits a bus, or finishes a trip.
 */
export function resetObservationSessionId(): void {
  activeSessionId = null;
}
