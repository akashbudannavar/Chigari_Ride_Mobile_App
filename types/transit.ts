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

export interface ChigariBus {
  id: string;
  busNumber: ChigariBusNumber;
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
