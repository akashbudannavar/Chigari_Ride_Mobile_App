/**
 * Route Validation Service for CHIGARI RIDE & CHIGARI GATE.
 * 
 * Provides route path discovery and station validation for journeys.
 * Determines the permitted ordered sequence of stations between origin and destination,
 * allowing safe intermediate station exits while strictly rejecting arbitrary/unrelated stations.
 */

import {
  AUTHORITATIVE_STATIONS,
  resolveAuthoritativeStation,
  type AuthoritativeStation,
} from './sharedTicketContract';
import {
  CANONICAL_CORRIDOR_STOPS,
  resolveStopNumber,
  getAvailableServicesForJourney,
  CHIGARI_SERVICES,
} from '../data/chigariServices';
import { getNetworkPathOrders } from '../data/chigariStops';

export interface PermittedJourneyRoute {
  fromStation: AuthoritativeStation;
  toStation: AuthoritativeStation;
  orderedStations: AuthoritativeStation[];
  isDirect: boolean;
}

/**
 * Returns the ordered list of permitted stations for travel between fromStation and toStation.
 * Includes origin, intermediate stops along the corridor route, and destination.
 */
export function getPermittedJourneyStations(
  fromStationInput: string | AuthoritativeStation,
  toStationInput: string | AuthoritativeStation
): AuthoritativeStation[] {
  const fromAuth =
    typeof fromStationInput === 'string'
      ? resolveAuthoritativeStation(fromStationInput)
      : fromStationInput;
  const toAuth =
    typeof toStationInput === 'string'
      ? resolveAuthoritativeStation(toStationInput)
      : toStationInput;

  if (fromAuth.code.toLowerCase() === toAuth.code.toLowerCase()) {
    return [fromAuth];
  }

  // Resolve stop numbers in the 36-station corridor network
  const fromStopNum = resolveStopNumber(fromAuth.name) || resolveStopNumber(fromAuth.initials);
  const toStopNum = resolveStopNumber(toAuth.name) || resolveStopNumber(toAuth.initials);

  if (fromStopNum && toStopNum) {
    // 1. First check if any operational service (e.g. 200A, 201B, 202C, 100D) serves this direct sequence
    const directServices = getAvailableServicesForJourney(fromStopNum, toStopNum);
    if (directServices.length > 0) {
      // Find the service that provides the most comprehensive intermediate stops (local over limited)
      const nonLimited = directServices.find((s) => !s.isLimitedStop) || directServices[0];
      const startIdx = nonLimited.stopNumbers.indexOf(fromStopNum);
      const endIdx = nonLimited.stopNumbers.indexOf(toStopNum);

      if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
        const sliceNumbers = nonLimited.stopNumbers.slice(startIdx, endIdx + 1);
        const mappedStations = sliceNumbers
          .map((num) => {
            const canonical = CANONICAL_CORRIDOR_STOPS.find((c) => c.number === num);
            return canonical ? resolveAuthoritativeStation(canonical.name) : null;
          })
          .filter((s): s is AuthoritativeStation => Boolean(s));

        if (mappedStations.length >= 2) {
          return deduplicateStations(mappedStations);
        }
      }
    }

    // 2. Otherwise compute path using network corridor adjacency graph
    const pathOrders = getNetworkPathOrders(fromStopNum, toStopNum);
    if (pathOrders.length > 0) {
      const mappedStations = pathOrders
        .map((num) => {
          const canonical = CANONICAL_CORRIDOR_STOPS.find((c) => c.number === num);
          return canonical ? resolveAuthoritativeStation(canonical.name) : null;
        })
        .filter((s): s is AuthoritativeStation => Boolean(s));

      if (mappedStations.length >= 2) {
        return deduplicateStations(mappedStations);
      }
    }
  }

  // Fallback: at minimum, origin and destination are permitted
  return [fromAuth, toAuth];
}

/**
 * Validates whether the given station is the permitted boarding / ENTRY station.
 * Rule: Entry is accepted ONLY at the origin station (ticket.journey.from).
 */
export function isStationPermittedForEntry(
  fromStationInput: string | AuthoritativeStation,
  entryStationInput: string | AuthoritativeStation
): boolean {
  const fromAuth =
    typeof fromStationInput === 'string'
      ? resolveAuthoritativeStation(fromStationInput)
      : fromStationInput;
  const entryAuth =
    typeof entryStationInput === 'string'
      ? resolveAuthoritativeStation(entryStationInput)
      : entryStationInput;

  return fromAuth.code.toLowerCase() === entryAuth.code.toLowerCase();
}

/**
 * Validates whether the given station is a permitted EXIT station for the journey.
 * Permitted stations include:
 * 1. The original TO destination station.
 * 2. Any intermediate station along the validated corridor path between FROM and TO.
 * Arbitrary stations outside the journey route are rejected.
 */
export function isStationPermittedForExit(
  fromStationInput: string | AuthoritativeStation,
  toStationInput: string | AuthoritativeStation,
  exitStationInput: string | AuthoritativeStation
): { isPermitted: boolean; reason?: string; permittedStations?: string[] } {
  const fromAuth =
    typeof fromStationInput === 'string'
      ? resolveAuthoritativeStation(fromStationInput)
      : fromStationInput;
  const toAuth =
    typeof toStationInput === 'string'
      ? resolveAuthoritativeStation(toStationInput)
      : toStationInput;
  const exitAuth =
    typeof exitStationInput === 'string'
      ? resolveAuthoritativeStation(exitStationInput)
      : exitStationInput;

  // Origin station is for boarding; if a passenger immediately tries to exit at origin,
  // we check if they are permitted or if origin is distinct from route stops.
  const permittedStations = getPermittedJourneyStations(fromAuth, toAuth);

  const isMatched = permittedStations.some(
    (s) => s.code.toLowerCase() === exitAuth.code.toLowerCase()
  );

  if (isMatched) {
    return {
      isPermitted: true,
      permittedStations: permittedStations.map((s) => s.name),
    };
  }

  return {
    isPermitted: false,
    reason: `Station ${exitAuth.name} is not on the permitted journey route (${fromAuth.name} ➔ ${toAuth.name})`,
    permittedStations: permittedStations.map((s) => s.name),
  };
}

function deduplicateStations(stations: AuthoritativeStation[]): AuthoritativeStation[] {
  const seenCodes = new Set<string>();
  const results: AuthoritativeStation[] = [];
  for (const s of stations) {
    const code = s.code.toLowerCase();
    if (!seenCodes.has(code)) {
      seenCodes.add(code);
      results.push(s);
    }
  }
  return results;
}
