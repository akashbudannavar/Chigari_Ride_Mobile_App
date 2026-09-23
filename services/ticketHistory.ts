import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChigariScannedTicket } from '@/types/ticket';

export interface DigitalTicket {
  ticketId: string;
  fromStationId: string;
  fromStationName: string;
  toStationId: string;
  toStationName: string;
  fare: number;
  ticketType: 'Adult' | 'Student' | 'Senior';
  issuedAt: string; // ISO 8601 string
  validUntil: string; // ISO 8601 string
  status: 'VALID' | 'EXPIRED' | 'USED' | 'IN_JOURNEY' | 'BOARDED' | 'EXITED';
  routeNumber: string;
  routeName: string;
  durationMinutes: number;
  distanceKm: number;
  qrPayload?: string;
  journeyState?: 'ACTIVE' | 'BOARDED' | 'EXITED' | 'EXPIRED' | 'CANCELLED';
  entryStationName?: string;
  entryValidatedAt?: string;
  exitStationName?: string;
  exitValidatedAt?: string;
}

const DIGITAL_TICKETS_STORAGE_KEY = '@chigari_digital_tickets';
const LATEST_DIGITAL_TICKET_KEY = '@chigari_latest_digital_ticket';

import { supabase } from '@/lib/supabase';
import {
  registerTicketJourneyRecord,
  type TicketJourneyRecord,
} from '@/services/ticketJourneyLifecycle';
import { resolveAuthoritativeStation } from '@/services/sharedTicketContract';

/**
 * Saves a newly generated digital ticket to AsyncStorage and syncs to Supabase if authenticated.
 */
export async function saveDigitalTicket(ticket: DigitalTicket): Promise<void> {
  try {
    // 1. Always save locally first (ensures offline reliability)
    await AsyncStorage.setItem(LATEST_DIGITAL_TICKET_KEY, JSON.stringify(ticket));

    const existingRaw = await AsyncStorage.getItem(DIGITAL_TICKETS_STORAGE_KEY);
    const existing: DigitalTicket[] = existingRaw ? JSON.parse(existingRaw) : [];
    const filtered = existing.filter((t) => t.ticketId !== ticket.ticketId);
    const updated = [ticket, ...filtered].slice(0, 50);

    await AsyncStorage.setItem(DIGITAL_TICKETS_STORAGE_KEY, JSON.stringify(updated));

    // Initialize or register central journey record
    try {
      const fromAuth = resolveAuthoritativeStation(ticket.fromStationName);
      const toAuth = resolveAuthoritativeStation(ticket.toStationName);
      const journeyRecord: TicketJourneyRecord = {
        ticketId: ticket.ticketId,
        fromStationCode: fromAuth.code,
        fromStationName: fromAuth.name,
        toStationCode: toAuth.code,
        toStationName: toAuth.name,
        fare: ticket.fare,
        currency: 'INR',
        issuedAt: ticket.issuedAt,
        expiresAt: ticket.validUntil,
        state: ticket.journeyState || (ticket.status === 'EXPIRED' ? 'EXPIRED' : ticket.status === 'BOARDED' ? 'BOARDED' : ticket.status === 'EXITED' ? 'EXITED' : 'ACTIVE'),
        entryStatus: ticket.status === 'BOARDED' || ticket.status === 'EXITED' ? 'BOARDED' : 'NOT_ENTERED',
        entryStationName: ticket.entryStationName,
        entryValidatedAt: ticket.entryValidatedAt,
        exitStatus: ticket.status === 'EXITED' ? 'EXITED' : 'NOT_EXITED',
        exitStationName: ticket.exitStationName,
        exitValidatedAt: ticket.exitValidatedAt,
      };
      await registerTicketJourneyRecord(journeyRecord);
    } catch (jErr) {
      console.warn('[ticketHistory] Failed to register journey lifecycle record:', jErr);
    }

    // 2. Best-effort online sync to Supabase if logged in
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('tickets').upsert({
          id: ticket.ticketId,
          user_id: session.user.id,
          from_stop_id: ticket.fromStationId,
          from_stop_name: ticket.fromStationName,
          to_stop_id: ticket.toStationId,
          to_stop_name: ticket.toStationName,
          fare: ticket.fare,
          ticket_type: ticket.ticketType,
          status: ticket.status,
          route_number: ticket.routeNumber,
          route_name: ticket.routeName,
          issued_at: ticket.issuedAt,
          valid_until: ticket.validUntil,
          qr_payload: ticket.qrPayload,
        }, { onConflict: 'id' });
      }
    } catch (syncErr) {
      // Offline fallback: ignore network error
      console.log('[ticketHistory] Offline mode: saved locally');
    }
  } catch (error) {
    console.warn('[ticketHistory] Error saving digital ticket to storage:', error);
  }
}

/**
 * Updates the status of an existing digital ticket in AsyncStorage and Supabase.
 */
export async function updateDigitalTicketStatus(
  ticketId: string,
  status: DigitalTicket['status'],
): Promise<void> {
  try {
    const existingRaw = await AsyncStorage.getItem(DIGITAL_TICKETS_STORAGE_KEY);
    const existing: DigitalTicket[] = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = existing.map((t) => (t.ticketId === ticketId ? { ...t, status } : t));
    await AsyncStorage.setItem(DIGITAL_TICKETS_STORAGE_KEY, JSON.stringify(updated));

    const latestRaw = await AsyncStorage.getItem(LATEST_DIGITAL_TICKET_KEY);
    if (latestRaw) {
      const latest: DigitalTicket = JSON.parse(latestRaw);
      if (latest.ticketId === ticketId) {
        await AsyncStorage.setItem(LATEST_DIGITAL_TICKET_KEY, JSON.stringify({ ...latest, status }));
      }
    }

    // Best-effort online update
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('tickets').update({ status }).eq('id', ticketId);
      }
    } catch {}
  } catch (error) {
    console.warn('[ticketHistory] Error updating digital ticket status:', error);
  }
}

/**
 * Retrieves all stored digital tickets from AsyncStorage.
 */
export async function getDigitalTickets(): Promise<DigitalTicket[]> {
  try {
    const raw = await AsyncStorage.getItem(DIGITAL_TICKETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('[ticketHistory] Error retrieving digital tickets:', error);
    return [];
  }
}

/**
 * Retrieves the most recent digital ticket from AsyncStorage.
 */
export async function getLatestDigitalTicket(): Promise<DigitalTicket | null> {
  try {
    const raw = await AsyncStorage.getItem(LATEST_DIGITAL_TICKET_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Converts a DigitalTicket to ChigariScannedTicket for interoperability with JourneyContext.
 */
export function digitalTicketToScannedTicket(dt: DigitalTicket): ChigariScannedTicket {
  const isTimeValid = new Date(dt.validUntil).getTime() > Date.now();
  const isValid = (dt.status === 'VALID' || dt.status === 'IN_JOURNEY') && isTimeValid;

  return {
    type: 'CHIGARI_TICKET',
    ticketId: dt.ticketId,
    fromStopId: dt.fromStationId,
    toStopId: dt.toStationId,
    fromStopName: dt.fromStationName,
    toStopName: dt.toStationName,
    fare: dt.fare,
    currency: 'INR',
    ticketType: dt.ticketType || 'Adult',
    issuedAt: dt.issuedAt,
    validUntil: dt.validUntil,
    status: isValid ? 'Valid' : dt.status === 'USED' ? 'Invalid' : 'Expired',
    validityStatus: isValid ? 'VALID' : dt.status === 'USED' ? 'INVALID' : 'EXPIRED',
    rawPayload: dt.qrPayload,
    fareFormatted: `₹${dt.fare.toFixed(2)}`,
  };
}
