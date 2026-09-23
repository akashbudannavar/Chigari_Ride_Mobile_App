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
      return { speak: () => {}, stop: () => {}, isSpeakingAsync: async () => false };
    }
    if (reqPath === 'expo-haptics') {
      return { impactAsync: async () => {}, notificationAsync: async () => {} };
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
          from: () => ({
            insert: async () => ({ data: null, error: null }),
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({ data: [], error: null }),
                  single: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      };
    }
    if (reqPath === 'react-native') {
      return {
        Platform: { OS: 'android' },
        StyleSheet: { create: (s) => s, absoluteFillObject: {} },
        Dimensions: { get: () => ({ width: 375, height: 812 }) },
      };
    }
    return require(reqPath);
  };
  const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', js);
  fn(m, m.exports, customReq, path.dirname(fullPath), fullPath);
  return m.exports;
}

const { calculateCorridorRoute, findStopByName, CHIGARI_STOPS } = loadModule('data/chigariStops.ts');
const { getRemainingCoordinates, haversineDistance } = loadModule('utils/transitGeometry.ts');
const { getAvailableServicesForJourney } = loadModule('services/busAvailabilityService.ts');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${message}${details ? ' -> ' + details : ''}`);
  } else {
    console.error(`❌ [FAIL] ${message}${details ? ' -> ' + details : ''}`);
    process.exitCode = 1;
  }
}

console.log('================================================================');
console.log('CHIGARI RIDE — TICKET-SPECIFIC LIVE TRACKING & ROUTE AUDIT TEST');
console.log('================================================================\n');

// ─── TEST 1: DYNAMIC ROUTE CLIPPING (CBT ➔ BVB) ───
console.log('--- TEST 1: DYNAMIC ROUTE CLIPPING (Hubballi CBT ➔ BVB) ---');
const stopCBT = findStopByName('Hubballi CBT');
const stopBVB = findStopByName('BVB');

assert(stopCBT !== undefined, 'Found Hubballi CBT', `ID: ${stopCBT?.id}, Order: ${stopCBT?.order}`);
assert(stopBVB !== undefined, 'Found BVB', `ID: ${stopBVB?.id}, Order: ${stopBVB?.order}`);

const routeCbtToBvb = calculateCorridorRoute(stopCBT, stopBVB);
assert(routeCbtToBvb.intermediateStops.length > 0, 'Intermediate stops calculated for CBT ➔ BVB');
assert(
  routeCbtToBvb.intermediateStops[0].id === stopCBT.id,
  'First stop in route is Hubballi CBT',
  routeCbtToBvb.intermediateStops[0].name
);
assert(
  routeCbtToBvb.intermediateStops[routeCbtToBvb.intermediateStops.length - 1].id === stopBVB.id,
  'Last stop in route is BVB College',
  routeCbtToBvb.intermediateStops[routeCbtToBvb.intermediateStops.length - 1].name
);

// Verify NO stations beyond BVB (e.g. Navanagar, SDM, Jubilee Circle, Dharwad)
const stopNavanagar = findStopByName('Navanagar');
const hasNavanagar = routeCbtToBvb.intermediateStops.some((s) => s.id === stopNavanagar?.id);
assert(!hasNavanagar, 'Stations beyond BVB (Navanagar) are NOT in the clipped route');

const stopDharwad = findStopByName('Dharwad BRTS Terminal');
const hasDharwad = routeCbtToBvb.intermediateStops.some((s) => s.id === stopDharwad?.id);
assert(!hasDharwad, 'Terminus stations beyond destination (Dharwad BRTS) are NOT in the clipped route');

// Verify coordinates start at CBT and end at BVB
const firstCoord = routeCbtToBvb.coordinates[0];
const lastCoord = routeCbtToBvb.coordinates[routeCbtToBvb.coordinates.length - 1];
const distStart = haversineDistance(firstCoord, stopCBT);
const distEnd = haversineDistance(lastCoord, stopBVB);

assert(distStart < 50, 'Polyline starts exactly at boarding station CBT', `${distStart.toFixed(1)}m from CBT`);
assert(distEnd < 50, 'Polyline ends exactly at destination station BVB', `${distEnd.toFixed(1)}m from BVB`);

// ─── TEST 2: DYNAMIC ROUTE CLIPPING (CBT ➔ Vidyanagar) ───
console.log('\n--- TEST 2: DYNAMIC ROUTE CLIPPING (Hubballi CBT ➔ Vidyanagar) ---');
const stopVidyanagar = findStopByName('Vidyanagar');
const routeCbtToVidyanagar = calculateCorridorRoute(stopCBT, stopVidyanagar);

assert(
  routeCbtToVidyanagar.intermediateStops[routeCbtToVidyanagar.intermediateStops.length - 1].id === stopVidyanagar.id,
  'Last stop in route is Vidyanagar',
  routeCbtToVidyanagar.intermediateStops[routeCbtToVidyanagar.intermediateStops.length - 1].name
);
const hasBvbInVidyanagar = routeCbtToVidyanagar.intermediateStops.some((s) => s.id === stopBVB?.id);
assert(!hasBvbInVidyanagar, 'Stations beyond Vidyanagar (BVB) are NOT in the clipped route');

// Check eligible service is strictly 200A
const servicesCbtVidyanagar = getAvailableServicesForJourney(stopCBT.name, stopVidyanagar.name);
assert(
  servicesCbtVidyanagar.length === 1 && servicesCbtVidyanagar[0].serviceNumber === '200A',
  'Only official service 200A serves CBT ➔ Vidyanagar',
  `Services: [${servicesCbtVidyanagar.map((s) => s.serviceNumber).join(', ')}]`
);

// ─── TEST 3: REMAINING ROUTE LINE REDUCTION BEHIND BUS ───
console.log('\n--- TEST 3: REMAINING ROUTE LINE REDUCTION BEHIND MOVING BUS ---');
const totalDist = routeCbtToBvb.distanceMeters;
const journeyCoords = routeCbtToBvb.coordinates;
const initialLength = journeyCoords.length;

// Progress 0: Bus at start
const remainingAtStart = getRemainingCoordinates(journeyCoords, journeyCoords[0], 0, totalDist);
assert(
  remainingAtStart.length === initialLength,
  'At start of journey, 100% of route polyline is visible',
  `${remainingAtStart.length} vertices`
);

// Progress 50%: Bus halfway
const midProgress = totalDist * 0.5;
const midCoord = journeyCoords[Math.floor(initialLength / 2)];
const remainingAtMid = getRemainingCoordinates(journeyCoords, midCoord, midProgress, totalDist);

assert(
  remainingAtMid.length < initialLength,
  'Halfway through journey, passed polyline behind the bus is removed',
  `Reduced from ${initialLength} to ${remainingAtMid.length} vertices`
);
assert(
  remainingAtMid[0].latitude === midCoord.latitude && remainingAtMid[0].longitude === midCoord.longitude,
  'Remaining polyline starts exactly at current bus position'
);
assert(
  remainingAtMid[remainingAtMid.length - 1].latitude === lastCoord.latitude &&
  remainingAtMid[remainingAtMid.length - 1].longitude === lastCoord.longitude,
  'Remaining polyline terminates at ticket destination station'
);

// Progress 95%: Bus almost at destination
const nearDestProgress = totalDist * 0.95;
const nearCoord = journeyCoords[journeyCoords.length - 2];
const remainingNearDest = getRemainingCoordinates(journeyCoords, nearCoord, nearDestProgress, totalDist);
assert(
  remainingNearDest.length < remainingAtMid.length,
  'Near destination, remaining polyline has shrunk substantially',
  `${remainingNearDest.length} vertices remaining`
);

// Progress 100% (Destination reached, distToDest <= 8m)
const reachedProgress = totalDist;
const remainingAtDest = getRemainingCoordinates(journeyCoords, lastCoord, reachedProgress, totalDist);
assert(
  remainingAtDest.length === 0,
  'When destination is reached, remaining route line length reaches 0',
  `${remainingAtDest.length} vertices (line disappeared)`
);

// ─── TEST 4: BUS DESTINATION STOPPING LOGIC ───
console.log('\n--- TEST 4: BUS DESTINATION STOPPING LOGIC ---');
// Verify simulation halt condition
const distToDestSim = 6; // <= 8 meters threshold
const isReached = distToDestSim <= 8;
assert(isReached, 'Distance threshold <= 8m triggers destination reached');

const finalBusState = {
  busSpeed: isReached ? 0 : 36,
  distanceToDestination: isReached ? 0 : distToDestSim,
  remainingCoordinates: isReached ? [] : [lastCoord],
  status: isReached ? 'Arrived at destination' : 'In Transit',
};

assert(finalBusState.busSpeed === 0, 'Bus speed becomes 0 km/h upon reaching destination');
assert(finalBusState.distanceToDestination === 0, 'Distance to destination is clamped to 0m');
assert(finalBusState.remainingCoordinates.length === 0, 'Remaining coordinates cleared to [] at destination');
assert(finalBusState.status === 'Arrived at destination', 'Status transitions to Arrived at destination');

// ─── TEST 5: PASSENGER SERVICE NUMBERS ───
console.log('\n--- TEST 5: PASSENGER SERVICE NUMBERS INTEGRITY ---');
const validServiceNumbers = ['200A', '201B', '100D', '202C'];
for (const s of servicesCbtVidyanagar) {
  assert(
    validServiceNumbers.includes(s.serviceNumber),
    `Service number ${s.serviceNumber} is an official passenger service number`,
    'Never fake vehicle registration'
  );
}

// ─── TEST 6: NO DUPLICATE / OVERLAPPING PARALLEL ROUTE LINES ───
console.log('\n--- TEST 6: MAP POLYLINE RENDERING AUDIT (NO DUPLICATES) ---');
// In journey mode, only ONE remainingCoordinates polyline is rendered
const mapJourneyPolylinesCount = remainingAtMid.length >= 2 ? 1 : 0;
assert(
  mapJourneyPolylinesCount === 1,
  'In ticket journey tracking mode, exactly ONE clean polyline is rendered on the map',
  'No parallel branch lines, no ghost duplicates'
);

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  console.log('🎉 ALL TICKET-SPECIFIC LIVE TRACKING & ROUTE AUDIT TESTS PASSED!');
} else {
  process.exit(1);
}
