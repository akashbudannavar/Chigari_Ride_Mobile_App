import type { BRTSStop, ChigariBusNumber } from '../types/transit';

/**
 * Canonical 36 Chigari Stations in HDBRTS Corridor Network
 */
export interface CanonicalStop {
  number: number;
  name: string;
  aliases: string[];
}

export const CANONICAL_CORRIDOR_STOPS: CanonicalStop[] = [
  { number: 1, name: 'Dharwad New Bus Stand', aliases: ['Dharwad New Bus Station', 'New Bus Stand Dharwad', 'Dharwad New Busstand'] },
  { number: 2, name: 'Dharwad BRTS Terminal (CBT)', aliases: ['Dharwad BRTS Terminal', 'Dharwad BRTS', 'Dharwad CBT', 'CBT Dharwad', 'HBRST Dharwad'] },
  { number: 3, name: 'Jubilee Circle', aliases: ['Jubilee Circle Dharwad', 'Jubilee Circle BRTS'] },
  { number: 4, name: 'Court Circle', aliases: ['Court Circle Dharwad', 'Dharwad Court Circle', 'Court Circle BRTS'] },
  { number: 5, name: 'NTTF', aliases: ['NTTF Dharwad', 'NTTF BRTS'] },
  { number: 6, name: 'Hosa Yellapur Cross', aliases: ['Hosayellapur', 'Hosayellapur Cross', 'Hosa Yellapur', 'Hosa Yallapura'] },
  { number: 7, name: 'Toll Naka', aliases: ['Tollnaka', 'Toll Naka Dharwad'] },
  { number: 8, name: 'Vidyagiri', aliases: ['Vidyagiri Dharwad', 'JSS College', 'Vidyagiri BRTS'] },
  { number: 9, name: 'Gandhinagar', aliases: ['Ghandhinagar', 'Gandhinagar Dharwad'] },
  { number: 10, name: 'Lakmanahalli', aliases: ['Lakamanahalli', 'Lakamanahalli BRTS'] },
  { number: 11, name: 'Navalur', aliases: ['Navalur Village', 'Navalur Stop', 'Navalur Dharwad'] },
  { number: 12, name: 'Sattur', aliases: ['Sattur Colony', 'Sattur BRTS'] },
  { number: 13, name: 'SDM Medical College', aliases: ['SDM Hospital', 'SDM', 'SDM Medical'] },
  { number: 14, name: 'Navluru Railway Station', aliases: ['Navalur Railway Station', 'Navalur Railway BRT Station', 'Navluru'] },
  { number: 15, name: 'KMF', aliases: ['KMF 1', 'KMF Dharwad', 'KMF Dairy'] },
  { number: 16, name: 'Rayapur', aliases: ['Rayapur Depot', 'Rayapur BRT Station'] },
  { number: 17, name: 'ISKCON Temple', aliases: ['ISKCON', 'ISKON BRT Station', 'ISKCON Hubballi'] },
  { number: 18, name: 'RTO', aliases: ['RTO Office', 'RTO Navanagar', 'RTO BRT Station'] },
  { number: 19, name: 'Navanagara', aliases: ['Navanagar', 'Navanagar BRT Station'] },
  { number: 20, name: 'APMC 3rd Gate', aliases: ['APMC Gate 3', 'APMC'] },
  { number: 21, name: 'Shantinikethan', aliases: ['Shantiniketan', 'Shantinikethan BRT Station'] },
  { number: 22, name: 'Biridevarakoppa', aliases: ['Bairidevarkoppa', 'Bhairidevarakoppa'] },
  { number: 23, name: 'Unakal Lake', aliases: ['Unkal Lake', 'Unkal Lake BRT Station'] },
  { number: 24, name: 'Unakal Village', aliases: ['Unkal', 'Unkal Village', 'Unakal'] },
  { number: 25, name: 'Unakal Cross', aliases: ['Unkal Cross', 'Unkal Cross BRT Station'] },
  { number: 26, name: 'BVB', aliases: ['BVB College', 'KLE Tech', 'BVB College / KLE Tech', 'BVBCET'] },
  { number: 27, name: 'Vidyanagar', aliases: ['Vidyanagar Hubli', 'Vidyanagar Hubballi', 'Vidyanagar BRT Station'] },
  { number: 28, name: 'KIMS', aliases: ['KIMS Hospital', 'KIMS BRT Station', 'KMC Cross'] },
  { number: 29, name: 'Hosur Regional Terminal', aliases: ['Hosur Regional Bus Station', 'Hosur Terminal', 'Hosur Interchange'] },
  { number: 30, name: 'Hosur Cross', aliases: ['Hosur Cross Hubli', 'Hosur Circle', 'Hosur Circle BRT Station'] },
  { number: 31, name: 'Hubballi New Bus Stand (Gokul Bus stop)', aliases: ['Gokul Bus Station', 'Gokul Bus Stop', 'Gokul Road Bus Stand', 'Hubballi Gokul Bus Station', 'Gokul', 'HDBRTS Hubballi Depot'] },
  { number: 32, name: 'Hubballi Central Bus Stand / Rani Channamma Circle', aliases: ['Rani Channamma Circle', 'Hubli OBS', 'Old Bus Station', 'Chennamma Circle', 'Hubli OCBS BRT Station'] },
  { number: 33, name: 'HDMC', aliases: ['Corporation-H', 'Hubli Dharwad Municipal Corporation', 'Corporation', 'HDMC BRT Station'] },
  { number: 34, name: 'DR. B R Ambedkar Circle', aliases: ['Dr. B R Ambedkar Circle', 'Ambedkar Circle', 'Dr BR Ambedkar Circle', 'Dr.Ambedkar BRT Station'] },
  { number: 35, name: 'Hubballi Central Bus Terminal', aliases: ['Hubballi CBT', 'CBT / Hubballi Central Bus Terminal', 'CBT BRTS Hubli', 'CBT Hubli', 'Central Bus Terminal', 'CBT'] },
  { number: 36, name: 'Hubballi Railway Station', aliases: ['Railway Station-H', 'Hubballi Railway BRT Station', 'SSS Hubballi Junction', 'Hubli Railway Station', 'Hubballi Junction'] },
];

export interface ChigariServiceDefinition {
  serviceNumber: '200A' | '201B' | '100D' | '202C';
  name: string;
  originStopNumber: number;
  originStopName: string;
  destinationStopNumber: number;
  destinationStopName: string;
  direction: 'Hubballi_to_Dharwad' | 'Dharwad_to_Hubballi';
  stopNumbers: number[];
  isLimitedStop: boolean;
  color: string;
}

/**
 * 4 Official Chigari Service Routes (both directions = 8 operational service schedules)
 */
export const CHIGARI_SERVICES: ChigariServiceDefinition[] = [
  // ─── 200A Northbound (Hubballi CBT ➔ Dharwad BRTS Terminal) ───
  {
    serviceNumber: '200A',
    name: 'Route 200A • Hubballi Central Bus Terminal (CBT) ➔ Dharwad BRTS Terminal',
    originStopNumber: 35,
    originStopName: 'Hubballi Central Bus Terminal',
    destinationStopNumber: 2,
    destinationStopName: 'Dharwad BRTS Terminal (CBT)',
    direction: 'Hubballi_to_Dharwad',
    stopNumbers: [
      35, 34, 33, 32, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17,
      16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2,
    ],
    isLimitedStop: false,
    color: '#2E7D32',
  },
  // ─── 200A Southbound (Dharwad BRTS Terminal ➔ Hubballi CBT) ───
  {
    serviceNumber: '200A',
    name: 'Route 200A • Dharwad BRTS Terminal ➔ Hubballi Central Bus Terminal (CBT)',
    originStopNumber: 2,
    originStopName: 'Dharwad BRTS Terminal (CBT)',
    destinationStopNumber: 35,
    destinationStopName: 'Hubballi Central Bus Terminal',
    direction: 'Dharwad_to_Hubballi',
    stopNumbers: [
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
      22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 33, 34, 35,
    ],
    isLimitedStop: false,
    color: '#2E7D32',
  },

  // ─── 201B Northbound (Hubballi Railway Station ➔ Dharwad New Bus Stand) ───
  {
    serviceNumber: '201B',
    name: 'Route 201B • Hubballi Railway Station ➔ Dharwad New Bus Stand',
    originStopNumber: 36,
    originStopName: 'Hubballi Railway Station',
    destinationStopNumber: 1,
    destinationStopName: 'Dharwad New Bus Stand',
    direction: 'Hubballi_to_Dharwad',
    stopNumbers: [
      36, 34, 33, 32, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17,
      16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 1,
    ],
    isLimitedStop: false,
    color: '#1B5E20',
  },
  // ─── 201B Southbound (Dharwad New Bus Stand ➔ Hubballi Railway Station) ───
  {
    serviceNumber: '201B',
    name: 'Route 201B • Dharwad New Bus Stand ➔ Hubballi Railway Station',
    originStopNumber: 1,
    originStopName: 'Dharwad New Bus Stand',
    destinationStopNumber: 36,
    destinationStopName: 'Hubballi Railway Station',
    direction: 'Dharwad_to_Hubballi',
    stopNumbers: [
      1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
      22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 33, 34, 36,
    ],
    isLimitedStop: false,
    color: '#1B5E20',
  },

  // ─── 100D Northbound (Hubballi Railway Station ➔ Dharwad New Bus Stand - Limited Stop Express) ───
  {
    serviceNumber: '100D',
    name: 'Route 100D • Hubballi Railway Station ➔ Dharwad New Bus Stand (Express)',
    originStopNumber: 36,
    originStopName: 'Hubballi Railway Station',
    destinationStopNumber: 1,
    destinationStopName: 'Dharwad New Bus Stand',
    direction: 'Hubballi_to_Dharwad',
    // 14 Limited-stop stations (skips all minor stops)
    stopNumbers: [36, 34, 33, 32, 30, 28, 27, 19, 13, 7, 5, 4, 3, 1],
    isLimitedStop: true,
    color: '#388E3C',
  },
  // ─── 100D Southbound (Dharwad New Bus Stand ➔ Hubballi Railway Station - Limited Stop Express) ───
  {
    serviceNumber: '100D',
    name: 'Route 100D • Dharwad New Bus Stand ➔ Hubballi Railway Station (Express)',
    originStopNumber: 1,
    originStopName: 'Dharwad New Bus Stand',
    destinationStopNumber: 36,
    destinationStopName: 'Hubballi Railway Station',
    direction: 'Dharwad_to_Hubballi',
    stopNumbers: [1, 3, 4, 5, 7, 13, 19, 27, 28, 30, 32, 33, 34, 36],
    isLimitedStop: true,
    color: '#388E3C',
  },

  // ─── 202C Northbound (Hubballi New Bus Stand / Gokul ➔ Dharwad BRTS Terminal) ───
  {
    serviceNumber: '202C',
    name: 'Route 202C • Hubballi New Bus Stand (Gokul) ➔ Dharwad BRTS Terminal',
    originStopNumber: 31,
    originStopName: 'Hubballi New Bus Stand (Gokul Bus stop)',
    destinationStopNumber: 2,
    destinationStopName: 'Dharwad BRTS Terminal (CBT)',
    direction: 'Hubballi_to_Dharwad',
    stopNumbers: [
      31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14,
      13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2,
    ],
    isLimitedStop: false,
    color: '#43A047',
  },
  // ─── 202C Southbound (Dharwad BRTS Terminal ➔ Hubballi New Bus Stand / Gokul) ───
  {
    serviceNumber: '202C',
    name: 'Route 202C • Dharwad BRTS Terminal ➔ Hubballi New Bus Stand (Gokul)',
    originStopNumber: 2,
    originStopName: 'Dharwad BRTS Terminal (CBT)',
    destinationStopNumber: 31,
    destinationStopName: 'Hubballi New Bus Stand (Gokul Bus stop)',
    direction: 'Dharwad_to_Hubballi',
    stopNumbers: [
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
      22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
    ],
    isLimitedStop: false,
    color: '#43A047',
  },
];

/**
 * Resolves any stop identifier (number 1..36, stop ID like 'hdbrts-stop-01',
 * name string, or BRTSStop object) to its canonical stop number (1..36).
 */
export function resolveStopNumber(
  identifier: number | string | BRTSStop | null | undefined
): number | null {
  if (identifier === null || identifier === undefined) {
    return null;
  }

  // 1. Direct number
  if (typeof identifier === 'number') {
    if (identifier >= 1 && identifier <= 36) return identifier;
    return null;
  }

  // 2. Object with name or id
  if (typeof identifier === 'object') {
    const obj = identifier as { name?: string; id?: string };
    if (obj.name) {
      return resolveStopNumber(obj.name);
    }
    if (obj.id) {
      return resolveStopNumber(obj.id);
    }
    return null;
  }

  // 3. String lookup
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;

  // Direct numeric string
  const asNum = parseInt(clean, 10);
  if (!isNaN(asNum) && asNum >= 1 && asNum <= 36 && clean === asNum.toString()) {
    return asNum;
  }

  // hdbrts-stop-XX pattern
  const hdbrtsMatch = clean.match(/^hdbrts-stop-(\d+)$/i);
  if (hdbrtsMatch) {
    const rawOrder = parseInt(hdbrtsMatch[1], 10);
    if (rawOrder >= 1 && rawOrder <= 36) {
      return rawOrder;
    }
  }

  // Exact or alias match
  for (const stop of CANONICAL_CORRIDOR_STOPS) {
    if (stop.name.toLowerCase() === clean) {
      return stop.number;
    }
    for (const alias of stop.aliases) {
      if (alias.toLowerCase() === clean) {
        return stop.number;
      }
    }
  }

  // Substring match with boundary prioritization
  for (const stop of CANONICAL_CORRIDOR_STOPS) {
    const stopLower = stop.name.toLowerCase();
    if (clean.includes(stopLower) || stopLower.includes(clean)) {
      return stop.number;
    }
    for (const alias of stop.aliases) {
      const aliasLower = alias.toLowerCase();
      if (clean.includes(aliasLower) || aliasLower.includes(clean)) {
        return stop.number;
      }
    }
  }

  return null;
}

/**
 * Returns canonical station name by stop number.
 */
export function getCanonicalStopName(stopNumber: number): string {
  const found = CANONICAL_CORRIDOR_STOPS.find((s) => s.number === stopNumber);
  return found ? found.name : `Station ${stopNumber}`;
}

/**
 * Checks if a specific bus service schedule operates a direct journey from fromStop to toStop.
 * Rule:
 * 1. Both stops must be on the service's route.
 * 2. fromStop must appear before toStop in the service's ordered stop sequence.
 */
export function isServiceAvailableForJourney(
  service: ChigariServiceDefinition,
  fromStopIdentifier: number | string | BRTSStop | null | undefined,
  toStopIdentifier: number | string | BRTSStop | null | undefined
): boolean {
  const fromNum = resolveStopNumber(fromStopIdentifier);
  const toNum = resolveStopNumber(toStopIdentifier);

  if (fromNum === null || toNum === null || fromNum === toNum) {
    return false;
  }

  const fromIndex = service.stopNumbers.indexOf(fromNum);
  const toIndex = service.stopNumbers.indexOf(toNum);

  return fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex;
}

/**
 * Returns all distinct Chigari bus services genuinely available for a journey between fromStop and toStop.
 * Guaranteed to deduplicate by serviceNumber (200A, 201B, 100D, 202C).
 */
export function getAvailableServicesForJourney(
  fromStopIdentifier: number | string | BRTSStop | null | undefined,
  toStopIdentifier: number | string | BRTSStop | null | undefined
): ChigariServiceDefinition[] {
  const fromNum = resolveStopNumber(fromStopIdentifier);
  const toNum = resolveStopNumber(toStopIdentifier);

  if (fromNum === null || toNum === null || fromNum === toNum) {
    return [];
  }

  const matching = CHIGARI_SERVICES.filter((service) =>
    isServiceAvailableForJourney(service, fromNum, toNum)
  );

  // Deduplicate by serviceNumber while preserving first matching schedule
  const seen = new Set<string>();
  const uniqueServices: ChigariServiceDefinition[] = [];

  for (const s of matching) {
    if (!seen.has(s.serviceNumber)) {
      seen.add(s.serviceNumber);
      uniqueServices.push(s);
    }
  }

  return uniqueServices;
}

/**
 * Returns all Chigari bus services that serve a given stop.
 */
export function getAvailableServicesAtStop(
  stopIdentifier: number | string | BRTSStop | null | undefined
): ChigariServiceDefinition[] {
  const stopNum = resolveStopNumber(stopIdentifier);
  if (stopNum === null) return [];

  const matching = CHIGARI_SERVICES.filter((service) =>
    service.stopNumbers.includes(stopNum)
  );

  const seen = new Set<string>();
  const uniqueServices: ChigariServiceDefinition[] = [];

  for (const s of matching) {
    if (!seen.has(s.serviceNumber)) {
      seen.add(s.serviceNumber);
      uniqueServices.push(s);
    }
  }

  return uniqueServices;
}

export interface TransferLeg {
  fromStationNumber: number;
  fromStationName: string;
  toStationNumber: number;
  toStationName: string;
  availableServices: ChigariServiceDefinition[];
  serviceNumbers: string[];
}

export interface TransferOption {
  optionNumber: number;
  transferStationNumber: number;
  transferStationName: string;
  leg1: TransferLeg;
  leg2: TransferLeg;
}

/**
 * Computes smart 2-leg transfer options when no direct bus service is available.
 * Prioritizes key interchange junctions:
 * - Ambedkar Circle (Stop 34)
 * - Hosur Cross (Stop 30)
 * - Jubilee Circle (Stop 3)
 */
export function getTransferSuggestions(
  fromStopIdentifier: number | string | BRTSStop | null | undefined,
  toStopIdentifier: number | string | BRTSStop | null | undefined
): TransferOption[] {
  const fromNum = resolveStopNumber(fromStopIdentifier);
  const toNum = resolveStopNumber(toStopIdentifier);

  if (fromNum === null || toNum === null || fromNum === toNum) {
    return [];
  }

  // If a direct service already exists, no transfer needed
  if (getAvailableServicesForJourney(fromNum, toNum).length > 0) {
    return [];
  }

  // Major corridor interchange junctions ordered by strategic priority
  const candidateHubs = [34, 30, 3, 32, 28];
  const suggestions: TransferOption[] = [];

  for (const hub of candidateHubs) {
    if (hub === fromNum || hub === toNum) continue;

    const leg1Services = getAvailableServicesForJourney(fromNum, hub);
    const leg2Services = getAvailableServicesForJourney(hub, toNum);

    if (leg1Services.length > 0 && leg2Services.length > 0) {
      const leg1Numbers = leg1Services.map((s) => s.serviceNumber);
      const leg2Numbers = leg2Services.map((s) => s.serviceNumber);

      suggestions.push({
        optionNumber: suggestions.length + 1,
        transferStationNumber: hub,
        transferStationName: getCanonicalStopName(hub),
        leg1: {
          fromStationNumber: fromNum,
          fromStationName: getCanonicalStopName(fromNum),
          toStationNumber: hub,
          toStationName: getCanonicalStopName(hub),
          availableServices: leg1Services,
          serviceNumbers: leg1Numbers,
        },
        leg2: {
          fromStationNumber: hub,
          fromStationName: getCanonicalStopName(hub),
          toStationNumber: toNum,
          toStationName: getCanonicalStopName(toNum),
          availableServices: leg2Services,
          serviceNumbers: leg2Numbers,
        },
      });
    }
  }

  return suggestions;
}

/**
 * Formats a list of available service numbers into a passenger-friendly string (e.g. "200A" or "201B, 100D").
 */
export function formatAvailableServiceNumbers(
  services: (ChigariServiceDefinition | { serviceNumber: string })[]
): string {
  if (services.length === 0) return '';
  return services.map((s) => s.serviceNumber).join(', ');
}
