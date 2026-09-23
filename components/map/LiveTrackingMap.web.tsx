import React, { forwardRef } from 'react';
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

export const LiveTrackingMap = forwardRef<LiveTrackingMapRef, LiveTrackingMapProps>(
  (props, ref) => {
    return <LiveTrackingMapVector ref={ref} {...props} />;
  }
);

export default LiveTrackingMap;
