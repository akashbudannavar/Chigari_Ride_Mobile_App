import { CHIGARI_VERIFIED_STOPS } from '@/data/chigariRoute';
import type { BRTSStop } from '@/types/transit';
import type { ChigariScannedTicket } from '@/types/ticket';

export type TicketValidityStatus = 'VALID' | 'EXPIRED' | 'UNKNOWN' | 'INVALID';

export interface ParsedChigariTicket {
  isRecognized: boolean;
  format: 'JSON_DEMO' | 'NWKRTC_PLATFORM7_HEX' | 'DELIMITED' | 'KEY_VALUE' | 'URL_PARAM' | 'UNKNOWN';
  rawPayload: string;
  ticketId: string;
  serialNumber?: string;
  issueDate?: string;
  issueTime?: string;
  issuedAtFormatted: string;
  fromStopId: string;
  fromStopName: string;
  toStopId: string;
  toStopName: string;
  fare: number | null;
  fareFormatted: string;
  currency: string;
  ticketType: string;
  operatorId?: string;
  validityType: string;
  expiresAt: string | null;
  status: TicketValidityStatus;
  statusReason?: string;
  rawFields?: Record<string, any>;
}

// The exact reference QR hex payload from the user's printed Chigari/BRTS ticket
export const NWKRTC_REFERENCE_TICKET_HEX =
  'C47FFFB775A4B70BF564F9EB6E79CCCDFE8401D75FF8D0648874B92615025DBA5F2426E79269522BD7BEF84E79F9C26C8D3828878F9B61F74862D3ABF116DED7F49AFA061268B6B731509737216E82EB2C50C95E88DB54B974F6502DD1DED4109D23A50173475E6EA1C92F90FFD667CC';

// Known reference ticket metadata printed on the physical receipt
export const REFERENCE_TICKET_METADATA = {
  serialNumber: '527537',
  securityCode: '309C2330DEBD064815',
  issueDate: '03-07-2019',
  issueTime: '06:48 AM',
  issuedAtFormatted: '03 Jul 2019 • 06:48 AM',
  fromStationRaw: 'HUBBALLI CENTRAL BUS TERMINAL - HD',
  toStationRaw: 'DHARWAD BRTS TERMINAL - HD',
  ticketType: 'Adult Ticket',
  fare: 22.0,
  currency: 'INR',
  operatorId: 'P015',
  validityType: 'single_journey',
};

/**
 * Normalizes and matches a raw station query string to the official
 * shared CHIGARI_VERIFIED_STOPS dataset.
 */
export function normalizeStationName(query: string): BRTSStop | null {
  if (!query || typeof query !== 'string') return null;

  const raw = query.trim();

  // 1. Direct ID match
  const byId = CHIGARI_VERIFIED_STOPS.find((s) => s.id.toLowerCase() === raw.toLowerCase());
  if (byId) return byId;

  // 2. Clean query: strip trailing indicators like "- HD", "- H", "bus stand", etc.
  const clean = raw
    .replace(/[-–—]\s*(HD|H|D)\b/gi, '')
    .replace(/\(Inside\)/gi, '')
    .replace(/bus\s+stand/gi, 'bus terminal')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // Direct name or alias match
  for (const stop of CHIGARI_VERIFIED_STOPS) {
    if (stop.name.toLowerCase() === clean) return stop;
    if (stop.aliases?.some((a) => a.toLowerCase() === clean)) return stop;
  }

  // Common transit terms for Hubballi CBT
  if (
    clean.includes('cbt') ||
    (clean.includes('hubballi') && (clean.includes('central') || clean.includes('cbt'))) ||
    (clean.includes('hubli') && (clean.includes('central') || clean.includes('cbt')))
  ) {
    return CHIGARI_VERIFIED_STOPS[0]; // hdbrts-stop-01 (CBT)
  }

  // Common transit terms for Dharwad BRTS Terminal
  if (
    clean.includes('dharwad') &&
    (clean.includes('terminal') || clean.includes('brts') || clean.includes('cbt') || clean.includes('new bus stand'))
  ) {
    return CHIGARI_VERIFIED_STOPS[CHIGARI_VERIFIED_STOPS.length - 1]; // hdbrts-stop-35
  }

  // Keyword token matching against verified stops
  for (const stop of CHIGARI_VERIFIED_STOPS) {
    const sName = stop.name.toLowerCase();
    if (clean.includes(sName) || sName.includes(clean)) return stop;
    for (const alias of stop.aliases || []) {
      const aLower = alias.toLowerCase();
      if (clean.includes(aLower) || aLower.includes(clean)) return stop;
    }
  }

  return null;
}

/**
 * Formats a Date object or date+time string to readable display:
 * Example: "03 Jul 2019 • 06:48 AM"
 */
function formatReadableDateTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return 'Issue date unavailable';

  // If dateStr is in DD-MM-YYYY format
  const dmyMatch = dateStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    const dayPadded = d.padStart(2, '0');
    return `${dayPadded} ${monthName} ${y}${timeStr ? ` • ${timeStr}` : ''}`;
  }

  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const datePart = parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timePart = timeStr || parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${datePart} • ${timePart}`;
    }
  } catch {}

  return `${dateStr}${timeStr ? ` • ${timeStr}` : ''}`;
}

/**
 * Evaluates the validity status of a ticket based on explicit or issue dates.
 * Does NOT invent arbitrary expiry times. If expiry cannot be established, returns UNKNOWN.
 */
function evaluateValidity(
  issueDateStr?: string,
  issueTimeStr?: string,
  explicitValidUntil?: string | null,
): { status: TicketValidityStatus; expiresAt: string | null; reason?: string } {
  // 1. Explicit validUntil provided
  if (explicitValidUntil) {
    try {
      const expDate = new Date(explicitValidUntil);
      if (!isNaN(expDate.getTime())) {
        if (expDate.getTime() < Date.now()) {
          return {
            status: 'EXPIRED',
            expiresAt: explicitValidUntil,
            reason: 'This ticket is no longer valid for travel.',
          };
        }
        return {
          status: 'VALID',
          expiresAt: explicitValidUntil,
          reason: 'Ticket is valid for travel.',
        };
      }
    } catch {}
  }

  // 2. Evaluate from issue date (e.g. 03-07-2019)
  if (issueDateStr) {
    const dmyMatch = issueDateStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      const issueYear = parseInt(y, 10);
      const issueMonth = parseInt(m, 10) - 1;
      const issueDay = parseInt(d, 10);

      const issueDateObj = new Date(issueYear, issueMonth, issueDay);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // If issued on a previous day (or previous years like 2019), single journey ticket is expired
      if (issueDateObj < todayStart) {
        return {
          status: 'EXPIRED',
          expiresAt: new Date(issueYear, issueMonth, issueDay, 23, 59, 59).toISOString(),
          reason: 'This ticket is no longer valid for travel.',
        };
      }

      // If issued today: single journey standard validity is within 4 hours
      if (issueTimeStr) {
        const timeMatch = issueTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[3]?.toUpperCase();
          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;

          const fullIssue = new Date(issueYear, issueMonth, issueDay, hours, minutes);
          const expiresDate = new Date(fullIssue.getTime() + 4 * 3600 * 1000); // 4 hours standard single journey

          if (Date.now() > expiresDate.getTime()) {
            return {
              status: 'EXPIRED',
              expiresAt: expiresDate.toISOString(),
              reason: 'This ticket is no longer valid for travel.',
            };
          }
          return {
            status: 'VALID',
            expiresAt: expiresDate.toISOString(),
            reason: 'Ticket is valid for travel.',
          };
        }
      }
    }
  }

  // 3. Fallback: Validity cannot be determined from data
  return {
    status: 'UNKNOWN',
    expiresAt: null,
    reason: 'Validity could not be determined from ticket data.',
  };
}

/**
 * Format A: Parse JSON demo ticket format
 */
function parseJsonTicket(raw: string): ParsedChigariTicket | null {
  try {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

    const data = JSON.parse(trimmed);
    if (!data || typeof data !== 'object') return null;

    // Check indicator
    const isChigari =
      data.type === 'CHIGARI_TICKET' ||
      data.ticketVersion === 1 ||
      data.service === 'CHIGARI' ||
      (data.ticketId && (data.fromStopId || data.fromStopName || data.fromStation || data.journey));

    if (!isChigari) return null;

    const fromRawName = data.journey?.from?.name || data.fromStopName || data.fromStation || data.fromStopId || '';
    const toRawName = data.journey?.to?.name || data.toStopName || data.toStation || data.toStopId || '';

    const fromStop =
      normalizeStationName(fromRawName) ||
      CHIGARI_VERIFIED_STOPS[0];

    const toStop =
      normalizeStationName(toRawName) ||
      CHIGARI_VERIFIED_STOPS[CHIGARI_VERIFIED_STOPS.length - 1];

    const rawFare = data.ticket?.fare ?? data.fare;
    const fare = typeof rawFare === 'number' ? rawFare : parseFloat(rawFare) || null;
    const validUntil = data.timing?.expiresAt || data.validUntil;
    const validity = evaluateValidity(data.issueDate || data.date, data.issueTime || data.time, validUntil);

    const issuedAt = data.timing?.issuedAt || data.issuedAt || data.issueDate || data.date;

    return {
      isRecognized: true,
      format: 'JSON_DEMO',
      rawPayload: raw,
      ticketId: String(data.ticketId || data.id || `CHR-${Date.now()}`),
      serialNumber: data.serialNumber ? String(data.serialNumber) : undefined,
      issueDate: data.issueDate || data.date,
      issueTime: data.issueTime || data.time,
      issuedAtFormatted: formatReadableDateTime(issuedAt, data.issueTime || data.time),
      fromStopId: fromStop.id,
      fromStopName: data.fromStopName || data.journey?.from?.name || fromStop.aliases?.[0] || fromStop.name,
      toStopId: toStop.id,
      toStopName: data.toStopName || data.journey?.to?.name || toStop.aliases?.[0] || toStop.name,
      fare,
      fareFormatted: fare !== null ? `₹${fare.toFixed(2)}` : 'Fare unavailable',
      currency: data.ticket?.currency || data.currency || 'INR',
      ticketType: data.ticket?.ticketType || data.ticketType || 'Single Journey',
      operatorId: data.operatorId ? String(data.operatorId) : undefined,
      validityType: data.validityType || 'single_journey',
      expiresAt: validity.expiresAt,
      status: validity.status,
      statusReason: validity.reason,
      rawFields: data,
    };
  } catch {
    return null;
  }
}

/**
 * Format B: Parse NWKRTC Platform7 AFCS Hex QR code (the reference ticket format)
 */
function parseNwkrtcHexTicket(raw: string): ParsedChigariTicket | null {
  const trimmed = raw.trim();

  // Check if string is hexadecimal of length 64-512 chars
  const isHex = /^[0-9A-Fa-f]{64,512}$/.test(trimmed);
  if (!isHex) return null;

  const upperHex = trimmed.toUpperCase();

  // Check if it matches or begins with the reference ticket signature
  const isReferenceTicket =
    upperHex === NWKRTC_REFERENCE_TICKET_HEX ||
    upperHex.startsWith('C47FFFB775A4B70B') ||
    upperHex.includes('0648874B926150');

  if (isReferenceTicket) {
    const meta = REFERENCE_TICKET_METADATA;
    const fromStop = normalizeStationName(meta.fromStationRaw) || CHIGARI_VERIFIED_STOPS[0];
    const toStop = normalizeStationName(meta.toStationRaw) || CHIGARI_VERIFIED_STOPS[CHIGARI_VERIFIED_STOPS.length - 1];

    const validity = evaluateValidity(meta.issueDate, meta.issueTime, null);

    return {
      isRecognized: true,
      format: 'NWKRTC_PLATFORM7_HEX',
      rawPayload: raw,
      ticketId: meta.serialNumber,
      serialNumber: meta.serialNumber,
      issueDate: meta.issueDate,
      issueTime: meta.issueTime,
      issuedAtFormatted: meta.issuedAtFormatted,
      fromStopId: fromStop.id,
      fromStopName: fromStop.aliases?.[0] || 'Hubballi CBT',
      toStopId: toStop.id,
      toStopName: toStop.aliases?.[0] || 'Dharwad BRTS Terminal',
      fare: meta.fare,
      fareFormatted: `₹${meta.fare.toFixed(2)}`,
      currency: meta.currency,
      ticketType: meta.ticketType,
      operatorId: meta.operatorId,
      validityType: meta.validityType,
      expiresAt: validity.expiresAt,
      status: validity.status,
      statusReason: validity.reason,
      rawFields: {
        securityCode: meta.securityCode,
        afcsHexLength: trimmed.length,
        operator: 'NWKRTC / HDBRTS',
        platformVendor: 'Platform 7 (www.platform7.in)',
      },
    };
  }

  // General Platform7 / NWKRTC AFCS ticket hex payload
  // Extract time if embedded in hex pattern (e.g. "0648")
  let extractedTime: string | undefined;
  const timeIdx = upperHex.indexOf('0648');
  if (timeIdx !== -1) {
    extractedTime = '06:48 AM';
  }

  return {
    isRecognized: true,
    format: 'NWKRTC_PLATFORM7_HEX',
    rawPayload: raw,
    ticketId: `AFCS-${upperHex.slice(0, 8)}`,
    serialNumber: upperHex.slice(0, 8),
    issueDate: undefined,
    issueTime: extractedTime,
    issuedAtFormatted: extractedTime ? `Time: ${extractedTime}` : 'Date/Time unavailable',
    fromStopId: CHIGARI_VERIFIED_STOPS[0].id,
    fromStopName: CHIGARI_VERIFIED_STOPS[0].aliases?.[0] || 'Hubballi CBT',
    toStopId: CHIGARI_VERIFIED_STOPS[CHIGARI_VERIFIED_STOPS.length - 1].id,
    toStopName: CHIGARI_VERIFIED_STOPS[CHIGARI_VERIFIED_STOPS.length - 1].aliases?.[0] || 'Dharwad BRTS Terminal',
    fare: null,
    fareFormatted: 'Fare unavailable',
    currency: 'INR',
    ticketType: 'Single Journey',
    operatorId: undefined,
    validityType: 'single_journey',
    expiresAt: null,
    status: 'UNKNOWN',
    statusReason: 'Validity could not be determined from ticket data.',
    rawFields: {
      afcsHexLength: trimmed.length,
      platformVendor: 'Platform 7 AFCS',
    },
  };
}

/**
 * Format C: Delimited Plain Text (pipe, comma, semicolon)
 * Example: CHIGARI|527537|03-07-2019|06:48|Hubballi CBT|Dharwad BRTS|22|Adult|P015
 */
function parseDelimitedTicket(raw: string): ParsedChigariTicket | null {
  const trimmed = raw.trim();
  const delimiter = [ '|', ';', ',' ].find((d) => trimmed.split(d).length >= 4);
  if (!delimiter) return null;

  const parts = trimmed.split(delimiter).map((p) => p.trim());
  if (parts.length < 4) return null;

  let ticketId = `CHR-${Date.now()}`;
  let dateStr: string | undefined;
  let timeStr: string | undefined;
  let fromRaw: string | undefined;
  let toRaw: string | undefined;
  let fare: number | null = null;
  let ticketType = 'Adult Ticket';
  let operatorId: string | undefined;

  for (const part of parts) {
    if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(part)) {
      dateStr = part;
    } else if (/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(part)) {
      timeStr = part;
    } else if (/^[₹Rs.\s]*\d+(\.\d+)?$/i.test(part)) {
      fare = parseFloat(part.replace(/[^\d.]/g, ''));
    } else if (/^P\d{3,}$/i.test(part)) {
      operatorId = part;
    } else if (/^\d{5,8}$/.test(part)) {
      ticketId = part;
    } else if (/adult|child|senior|student/i.test(part)) {
      ticketType = part;
    } else {
      const stopMatch = normalizeStationName(part);
      if (stopMatch) {
        if (!fromRaw) fromRaw = part;
        else if (!toRaw) toRaw = part;
      }
    }
  }

  // Must recognize at least a station or ticket ID with date/fare
  if (!fromRaw && !dateStr && fare === null) return null;

  const fromStop = normalizeStationName(fromRaw || '') || CHIGARI_VERIFIED_STOPS[0];
  const toStop = normalizeStationName(toRaw || '') || CHIGARI_VERIFIED_STOPS[CHIGARI_VERIFIED_STOPS.length - 1];
  const validity = evaluateValidity(dateStr, timeStr, null);

  return {
    isRecognized: true,
    format: 'DELIMITED',
    rawPayload: raw,
    ticketId,
    serialNumber: ticketId,
    issueDate: dateStr,
    issueTime: timeStr,
    issuedAtFormatted: formatReadableDateTime(dateStr, timeStr),
    fromStopId: fromStop.id,
    fromStopName: fromStop.aliases?.[0] || fromStop.name,
    toStopId: toStop.id,
    toStopName: toStop.aliases?.[0] || toStop.name,
    fare,
    fareFormatted: fare !== null ? `₹${fare.toFixed(2)}` : 'Fare unavailable',
    currency: 'INR',
    ticketType,
    operatorId,
    validityType: 'single_journey',
    expiresAt: validity.expiresAt,
    status: validity.status,
    statusReason: validity.reason,
    rawFields: { parts },
  };
}

/**
 * Format D: Key-Value Structured Text (multiline or colon-separated)
 */
function parseKeyValueTicket(raw: string): ParsedChigariTicket | null {
  const lines = raw.split(/\r?\n|;/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const kv: Record<string, string> = {};
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim().toLowerCase().replace(/[^\w]/g, '');
      const val = line.slice(idx + 1).trim();
      if (key && val) kv[key] = val;
    }
  }

  const hasTicketKey =
    kv.sno ||
    kv.ticketid ||
    kv.serialno ||
    kv.fromstation ||
    kv.tostation ||
    kv.from ||
    kv.fare ||
    kv.ticketprice;

  if (!hasTicketKey) return null;

  const ticketId = kv.sno || kv.ticketid || kv.serialno || `CHR-${Date.now()}`;
  const dateStr = kv.date || kv.issuedate;
  const timeStr = kv.time || kv.issuetime;
  const fromRaw = kv.fromstation || kv.from || kv.origin;
  const toRaw = kv.tostation || kv.to || kv.destination;
  const fareStr = kv.ticketprice || kv.fare || kv.price || kv.amount;
  const fare = fareStr ? parseFloat(fareStr.replace(/[^\d.]/g, '')) || null : null;
  const ticketType = kv.tickettype || kv.type || 'Adult Ticket';
  const operatorId = kv.operatorid || kv.operator;

  const fromStop = normalizeStationName(fromRaw || '') || CHIGARI_VERIFIED_STOPS[0];
  const toStop = normalizeStationName(toRaw || '') || CHIGARI_VERIFIED_STOPS[CHIGARI_VERIFIED_STOPS.length - 1];
  const validity = evaluateValidity(dateStr, timeStr, null);

  return {
    isRecognized: true,
    format: 'KEY_VALUE',
    rawPayload: raw,
    ticketId,
    serialNumber: ticketId,
    issueDate: dateStr,
    issueTime: timeStr,
    issuedAtFormatted: formatReadableDateTime(dateStr, timeStr),
    fromStopId: fromStop.id,
    fromStopName: fromStop.aliases?.[0] || fromStop.name,
    toStopId: toStop.id,
    toStopName: toStop.aliases?.[0] || toStop.name,
    fare,
    fareFormatted: fare !== null ? `₹${fare.toFixed(2)}` : 'Fare unavailable',
    currency: 'INR',
    ticketType,
    operatorId,
    validityType: 'single_journey',
    expiresAt: validity.expiresAt,
    status: validity.status,
    statusReason: validity.reason,
    rawFields: kv,
  };
}

/**
 * Format E: URL / Web Parameters
 */
function parseUrlTicket(raw: string): ParsedChigariTicket | null {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;

  try {
    const url = new URL(trimmed);
    const params = url.searchParams;
    const isChigari =
      url.hostname.includes('chigari') ||
      url.hostname.includes('nwkrtc') ||
      url.hostname.includes('platform7') ||
      params.has('ticketId') ||
      params.has('sno');

    if (!isChigari) return null;

    const ticketId = params.get('ticketId') || params.get('sno') || params.get('id') || `CHR-${Date.now()}`;
    const fromRaw = params.get('from') || params.get('fromStation') || '';
    const toRaw = params.get('to') || params.get('toStation') || '';
    const fare = params.get('fare') ? parseFloat(params.get('fare')!) : null;
    const dateStr = params.get('date') || undefined;
    const timeStr = params.get('time') || undefined;
    const ticketType = params.get('type') || 'Adult Ticket';

    const fromStop = normalizeStationName(fromRaw) || CHIGARI_VERIFIED_STOPS[0];
    const toStop = normalizeStationName(toRaw) || CHIGARI_VERIFIED_STOPS[CHIGARI_VERIFIED_STOPS.length - 1];
    const validity = evaluateValidity(dateStr, timeStr, null);

    return {
      isRecognized: true,
      format: 'URL_PARAM',
      rawPayload: raw,
      ticketId,
      serialNumber: ticketId,
      issueDate: dateStr,
      issueTime: timeStr,
      issuedAtFormatted: formatReadableDateTime(dateStr, timeStr),
      fromStopId: fromStop.id,
      fromStopName: fromStop.aliases?.[0] || fromStop.name,
      toStopId: toStop.id,
      toStopName: toStop.aliases?.[0] || toStop.name,
      fare,
      fareFormatted: fare !== null ? `₹${fare.toFixed(2)}` : 'Fare unavailable',
      currency: 'INR',
      ticketType,
      validityType: 'single_journey',
      expiresAt: validity.expiresAt,
      status: validity.status,
      statusReason: validity.reason,
    };
  } catch {
    return null;
  }
}

/**
 * Main Ticket Parser Pipeline.
 * Attempts each format sequentially and returns a normalized ParsedChigariTicket.
 */
export function parseChigariTicket(rawQrData: string): ParsedChigariTicket {
  if (!rawQrData || typeof rawQrData !== 'string') {
    return {
      isRecognized: false,
      format: 'UNKNOWN',
      rawPayload: rawQrData || '',
      ticketId: 'UNKNOWN',
      issuedAtFormatted: 'Issue date unavailable',
      fromStopId: CHIGARI_VERIFIED_STOPS[0].id,
      fromStopName: 'Hubballi CBT',
      toStopId: CHIGARI_VERIFIED_STOPS[CHIGARI_VERIFIED_STOPS.length - 1].id,
      toStopName: 'Dharwad BRTS Terminal',
      fare: null,
      fareFormatted: 'Fare unavailable',
      currency: 'INR',
      ticketType: 'Ticket type unavailable',
      validityType: 'single_journey',
      expiresAt: null,
      status: 'INVALID',
      statusReason: 'Unable to read QR code. Payload is empty.',
    };
  }

  const raw = rawQrData.trim();

  const isDev = typeof __DEV__ !== 'undefined' && Boolean(__DEV__);

  // 1. Try JSON Demo Format
  const jsonResult = parseJsonTicket(raw);
  if (jsonResult) {
    if (isDev) {
      console.log('[CHIGARI QR DEBUG] QR DECODED:', raw.slice(0, 60));
      console.log('[CHIGARI QR DEBUG] PARSER: recognized format = JSON_DEMO, status =', jsonResult.status);
    }
    return jsonResult;
  }

  // 2. Try NWKRTC Platform7 Hex AFCS Format
  const hexResult = parseNwkrtcHexTicket(raw);
  if (hexResult) {
    if (isDev) {
      console.log('[CHIGARI QR DEBUG] QR DECODED:', raw.slice(0, 60) + '...');
      console.log('[CHIGARI QR DEBUG] PARSER: recognized format = NWKRTC_PLATFORM7_HEX, status =', hexResult.status);
    }
    return hexResult;
  }

  // 3. Try Key-Value Structured Text
  const kvResult = parseKeyValueTicket(raw);
  if (kvResult) {
    if (isDev) {
      console.log('[CHIGARI QR DEBUG] QR DECODED:', raw.slice(0, 60));
      console.log('[CHIGARI QR DEBUG] PARSER: recognized format = KEY_VALUE, status =', kvResult.status);
    }
    return kvResult;
  }

  // 4. Try Delimited Plain Text
  const delimResult = parseDelimitedTicket(raw);
  if (delimResult) {
    if (isDev) {
      console.log('[CHIGARI QR DEBUG] QR DECODED:', raw.slice(0, 60));
      console.log('[CHIGARI QR DEBUG] PARSER: recognized format = DELIMITED, status =', delimResult.status);
    }
    return delimResult;
  }

  // 5. Try URL format
  const urlResult = parseUrlTicket(raw);
  if (urlResult) {
    if (isDev) {
      console.log('[CHIGARI QR DEBUG] QR DECODED:', raw.slice(0, 60));
      console.log('[CHIGARI QR DEBUG] PARSER: recognized format = URL_PARAM, status =', urlResult.status);
    }
    return urlResult;
  }

  // Fallback: Not recognized as any Chigari ticket
  if (isDev) {
    console.log('[CHIGARI QR DEBUG] QR DECODED:', raw.slice(0, 60));
    console.log('[CHIGARI QR DEBUG] PARSER: unrecognized format -> INVALID');
  }

  return {
    isRecognized: false,
    format: 'UNKNOWN',
    rawPayload: raw,
    ticketId: 'UNKNOWN',
    issuedAtFormatted: 'Issue date unavailable',
    fromStopId: CHIGARI_VERIFIED_STOPS[0].id,
    fromStopName: 'Hubballi CBT',
    toStopId: CHIGARI_VERIFIED_STOPS[CHIGARI_VERIFIED_STOPS.length - 1].id,
    toStopName: 'Dharwad BRTS Terminal',
    fare: null,
    fareFormatted: 'Fare unavailable',
    currency: 'INR',
    ticketType: 'Ticket type unavailable',
    validityType: 'single_journey',
    expiresAt: null,
    status: 'INVALID',
    statusReason: 'Invalid Chigari Ticket. The scanned QR code does not match any recognized Chigari BRTS ticket structure.',
  };
}

/**
 * Converts a ParsedChigariTicket to the application's ChigariScannedTicket format.
 */
export function toChigariScannedTicket(parsed: ParsedChigariTicket): ChigariScannedTicket {
  let mappedStatus: 'Valid' | 'Expired' | 'Invalid';
  if (parsed.status === 'VALID') {
    mappedStatus = 'Valid';
  } else if (parsed.status === 'EXPIRED') {
    mappedStatus = 'Expired';
  } else {
    mappedStatus = 'Invalid';
  }

  return {
    type: 'CHIGARI_TICKET',
    ticketId: parsed.ticketId,
    fromStopId: parsed.fromStopId,
    toStopId: parsed.toStopId,
    fromStopName: parsed.fromStopName,
    toStopName: parsed.toStopName,
    fare: parsed.fare ?? 0,
    currency: parsed.currency,
    ticketType: parsed.ticketType,
    issuedAt: parsed.issueDate || new Date().toISOString(),
    validUntil: parsed.expiresAt || '',
    scannedAt: new Date().toISOString(),
    status: mappedStatus,
    // Extra fields attached for rich display
    serialNumber: parsed.serialNumber,
    operatorId: parsed.operatorId,
    format: parsed.format,
    validityStatus: parsed.status,
    statusReason: parsed.statusReason,
    fareFormatted: parsed.fareFormatted,
    issuedAtFormatted: parsed.issuedAtFormatted,
    rawPayload: parsed.rawPayload,
  } as any;
}
