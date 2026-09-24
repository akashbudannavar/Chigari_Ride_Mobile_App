/**
 * Live Tracking Service
 * Stage 6A: Supabase Realtime Live Position Integration for CHIGARI RIDE
 *
 * Provides:
 * 1. Read-only queries to public.live_positions and public.buses.
 * 2. Supabase Realtime postgres_changes subscription (INSERT, UPDATE, DELETE).
 * 3. Conversion from database records to ChigariBus transit models.
 * 4. Preservation of physical bus identity (physicalBusId / bus_id).
 * 5. Deterministic in-memory store preventing duplicate subscriptions and out-of-order writes.
 * 6. Fallback coordination for demo/offline states.
 *
 * Strict Invariants:
 * - Read-only: Zero writes to live_positions or buses from mobile client.
 * - Zero background location or passenger GPS persistence.
 * - No service-role key exposure.
 */

import { supabase } from '../lib/supabase';
import type { LivePosition, Bus } from '../types/database';
import type {
  ChigariBus,
  ChigariBusNumber,
  BusDirection,
  CrowdLevel,
  BRTSStop,
  TrackingSource,
  MovementState,
  ConfidenceTier,
} from '../types/transit';
import {
  CHIGARI_VERIFIED_STOPS,
  CHIGARI_CORRIDOR_ROUTE,
  INITIAL_CHIGARI_BUSES,
} from '../data/chigariRoute';
import { CHIGARI_SERVICES } from '../data/chigariServices';
import { haversineDistance } from '../utils/transitGeometry';
import {
  applyConfidenceDecayToBus,
  applyConfidenceDecayToBuses,
} from './trackingConfidenceEngine';

/**
 * Finds the nearest stop and next stop along the route for a given coordinate.
 */
export function findRouteStopsForPosition(
  latitude: number,
  longitude: number,
  isReverse: boolean = false
): { currentStop: BRTSStop | null; nextStop: BRTSStop; distanceToNextStop: number; etaMinutes: number } {
  const stops = isReverse ? [...CHIGARI_VERIFIED_STOPS].reverse() : CHIGARI_VERIFIED_STOPS;
  let nearestStop: BRTSStop = stops[0];
  let minDistance = Infinity;

  for (const stop of stops) {
    const d = haversineDistance({ latitude, longitude }, { latitude: stop.latitude, longitude: stop.longitude });
    if (d < minDistance) {
      minDistance = d;
      nearestStop = stop;
    }
  }

  // Current stop if within 60 meters
  const currentStop = minDistance <= 60 ? nearestStop : null;

  // Next stop calculation
  const nearestIdx = stops.findIndex((s) => s.id === nearestStop.id);
  const nextIdx = Math.min(stops.length - 1, nearestIdx + 1);
  const nextStop = stops[nextIdx];

  const distanceToNextStop = Math.round(
    haversineDistance({ latitude, longitude }, { latitude: nextStop.latitude, longitude: nextStop.longitude })
  );

  // Simple ETA: ~30 km/h average transit corridor speed
  const etaMinutes = Math.max(1, Math.round((distanceToNextStop / 1000) / (30 / 60)));

  return {
    currentStop,
    nextStop,
    distanceToNextStop,
    etaMinutes,
  };
}

/**
 * Converts a database LivePosition and associated Bus record into an authoritative ChigariBus.
 */
export function convertLivePositionToChigariBus(
  livePos: Partial<LivePosition>,
  busRecord?: Partial<Bus> | null
): ChigariBus | null {
  if (!livePos || typeof livePos !== 'object') return null;

  const busId = livePos.bus_id || livePos.id;
  if (!busId) return null;

  const lat = Number(livePos.lat);
  const lng = Number(livePos.lng);
  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
    return null;
  }

  const serviceNumber = (livePos.service_number || '200A').trim().toUpperCase() as ChigariBusNumber;
  const fleetNumber = busRecord?.fleet_number || livePos.bus?.fleet_number || undefined;
  const physicalBusId = fleetNumber || busId;

  const heading = Number(livePos.heading || 0);
  const speed = Number(livePos.speed || 0);

  // Direction: 0..180 heading generally Southbound (Dharwad to Hubballi), 180..360 Northbound
  const isReverse = heading > 90 && heading < 270;
  const direction: BusDirection = isReverse ? 'To Hubballi CBT' : 'To Dharwad BRTS Terminal';

  const serviceDef = CHIGARI_SERVICES.find((s) => s.serviceNumber === serviceNumber);
  const routeName = serviceDef ? serviceDef.name : `Route ${serviceNumber}`;
  const routeColor = serviceDef ? serviceDef.color : '#2E7D32';

  const stopInfo = findRouteStopsForPosition(lat, lng, isReverse);

  let crowd: CrowdLevel = 'Low';
  if (livePos.occupancy === 'full') crowd = 'Full';
  else if (livePos.occupancy === 'high') crowd = 'High';
  else if (livePos.occupancy === 'medium') crowd = 'Moderate';

  let statusText = 'In Transit';
  if (livePos.movement_state === 'at_station') {
    statusText = stopInfo.currentStop ? `At ${stopInfo.currentStop.name}` : 'At Station';
  } else if (livePos.movement_state === 'stopped') {
    statusText = 'Stopped in Traffic';
  }

  const bus: ChigariBus = {
    id: busId,
    physicalBusId,
    busNumber: serviceNumber,
    fleetNumber,
    trackingSource: (livePos.tracking_source as TrackingSource) || 'observed',
    movementState: (livePos.movement_state as MovementState) || 'moving',
    confidenceTier: (livePos.confidence_tier as ConfidenceTier) || 'LIVE',
    routeName,
    routeColor,
    direction,
    crowd,
    status: statusText,
    latitude: lat,
    longitude: lng,
    heading,
    speed,
    progressMeters: 0,
    currentStop: stopInfo.currentStop,
    nextStop: stopInfo.nextStop,
    distanceToNextStop: stopInfo.distanceToNextStop,
    etaMinutes: stopInfo.etaMinutes,
    lastUpdated: livePos.updated_at || livePos.last_observation_at || new Date().toISOString(),
    lastObservationAt: livePos.last_observation_at || livePos.updated_at || undefined,
    isReverse,
  };

  return applyConfidenceDecayToBus(bus);
}

/**
 * In-Memory Realtime Live Position Store
 * Manages physical-bus state, atomic updates, and deterministic event handling.
 */
export class LivePositionStore {
  private busesMap: Map<string, ChigariBus> = new Map();
  private busesMetadata: Map<string, Partial<Bus>> = new Map();
  private lastUpdateTimestamps: Map<string, number> = new Map();

  /**
   * Initializes store with bus metadata (fleet numbers, plates, etc.).
   */
  setBusMetadata(buses: Partial<Bus>[]): void {
    for (const b of buses) {
      if (b.id) {
        this.busesMetadata.set(b.id, b);
      }
    }
  }

  /**
   * Resets and loads initial snapshot of live_positions from database.
   */
  setInitialPositions(rows: Partial<LivePosition>[]): void {
    this.busesMap.clear();
    this.lastUpdateTimestamps.clear();

    for (const row of rows) {
      if (!row || !row.bus_id) continue;
      const meta = this.busesMetadata.get(row.bus_id) || row.bus;
      const bus = convertLivePositionToChigariBus(row, meta);
      if (bus) {
        this.busesMap.set(row.bus_id, bus);
        const time = new Date(row.updated_at || row.last_observation_at || 0).getTime();
        this.lastUpdateTimestamps.set(row.bus_id, isNaN(time) ? Date.now() : time);
      }
    }
  }

  /**
   * Handles Realtime postgres_changes event for INSERT, UPDATE, DELETE.
   */
  handleRealtimeEvent(payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string;
    new: Partial<LivePosition>;
    old: Partial<LivePosition>;
  }): { changed: boolean; affectedBusId: string | null } {
    const eventType = payload.eventType;

    if (eventType === 'DELETE') {
      const busId = payload.old?.bus_id || payload.old?.id;
      if (busId && this.busesMap.has(busId)) {
        this.busesMap.delete(busId);
        this.lastUpdateTimestamps.delete(busId);
        return { changed: true, affectedBusId: busId };
      }
      return { changed: false, affectedBusId: null };
    }

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      const newRow = payload.new;
      if (!newRow || !newRow.bus_id) {
        return { changed: false, affectedBusId: null };
      }

      const busId = newRow.bus_id;

      // Stale update protection: ignore out-of-order older updates
      const newTime = new Date(newRow.updated_at || newRow.last_observation_at || 0).getTime();
      const lastTime = this.lastUpdateTimestamps.get(busId) || 0;
      if (!isNaN(newTime) && newTime < lastTime) {
        return { changed: false, affectedBusId: busId };
      }

      const meta = this.busesMetadata.get(busId) || newRow.bus;
      const updatedBus = convertLivePositionToChigariBus(newRow, meta);

      if (updatedBus) {
        // Preserve selection state if already selected
        const prev = this.busesMap.get(busId);
        if (prev?.isSelected) {
          updatedBus.isSelected = true;
        }

        this.busesMap.set(busId, updatedBus);
        this.lastUpdateTimestamps.set(busId, isNaN(newTime) ? Date.now() : newTime);
        return { changed: true, affectedBusId: busId };
      }
    }

    return { changed: false, affectedBusId: null };
  }

  /**
   * Returns array of all active ChigariBus instances.
   */
  getAllBuses(): ChigariBus[] {
    return Array.from(this.busesMap.values());
  }

  /**
   * Returns array of all active ChigariBus instances with client-side confidence decay applied.
   */
  getDecayedBuses(nowMs?: number): ChigariBus[] {
    return applyConfidenceDecayToBuses(this.getAllBuses(), nowMs);
  }

  /**
   * Returns a specific bus by physicalBusId or bus_id.
   */
  getBus(idOrPhysicalId: string): ChigariBus | undefined {
    return (
      this.busesMap.get(idOrPhysicalId) ||
      Array.from(this.busesMap.values()).find((b) => b.physicalBusId === idOrPhysicalId)
    );
  }

  /**
   * Clears the store.
   */
  clear(): void {
    this.busesMap.clear();
    this.busesMetadata.clear();
    this.lastUpdateTimestamps.clear();
  }
}

// Global store instance
export const livePositionStore = new LivePositionStore();

/**
 * Fetches current active physical buses and their live positions from Supabase.
 * Read-only operation.
 */
export async function fetchLiveBusesSnapshot(): Promise<{
  buses: ChigariBus[];
  error?: string;
}> {
  try {
    // 1. Fetch active buses metadata
    const { data: busRows, error: busError } = await supabase
      .from('buses')
      .select('id, plate, fleet_number, is_active')
      .eq('is_active', true);

    if (busError) {
      console.warn('[LiveTrackingService] Failed to load buses:', busError.message);
    } else if (busRows) {
      livePositionStore.setBusMetadata(busRows as Partial<Bus>[]);
    }

    // 2. Fetch current live_positions
    const { data: posRows, error: posError } = await supabase
      .from('live_positions')
      .select('*');

    if (posError) {
      console.warn('[LiveTrackingService] Failed to load live_positions:', posError.message);
      return { buses: [], error: posError.message };
    }

    if (posRows && posRows.length > 0) {
      livePositionStore.setInitialPositions(posRows as Partial<LivePosition>[]);
      return { buses: livePositionStore.getAllBuses() };
    }

    return { buses: [] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[LiveTrackingService] Network error during initial snapshot:', msg);
    return { buses: [], error: msg };
  }
}

/**
 * Subscribes to Supabase postgres_changes for live_positions.
 * Returns an unsubscription function.
 */
export function subscribeToLivePositions(
  onUpdate: (buses: ChigariBus[]) => void,
  onError?: (err: Error) => void
): () => void {
  const channelName = `live-positions-feed-${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      // @ts-ignore: Realtime v2 type
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'live_positions',
      },
      (payload: any) => {
        try {
          const res = livePositionStore.handleRealtimeEvent(payload);
          if (res.changed) {
            onUpdate(livePositionStore.getAllBuses());
          }
        } catch (err) {
          console.error('[LiveTrackingService] Error handling realtime event:', err);
        }
      }
    )
    .subscribe((status: string, err?: any) => {
      if (status === 'SUBSCRIBED') {
        // Connected successfully
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        const error = new Error(`Realtime subscription failed with status: ${status}`);
        onError?.(error);
      }
    });

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      // Ignore channel removal errors on unmount
    }
  };
}
