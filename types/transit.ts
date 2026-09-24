export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BRTSStop {
  id: string;
  name: string;
  kannadaName?: string;
  aliases?: string[];
  latitude: number;
  longitude: number;
  order: number;
  distanceAlongRoute: number; // Distance in meters from Hubballi CBT
  perpendicularDistance?: number;
  section?: 'Dharwad' | 'Central Corridor' | 'Hubballi';
  isMajorTerminal?: boolean;
  terminalType?: string;
  typeBadge?: string;
  tagline?: string;
  branch?: string;
  servedServices?: string[];
}

export type ChigariBusNumber = '200A' | '201B' | '100D' | '202C' | '202D';

export type CrowdLevel = 'Low' | 'Moderate' | 'High' | 'Full';

export type BusDirection =
  | 'To Dharwad BRTS Terminal'
  | 'To Hubballi CBT'
  | 'To Dharwad New Bus Stand'
  | 'To Hubballi Railway Station'
  | 'To Gokul Bus Station';

export type TrackingSource = 'observed' | 'predicted';

export type MovementState = 'moving' | 'stopped' | 'at_station' | 'offline';

export type ConfidenceTier = 'LIVE' | 'RECENT' | 'ESTIMATED' | 'STALE' | 'OFFLINE';

/**
 * Authoritative Physical Bus Entity
 * Represents an individual physical vehicle operating on the HDBRTS corridor.
 * Decoupled from the public transit service number (e.g., multiple physical buses run on service 200A).
 */
export interface PhysicalBus {
  physicalBusId: string;
  serviceNumber: ChigariBusNumber;
  fleetNumber?: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  trackingSource: TrackingSource;
  movementState: MovementState;
  confidenceTier: ConfidenceTier;
  lastObservationAt: string;
  firstEstablishedAt: string;
}

/**
 * Passenger Observation (Type Model Only for future crowdsourced/telemetry ingestion)
 * Anonymous, session-scoped observation payload without attachment to user account identity.
 */
export interface PassengerObservation {
  observationId: string;
  sessionId: string;
  serviceNumber: ChigariBusNumber;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  reportedFleetNumber?: string;
}

export interface ChigariBus {
  id: string;
  physicalBusId: string;
  busNumber: ChigariBusNumber;
  fleetNumber?: string;
  trackingSource?: TrackingSource;
  movementState?: MovementState;
  confidenceTier?: ConfidenceTier;
  routeName: string;
  routeColor: string;
  direction: BusDirection;
  crowd: CrowdLevel;
  status: string;
  latitude: number;
  longitude: number;
  heading: number;           // Bearing in degrees (0 = North, 90 = East, etc.)
  speed: number;             // Real-time speed in km/h
  progressMeters: number;    // Current cumulative progress along route in meters
  currentStop: BRTSStop | null;
  nextStop: BRTSStop;
  distanceToNextStop: number;// Distance to next station in meters
  etaMinutes: number;        // Dynamic ETA in minutes
  lastUpdated: string;
  lastObservationAt?: string;
  isSelected?: boolean;
  isReverse?: boolean;       // true if traveling from Dharwad to Hubballi
}

export interface ChigariRoute {
  id: string;
  routeNumber: string;
  name: string;
  color: string;
  origin: string;
  destination: string;
  coordinates: Coordinates[];
  stops: BRTSStop[];
  totalDistanceMeters: number;
}
