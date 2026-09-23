import { useMemo } from 'react';
import type { ChigariScannedTicket, NearbyBusInfo } from '@/types/ticket';
import type { Coordinates, BRTSStop } from '@/types/transit';
import { useDemoBusTracking } from './useDemoBusTracking';
import { findStopById, findStopByName, CHIGARI_STOPS } from '@/data/chigariStops';
import {
  getAvailableServicesForJourney,
  getAvailableServicesAtStop,
  type ChigariServiceDefinition,
} from '@/services/busAvailabilityService';

import { haversineDistance } from '@/utils/transitGeometry';


function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
}

export function useNearbyBuses(ticket: ChigariScannedTicket | null) {
  const { buses, selectedBus, selectBus } = useDemoBusTracking({
    simulationSpeedMultiplier: 3.0,
    updateIntervalMs: 500,
  });

  const fromStop: BRTSStop = useMemo(() => {
    if (!ticket) return CHIGARI_STOPS[0];
    return (
      findStopById(ticket.fromStopId) ||
      findStopByName(ticket.fromStopName) ||
      CHIGARI_STOPS[0]
    );
  }, [ticket]);

  const toStop: BRTSStop = useMemo(() => {
    if (!ticket) return CHIGARI_STOPS[CHIGARI_STOPS.length - 1];
    return (
      findStopById(ticket.toStopId) ||
      findStopByName(ticket.toStopName) ||
      CHIGARI_STOPS[CHIGARI_STOPS.length - 1]
    );
  }, [ticket]);

  // Route-aware available services for this specific ticket journey or stop
  const availableServices: ChigariServiceDefinition[] = useMemo(() => {
    if (ticket && ticket.fromStopName && ticket.toStopName && ticket.fromStopName !== ticket.toStopName) {
      return getAvailableServicesForJourney(ticket.fromStopName, ticket.toStopName);
    }
    if (fromStop && toStop && fromStop.id !== toStop.id) {
      return getAvailableServicesForJourney(fromStop.name, toStop.name);
    }
    return getAvailableServicesAtStop(fromStop.name);
  }, [ticket, fromStop, toStop]);

  const isHeadingDharwad = fromStop.order <= toStop.order;

  const nearbyBuses: NearbyBusInfo[] = useMemo(() => {
    const availableNumbers = new Set(availableServices.map((s) => s.serviceNumber));

    // If no services operate this route, return empty (triggers empty state)
    if (availableNumbers.size === 0) {
      return [];
    }

    // Filter buses: only include buses operating an available service route
    const eligibleBuses = buses.filter((bus) =>
      availableNumbers.has(bus.busNumber as any)
    );

    const list = eligibleBuses.map((bus) => {
      const dist = haversineDistance(fromStop, {
        latitude: bus.latitude,
        longitude: bus.longitude,
      });

      // Direction match: !bus.isReverse is towards Dharwad, bus.isReverse is towards Hubballi CBT
      const busHeadingDharwad = !bus.isReverse;
      const isSameDirection = isHeadingDharwad === busHeadingDharwad;

      // ETA in minutes based on real-time speed (min 20 km/h baseline)
      const speedKmh = Math.max(bus.speed, 20);
      const speedMpm = (speedKmh * 1000) / 60;
      const etaMinutes = Math.max(1, Math.round(dist / speedMpm));

      return {
        id: bus.id,
        busNumber: bus.busNumber,
        routeName: bus.routeName,
        routeColor: bus.routeColor,
        direction: bus.direction,
        distanceMeters: Math.round(dist),
        formattedDistance: formatDistance(dist),
        etaMinutes,
        currentStopName: bus.currentStop?.name || 'In Transit',
        nextStopName: bus.nextStop?.name || 'Approaching Stop',
        latitude: bus.latitude,
        longitude: bus.longitude,
        speed: bus.speed,
        isSameDirection,
      };
    });

    // Sort: same-direction buses first, then closest distance
    return list.sort((a, b) => {
      if (a.isSameDirection && !b.isSameDirection) return -1;
      if (!a.isSameDirection && b.isSameDirection) return 1;
      return a.distanceMeters - b.distanceMeters;
    });
  }, [buses, fromStop, isHeadingDharwad, availableServices]);

  return {
    nearbyBuses,
    availableServices,
    fromStop,
    toStop,
    selectedBus,
    selectBus,
  };
}
