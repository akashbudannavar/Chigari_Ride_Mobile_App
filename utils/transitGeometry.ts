import type { Coordinates } from '@/types/transit';

/**
 * Haversine distance in meters between two GPS coordinates
 */
export function haversineDistance(c1: Coordinates, c2: Coordinates): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (c2.latitude - c1.latitude) * rad;
  const dLon = (c2.longitude - c1.longitude) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(c1.latitude * rad) *
      Math.cos(c2.latitude * rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Bearing angle in degrees (0 = North, 90 = East, 180 = South, 270 = West)
 */
export function calculateBearing(start: Coordinates, end: Coordinates): number {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;
  const startLat = start.latitude * rad;
  const startLng = start.longitude * rad;
  const endLat = end.latitude * rad;
  const endLng = end.longitude * rad;
  const dLng = endLng - startLng;

  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  const brng = Math.atan2(y, x) * deg;
  return (brng + 360) % 360;
}

/**
 * Precomputes cumulative distances along a polyline
 */
export function getCumulativeDistances(coordinates: Coordinates[]): number[] {
  const distances = [0];
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const d = haversineDistance(coordinates[i], coordinates[i + 1]);
    total += d;
    distances.push(total);
  }
  return distances;
}

/**
 * Interpolates GPS position and bearing heading along a polyline for a given distance in meters
 */
export function interpolatePosition(
  coordinates: Coordinates[],
  cumulative: number[],
  distanceMeters: number,
  isReverse = false,
): { position: Coordinates; heading: number } {
  if (!coordinates || coordinates.length === 0) {
    return { position: { latitude: 0, longitude: 0 }, heading: 0 };
  }
  if (coordinates.length === 1) {
    return { position: coordinates[0], heading: 0 };
  }

  const maxDist = cumulative[cumulative.length - 1];
  const d = Math.max(0, Math.min(distanceMeters, maxDist));

  let segmentIdx = 0;
  while (
    segmentIdx < cumulative.length - 1 &&
    cumulative[segmentIdx + 1] < d
  ) {
    segmentIdx++;
  }

  const p1 = coordinates[segmentIdx];
  const p2 = coordinates[Math.min(segmentIdx + 1, coordinates.length - 1)];

  const segStart = cumulative[segmentIdx];
  const segEnd = cumulative[Math.min(segmentIdx + 1, coordinates.length - 1)];
  const segLen = segEnd - segStart;

  const fraction = segLen > 0 ? (d - segStart) / segLen : 0;

  const latitude = p1.latitude + fraction * (p2.latitude - p1.latitude);
  const longitude = p1.longitude + fraction * (p2.longitude - p1.longitude);

  const heading = isReverse
    ? calculateBearing(p2, p1)
    : calculateBearing(p1, p2);

  return { position: { latitude, longitude }, heading };
}

/**
 * Computes remaining coordinates of a journey from the current position to the end.
 * The portion of the polyline already traversed is removed so the line shrinks behind the moving vehicle.
 */
export function getRemainingCoordinates(
  journeyCoords: Coordinates[],
  currentCoord: Coordinates,
  distanceTraveledMeters: number,
  totalDistanceMeters: number,
): Coordinates[] {
  if (!journeyCoords || journeyCoords.length < 2) return [];
  if (totalDistanceMeters <= 0 || distanceTraveledMeters >= totalDistanceMeters - 8) {
    return [];
  }

  const fraction = Math.max(0, Math.min(1, distanceTraveledMeters / totalDistanceMeters));
  const cumDists = getCumulativeDistances(journeyCoords);
  const totalCum = cumDists[cumDists.length - 1];
  const targetDist = fraction * totalCum;

  // Find the first vertex that lies ahead of targetDist
  let nextIdx = 1;
  while (nextIdx < cumDists.length - 1 && cumDists[nextIdx] <= targetDist) {
    nextIdx++;
  }

  const remaining = journeyCoords.slice(nextIdx);
  return [currentCoord, ...remaining];
}
