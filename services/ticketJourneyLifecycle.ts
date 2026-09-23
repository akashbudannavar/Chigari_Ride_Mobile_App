/**
 * Ticket Journey Lifecycle & Validation Engine.
 * 
 * Implements the complete passenger journey lifecycle:
 *   ACTIVE ➔ BOARDED ➔ EXITED
 * 
 * Rules:
 * - Exactly ONE successful ENTRY scan at the FROM station.
 * - Exactly ONE successful EXIT scan at the TO station OR any permitted intermediate station.
 * - Repeated ENTRY is rejected with ALREADY BOARDED / ENTRY ALREADY USED.
 * - Repeated EXIT or exit after journey completion is rejected with ALREADY EXITED / JOURNEY ALREADY COMPLETED.
 * - EXIT before ENTRY is rejected.
 * - ENTRY or EXIT at invalid/unrelated stations is rejected.
 * - Expired and Cancelled tickets are rejected.
 * - Provides atomic single-use concurrency guards.
 * - Preserves Shared E-Ticket Contract Version 1 compatibility.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isSharedTicketContract,
  resolveAuthoritativeStation,
  type AuthoritativeStation,
} from './sharedTicketContract';
import {
  isStationPermittedForEntry,
  isStationPermittedForExit,
  getPermittedJourneyStations,
} from './routeValidationService';

export type TicketJourneyState = 'ACTIVE' | 'BOARDED' | 'EXITED' | 'EXPIRED' | 'CANCELLED';
export type EntryStatus = 'NOT_ENTERED' | 'BOARDED';
export type ExitStatus = 'NOT_EXITED' | 'EXITED';
export type ValidationOperation = 'ENTRY' | 'EXIT';

export interface TicketJourneyRecord {
  ticketId: string;
  fromStationCode: string;
  fromStationName: string;
  toStationCode: string;
  toStationName: string;
  fare: number;
  currency: string;
  issuedAt: string;
  expiresAt: string;
  state: TicketJourneyState;
  entryStatus: EntryStatus;
  entryStationCode?: string;
  entryStationName?: string;
  entryValidatedAt?: string;
  entryTerminalId?: string;
  exitStatus: ExitStatus;
  exitStationCode?: string;
  exitStationName?: string;
  exitValidatedAt?: string;
  exitTerminalId?: string;
  cancellationReason?: string;
}

export type ValidationOutcomeCode =
  | 'success'
  | 'already_boarded'
  | 'already_exited'
  | 'journey_completed'
  | 'entry_required'
  | 'invalid_origin_station'
  | 'invalid_exit_station'
  | 'ticket_expired'
  | 'ticket_cancelled'
  | 'ticket_not_found'
  | 'invalid_payload'
  | 'concurrency_conflict';

export interface ValidationEngineResult {
  isValid: boolean;
  state: TicketJourneyState;
  code: ValidationOutcomeCode;
  reason: string;
  ticketId?: string;
  fromStationName?: string;
  toStationName?: string;
  validatedStationName?: string;
  validatedAt: string;
  operation: ValidationOperation;
  record?: TicketJourneyRecord;
}

export interface ValidateOperationParams {
  rawQrPayload: string;
  operation: ValidationOperation;
  stationCode: string;
  stationName: string;
  terminalId?: string;
}

const JOURNEY_RECORDS_STORAGE_KEY = '@chigari_ticket_journey_records';

/**
 * Centralized in-memory cache and atomic concurrency lock.
 */
class JourneyStateManager {
  private records: Map<string, TicketJourneyRecord> = new Map();
  private locks: Set<string> = new Set();
  private isLoaded = false;

  async load(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const raw = await AsyncStorage.getItem(JOURNEY_RECORDS_STORAGE_KEY);
      if (raw) {
        const parsed: Record<string, TicketJourneyRecord> = JSON.parse(raw);
        for (const [id, rec] of Object.entries(parsed)) {
          this.records.set(id, rec);
        }
      }
    } catch (err) {
      console.warn('[JourneyStateManager] Failed to load journey records from storage:', err);
    } finally {
      this.isLoaded = true;
    }
  }

  async persist(): Promise<void> {
    try {
      const obj: Record<string, TicketJourneyRecord> = {};
      for (const [id, rec] of this.records.entries()) {
        obj[id] = rec;
      }
      await AsyncStorage.setItem(JOURNEY_RECORDS_STORAGE_KEY, JSON.stringify(obj));
    } catch (err) {
      console.warn('[JourneyStateManager] Failed to persist journey records:', err);
    }
  }

  getRecord(ticketId: string): TicketJourneyRecord | undefined {
    return this.records.get(ticketId);
  }

  setRecord(record: TicketJourneyRecord): void {
    this.records.set(record.ticketId, record);
  }

  /**
   * Acquires an atomic lock for a given ticket ID to enforce strict transaction
   * serialization and single-use guarantees across concurrent requests.
   */
  async withLock<T>(ticketId: string, action: () => Promise<T>): Promise<T> {
    while (this.locks.has(ticketId)) {
      // Wait for existing transaction to complete
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    this.locks.add(ticketId);
    try {
      return await action();
    } finally {
      this.locks.delete(ticketId);
    }
  }

  clear(): void {
    this.records.clear();
    this.locks.clear();
  }
}

export const journeyStateManager = new JourneyStateManager();

/**
 * Registers or updates a ticket record into the central journey state manager.
 */
export async function registerTicketJourneyRecord(record: TicketJourneyRecord): Promise<void> {
  await journeyStateManager.load();
  await journeyStateManager.withLock(record.ticketId, async () => {
    journeyStateManager.setRecord(record);
    await journeyStateManager.persist();
  });
}

/**
 * Retrieves the journey record for a ticket.
 */
export async function getTicketJourneyRecord(ticketId: string): Promise<TicketJourneyRecord | null> {
  await journeyStateManager.load();
  return journeyStateManager.getRecord(ticketId) || null;
}

/**
 * Parses a Shared E-Ticket Contract v1 payload defensively.
 */
export function parseSharedTicketJson(rawPayload: string): any | null {
  try {
    const trimmed = rawPayload.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Validates an ENTRY or EXIT operation against a ticket QR payload and authenticated terminal.
 */
export async function validateTicketOperation(
  params: ValidateOperationParams
): Promise<ValidationEngineResult> {
  await journeyStateManager.load();

  const validatedAt = new Date().toISOString();
  const { rawQrPayload, operation, stationCode, stationName, terminalId } = params;

  // 1. Guard against empty/malformed inputs
  if (!rawQrPayload || typeof rawQrPayload !== 'string' || !rawQrPayload.trim()) {
    return {
      isValid: false,
      state: 'ACTIVE',
      code: 'invalid_payload',
      reason: 'Malformed or empty QR code',
      validatedAt,
      operation,
    };
  }

  const contractData = parseSharedTicketJson(rawQrPayload);
  if (!contractData || !isSharedTicketContract(rawQrPayload)) {
    return {
      isValid: false,
      state: 'ACTIVE',
      code: 'invalid_payload',
      reason: 'Invalid or unrecognized ticket schema (requires Shared E-Ticket Contract v1)',
      validatedAt,
      operation,
    };
  }

  const ticketId: string = contractData.ticketId;
  const fromAuth = resolveAuthoritativeStation(contractData.journey?.from?.name || contractData.journey?.from?.code);
  const toAuth = resolveAuthoritativeStation(contractData.journey?.to?.name || contractData.journey?.to?.code);
  const currentStationAuth = resolveAuthoritativeStation(stationName || stationCode);

  // 2. Execute within atomic concurrency lock
  return await journeyStateManager.withLock(ticketId, async () => {
    let record = journeyStateManager.getRecord(ticketId);

    // Initialize journey record from QR identity if not yet tracked in development memory
    if (!record) {
      const initialStatus = (contractData.ticket?.status || 'active').toLowerCase();
      const isInitialCancelled = initialStatus === 'cancelled' || initialStatus === 'canceled';
      const isInitialExpired = initialStatus === 'expired';

      record = {
        ticketId,
        fromStationCode: fromAuth.code,
        fromStationName: fromAuth.name,
        toStationCode: toAuth.code,
        toStationName: toAuth.name,
        fare: contractData.ticket?.fare || 25.0,
        currency: contractData.ticket?.currency || 'INR',
        issuedAt: contractData.timing?.issuedAt || validatedAt,
        expiresAt: contractData.timing?.expiresAt || new Date(Date.now() + 4 * 3600000).toISOString(),
        state: isInitialCancelled ? 'CANCELLED' : isInitialExpired ? 'EXPIRED' : 'ACTIVE',
        entryStatus: 'NOT_ENTERED',
        exitStatus: 'NOT_EXITED',
      };
      journeyStateManager.setRecord(record);
    }

    // 3. Check Cancellation
    if (record.state === 'CANCELLED') {
      return {
        isValid: false,
        state: 'CANCELLED',
        code: 'ticket_cancelled',
        reason: 'Ticket has been cancelled',
        ticketId,
        fromStationName: record.fromStationName,
        toStationName: record.toStationName,
        validatedStationName: currentStationAuth.name,
        validatedAt,
        operation,
        record,
      };
    }

    // 4. Check Expiration
    const expiryTime = new Date(record.expiresAt).getTime();
    const nowTime = new Date(validatedAt).getTime();
    if (record.state === 'EXPIRED' || (!isNaN(expiryTime) && expiryTime <= nowTime)) {
      record.state = 'EXPIRED';
      await journeyStateManager.persist();
      return {
        isValid: false,
        state: 'EXPIRED',
        code: 'ticket_expired',
        reason: 'Ticket has expired',
        ticketId,
        fromStationName: record.fromStationName,
        toStationName: record.toStationName,
        validatedStationName: currentStationAuth.name,
        validatedAt,
        operation,
        record,
      };
    }

    // 5. OPERATION: ENTRY
    if (operation === 'ENTRY') {
      // 5a. Check if already exited / journey completed
      if (record.exitStatus === 'EXITED' || record.state === 'EXITED') {
        return {
          isValid: false,
          state: 'EXITED',
          code: 'journey_completed',
          reason: 'Journey already completed. Ticket cannot be used for entry.',
          ticketId,
          fromStationName: record.fromStationName,
          toStationName: record.toStationName,
          validatedStationName: currentStationAuth.name,
          validatedAt,
          operation,
          record,
        };
      }

      // 5b. Check if already boarded (Repeated Entry Guard)
      if (record.entryStatus === 'BOARDED' || record.state === 'BOARDED') {
        return {
          isValid: false,
          state: 'BOARDED',
          code: 'already_boarded',
          reason: `Ticket already boarded at ${record.entryStationName || record.fromStationName}. Entry already used.`,
          ticketId,
          fromStationName: record.fromStationName,
          toStationName: record.toStationName,
          validatedStationName: currentStationAuth.name,
          validatedAt,
          operation,
          record,
        };
      }

      // 5c. Station verification for ENTRY (must board at FROM origin station)
      const isPermittedOrigin = isStationPermittedForEntry(record.fromStationCode, currentStationAuth);
      if (!isPermittedOrigin) {
        return {
          isValid: false,
          state: record.state,
          code: 'invalid_origin_station',
          reason: `Ticket origin station (${record.fromStationName}) does not match current station (${currentStationAuth.name})`,
          ticketId,
          fromStationName: record.fromStationName,
          toStationName: record.toStationName,
          validatedStationName: currentStationAuth.name,
          validatedAt,
          operation,
          record,
        };
      }

      // 5d. Successful ENTRY
      record.state = 'BOARDED';
      record.entryStatus = 'BOARDED';
      record.entryStationCode = currentStationAuth.code;
      record.entryStationName = currentStationAuth.name;
      record.entryValidatedAt = validatedAt;
      record.entryTerminalId = terminalId;

      await journeyStateManager.persist();

      return {
        isValid: true,
        state: 'BOARDED',
        code: 'success',
        reason: `Entry verified successfully at ${currentStationAuth.name}. Boarding approved.`,
        ticketId,
        fromStationName: record.fromStationName,
        toStationName: record.toStationName,
        validatedStationName: currentStationAuth.name,
        validatedAt,
        operation,
        record,
      };
    }

    // 6. OPERATION: EXIT
    if (operation === 'EXIT') {
      // 6a. Check if entry occurred before exit
      if (record.entryStatus !== 'BOARDED') {
        return {
          isValid: false,
          state: record.state,
          code: 'entry_required',
          reason: 'Ticket has not been boarded. Entry scan required before exit.',
          ticketId,
          fromStationName: record.fromStationName,
          toStationName: record.toStationName,
          validatedStationName: currentStationAuth.name,
          validatedAt,
          operation,
          record,
        };
      }

      // 6b. Check if already exited (Repeated Exit Guard)
      if (record.exitStatus === 'EXITED' || record.state === 'EXITED') {
        return {
          isValid: false,
          state: 'EXITED',
          code: 'already_exited',
          reason: `Ticket journey already completed. Exited previously at ${record.exitStationName || record.toStationName}.`,
          ticketId,
          fromStationName: record.fromStationName,
          toStationName: record.toStationName,
          validatedStationName: currentStationAuth.name,
          validatedAt,
          operation,
          record,
        };
      }

      // 6c. Station verification for EXIT (TO station OR permitted intermediate station)
      const exitEvaluation = isStationPermittedForExit(
        record.fromStationCode,
        record.toStationCode,
        currentStationAuth
      );

      if (!exitEvaluation.isPermitted) {
        return {
          isValid: false,
          state: record.state,
          code: 'invalid_exit_station',
          reason: exitEvaluation.reason || `Station ${currentStationAuth.name} is not on the permitted journey route`,
          ticketId,
          fromStationName: record.fromStationName,
          toStationName: record.toStationName,
          validatedStationName: currentStationAuth.name,
          validatedAt,
          operation,
          record,
        };
      }

      // 6d. Successful EXIT
      record.state = 'EXITED';
      record.exitStatus = 'EXITED';
      record.exitStationCode = currentStationAuth.code;
      record.exitStationName = currentStationAuth.name;
      record.exitValidatedAt = validatedAt;
      record.exitTerminalId = terminalId;

      await journeyStateManager.persist();

      return {
        isValid: true,
        state: 'EXITED',
        code: 'success',
        reason: `Exit verified successfully at ${currentStationAuth.name}. Journey completed.`,
        ticketId,
        fromStationName: record.fromStationName,
        toStationName: record.toStationName,
        validatedStationName: currentStationAuth.name,
        validatedAt,
        operation,
        record,
      };
    }

    return {
      isValid: false,
      state: record.state,
      code: 'invalid_payload',
      reason: `Unknown validation operation: ${operation}`,
      validatedAt,
      operation,
    };
  });
}
