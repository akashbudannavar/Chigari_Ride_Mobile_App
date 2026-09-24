/**
 * Geometry & Polyline Utilities for CHIGARI RIDE Aggregator
 * High-performance planar and geodetic math for corridor projection and spatial calculations.
 */

import { Coordinates } from './corridorData';

const R = 6371000; // Earth radius in meters
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * Haversine distance in meters between two GPS coordinates
 */
export function haversineDistance(c1: Coordinates, c2: Coordinates): number {
  const dLat = (c2.latitude - c1.latitude) * RAD;
  const dLon = (c2.longitude - c1.longitude) * RAD;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(c1.latitude * RAD) *
      Math.cos(c2.latitude * RAD) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Bearing angle in degrees (0 = North, 90 = East, 180 = South, 270 = West)
 */
export function calculateBearing(start: Coordinates, end: Coordinates): number {
  const startLat = start.latitude * RAD;
  const startLng = start.longitude * RAD;
  const endLat = end.latitude * RAD;
  const endLng = end.longitude * RAD;
  const dLng = endLng - startLng;

  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  const brng = Math.atan2(y, x) * DEG;
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

export interface CorridorProjection {
  s: number; // Linear distance in meters along the corridor
  perpendicularDistance: number; // Distance in meters from the centerline
  nearestCoord: Coordinates; // Closest point on the polyline
  segmentBearing: number; // Bearing of the closest polyline segment
  segmentIndex: number;
}

/**
 * Projects a GPS coordinate onto the nearest segment of the corridor polyline.
 * Returns progress distance s, perpendicular distance, and nearest point.
 */
export function projectPointOntoCorridor(
  point: Coordinates,
  corridor: Coordinates[],
  cumulativeDists: number[]
): CorridorProjection {
  if (!corridor || corridor.length < 2) {
    return {
      s: 0,
      perpendicularDistance: Infinity,
      nearestCoord: point,
      segmentBearing: 0,
      segmentIndex: 0,
    };
  }

  let minDistance = Infinity;
  let bestS = 0;
  let bestNearestCoord: Coordinates = corridor[0];
  let bestBearing = 0;
  let bestSegIdx = 0;

  for (let i = 0; i < corridor.length - 1; i++) {
    const p1 = corridor[i];
    const p2 = corridor[i + 1];

    const midLat = (p1.latitude + p2.latitude) / 2;
    const cosLat = Math.cos(midLat * RAD);
    const mPerDegLat = 111320;
    const mPerDegLng = 111320 * cosLat;

    const dx = (p2.longitude - p1.longitude) * mPerDegLng;
    const dy = (p2.latitude - p1.latitude) * mPerDegLat;
    const segLenSq = dx * dx + dy * dy;

    let u = 0;
    if (segLenSq > 0.0001) {
      const px = (point.longitude - p1.longitude) * mPerDegLng;
      const py = (point.latitude - p1.latitude) * mPerDegLat;
      u = (px * dx + py * dy) / segLenSq;
      u = Math.max(0, Math.min(1, u));
    }

    const nearestLat = p1.latitude + u * (p2.latitude - p1.latitude);
    const nearestLng = p1.longitude + u * (p2.longitude - p1.longitude);
    const candidateCoord: Coordinates = { latitude: nearestLat, longitude: nearestLng };

    const dist = haversineDistance(point, candidateCoord);

    if (dist < minDistance) {
      minDistance = dist;
      bestNearestCoord = candidateCoord;
      const segLength = Math.sqrt(segLenSq);
      bestS = cumulativeDists[i] + u * segLength;
      bestBearing = calculateBearing(p1, p2);
      bestSegIdx = i;
    }
  }

  return {
    s: bestS,
    perpendicularDistance: minDistance,
    nearestCoord: bestNearestCoord,
    segmentBearing: bestBearing,
    segmentIndex: bestSegIdx,
  };
}

/**
 * Interpolates GPS position and bearing heading along a polyline for a given distance s in meters
 */
export function interpolateCorridorPosition(
  coordinates: Coordinates[],
  cumulative: number[],
  distanceMeters: number
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
  const heading = calculateBearing(p1, p2);

  return { position: { latitude, longitude }, heading };
}
