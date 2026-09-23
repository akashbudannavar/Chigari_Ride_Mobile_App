import type { Coordinates, BRTSStop } from '@/types/transit';
import {
  CHIGARI_VERIFIED_STOPS,
  HDBRTS_CORRIDOR_COORDINATES,
  HDBRTS_GOKUL_BRANCH_COORDINATES,
  HDBRTS_RAILWAY_BRANCH_COORDINATES,
  HDBRTS_DHARWAD_NEW_COORDINATES,
} from './chigariRoute';

// Shared single source of truth for all 36 Chigari BRTS stations
export const CHIGARI_STOPS: BRTSStop[] = CHIGARI_VERIFIED_STOPS;

export interface PlannedRoute {
  fromStop: BRTSStop;
  toStop: BRTSStop;
  distanceMeters: number;
  durationMinutes: number;
  fare: number;
  intermediateStops: BRTSStop[];
  coordinates: Coordinates[];
  isReverse: boolean;
  searchedAt: string;
}

/**
 * Search stops by name with case-insensitivity and prefix-first prioritization
 */
export function searchChigariStops(query: string): BRTSStop[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const prefixMatches: BRTSStop[] = [];
  const containsMatches: BRTSStop[] = [];

  for (const stop of CHIGARI_STOPS) {
    const nameLower = stop.name.toLowerCase();
    const words = nameLower.split(/[\s/]+/);
    const kannadaLower = (stop.kannadaName || '').toLowerCase();
    const aliasesLower = (stop.aliases || []).map((a) => a.toLowerCase());

    // Priority 1: Full name starts with query OR any individual word starts with query OR alias starts with query
    // e.g. "c" or "cbt" matches "Hubballi CBT" or "CBT Hubballi"
    const wordStartsWith = words.some((w) => w.startsWith(q));
    const nameStartsWith = nameLower.startsWith(q);
    const aliasStartsWith = aliasesLower.some(
      (a) => a.startsWith(q) || a.split(/[\s/]+/).some((w) => w.startsWith(q)),
    );

    if (nameStartsWith || wordStartsWith || aliasStartsWith) {
      prefixMatches.push(stop);
    } else if (
      nameLower.includes(q) ||
      kannadaLower.includes(q) ||
      aliasesLower.some((a) => a.includes(q))
    ) {
      containsMatches.push(stop);
    }
  }

  // Deduplicate and combine (prefix matches first)
  const seenIds = new Set<string>();
  const results: BRTSStop[] = [];

  for (const stop of prefixMatches) {
    if (!seenIds.has(stop.id)) {
      seenIds.add(stop.id);
      results.push(stop);
    }
  }

  for (const stop of containsMatches) {
    if (!seenIds.has(stop.id)) {
      seenIds.add(stop.id);
      results.push(stop);
    }
  }

  return results;
}

export function findStopById(id: string): BRTSStop | undefined {
  return CHIGARI_STOPS.find((s) => s.id === id);
}

export function findStopByName(name: string): BRTSStop | undefined {
  const q = name.trim().toLowerCase();
  return CHIGARI_STOPS.find(
    (s) =>
      s.name.toLowerCase() === q ||
      (s.kannadaName && s.kannadaName.toLowerCase() === q) ||
      (s.aliases && s.aliases.some((a) => a.toLowerCase() === q)),
  );
}

// Adjacency graph representing the physical HDBRTS corridor and its branches
const NETWORK_EDGES: [number, number][] = [
  [1, 3], // Dharwad New Bus Stand ↔ Jubilee Circle
  [2, 3], // Dharwad BRTS Terminal ↔ Jubilee Circle
  // Trunk: Jubilee Circle (3) down to Hosur Cross (30)
  [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10],
  [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16],
  [16, 17], [17, 18], [18, 19], [19, 20], [20, 21], [21, 22],
  [22, 23], [23, 24], [24, 25], [25, 26], [26, 27], [27, 28],
  [28, 29], [29, 30],
  // Branch A: Gokul
  [30, 31],
  // Hubballi Central Corridor: Hosur Cross (30) to Ambedkar Circle (34)
  [30, 32], [32, 33], [33, 34],
  // Branch B: CBT
  [34, 35],
  // Branch C: Railway Station
  [34, 36],
];

export function getNetworkPathOrders(startOrder: number, endOrder: number): number[] {
  if (startOrder === endOrder) return [startOrder];

  const adj = new Map<number, number[]>();
  for (const [u, v] of NETWORK_EDGES) {
    if (!adj.has(u)) adj.set(u, []);
    if (!adj.has(v)) adj.set(v, []);
    adj.get(u)!.push(v);
    adj.get(v)!.push(u);
  }

  const queue: number[][] = [[startOrder]];
  const visited = new Set<number>([startOrder]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const curr = path[path.length - 1];
    if (curr === endOrder) {
      return path;
    }
    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }

  return [startOrder, endOrder];
}

function findClosestCoordIndex(coords: Coordinates[], target: Coordinates): number {
  let closestIdx = 0;
  let minDistanceSq = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const dLat = coords[i].latitude - target.latitude;
    const dLng = coords[i].longitude - target.longitude;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      closestIdx = i;
    }
  }
  return closestIdx;
}

/**
 * Calculates a verified road-following route segment between two BRTS stations
 */
export function calculateCorridorRoute(
  fromStop: BRTSStop,
  toStop: BRTSStop,
): PlannedRoute {
  const pathOrders = getNetworkPathOrders(fromStop.order, toStop.order);
  const intermediateStops = pathOrders
    .map((o) => CHIGARI_STOPS.find((s) => s.order === o))
    .filter((s): s is BRTSStop => Boolean(s));

  // Determine direction: traveling toward Hubballi CBT / Railway is reverse (southward)
  const isReverse = fromStop.latitude > toStop.latitude;

  // Slicing coordinates along trunk and branches
  const idxFrom = findClosestCoordIndex(HDBRTS_CORRIDOR_COORDINATES, fromStop);
  const idxTo = findClosestCoordIndex(HDBRTS_CORRIDOR_COORDINATES, toStop);

  let sliceCoordinates: Coordinates[];
  if (idxFrom <= idxTo) {
    sliceCoordinates = HDBRTS_CORRIDOR_COORDINATES.slice(idxFrom, idxTo + 1);
  } else {
    sliceCoordinates = HDBRTS_CORRIDOR_COORDINATES.slice(idxTo, idxFrom + 1).reverse();
  }

  // Handle Gokul Branch (Stop 31)
  if (fromStop.order === 31) {
    sliceCoordinates = [...HDBRTS_GOKUL_BRANCH_COORDINATES].reverse().concat(sliceCoordinates);
  } else if (toStop.order === 31) {
    sliceCoordinates = sliceCoordinates.concat(HDBRTS_GOKUL_BRANCH_COORDINATES);
  }

  // Handle Railway Branch (Stop 36)
  if (fromStop.order === 36) {
    sliceCoordinates = [...HDBRTS_RAILWAY_BRANCH_COORDINATES].reverse().concat(sliceCoordinates);
  } else if (toStop.order === 36) {
    sliceCoordinates = sliceCoordinates.concat(HDBRTS_RAILWAY_BRANCH_COORDINATES);
  }

  // Handle Dharwad New Bus Stand (Stop 1)
  if (fromStop.order === 1) {
    sliceCoordinates = [...HDBRTS_DHARWAD_NEW_COORDINATES].reverse().concat(sliceCoordinates);
  } else if (toStop.order === 1) {
    sliceCoordinates = sliceCoordinates.concat(HDBRTS_DHARWAD_NEW_COORDINATES);
  }

  // Fallback if empty
  if (sliceCoordinates.length === 0) {
    sliceCoordinates = [
      { latitude: fromStop.latitude, longitude: fromStop.longitude },
      { latitude: toStop.latitude, longitude: toStop.longitude },
    ];
  } else {
    sliceCoordinates[0] = { latitude: fromStop.latitude, longitude: fromStop.longitude };
    sliceCoordinates[sliceCoordinates.length - 1] = {
      latitude: toStop.latitude,
      longitude: toStop.longitude,
    };
  }

  const distanceMeters = Math.max(1000, Math.abs(toStop.distanceAlongRoute - fromStop.distanceAlongRoute));
  const distanceKm = distanceMeters / 1000;

  // Transit time: ~35 km/h BRTS average speed + 40s per intermediate station dwell
  const transitTimeMin = (distanceKm / 35) * 60;
  const stopsCount = Math.max(0, intermediateStops.length - 2);
  const dwellTimeMin = (stopsCount * 40) / 60;
  const durationMinutes = Math.max(3, Math.round(transitTimeMin + dwellTimeMin));

  // NWKRTC Chigari BRTS fare slab
  // ₹10 base up to 3 km, then ~₹1.25/km, rounded to nearest ₹5
  const rawFare = 10 + Math.max(0, distanceKm - 3) * 1.25;
  const fare = Math.max(10, Math.round(rawFare / 5) * 5);

  return {
    fromStop,
    toStop,
    distanceMeters,
    durationMinutes,
    fare,
    intermediateStops,
    coordinates: sliceCoordinates,
    isReverse,
    searchedAt: new Date().toISOString(),
  };
}
