import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChigariScannedTicket } from '@/types/ticket';

const SCANNED_TICKETS_STORAGE_KEY = '@chigari_scanned_tickets';
const LATEST_SCANNED_TICKET_KEY = '@chigari_latest_scanned_ticket';

export async function saveScannedTicket(ticket: ChigariScannedTicket): Promise<void> {
  try {
    // Save as latest
    await AsyncStorage.setItem(LATEST_SCANNED_TICKET_KEY, JSON.stringify(ticket));

    // Append to list (deduplicating by ticketId)
    const existingRaw = await AsyncStorage.getItem(SCANNED_TICKETS_STORAGE_KEY);
    const existing: ChigariScannedTicket[] = existingRaw ? JSON.parse(existingRaw) : [];
    const filtered = existing.filter((t) => t.ticketId !== ticket.ticketId);
    const updated = [ticket, ...filtered].slice(0, 30); // keep up to 30 recent tickets

    await AsyncStorage.setItem(SCANNED_TICKETS_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('[ticketScanner] Error saving scanned ticket to storage:', error);
  }
}

export async function getLatestScannedTicket(): Promise<ChigariScannedTicket | null> {
  try {
    const raw = await AsyncStorage.getItem(LATEST_SCANNED_TICKET_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getScannedTickets(): Promise<ChigariScannedTicket[]> {
  try {
    const raw = await AsyncStorage.getItem(SCANNED_TICKETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
