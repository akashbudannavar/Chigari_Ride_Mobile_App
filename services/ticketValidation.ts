import type { ChigariScannedTicket } from '@/types/ticket';
import {
  parseChigariTicket,
  toChigariScannedTicket,
  NWKRTC_REFERENCE_TICKET_HEX,
} from '@/services/chigariTicketParser';

import { journeyStateManager } from '@/services/ticketJourneyLifecycle';

/**
 * Validates a raw QR string scanned from a ticket.
 * Delegates to parseChigariTicket which supports:
 * - Format A: JSON Demo QR payload
 * - Format B: Official NWKRTC Platform 7 AFCS Hex QR code (physical ticket)
 * - Format C: Delimited plain text (pipe, comma, semicolon)
 * - Format D: Structured key-value text
 * - Format E: URL / query parameters
 */
export function validateTicketQR(
  rawPayload: string,
): { success: true; ticket: ChigariScannedTicket } | { success: false; error: string } {
  if (!rawPayload || typeof rawPayload !== 'string' || !rawPayload.trim()) {
    return {
      success: false,
      error: 'Invalid QR code. Please scan a valid Chigari ticket QR code.',
    };
  }

  const parsed = parseChigariTicket(rawPayload);

  if (parsed.isRecognized) {
    const ticket = toChigariScannedTicket(parsed);

    // Enrich with central journey lifecycle state if present
    const record = journeyStateManager.getRecord(ticket.ticketId);
    if (record) {
      ticket.journeyState = record.state;
      ticket.entryStationName = record.entryStationName;
      ticket.exitStationName = record.exitStationName;
      if (record.state === 'BOARDED') {
        ticket.status = 'Boarded';
        ticket.validityStatus = 'BOARDED';
      } else if (record.state === 'EXITED') {
        ticket.status = 'Completed';
        ticket.validityStatus = 'COMPLETED';
      } else if (record.state === 'EXPIRED') {
        ticket.status = 'Expired';
        ticket.validityStatus = 'EXPIRED';
      }
    }

    return { success: true, ticket };
  }

  return {
    success: false,
    error: parsed.statusReason || 'Invalid Chigari Ticket. The scanned QR code is not recognized as a valid Chigari ticket.',
  };
}

/**
 * Pre-defined demonstration tickets for seamless testing in demo mode.
 * Includes the physical NWKRTC / Platform 7 reference ticket (S.No 527537) and active demo tickets.
 */
export const DEMO_TICKETS: ChigariScannedTicket[] = [
  {
    type: 'CHIGARI_TICKET',
    ticketId: '527537',
    serialNumber: '527537',
    fromStopId: 'hdbrts-stop-35',
    toStopId: 'hdbrts-stop-02',
    fromStopName: 'Hubballi CBT',
    toStopName: 'Dharwad BRTS Terminal',
    fare: 22.0,
    fareFormatted: '₹22.00',
    currency: 'INR',
    ticketType: 'Adult Ticket',
    issuedAt: '2019-07-03T06:48:00.000Z',
    issuedAtFormatted: '03 Jul 2019 • 06:48 AM',
    validUntil: '2019-07-03T10:48:00.000Z',
    status: 'Expired',
    validityStatus: 'EXPIRED',
    statusReason: 'This ticket is no longer valid for travel.',
    operatorId: 'P015',
    format: 'NWKRTC_PLATFORM7_HEX',
    rawPayload: NWKRTC_REFERENCE_TICKET_HEX,
  },
  {
    type: 'CHIGARI_TICKET',
    ticketId: 'CHR-DEMO-001',
    fromStopId: 'hdbrts-stop-35',
    toStopId: 'hdbrts-stop-02',
    fromStopName: 'Hubballi CBT',
    toStopName: 'Dharwad BRTS Terminal',
    fare: 30,
    fareFormatted: '₹30.00',
    currency: 'INR',
    ticketType: 'Single Journey',
    issuedAt: new Date().toISOString(),
    issuedAtFormatted: 'Today • Just now',
    validUntil: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    status: 'Valid',
    validityStatus: 'VALID',
  },
  {
    type: 'CHIGARI_TICKET',
    ticketId: 'CHR-DEMO-002',
    fromStopId: 'hdbrts-stop-30',
    toStopId: 'hdbrts-stop-35',
    fromStopName: 'Hosur Cross',
    toStopName: 'Hubballi CBT',
    fare: 10,
    fareFormatted: '₹10.00',
    currency: 'INR',
    ticketType: 'Single Journey',
    issuedAt: new Date().toISOString(),
    issuedAtFormatted: 'Today • Just now',
    validUntil: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    status: 'Valid',
    validityStatus: 'VALID',
  },
  {
    type: 'CHIGARI_TICKET',
    ticketId: 'CHR-DEMO-003',
    fromStopId: 'hdbrts-stop-26',
    toStopId: 'hdbrts-stop-02',
    fromStopName: 'BVB',
    toStopName: 'Dharwad BRTS Terminal',
    fare: 20,
    fareFormatted: '₹20.00',
    currency: 'INR',
    ticketType: 'Single Journey',
    issuedAt: new Date().toISOString(),
    issuedAtFormatted: 'Today • Just now',
    validUntil: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    status: 'Valid',
    validityStatus: 'VALID',
  },
  {
    type: 'CHIGARI_TICKET',
    ticketId: 'CHR-DEMO-004',
    fromStopId: 'hdbrts-stop-08',
    toStopId: 'hdbrts-stop-35',
    fromStopName: 'Vidyagiri',
    toStopName: 'Hubballi CBT',
    fare: 25,
    fareFormatted: '₹25.00',
    currency: 'INR',
    ticketType: 'Return Service',
    issuedAt: new Date().toISOString(),
    issuedAtFormatted: 'Today • Just now',
    validUntil: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    status: 'Valid',
    validityStatus: 'VALID',
  },
];

export function encodeTicketQR(ticket: ChigariScannedTicket): string {
  if (ticket.rawPayload) {
    return ticket.rawPayload;
  }
  return JSON.stringify({
    type: ticket.type,
    ticketId: ticket.ticketId,
    fromStopId: ticket.fromStopId,
    toStopId: ticket.toStopId,
    fromStopName: ticket.fromStopName,
    toStopName: ticket.toStopName,
    fare: ticket.fare,
    currency: ticket.currency,
    ticketType: ticket.ticketType,
    issuedAt: ticket.issuedAt,
    validUntil: ticket.validUntil,
  });
}

