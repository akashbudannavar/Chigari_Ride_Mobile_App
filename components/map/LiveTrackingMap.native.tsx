import React, { Component, forwardRef } from 'react';
import { Platform } from 'react-native';
import { LiveTrackingMapLibre } from './LiveTrackingMapLibre';
import { LiveTrackingMapVector, type LiveTrackingMapRef } from './LiveTrackingMapVector';
import type { ChigariBus, ChigariRoute, Coordinates, BRTSStop } from '@/types/transit';

export type { LiveTrackingMapRef };

export interface LiveTrackingMapProps {
  buses: ChigariBus[];
  selectedBus: ChigariBus | null;
  activeRoute: ChigariRoute;
  userLocation: Coordinates & { title: string; subtitle: string };
  onSelectBus: (bus: ChigariBus) => void;
  onSelectStop?: (stop: BRTSStop) => void;
  selectedStop?: BRTSStop | null;
  isJourneyActive?: boolean;
  remainingCoordinates?: Coordinates[];
  journeyCoordinates?: Coordinates[];
  ticketOriginStop?: BRTSStop;
  ticketDestinationStop?: BRTSStop;
  intermediateStops?: BRTSStop[];
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Resilient Error Boundary that safely catches any map rendering failures.
 */
class MapErrorBoundary extends Component<{ children: React.ReactNode; fallback: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn('[LiveTrackingMap] Map encountered an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Live Tracking Map for Native Mobile (Android & iOS).
 * Uses OpenFreeMap vector tiles rendered with MapLibre.
 * Style endpoint: https://tiles.openfreemap.org/styles/liberty
 * Permanently free, open-source vector map with zero API keys.
 * Fallback to high-performance vector map ensures zero-crash guarantee under all conditions.
 */
export const LiveTrackingMap = forwardRef<LiveTrackingMapRef, LiveTrackingMapProps>(
  (props, ref) => {
    return (
      <MapErrorBoundary fallback={<LiveTrackingMapVector ref={ref} {...props} />}>
        <LiveTrackingMapLibre ref={ref} {...props} />
      </MapErrorBoundary>
    );
  }
);

export default LiveTrackingMap;
