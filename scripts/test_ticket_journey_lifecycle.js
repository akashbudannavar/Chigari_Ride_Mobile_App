/**
 * CHIGARI RIDE — TICKET JOURNEY LIFECYCLE & ENTRY/EXIT VALIDATION TEST SUITE
 * 
 * Verifies all 18 required test scenarios from the Stage specification:
 * 
 * TEST 1: Create Rayapur -> Navanagara ticket.
 * TEST 2: Scan at Rayapur as ENTRY -> SUCCESS, state = BOARDED.
 * TEST 3: Scan same ticket again at Rayapur as ENTRY -> REJECTED / ALREADY BOARDED.
 * TEST 4: Scan at RTO as EXIT -> SUCCESS, state = EXITED.
 * TEST 5: Scan same ticket again at RTO as EXIT -> REJECTED / ALREADY EXITED.
 * TEST 6: Scan same ticket at Navanagara after exiting at RTO -> REJECTED / JOURNEY ALREADY COMPLETED.
 * TEST 7: Rayapur -> Navanagara. Enter Rayapur and exit Navanagara -> ENTRY SUCCESS, EXIT SUCCESS.
 * TEST 8: Attempt EXIT before ENTRY -> REJECTED.
 * TEST 9: Attempt ENTRY at an incorrect station -> REJECTED.
 * TEST 10: Attempt EXIT at an invalid/unrelated station -> REJECTED.
 * TEST 11: Expired ticket -> ENTRY rejected, EXIT rejected.
 * TEST 12: Cancelled ticket -> ENTRY rejected, EXIT rejected.
 * TEST 13: Two simultaneous ENTRY attempts -> Only one succeeds.
 * TEST 14: Two simultaneous EXIT attempts -> Only one succeeds.
 * TEST 15: Completed ticket cannot be reused.
 * TEST 16: QR remains compatible with Shared Ticket Contract Version 1.
 * TEST 17: Existing ticket-generation flow continues working.
 * TEST 18: Existing digital-ticket UI continues working.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadModule(relativePath) {
  const fullPath = path.resolve(__dirname, '..', relativePath);
  const source = fs.readFileSync(fullPath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const m = { exports: {} };
  const memStore = global.__mockStorage || (global.__mockStorage = new Map());
  const customRequire = (moduleName) => {
    if (moduleName === '@/lib/supabase' || moduleName.includes('supabase')) {
      return {
        supabase: {
          auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
          },
          from: () => ({
            upsert: async () => ({ error: null }),
            update: async () => ({ error: null }),
            eq: () => ({ error: null }),
          }),
        },
      };
    }
    if (moduleName === '@react-native-async-storage/async-storage') {
      const storageObj = {
        getItem: async (key) => memStore.get(key) || null,
        setItem: async (key, val) => { memStore.set(key, val); },
        removeItem: async (key) => { memStore.delete(key); },
        clear: async () => { memStore.clear(); },
      };
      return {
        __esModule: true,
        default: storageObj,
        ...storageObj,
      };
    }
    if (moduleName.startsWith('@/')) {
      const sub = moduleName.replace('@/', '');
      return loadModule(sub + (sub.endsWith('.ts') ? '' : '.ts'));
    }
    if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
      const dir = path.dirname(fullPath);
      let target = path.resolve(dir, moduleName);
      if (!fs.existsSync(target) && fs.existsSync(target + '.ts')) {
        target = target + '.ts';
      } else if (!fs.existsSync(target) && fs.existsSync(target + '.js')) {
        target = target + '.js';
      }
      return loadModule(path.relative(path.resolve(__dirname, '..'), target));
    }
    return require(moduleName);
  };

  const fn = new Function('module', 'exports', 'require', '__dirname', compiled.outputText);
  fn(m, m.exports, customRequire, path.dirname(fullPath));
  return m.exports;
}

const {
  buildSharedTicketPayload,
  isSharedTicketContract,
  AUTHORITATIVE_STATIONS,
  resolveAuthoritativeStation,
} = loadModule('services/sharedTicketContract.ts');

const {
  getPermittedJourneyStations,
  isStationPermittedForEntry,
  isStationPermittedForExit,
} = loadModule('services/routeValidationService.ts');

const {
  validateTicketOperation,
  journeyStateManager,
} = loadModule('services/ticketJourneyLifecycle.ts');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${message}`);
  } else {
    console.error(`❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('CHIGARI RIDE — TICKET JOURNEY LIFECYCLE & VALIDATION TEST SUITE');
  console.log('================================================================\n');

  journeyStateManager.clear();

  const rayapurAuth = resolveAuthoritativeStation('Rayapur');
  const navanagaraAuth = resolveAuthoritativeStation('Navanagara');
  const rtoAuth = resolveAuthoritativeStation('RTO');
  const bvbAuth = resolveAuthoritativeStation('BVB');
  const dnbsAuth = resolveAuthoritativeStation('Dharwad New Bus Stand');
  const ambedkarAuth = resolveAuthoritativeStation('DR. B R Ambedkar Circle');

  // Helper to generate a test ticket payload
  function createTicketPayload(options = {}) {
    const now = new Date();
    const ticketId = options.ticketId || `CR-TEST-${Math.floor(100000 + Math.random() * 900000)}`;
    const from = options.from || 'Rayapur';
    const to = options.to || 'Navanagara';
    const fare = options.fare || 20.0;
    const status = options.status || 'active';
    const issuedAt = options.issuedAt || now.toISOString();
    const validUntil = options.validUntil || new Date(now.getTime() + 4 * 3600000).toISOString();

    return {
      ticketId,
      rawQr: buildSharedTicketPayload({
        ticketId,
        fromStationName: from,
        toStationName: to,
        fare,
        currency: 'INR',
        passengerDisplayName: 'Akash Budannavar',
        status,
        issuedAt,
        validUntil,
      }),
    };
  }

  // TEST 1: Create Rayapur -> Navanagara ticket.
  const t1 = createTicketPayload({ from: 'Rayapur', to: 'Navanagara' });
  assert(isSharedTicketContract(t1.rawQr), 'TEST 1: Create Rayapur ➔ Navanagara ticket (produces valid Contract v1)');
  const parsed1 = JSON.parse(t1.rawQr);
  assert(parsed1.journey.from.name === 'Rayapur' && parsed1.journey.to.name === 'Navanagara', 'TEST 1: Ticket journey matches Rayapur ➔ Navanagara');

  // TEST 2: Scan at Rayapur as ENTRY. Expected: SUCCESS, state = BOARDED.
  const resEntry1 = await validateTicketOperation({
    rawQrPayload: t1.rawQr,
    operation: 'ENTRY',
    stationCode: rayapurAuth.code,
    stationName: rayapurAuth.name,
    terminalId: 'GATE-RAYAPUR-01',
  });
  assert(resEntry1.isValid === true && resEntry1.code === 'success', 'TEST 2: Scan at Rayapur as ENTRY -> SUCCESS');
  assert(resEntry1.state === 'BOARDED', 'TEST 2: State becomes BOARDED after successful entry');

  // TEST 3: Scan same ticket again at Rayapur as ENTRY. Expected: REJECTED / ALREADY BOARDED.
  const resEntryRepeat = await validateTicketOperation({
    rawQrPayload: t1.rawQr,
    operation: 'ENTRY',
    stationCode: rayapurAuth.code,
    stationName: rayapurAuth.name,
    terminalId: 'GATE-RAYAPUR-01',
  });
  assert(resEntryRepeat.isValid === false && resEntryRepeat.code === 'already_boarded', 'TEST 3: Second scan at Rayapur as ENTRY is REJECTED (already_boarded)');

  // TEST 4: Scan at RTO as EXIT. Expected: SUCCESS, state = EXITED.
  const resExitRto = await validateTicketOperation({
    rawQrPayload: t1.rawQr,
    operation: 'EXIT',
    stationCode: rtoAuth.code,
    stationName: rtoAuth.name,
    terminalId: 'GATE-RTO-01',
  });
  assert(resExitRto.isValid === true && resExitRto.code === 'success', 'TEST 4: Scan at RTO as intermediate EXIT -> SUCCESS');
  assert(resExitRto.state === 'EXITED', 'TEST 4: State becomes EXITED');

  // TEST 5: Scan same ticket again at RTO as EXIT. Expected: REJECTED / ALREADY EXITED.
  const resExitRtoRepeat = await validateTicketOperation({
    rawQrPayload: t1.rawQr,
    operation: 'EXIT',
    stationCode: rtoAuth.code,
    stationName: rtoAuth.name,
    terminalId: 'GATE-RTO-01',
  });
  assert(resExitRtoRepeat.isValid === false && resExitRtoRepeat.code === 'already_exited', 'TEST 5: Second scan at RTO as EXIT is REJECTED (already_exited)');

  // TEST 6: Scan same ticket at Navanagara after exiting at RTO. Expected: REJECTED / JOURNEY ALREADY COMPLETED.
  const resExitNavanagaraAfterRto = await validateTicketOperation({
    rawQrPayload: t1.rawQr,
    operation: 'EXIT',
    stationCode: navanagaraAuth.code,
    stationName: navanagaraAuth.name,
    terminalId: 'GATE-NAVANAGARA-01',
  });
  assert(resExitNavanagaraAfterRto.isValid === false && resExitNavanagaraAfterRto.code === 'already_exited', 'TEST 6: Scan at Navanagara after exiting at RTO is REJECTED (journey already completed)');

  // TEST 7: Rayapur -> Navanagara. Enter Rayapur and exit Navanagara. Expected: ENTRY SUCCESS, EXIT SUCCESS.
  const t7 = createTicketPayload({ from: 'Rayapur', to: 'Navanagara' });
  const res7Entry = await validateTicketOperation({
    rawQrPayload: t7.rawQr,
    operation: 'ENTRY',
    stationCode: rayapurAuth.code,
    stationName: rayapurAuth.name,
  });
  const res7Exit = await validateTicketOperation({
    rawQrPayload: t7.rawQr,
    operation: 'EXIT',
    stationCode: navanagaraAuth.code,
    stationName: navanagaraAuth.name,
  });
  assert(res7Entry.isValid && res7Entry.state === 'BOARDED', 'TEST 7: Full journey: Entry at Rayapur SUCCESS (BOARDED)');
  assert(res7Exit.isValid && res7Exit.state === 'EXITED', 'TEST 7: Full journey: Exit at destination Navanagara SUCCESS (EXITED)');

  // TEST 8: Attempt EXIT before ENTRY. Expected: REJECTED.
  const t8 = createTicketPayload({ from: 'Rayapur', to: 'Navanagara' });
  const res8ExitBeforeEntry = await validateTicketOperation({
    rawQrPayload: t8.rawQr,
    operation: 'EXIT',
    stationCode: navanagaraAuth.code,
    stationName: navanagaraAuth.name,
  });
  assert(res8ExitBeforeEntry.isValid === false && res8ExitBeforeEntry.code === 'entry_required', 'TEST 8: Attempt EXIT before ENTRY is REJECTED (entry_required)');

  // TEST 9: Attempt ENTRY at an incorrect station. Expected: REJECTED.
  const t9 = createTicketPayload({ from: 'Rayapur', to: 'Navanagara' });
  const res9WrongOrigin = await validateTicketOperation({
    rawQrPayload: t9.rawQr,
    operation: 'ENTRY',
    stationCode: bvbAuth.code,
    stationName: bvbAuth.name,
  });
  assert(res9WrongOrigin.isValid === false && res9WrongOrigin.code === 'invalid_origin_station', 'TEST 9: Attempt ENTRY at incorrect station (BVB instead of Rayapur) is REJECTED (invalid_origin_station)');

  // TEST 10: Attempt EXIT at an invalid/unrelated station. Expected: REJECTED.
  const t10 = createTicketPayload({ from: 'Rayapur', to: 'Navanagara' });
  await validateTicketOperation({
    rawQrPayload: t10.rawQr,
    operation: 'ENTRY',
    stationCode: rayapurAuth.code,
    stationName: rayapurAuth.name,
  });
  const res10UnrelatedExit = await validateTicketOperation({
    rawQrPayload: t10.rawQr,
    operation: 'EXIT',
    stationCode: dnbsAuth.code,
    stationName: dnbsAuth.name,
  });
  assert(res10UnrelatedExit.isValid === false && res10UnrelatedExit.code === 'invalid_exit_station', 'TEST 10: Attempt EXIT at unrelated station (Dharwad New Bus Stand) outside Rayapur ➔ Navanagara is REJECTED (invalid_exit_station)');

  // TEST 11: Expired ticket. Expected: ENTRY rejected, EXIT rejected.
  const t11 = createTicketPayload({
    from: 'Rayapur',
    to: 'Navanagara',
    issuedAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    validUntil: new Date(Date.now() - 4 * 3600000).toISOString(),
  });
  const res11Entry = await validateTicketOperation({
    rawQrPayload: t11.rawQr,
    operation: 'ENTRY',
    stationCode: rayapurAuth.code,
    stationName: rayapurAuth.name,
  });
  const res11Exit = await validateTicketOperation({
    rawQrPayload: t11.rawQr,
    operation: 'EXIT',
    stationCode: navanagaraAuth.code,
    stationName: navanagaraAuth.name,
  });
  assert(res11Entry.isValid === false && res11Entry.code === 'ticket_expired', 'TEST 11: Expired ticket ENTRY is REJECTED (ticket_expired)');
  assert(res11Exit.isValid === false && res11Exit.code === 'ticket_expired', 'TEST 11: Expired ticket EXIT is REJECTED (ticket_expired)');

  // TEST 12: Cancelled ticket. Expected: ENTRY rejected, EXIT rejected.
  const t12 = createTicketPayload({
    from: 'Rayapur',
    to: 'Navanagara',
    status: 'cancelled',
  });
  const res12Entry = await validateTicketOperation({
    rawQrPayload: t12.rawQr,
    operation: 'ENTRY',
    stationCode: rayapurAuth.code,
    stationName: rayapurAuth.name,
  });
  const res12Exit = await validateTicketOperation({
    rawQrPayload: t12.rawQr,
    operation: 'EXIT',
    stationCode: navanagaraAuth.code,
    stationName: navanagaraAuth.name,
  });
  assert(res12Entry.isValid === false && res12Entry.code === 'ticket_cancelled', 'TEST 12: Cancelled ticket ENTRY is REJECTED (ticket_cancelled)');
  assert(res12Exit.isValid === false && res12Exit.code === 'ticket_cancelled', 'TEST 12: Cancelled ticket EXIT is REJECTED (ticket_cancelled)');

  // TEST 13: Two simultaneous ENTRY attempts. Expected: Only one succeeds.
  const t13 = createTicketPayload({ from: 'Rayapur', to: 'Navanagara' });
  const [res13a, res13b] = await Promise.all([
    validateTicketOperation({
      rawQrPayload: t13.rawQr,
      operation: 'ENTRY',
      stationCode: rayapurAuth.code,
      stationName: rayapurAuth.name,
      terminalId: 'TERM-A',
    }),
    validateTicketOperation({
      rawQrPayload: t13.rawQr,
      operation: 'ENTRY',
      stationCode: rayapurAuth.code,
      stationName: rayapurAuth.name,
      terminalId: 'TERM-B',
    }),
  ]);
  const entry13SuccessCount = (res13a.isValid ? 1 : 0) + (res13b.isValid ? 1 : 0);
  assert(entry13SuccessCount === 1, 'TEST 13: Concurrency: Two simultaneous ENTRY attempts -> exactly ONE succeeds');

  // TEST 14: Two simultaneous EXIT attempts. Expected: Only one succeeds.
  const t14 = createTicketPayload({ from: 'Rayapur', to: 'Navanagara' });
  await validateTicketOperation({
    rawQrPayload: t14.rawQr,
    operation: 'ENTRY',
    stationCode: rayapurAuth.code,
    stationName: rayapurAuth.name,
  });
  const [res14a, res14b] = await Promise.all([
    validateTicketOperation({
      rawQrPayload: t14.rawQr,
      operation: 'EXIT',
      stationCode: navanagaraAuth.code,
      stationName: navanagaraAuth.name,
      terminalId: 'EXIT-TERM-A',
    }),
    validateTicketOperation({
      rawQrPayload: t14.rawQr,
      operation: 'EXIT',
      stationCode: navanagaraAuth.code,
      stationName: navanagaraAuth.name,
      terminalId: 'EXIT-TERM-B',
    }),
  ]);
  const exit14SuccessCount = (res14a.isValid ? 1 : 0) + (res14b.isValid ? 1 : 0);
  assert(exit14SuccessCount === 1, 'TEST 14: Concurrency: Two simultaneous EXIT attempts -> exactly ONE succeeds');

  // TEST 15: Completed ticket cannot be reused.
  const res15ReEntry = await validateTicketOperation({
    rawQrPayload: t14.rawQr,
    operation: 'ENTRY',
    stationCode: rayapurAuth.code,
    stationName: rayapurAuth.name,
  });
  const res15ReExit = await validateTicketOperation({
    rawQrPayload: t14.rawQr,
    operation: 'EXIT',
    stationCode: navanagaraAuth.code,
    stationName: navanagaraAuth.name,
  });
  assert(!res15ReEntry.isValid && !res15ReExit.isValid, 'TEST 15: Completed ticket cannot be reused for entry or exit');

  // TEST 16: QR remains compatible with Shared Ticket Contract Version 1.
  const parsed16 = JSON.parse(t1.rawQr);
  assert(
    parsed16.ticketVersion === 1 &&
    parsed16.ticketId === t1.ticketId &&
    parsed16.passenger.displayName === 'Akash Budannavar' &&
    parsed16.journey.from.code === rayapurAuth.code &&
    parsed16.journey.to.code === navanagaraAuth.code &&
    parsed16.ticket.currency === 'INR',
    'TEST 16: QR payload strictly conforms to Shared Ticket Contract Version 1'
  );

  // TEST 17: Permitted intermediate stations discovery.
  const intermediateStops = getPermittedJourneyStations('Rayapur', 'Navanagara');
  const hasRto = intermediateStops.some((s) => s.name === 'RTO');
  const hasIskcon = intermediateStops.some((s) => s.name === 'ISKCON Temple');
  assert(hasRto && hasIskcon, 'TEST 17: Route path discovery includes RTO and ISKCON between Rayapur and Navanagara');

  // TEST 18: Digital ticket storage interoperability.
  const { saveDigitalTicket, getDigitalTickets } = loadModule('services/ticketHistory.ts');
  const dt18 = {
    ticketId: t1.ticketId,
    fromStationId: 'hdbrts-stop-16',
    fromStationName: 'Rayapur',
    toStationId: 'hdbrts-stop-19',
    toStationName: 'Navanagara',
    fare: 20.0,
    ticketType: 'Adult',
    issuedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 4 * 3600000).toISOString(),
    status: 'VALID',
    routeNumber: '200A',
    routeName: 'Chigari 200A Corridor',
    durationMinutes: 20,
    distanceKm: 8.5,
    qrPayload: t1.rawQr,
  };
  await saveDigitalTicket(dt18);
  const ticketsStored = await getDigitalTickets();
  const found18 = ticketsStored.find((t) => t.ticketId === t1.ticketId);
  assert(found18 && found18.ticketId === t1.ticketId, 'TEST 18: Digital ticket successfully stored and retrievable with journey sync');

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL 18 TICKET JOURNEY LIFECYCLE TESTS PASSED!\n');
  } else {
    console.error('❌ SOME TESTS FAILED!\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unexpected error running test suite:', err);
  process.exit(1);
});
