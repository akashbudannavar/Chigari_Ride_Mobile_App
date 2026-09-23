/**
 * Authoritative Shared E-Ticket Contract (Version 1) Helper.
 * 
 * Bridges CHIGARI RIDE (passenger app) with CHIGARI GATE (station validator app)
 * ensuring all generated e-ticket QR payloads strictly conform to the shared contract.
 */

export interface AuthoritativeStation {
  index: number;
  name: string;
  initials: string;
  code: string;
}

export const AUTHORITATIVE_STATIONS: AuthoritativeStation[] = [
  { index: 1, name: 'Dharwad New Bus Stand', initials: 'DNBS', code: 'CR-DNBS-031804140219' },
  { index: 2, name: 'Dharwad BRTS Terminal (CBT)', initials: 'DBT', code: 'CR-DBT-0318040220' },
  { index: 3, name: 'Jubilee Circle', initials: 'JC', code: 'CR-JC-03181003' },
  { index: 4, name: 'Court Circle', initials: 'CC', code: 'CR-CC-03180303' },
  { index: 5, name: 'NTTF', initials: 'NTTF', code: 'CR-NTTF-031814202006' },
  { index: 6, name: 'Hosa Yellapur Cross', initials: 'HYC', code: 'CR-HYC-0318082503' },
  { index: 7, name: 'Toll Naka', initials: 'TN', code: 'CR-TN-03182014' },
  { index: 8, name: 'Vidyagiri', initials: 'V', code: 'CR-V-031822' },
  { index: 9, name: 'Gandhinagar', initials: 'G', code: 'CR-G-031807' },
  { index: 10, name: 'Lakmanahalli', initials: 'L', code: 'CR-L-031812' },
  { index: 11, name: 'Sattur', initials: 'S', code: 'CR-S-031819' },
  { index: 12, name: 'SDM Medical College', initials: 'SMC', code: 'CR-SMC-0318191303' },
  { index: 13, name: 'Navluru Railway Station', initials: 'NRS', code: 'CR-NRS-0318141819' },
  { index: 14, name: 'Sanjeevini Park', initials: 'SP', code: 'CR-SP-03181916' },
  { index: 15, name: 'KMF', initials: 'KMF', code: 'CR-KMF-0318111306' },
  { index: 16, name: 'Rayapur', initials: 'R', code: 'CR-R-031818' },
  { index: 17, name: 'ISKCON Temple', initials: 'IT', code: 'CR-IT-03180920' },
  { index: 18, name: 'RTO', initials: 'RTO', code: 'CR-RTO-0318182015' },
  { index: 19, name: 'Navanagara', initials: 'N', code: 'CR-N-031814' },
  { index: 20, name: 'APMC 3rd Gate', initials: 'AG', code: 'CR-AG-0107' },
  { index: 21, name: 'Shantinikethan', initials: 'S', code: 'CR-S-031819' },
  { index: 22, name: 'Biridevarakoppa', initials: 'B', code: 'CR-B-031802' },
  { index: 23, name: 'Unakal Lake', initials: 'UL', code: 'CR-UL-03182112' },
  { index: 24, name: 'Unakal Village', initials: 'UV', code: 'CR-UV-03182122' },
  { index: 25, name: 'Unakal Cross', initials: 'UC', code: 'CR-UC-03182103' },
  { index: 26, name: 'BVB', initials: 'BVB', code: 'CR-BVB-031802022203' },
  { index: 27, name: 'Vidyanagar', initials: 'V', code: 'CR-V-031822' },
  { index: 28, name: 'KIMS', initials: 'KIMS', code: 'CR-KIMS-031811130619' },
  { index: 29, name: 'Hosur Regional Terminal', initials: 'HRT', code: 'CR-HRT-0318081820' },
  { index: 30, name: 'Hosur Cross', initials: 'HC', code: 'CR-HC-03180803' },
  { index: 31, name: 'Hubballi New Bus Stand (Gokul Bus stop)', initials: 'HNBS', code: 'CR-HNBS-031808140219' },
  { index: 32, name: 'Hubballi Central Bus Terminal', initials: 'HCBT', code: 'CR-HCBT-031808030220' },
  { index: 33, name: 'HDMC', initials: 'HDMC', code: 'CR-HDMC-031808040313' },
  { index: 34, name: 'DR. B R Ambedkar Circle', initials: 'DBRAC', code: 'CR-DBRAC-03180402180103' },
  { index: 35, name: 'Hubballi Railway Station', initials: 'HRS', code: 'CR-HRS-0318081819' },
];

/**
 * Resolves any stop name, alias, code, or query to the official authoritative station.
 */
export function resolveAuthoritativeStation(inputName: string): AuthoritativeStation {
  if (!inputName) {
    return AUTHORITATIVE_STATIONS[0];
  }
  const raw = inputName.trim();

  // 1. Direct code match (e.g. 'CR-BVB-031802022203' or 'CR-DNBS-031804140219')
  const byCode = AUTHORITATIVE_STATIONS.find(
    (s) => s.code.toLowerCase() === raw.toLowerCase()
  );
  if (byCode) return byCode;

  // 2. Exact name match (case-insensitive)
  const byExact = AUTHORITATIVE_STATIONS.find(
    (s) => s.name.toLowerCase() === raw.toLowerCase()
  );
  if (byExact) return byExact;

  const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 3. Normalized alphanumeric match
  const byNorm = AUTHORITATIVE_STATIONS.find(
    (s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean
  );
  if (byNorm) return byNorm;

  // 4. Normalized aliases and synonyms across all official stations
  if (clean.includes('bvb') || clean.includes('kletech') || clean.includes('bvbcet')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'BVB')!;
  }
  if (clean.includes('dharwadnew') || clean.includes('dnbs')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'DNBS')!;
  }
  if (clean.includes('dharwadbrts') || clean.includes('cbtdharwad') || clean.includes('dharwadcbt')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'DBT')!;
  }
  if (clean.includes('courtcircle') || clean.includes('dharwadcourt')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'CC')!;
  }
  if (clean.includes('jubilee')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'JC')!;
  }
  if (clean.includes('nttf')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'NTTF')!;
  }
  if (clean.includes('yellapur') || clean.includes('hyc')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'HYC')!;
  }
  if (clean.includes('tollnaka') || clean.includes('tn')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'TN')!;
  }
  if (clean.includes('vidyagiri')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'V' && s.name === 'Vidyagiri')!;
  }
  if (clean.includes('gandhinagar')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'G')!;
  }
  if (clean.includes('lakmanahalli') || clean.includes('lakamanahalli')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'L')!;
  }
  if (clean.includes('sdm')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'SMC')!;
  }
  if (clean.includes('sattur')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'S' && s.name === 'Sattur')!;
  }
  if (clean.includes('navalur') || clean.includes('navluru')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'NRS')!;
  }
  if (clean.includes('sanjeevini')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'SP')!;
  }
  if (clean.includes('kmf')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'KMF')!;
  }
  if (clean.includes('rayapur')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'R')!;
  }
  if (clean.includes('iskcon') || clean.includes('iskon')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'IT')!;
  }
  if (clean.includes('rto')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'RTO')!;
  }
  if (clean.includes('navanagar') || clean.includes('navanagara')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'N')!;
  }
  if (clean.includes('apmc')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'AG')!;
  }
  if (clean.includes('shantiniket')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.name === 'Shantinikethan')!;
  }
  if (clean.includes('biridevar') || clean.includes('bairidevar')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.name === 'Biridevarakoppa')!;
  }
  if (clean.includes('unkallake') || clean.includes('unakallake')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.name === 'Unakal Lake')!;
  }
  if (clean.includes('unkalcross') || clean.includes('unakalcross')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.name === 'Unakal Cross')!;
  }
  if (clean.includes('unkal') || clean.includes('unakal')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.name === 'Unakal Village')!;
  }
  if (clean.includes('vidyanagar')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'V' && s.name === 'Vidyanagar')!;
  }
  if (clean.includes('kims')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'KIMS')!;
  }
  if (clean.includes('hosurregional') || clean.includes('hrt')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'HRT')!;
  }
  if (clean.includes('hosurcross') || clean.includes('hc')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'HC')!;
  }
  if (clean.includes('gokul') || clean.includes('hnbs')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'HNBS')!;
  }
  if (clean.includes('hdmc')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'HDMC')!;
  }
  if (clean.includes('ambedkar') || clean.includes('dbrac')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'DBRAC')!;
  }
  if (clean.includes('hubballirailway') || clean.includes('hrs')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'HRS')!;
  }
  if (clean.includes('cbt') || clean.includes('hubballicentral') || clean.includes('hcbt')) {
    return AUTHORITATIVE_STATIONS.find((s) => s.initials === 'HCBT')!;
  }

  // 5. Substring matching
  const partial = AUTHORITATIVE_STATIONS.find(
    (s) =>
      clean.includes(s.name.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
      s.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(clean)
  );
  if (partial) return partial;

  // Fallback to first station if completely unrecognized
  return AUTHORITATIVE_STATIONS[0];
}

export interface SharedTicketPayloadInput {
  ticketId: string;
  fromStationName: string;
  toStationName: string;
  fare: number;
  currency?: string;
  passengerDisplayName?: string;
  status?: string;
  issuedAt: string;
  validUntil: string;
}

/**
 * Validates if a string is a well-formed Shared E-Ticket Contract v1 JSON payload.
 */
export function isSharedTicketContract(rawPayload?: string | null): boolean {
  if (!rawPayload || typeof rawPayload !== 'string') return false;
  const trimmed = rawPayload.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;
  try {
    const data = JSON.parse(trimmed);
    return (
      data.ticketVersion === 1 &&
      typeof data.ticketId === 'string' &&
      data.ticketId.trim().length > 0 &&
      Boolean(data.journey?.from?.code) &&
      Boolean(data.journey?.from?.name) &&
      Boolean(data.journey?.to?.code) &&
      Boolean(data.journey?.to?.name) &&
      typeof data.ticket?.fare === 'number' &&
      data.ticket?.currency === 'INR' &&
      Boolean(data.timing?.issuedAt) &&
      Boolean(data.timing?.expiresAt)
    );
  } catch {
    return false;
  }
}

/**
 * Builds the canonical Shared E-Ticket Contract Version 1 JSON string.
 */
export function buildSharedTicketPayload(input: SharedTicketPayloadInput): string {
  const from = resolveAuthoritativeStation(input.fromStationName);
  const to = resolveAuthoritativeStation(input.toStationName);

  const issuedDate = new Date(input.issuedAt);
  const validIssued = isNaN(issuedDate.getTime()) ? new Date() : issuedDate;

  let validExpiryDate = new Date(input.validUntil);
  if (isNaN(validExpiryDate.getTime()) || validExpiryDate.getTime() <= validIssued.getTime()) {
    validExpiryDate = new Date(validIssued.getTime() + 4 * 60 * 60 * 1000); // 4 hours standard validity
  }

  const rawFare = input.fare;
  const numericFare = typeof rawFare === 'number' && !isNaN(rawFare)
    ? Math.max(0, rawFare)
    : parseFloat(String(rawFare)) || 25.0;

  const rawStatus = (input.status || 'active').trim().toLowerCase();
  const normalizedStatus =
    rawStatus === 'valid'
      ? 'active'
      : rawStatus === 'used' || rawStatus === 'already_used'
      ? 'used'
      : rawStatus === 'expired'
      ? 'expired'
      : rawStatus === 'cancelled' || rawStatus === 'canceled'
      ? 'cancelled'
      : 'active';

  const payload = {
    ticketVersion: 1,
    ticketId: input.ticketId,
    passenger: {
      displayName: input.passengerDisplayName?.trim() || 'Passenger',
    },
    journey: {
      from: {
        name: from.name,
        code: from.code,
      },
      to: {
        name: to.name,
        code: to.code,
      },
    },
    ticket: {
      fare: numericFare,
      currency: 'INR',
      status: normalizedStatus,
    },
    timing: {
      issuedAt: validIssued.toISOString(),
      expiresAt: validExpiryDate.toISOString(),
    },
  };

  return JSON.stringify(payload);
}

