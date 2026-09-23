/**
 * Centralized Map Configuration for CHIGARI RIDE.
 * Uses OpenFreeMap vector tile styles rendered with MapLibre.
 *
 * OpenFreeMap is completely free and open-source, requiring zero API keys.
 * Style endpoint: https://tiles.openfreemap.org/styles/liberty
 */

export const OPEN_FREE_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/**
 * Hubballi-Dharwad BRTS Corridor Center Coordinates.
 * NOTE: GeoJSON / MapLibre requires [longitude, latitude] format.
 */
export const HDBRTS_MAP_CENTER_GEOJSON: [number, number] = [75.0772, 15.4050]; // [lng, lat]

export const MAP_CONFIG = {
  styleUrl: OPEN_FREE_MAP_STYLE_URL,
  centerGeoJSON: HDBRTS_MAP_CENTER_GEOJSON,
  defaultZoom: 12,
  minZoom: 9,
  maxZoom: 19,
  busDetailZoom: 16,
  corridorBounds: {
    // [minLng, minLat, maxLng, maxLat] for MapLibre fitBounds
    ne: [75.145, 15.485] as [number, number],
    sw: [75.010, 15.340] as [number, number],
  },
} as const;

/**
 * Helper to convert standard { latitude, longitude } or [lat, lng] to GeoJSON [lng, lat].
 */
export function toGeoJSONCoordinate(
  coord: { latitude: number; longitude: number } | [number, number]
): [number, number] {
  if (Array.isArray(coord)) {
    // If [lat, lng]
    return [coord[1], coord[0]];
  }
  return [coord.longitude, coord.latitude];
}

/**
 * Helper to convert an array of { latitude, longitude } or [lat, lng] to GeoJSON LineString coordinates [[lng, lat], ...].
 */
export function toGeoJSONLineCoordinates(
  coords: Array<{ latitude: number; longitude: number } | [number, number]>
): Array<[number, number]> {
  return coords.map(toGeoJSONCoordinate);
}
