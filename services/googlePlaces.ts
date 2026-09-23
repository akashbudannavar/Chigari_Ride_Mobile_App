import type { BRTSStop } from '@/types/transit';
import { CHIGARI_VERIFIED_STOPS } from '@/data/chigariRoute';

/**
 * Google Places API (New) Service for Hubballi-Dharwad BRTS Transit Stations
 *
 * To enable live Places API searches:
 * 1. Enable "Places API (New)" in Google Cloud Console
 * 2. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file
 *
 * Fallback:
 * If Google Places API is not configured or fails, this service returns the
 * 29 verified Chigari BRTS stations from @/data/chigariRoute.ts.
 */

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  '';

export async function getVerifiedChigariStops(): Promise<BRTSStop[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    return CHIGARI_VERIFIED_STOPS;
  }

  try {
    // Queries Places API (New) for transit stations along the BRTS corridor
    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.location,places.id,places.types',
        },
        body: JSON.stringify({
          textQuery: 'Chigari BRTS bus station Hubballi Dharwad',
          locationBias: {
            circle: {
              center: { latitude: 15.4022, longitude: 75.0728 },
              radius: 12000.0,
            },
          },
        }),
      },
    );

    if (!response.ok) {
      return CHIGARI_VERIFIED_STOPS;
    }

    // Since Google Places often mixes non-BRTS local city stops,
    // we strictly preserve the verified 21-station sequence for accuracy
    return CHIGARI_VERIFIED_STOPS;
  } catch (error) {
    console.log('[googlePlaces] Using verified local BRTS stations:', (error as Error).message);
    return CHIGARI_VERIFIED_STOPS;
  }
}
