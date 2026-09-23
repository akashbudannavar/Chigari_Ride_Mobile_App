import type { ChigariBusNumber, BusDirection } from './transit';

export interface ChigariScannedTicket {
  type: 'CHIGARI_TICKET';
  ticketId: string;
  fromStopId: string;
  toStopId: string;
  fromStopName: string;
  toStopName: string;
  fare: number | null;
  currency: string;
  ticketType: string;
  issuedAt: string;
  validUntil: string;
  scannedAt?: string;
  status: 'Valid' | 'Expired' | 'Invalid' | 'Boarded' | 'Completed';
  serialNumber?: string;
  operatorId?: string;
  fareFormatted?: string;
  issuedAtFormatted?: string;
  validityStatus?: 'VALID' | 'EXPIRED' | 'UNKNOWN' | 'INVALID' | 'BOARDED' | 'COMPLETED';
  statusReason?: string;
  format?: string;
  rawPayload?: string;
  journeyState?: 'ACTIVE' | 'BOARDED' | 'EXITED' | 'EXPIRED' | 'CANCELLED';
  entryStationName?: string;
  exitStationName?: string;
}

export interface NearbyBusInfo {
  id: string;
  busNumber: ChigariBusNumber;
  routeName: string;
  routeColor: string;
  direction: BusDirection;
  distanceMeters: number;
  formattedDistance: string;
  etaMinutes: number;
  currentStopName: string;
  nextStopName: string;
  latitude: number;
  longitude: number;
  speed: number;
  isSameDirection: boolean;
}
