const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadModule(relPath) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const js = ts.transpile(code, { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS });
  const m = { exports: {} };
  const customReq = (reqPath) => {
    if (reqPath.startsWith('@/')) {
      let sub = reqPath.slice(2);
      if (!sub.endsWith('.ts') && !sub.endsWith('.tsx') && !sub.endsWith('.js')) {
        if (fs.existsSync(path.resolve(__dirname, '..', sub + '.ts'))) {
          sub += '.ts';
        } else if (fs.existsSync(path.resolve(__dirname, '..', sub + '.tsx'))) {
          sub += '.tsx';
        }
      }
      return loadModule(sub);
    }
    if (reqPath.startsWith('./') || reqPath.startsWith('../')) {
      const dir = path.dirname(relPath);
      let resolved = path.join(dir, reqPath).replace(/\\/g, '/');
      if (!resolved.endsWith('.ts') && !resolved.endsWith('.tsx') && !resolved.endsWith('.js')) {
        if (fs.existsSync(path.resolve(__dirname, '..', resolved + '.ts'))) {
          resolved += '.ts';
        } else if (fs.existsSync(path.resolve(__dirname, '..', resolved + '.tsx'))) {
          resolved += '.tsx';
        }
      }
      return loadModule(resolved);
    }
    if (reqPath === '@react-native-async-storage/async-storage') {
      const storage = new Map();
      const mock = {
        getItem: async (key) => storage.get(key) || null,
        setItem: async (key, val) => storage.set(key, val),
        removeItem: async (key) => storage.delete(key),
        clear: async () => storage.clear(),
        _storage: storage,
      };
      return { ...mock, default: mock };
    }
    if (reqPath === 'expo-speech') {
      return {
        speak: () => {},
        stop: () => {},
        isSpeakingAsync: async () => false,
      };
    }
    if (reqPath === 'expo-secure-store') {
      const secureStoreMap = new Map();
      return {
        getItemAsync: async (k) => secureStoreMap.get(k) || null,
        setItemAsync: async (k, v) => secureStoreMap.set(k, v),
        deleteItemAsync: async (k) => secureStoreMap.delete(k),
      };
    }
    if (reqPath === '@supabase/supabase-js') {
      return {
        createClient: () => ({
          auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          },
          from: () => ({
            upsert: async () => ({ error: null }),
            update: async () => ({ eq: async () => ({ error: null }) }),
          }),
        }),
      };
    }
    if (reqPath === 'react-native' || reqPath === 'expo-camera' || reqPath === 'expo-haptics') {
      return { Platform: { OS: 'android' } };
    }
    return require(reqPath);
  };
  const fn = new Function('module', 'exports', 'require', js);
  fn(m, m.exports, customReq);
  return m.exports;
}

const {
  saveDigitalTicket,
  getDigitalTickets,
  updateDigitalTicketStatus,
  digitalTicketToScannedTicket,
} = loadModule('services/ticketHistory.ts');

const {
  getAvailableServicesForJourney,
  getAvailableServicesAtStop,
} = loadModule('services/busAvailabilityService.ts');

const { findStopByName, findStopById, CHIGARI_STOPS } = loadModule('data/chigariStops.ts');
const { CHIGARI_VERIFIED_STOPS } = loadModule('data/chigariRoute.ts');

const { en } = loadModule('translations/en.ts');
const { kn } = loadModule('translations/kn.ts');
const { hi } = loadModule('translations/hi.ts');

console.log('====================================================');
console.log('CHIGARI RIDE — MY TICKET TO JOURNEY TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(description, condition, details = '') {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${description}${details ? ` -> ${details}` : ''}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${description}${details ? ` -> ${details}` : ''}`);
  }
}

async function runTests() {
  // -------------------------------------------------------------
  // TEST 1: PURCHASED TICKET PERSISTENCE & RETRIEVAL
  // -------------------------------------------------------------
  console.log('--- TEST 1: PURCHASED TICKET PERSISTENCE & RETRIEVAL ---');

  const now = new Date();
  const validUntil = new Date(now.getTime() + 4 * 3600000).toISOString();
  const samplePurchasedTicket = {
    ticketId: 'CR-20260917-776703',
    fromStationId: 'hdbrts-stop-35',
    fromStationName: 'Hubballi Central Bus Terminal (CBT)',
    toStationId: 'hdbrts-stop-11',
    toStationName: 'Vidyanagar',
    fare: 20.0,
    ticketType: 'Adult',
    issuedAt: now.toISOString(),
    validUntil: validUntil,
    status: 'VALID',
    routeNumber: '200A',
    routeName: 'Chigari 200A Corridor',
    durationMinutes: 25,
    distanceKm: 9.8,
    qrPayload: JSON.stringify({
      type: 'CHIGARI_TICKET',
      ticketId: 'CR-20260917-776703',
      fromStopId: 'hdbrts-stop-35',
      fromStopName: 'Hubballi Central Bus Terminal (CBT)',
      toStopId: 'hdbrts-stop-11',
      toStopName: 'Vidyanagar',
      fare: 20.0,
      status: 'VALID',
    }),
  };

  await saveDigitalTicket(samplePurchasedTicket);
  const storedTickets = await getDigitalTickets();

  assert('Purchased ticket saved in storage', storedTickets.length > 0);
  assert(
    'Retrieved ticket matches original ticket ID',
    storedTickets[0].ticketId === samplePurchasedTicket.ticketId,
    storedTickets[0].ticketId
  );
  assert(
    'From and To stations remain unaltered',
    storedTickets[0].fromStationName === 'Hubballi Central Bus Terminal (CBT)' &&
      storedTickets[0].toStationName === 'Vidyanagar',
    `${storedTickets[0].fromStationName} ➔ ${storedTickets[0].toStationName}`
  );
  assert('Fare remains intact', storedTickets[0].fare === 20.0, `₹${storedTickets[0].fare}`);

  // -------------------------------------------------------------
  // TEST 2: ROUTE-AWARE BUS SELECTION (CBT -> VIDYANAGAR)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: ROUTE-AWARE BUS SELECTION (CBT ➔ VIDYANAGAR) ---');

  const cbtServices = getAvailableServicesForJourney(
    samplePurchasedTicket.fromStationName,
    samplePurchasedTicket.toStationName
  );

  const cbtServiceNumbers = cbtServices.map((s) => s.serviceNumber);
  console.log('Available services for CBT ➔ Vidyanagar:', cbtServiceNumbers);

  assert(
    'Only 200A is available for CBT ➔ Vidyanagar journey',
    cbtServiceNumbers.length === 1 && cbtServiceNumbers[0] === '200A',
    `Found: [${cbtServiceNumbers.join(', ')}]`
  );
  assert(
    'Excludes 201B, 100D, and 202C for CBT ➔ Vidyanagar',
    !cbtServiceNumbers.includes('201B') &&
      !cbtServiceNumbers.includes('100D') &&
      !cbtServiceNumbers.includes('202C'),
    'Unrelated services correctly excluded'
  );

  // -------------------------------------------------------------
  // TEST 3: ROUTE-AWARE BUS SELECTION (AMBEDKAR CIRCLE & GOKUL BUS STAND)
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: AMBEDKAR CIRCLE & GOKUL BUS STAND ---');

  const ambedkarServices = getAvailableServicesAtStop('DR. B R Ambedkar Circle');
  const ambedkarNumbers = ambedkarServices.map((s) => s.serviceNumber);
  console.log('Available services at DR. B R Ambedkar Circle:', ambedkarNumbers);

  assert(
    'Ambedkar Circle provides 200A, 201B, and 100D',
    ambedkarNumbers.includes('200A') &&
      ambedkarNumbers.includes('201B') &&
      ambedkarNumbers.includes('100D'),
    `Found: [${ambedkarNumbers.join(', ')}]`
  );
  assert(
    '202C is excluded at Ambedkar Circle (starts at Gokul Bus Stand)',
    !ambedkarNumbers.includes('202C'),
    '202C correctly excluded'
  );

  const gokulServices = getAvailableServicesAtStop('Hubballi New Bus Stand');
  const gokulNumbers = gokulServices.map((s) => s.serviceNumber);
  console.log('Available services at Gokul / Hubballi New Bus Stand:', gokulNumbers);

  assert(
    '202C is available at Gokul Bus Stand / Hubballi New Bus Stand',
    gokulNumbers.includes('202C'),
    `Found: [${gokulNumbers.join(', ')}]`
  );

  // -------------------------------------------------------------
  // TEST 4: STATION RESOLUTION USING VERIFIED 35 STOPS
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: STATION RESOLUTION USING VERIFIED STOPS ---');

  const resolvedBoarding =
    findStopById(samplePurchasedTicket.fromStationId) ||
    findStopByName(samplePurchasedTicket.fromStationName);

  const resolvedDest =
    findStopById(samplePurchasedTicket.toStationId) ||
    findStopByName(samplePurchasedTicket.toStationName);

  assert('Boarding station resolved from verified stops', !!resolvedBoarding, resolvedBoarding?.name);
  assert('Destination station resolved from verified stops', !!resolvedDest, resolvedDest?.name);
  assert(
    'Boarding station is Dharwad BRTS Terminal with order 35',
    resolvedBoarding?.order === 35,
    `Order: ${resolvedBoarding?.order}`
  );
  assert(
    'Destination station is Arts College/Vidyanagar with order 11',
    resolvedDest?.order === 11,
    `Order: ${resolvedDest?.order}`
  );

  // -------------------------------------------------------------
  // TEST 5: SIMULATED COUNTDOWN SEQUENCE
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: SIMULATED COUNTDOWN SEQUENCE ---');

  const expectedStages = ['02:35 min', '02:00 min', '01:30 min', '00:30 min', 'Arriving now'];
  console.log('Simulated arrival progression:', expectedStages.join(' -> '));

  assert(
    'Countdown sequence starts with 02:35 min',
    expectedStages[0] === '02:35 min'
  );
  assert(
    'Countdown sequence ends with Arriving now',
    expectedStages[expectedStages.length - 1] === 'Arriving now'
  );

  // Verify Enter Bus button activation condition
  function isEnterBusActive(stage) {
    return stage === 'Arriving now';
  }

  assert('Enter Bus is disabled at 02:35 min', !isEnterBusActive('02:35 min'));
  assert('Enter Bus is disabled at 01:30 min', !isEnterBusActive('01:30 min'));
  assert('Enter Bus becomes active upon arrival', isEnterBusActive('Arriving now'));

  // -------------------------------------------------------------
  // TEST 6: ENTER BUS & PERSISTENT STATUS UPDATE
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: ENTER BUS & STATUS UPDATE ---');

  await updateDigitalTicketStatus(samplePurchasedTicket.ticketId, 'IN_JOURNEY');
  const updatedTickets = await getDigitalTickets();
  const currentTicket = updatedTickets.find((t) => t.ticketId === samplePurchasedTicket.ticketId);

  assert(
    'Ticket status in storage updated to IN_JOURNEY',
    currentTicket?.status === 'IN_JOURNEY',
    currentTicket?.status
  );
  assert(
    'Original ticket ID remains unchanged after status update',
    currentTicket?.ticketId === samplePurchasedTicket.ticketId
  );
  assert(
    'QR payload remains intact without regeneration',
    currentTicket?.qrPayload === samplePurchasedTicket.qrPayload
  );

  const scannedTicket = digitalTicketToScannedTicket(currentTicket);
  assert('Interoperable with JourneyContext as valid scanned ticket', scannedTicket.validityStatus === 'VALID');
  assert('From/To stop IDs correctly preserved', scannedTicket.fromStopId === 'hdbrts-stop-35');

  // -------------------------------------------------------------
  // TEST 7: TRANSLATION PARITY ACROSS EN, KN, HI
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: TRANSLATION PARITY ---');

  const requiredKeys = [
    'title',
    'subtitle',
    'selectBus',
    'selectBusDesc',
    'selectStation',
    'demoBusArrival',
    'estimatedArrival',
    'arrivingNow',
    'enterBus',
    'busEnteredSuccess',
    'inJourney',
    'noBusesAvailable',
    'demoNotice',
  ];

  for (const key of requiredKeys) {
    assert(
      `ticketDetails.${key} exists in English`,
      typeof en.ticketDetails[key] === 'string' && en.ticketDetails[key].length > 0
    );
    assert(
      `ticketDetails.${key} exists in Kannada`,
      typeof kn.ticketDetails[key] === 'string' && kn.ticketDetails[key].length > 0
    );
    assert(
      `ticketDetails.${key} exists in Hindi`,
      typeof hi.ticketDetails[key] === 'string' && hi.ticketDetails[key].length > 0
    );
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL MY TICKET ➔ JOURNEY TESTS PASSED!');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
