import { useState, useEffect, useRef, useCallback } from 'react';
import type { Coordinates, BRTSStop, ChigariBus, ChigariBusNumber, ChigariRoute } from '@/types/transit';
import {
  CHIGARI_CORRIDOR_ROUTE,
  CHIGARI_VERIFIED_STOPS,
  INITIAL_CHIGARI_BUSES,
  DEMO_USER_LOCATION,
} from '@/data/chigariRoute';
import {
  haversineDistance,
  calculateBearing,
  getCumulativeDistances,
  interpolatePosition,
} from '@/utils/transitGeometry';

interface TrackingOptions {
  simulationSpeedMultiplier?: number; // Default 3.0 for a natural demo pace
  updateIntervalMs?: number;          // Default 250ms for smooth 4fps interpolation
}

export function useDemoBusTracking(options: TrackingOptions = {}) {
  const { simulationSpeedMultiplier = 3.0, updateIntervalMs = 250 } = options;

  const [buses, setBuses] = useState<ChigariBus[]>(INITIAL_CHIGARI_BUSES);
  const [selectedBusId, setSelectedBusId] = useState<string | null>('CR-BUS-001'); // Initially select first physical bus
  const [isPlaying, setIsPlaying] = useState<boolean>(false); // Stationary by default (Requirement 1 & 2)

  // Precomputed cumulative distance array for the HDBRTS corridor polyline
  const cumulativeDistancesRef = useRef<number[]>(
    getCumulativeDistances(CHIGARI_CORRIDOR_ROUTE.coordinates),
  );

  const activeRoute: ChigariRoute = CHIGARI_CORRIDOR_ROUTE;
  const selectedBus = selectedBusId
    ? (buses.find((b) => b.physicalBusId === selectedBusId || b.id === selectedBusId) ?? null)
    : null;

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const resetDemo = useCallback(() => {
    setBuses(INITIAL_CHIGARI_BUSES);
    setSelectedBusId('CR-BUS-001');
  }, []);

  const selectBus = useCallback((busOrIdOrNumber: ChigariBus | string | null) => {
    if (!busOrIdOrNumber) {
      setSelectedBusId(null);
      setBuses((prev) => prev.map((b) => ({ ...b, isSelected: false })));
      return;
    }

    setBuses((prev) => {
      let targetBus: ChigariBus | undefined;

      if (typeof busOrIdOrNumber === 'object' && busOrIdOrNumber !== null) {
        targetBus = busOrIdOrNumber;
      } else {
        // First try to match physicalBusId or id
        targetBus = prev.find(
          (b) => b.physicalBusId === busOrIdOrNumber || b.id === busOrIdOrNumber
        );
        // If not found, match by service number (busNumber)
        if (!targetBus) {
          targetBus = prev.find((b) => b.busNumber === busOrIdOrNumber);
        }
      }

      const chosenId = targetBus ? (targetBus.physicalBusId || targetBus.id) : null;
      setSelectedBusId(chosenId);

      return prev.map((b) => ({
        ...b,
        isSelected: chosenId !== null && (b.physicalBusId === chosenId || b.id === chosenId),
      }));
    });
  }, []);

  // Simulation animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setBuses((prevBuses) => {
        const cumDistances = cumulativeDistancesRef.current;
        const totalDistance = cumDistances[cumDistances.length - 1];

        return prevBuses.map((bus) => {
          const isReverse = bus.isReverse ?? false;

          // Determine next and current stop based on direction of travel
          let nextStop: BRTSStop;
          let currentStop: BRTSStop | null = null;
          let distanceToNextStop = 0;

          if (!isReverse) {
            // Forward: Hubballi CBT -> Dharwad BRTS Terminal
            let nextIndex = CHIGARI_VERIFIED_STOPS.length - 1;
            for (let i = 0; i < CHIGARI_VERIFIED_STOPS.length; i++) {
              if (bus.progressMeters < CHIGARI_VERIFIED_STOPS[i].distanceAlongRoute) {
                nextIndex = i;
                break;
              }
            }
            nextStop = CHIGARI_VERIFIED_STOPS[nextIndex];
            currentStop = nextIndex > 0 ? CHIGARI_VERIFIED_STOPS[nextIndex - 1] : null;
            distanceToNextStop = Math.max(10, Math.round(nextStop.distanceAlongRoute - bus.progressMeters));
          } else {
            // Reverse: Dharwad BRTS Terminal -> Hubballi CBT
            let nextIndex = 0;
            for (let i = CHIGARI_VERIFIED_STOPS.length - 1; i >= 0; i--) {
              if (bus.progressMeters > CHIGARI_VERIFIED_STOPS[i].distanceAlongRoute) {
                nextIndex = i;
                break;
              }
            }
            nextStop = CHIGARI_VERIFIED_STOPS[nextIndex];
            currentStop =
              nextIndex < CHIGARI_VERIFIED_STOPS.length - 1
                ? CHIGARI_VERIFIED_STOPS[nextIndex + 1]
                : null;
            distanceToNextStop = Math.max(10, Math.round(bus.progressMeters - nextStop.distanceAlongRoute));
          }

          // Physics-based speed variation:
          // Cruising: 30 - 38 km/h
          // Decelerating near station (< 160 m): 12 - 20 km/h
          // Station dwell (< 30 m): 4 - 8 km/h
          let currentSpeed = 34;
          if (distanceToNextStop < 40) {
            currentSpeed = 6 + Math.round(Math.sin(Date.now() / 600) * 3);
          } else if (distanceToNextStop < 160) {
            currentSpeed = 16 + Math.round(Math.sin(Date.now() / 800) * 4);
          } else {
            currentSpeed = 34 + Math.round(Math.sin(Date.now() / 1400) * 4);
          }

          // Speed in meters per second
          const speedMps = (currentSpeed * 1000) / 3600;
          const deltaSec = updateIntervalMs / 1000;
          const stepMeters = speedMps * deltaSec * simulationSpeedMultiplier;

          let newProgress = isReverse
            ? bus.progressMeters - stepMeters
            : bus.progressMeters + stepMeters;

          let newDirection = bus.direction;
          let newIsReverse = isReverse;

          // Bidirectional terminal turnaround
          if (!isReverse && newProgress >= totalDistance) {
            // Reached Dharwad BRTS Terminal -> turnaround to Hubballi CBT
            newProgress = totalDistance - 20;
            newIsReverse = true;
            newDirection = 'To Hubballi CBT';
          } else if (isReverse && newProgress <= 0) {
            // Reached Hubballi CBT -> turnaround to Dharwad BRTS Terminal
            newProgress = 20;
            newIsReverse = false;
            newDirection = 'To Dharwad BRTS Terminal';
          }

          // Interpolate GPS coordinates and tangent heading angle
          const { position, heading } = interpolatePosition(
            CHIGARI_CORRIDOR_ROUTE.coordinates,
            cumDistances,
            newProgress,
            newIsReverse,
          );

          // Dynamic ETA based on distance and speed
          const etaMinutes = Math.max(
            1,
            Math.round(distanceToNextStop / (Math.max(speedMps, 5) * 60)),
          );

          return {
            ...bus,
            direction: newDirection,
            isReverse: newIsReverse,
            latitude: position.latitude,
            longitude: position.longitude,
            heading,
            speed: currentSpeed,
            progressMeters: newProgress,
            currentStop,
            nextStop,
            distanceToNextStop,
            etaMinutes,
            lastUpdated: 'Just now',
          };
        });
      });
    }, updateIntervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, updateIntervalMs, simulationSpeedMultiplier]);

  return {
    buses,
    selectedBus,
    activeRoute,
    userLocation: DEMO_USER_LOCATION,
    isPlaying,
    togglePlayPause,
    resetDemo,
    selectBus,
  };
}
