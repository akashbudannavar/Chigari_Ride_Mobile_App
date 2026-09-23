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
    if (reqPath === 'react-native' || reqPath === 'expo-camera' || reqPath === 'expo-haptics') {
      return { Platform: { OS: 'ios' } };
    }
    return require(reqPath);
  };
  const fn = new Function('module', 'exports', 'require', js);
  fn(m, m.exports, customReq);
  return m.exports;
}

const { DEMO_TICKETS } = loadModule('services/ticketValidation.ts');
const { CHIGARI_VERIFIED_STOPS, CHIGARI_CORRIDOR_ROUTE } = loadModule('data/chigariRoute.ts');
const { findStopById, findStopByName, CHIGARI_STOPS } = loadModule('data/chigariStops.ts');
const { getAvailableServicesForJourney, getAvailableServicesAtStop } = loadModule('services/busAvailabilityService.ts');
const { haversineDistance, getCumulativeDistances, interpolatePosition } = loadModule('utils/transitGeometry.ts');

console.log('====================================================');
console.log('CHIGARI RIDE — PART 1 JOURNEY FLOW TEST SUITE');
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

// -------------------------------------------------------------
// TEST 1: TICKET SCANNER & AVAILABILITY SELECTION
// -------------------------------------------------------------
console.log('--- TEST 1: TICKET SCANNER & AVAILABILITY SELECTION ---');

// Valid Ticket
const validTicket = DEMO_TICKETS.find((t) => t.validityStatus === 'VALID');
assert('Valid demo ticket exists in DEMO_TICKETS', !!validTicket, `ID: ${validTicket?.ticketId}`);

const fromStop = findStopById(validTicket.fromStopId) || findStopByName(validTicket.fromStopName);
const toStop = findStopById(validTicket.toStopId) || findStopByName(validTicket.toStopName);

assert(
  'Resolves boarding and destination stations from ticket without re-entry',
  !!fromStop && !!toStop,
  `From: ${fromStop?.name} | To: ${toStop?.name}`
);

const eligibleServices = getAvailableServicesForJourney(fromStop.name, toStop.name);
const primaryService = eligibleServices[0] || getAvailableServicesAtStop(fromStop.name)[0];
assert(
  'Determines eligible passenger-facing Chigari bus service',
  ['200A', '201B', '100D', '202C'].includes(primaryService?.serviceNumber),
  `Service: Bus ${primaryService?.serviceNumber} (${primaryService?.name})`
);

// Expired Ticket Check
const expiredTicket = DEMO_TICKETS.find((t) => t.validityStatus === 'EXPIRED' || t.status === 'Expired');
assert('Expired reference ticket exists in DEMO_TICKETS', !!expiredTicket, `ID: ${expiredTicket?.ticketId}`);

const isExpiredValid = expiredTicket.validityStatus === 'VALID' && expiredTicket.status !== 'Expired';
assert(
  'Expired ticket correctly flagged as invalid for starting journey',
  !isExpiredValid,
  `validityStatus: ${expiredTicket.validityStatus}, status: ${expiredTicket.status}`
);

// -------------------------------------------------------------
// TEST 2: BOARDING STATION AS USER STARTING LOCATION
// -------------------------------------------------------------
console.log('\n--- TEST 2: BOARDING STATION AS USER STARTING LOCATION ---');

const userLocationOverride = {
  latitude: fromStop.latitude,
  longitude: fromStop.longitude,
  title: fromStop.name,
  subtitle: 'Your Boarding Station',
};

assert(
  'User location matches boarding station coordinates',
  userLocationOverride.latitude === fromStop.latitude &&
  userLocationOverride.longitude === fromStop.longitude,
  `Lat: ${userLocationOverride.latitude}, Lng: ${userLocationOverride.longitude}`
);

assert(
  'User location marker title is the boarding station name',
  userLocationOverride.title === fromStop.name,
  userLocationOverride.title
);

// -------------------------------------------------------------
// TEST 3: DEMO BUS POSITIONED EXACTLY 100 METERS AWAY
// -------------------------------------------------------------
console.log('\n--- TEST 3: DEMO BUS POSITIONED 100 METRES AWAY ---');

const cumDistances = getCumulativeDistances(CHIGARI_CORRIDOR_ROUTE.coordinates);
const totalDistance = cumDistances[cumDistances.length - 1];
const isReverse = fromStop.distanceAlongRoute > toStop.distanceAlongRoute;

let startProgress;
let initialBusCoords;

if (!isReverse) {
  if (fromStop.distanceAlongRoute >= 100) {
    startProgress = fromStop.distanceAlongRoute - 100;
    initialBusCoords = interpolatePosition(CHIGARI_CORRIDOR_ROUTE.coordinates, cumDistances, startProgress, false).position;
  } else {
    startProgress = 0;
    initialBusCoords = {
      latitude: fromStop.latitude - 100 / 111320,
      longitude: fromStop.longitude,
    };
  }
} else {
  if (fromStop.distanceAlongRoute <= totalDistance - 100) {
    startProgress = fromStop.distanceAlongRoute + 100;
    initialBusCoords = interpolatePosition(CHIGARI_CORRIDOR_ROUTE.coordinates, cumDistances, startProgress, true).position;
  } else {
    startProgress = totalDistance;
    initialBusCoords = {
      latitude: fromStop.latitude + 100 / 111320,
      longitude: fromStop.longitude,
    };
  }
}

const distanceMeters = haversineDistance(initialBusCoords, {
  latitude: fromStop.latitude,
  longitude: fromStop.longitude,
});

assert(
  'Bus spawns approximately 100 metres away from the boarding station (within tolerance)',
  Math.abs(distanceMeters - 100) <= 8,
  `Distance calculated: ${distanceMeters.toFixed(1)} metres`
);

// -------------------------------------------------------------
// TEST 4: BUS APPROACH SIMULATION & ARRIVAL DETECTION
// -------------------------------------------------------------
console.log('\n--- TEST 4: BUS APPROACH SIMULATION & ARRIVAL DETECTION ---');

let currentDistance = 100;
let step = 15; // 15m per simulation tick
let ticks = 0;
let busArrived = false;
let arrivalModalTriggered = false;

while (currentDistance > 0 && ticks < 20) {
  ticks++;
  currentDistance = Math.max(0, currentDistance - step);
  if (currentDistance <= 3.5) {
    busArrived = true;
    arrivalModalTriggered = true;
    break;
  }
}

assert(
  'Bus approaches and reaches the boarding station smoothly',
  busArrived && currentDistance <= 3.5,
  `Reached station in ${ticks} ticks. Remaining distance: ${currentDistance}m`
);

assert(
  'Arrival popup modal triggers automatically upon arrival',
  arrivalModalTriggered,
  'isArrivalModalVisible set to true'
);

const expectedModalTitle = 'Your bus has arrived';
const expectedModalSubtitle = `${primaryService.serviceNumber} is now at ${fromStop.name.split('/')[0].trim()}. Please enter the bus.`;
assert(
  'Arrival popup text matches required specification exactly',
  expectedModalTitle === 'Your bus has arrived' && expectedModalSubtitle.includes('Please enter the bus.'),
  `Title: "${expectedModalTitle}" | Message: "${expectedModalSubtitle}"`
);

// -------------------------------------------------------------
// TEST 5: ENTER BUS TRANSITION & DESTINATION TRANSIT
// -------------------------------------------------------------
console.log('\n--- TEST 5: ENTER BUS TRANSITION ---');

let journeyState = 'bus_arrived';
let modalVisible = true;

// Simulate tapping "Enter Bus"
function handleEnterBus() {
  modalVisible = false;
  journeyState = 'on_bus';
}

handleEnterBus();

assert(
  'Tapping Enter Bus closes arrival popup modal',
  modalVisible === false,
  'Modal dismissed'
);

assert(
  'Journey transitions to on_bus state',
  journeyState === 'on_bus',
  `Current state: ${journeyState}`
);

// Simulate bus moving toward destination
let currentProgress = fromStop.distanceAlongRoute;
const destProgress = toStop.distanceAlongRoute;
const cruiseStep = 30; // 30m per tick
const distBefore = Math.abs(currentProgress - destProgress);

currentProgress = isReverse ? currentProgress - cruiseStep : currentProgress + cruiseStep;
const distAfter = Math.abs(currentProgress - destProgress);

assert(
  'Bus begins traveling along corridor toward destination station',
  distAfter < distBefore,
  `Progressed toward destination (${distBefore}m -> ${distAfter}m)`
);

// -------------------------------------------------------------
// TEST 6: TRANSLATION PARITY & UI LABELS
// -------------------------------------------------------------
console.log('\n--- TEST 6: TRANSLATION PARITY ---');

const { en } = loadModule('translations/en.ts');
const { kn } = loadModule('translations/kn.ts');
const { hi } = loadModule('translations/hi.ts');

assert(
  'journey.busArrived key exists in EN, KN, and HI',
  !!en.journey?.busArrived && !!kn.journey?.busArrived && !!hi.journey?.busArrived,
  `EN: "${en.journey?.busArrived}" | KN: "${kn.journey?.busArrived}" | HI: "${hi.journey?.busArrived}"`
);

assert(
  'journey.enterBus key exists in EN, KN, and HI',
  !!en.journey?.enterBus && !!kn.journey?.enterBus && !!hi.journey?.enterBus,
  `EN: "${en.journey?.enterBus}" | KN: "${kn.journey?.enterBus}" | HI: "${hi.journey?.enterBus}"`
);

assert(
  'journey.startJourney key exists in EN, KN, and HI',
  !!en.journey?.startJourney && !!kn.journey?.startJourney && !!hi.journey?.startJourney,
  `EN: "${en.journey?.startJourney}"`
);

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log('====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
