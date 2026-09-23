import type { Coordinates, ChigariRoute } from '@/types/transit';
import { CHIGARI_CORRIDOR_ROUTE } from '@/data/chigariRoute';

/**
 * Google Routes API Client for Hubballi-Dharwad BRTS Corridor
 *
 * To use live Google Routes API:
 * 1. Enable "Routes API" in Google Cloud Console
 * 2. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file
 *
 * Note: When running offline, on Expo Go, or without an API key,
 * this service automatically falls back to the pre-resolved, verified
 * real PB Road road-following polyline stored in @/data/chigariRoute.ts.
 */

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  '';

export interface RouteComputationResult {
  coordinates: Coordinates[];
  distanceMeters: number;
  durationSeconds?: number;
  source: 'google_routes_api' | 'local_verified_corridor';
}

/**
 * Fetches the road-following corridor route between Hubballi CBT and Dharwad BRTS Terminal.
 * Gracefully falls back to the high-density verified PB Road geometry.
 */
export async function getChigariCorridorRoute(): Promise<ChigariRoute> {
  if (!GOOGLE_MAPS_API_KEY) {
    return CHIGARI_CORRIDOR_ROUTE;
  }

  try {
    const origin = CHIGARI_CORRIDOR_ROUTE.stops[0];
    const destination = CHIGARI_CORRIDOR_ROUTE.stops[CHIGARI_CORRIDOR_ROUTE.stops.length - 1];

    const response = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask':
            'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: origin.latitude,
                longitude: origin.longitude,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.latitude,
                longitude: destination.longitude,
              },
            },
          },
          travelMode: 'TRANSIT',
          computeAlternativeRoutes: false,
        }),
      },
    );

    if (!response.ok) {
      // Fall back to verified corridor geometry on network or auth error
      return CHIGARI_CORRIDOR_ROUTE;
    }

    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const encoded = route.polyline?.encodedPolyline;
      if (encoded) {
        const decoded = decodePolyline(encoded);
        if (decoded.length > 10) {
          return {
            ...CHIGARI_CORRIDOR_ROUTE,
            coordinates: decoded,
            totalDistanceMeters: route.distanceMeters || CHIGARI_CORRIDOR_ROUTE.totalDistanceMeters,
          };
        }
      }
    }
  } catch (error) {
    // Network or parse exception fallback
    console.log('[googleRoutes] Using verified local corridor geometry:', (error as Error).message);
  }

  return CHIGARI_CORRIDOR_ROUTE;
}

/**
 * Standard Google Encoded Polyline Algorithm decoder
 */
export function decodePolyline(encoded: string): Coordinates[] {
  const points: Coordinates[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}
